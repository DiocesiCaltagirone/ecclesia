from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import timedelta
from typing import Optional
import uvicorn

from database import get_db
from auth import (
    verify_password, 
    create_access_token, 
    verify_token,
    get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Inizializza FastAPI
app = FastAPI(
    title="Parrocchia App API",
    description="API per gestione parrocchiale multi-ente",
    version="1.0.0"
)

# CORS - permetti accesso da frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# UTILITY FUNCTIONS
# ============================================

def get_current_user(
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Ottiene utente corrente dal token"""
    user_id = token_data.get("sub")
    
    query = text("""
        SELECT id, username, email, nome, cognome, attivo
        FROM utenti
        WHERE id = :user_id AND attivo = true
    """)
    
    result = db.execute(query, {"user_id": user_id}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utente non trovato o disattivato"
        )
    
    return {
        "id": str(result[0]),
        "username": result[1],
        "email": result[2],
        "nome": result[3],
        "cognome": result[4]
    }

def verify_ente_access(
    ente_id: str,
    current_user: dict,
    db: Session
):
    """Verifica che l'utente abbia accesso all'ente"""
    query = text("""
        SELECT ruolo, permessi
        FROM utenti_enti
        WHERE utente_id = :user_id AND ente_id = :ente_id
    """)
    
    result = db.execute(query, {
        "user_id": current_user["id"],
        "ente_id": ente_id
    }).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso negato a questo ente"
        )
    
    return {
        "ente_id": ente_id,
        "ruolo": result[0],
        "permessi": result[1]
    }

def is_economo(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verifica che l'utente sia economo"""
    query = text("""
        SELECT COUNT(*) FROM utenti_enti 
        WHERE utente_id = :user_id AND ruolo = 'economo'
    """)
    result = db.execute(query, {"user_id": current_user["id"]}).scalar()
    
    if result == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso riservato all'economo"
        )
    return current_user

def check_modulo_permission(modulo: str, ente_id: str, current_user: dict, db: Session):
    """Verifica permesso su modulo specifico"""
    access = verify_ente_access(ente_id, current_user, db)
    permessi = access.get("permessi", {})
    
    if not permessi.get(modulo, False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Accesso negato al modulo {modulo}"
        )
    
    return access

# ============================================
# ENDPOINTS AUTENTICAZIONE
# ============================================

@app.post("/api/auth/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login utente"""
    query = text("""
        SELECT id, username, password_hash, attivo
        FROM utenti
        WHERE username = :username
    """)
    
    result = db.execute(query, {"username": form_data.username}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password non corretti"
        )
    
    user_id, username, password_hash, attivo = result
    
    if not verify_password(form_data.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password non corretti"
        )
    
    if not attivo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utente disattivato"
        )
    
    access_token = create_access_token(
        data={"sub": str(user_id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user_id),
            "username": username
        }
    }

@app.post("/api/auth/reset-password")
async def reset_password(
    email: str,
    db: Session = Depends(get_db)
):
    """Reset password - invia email con password temporanea"""
    # Cerca utente per email
    query = text("""
        SELECT id, username, email, nome, cognome
        FROM utenti
        WHERE email = :email AND attivo = true
    """)
    
    result = db.execute(query, {"email": email}).fetchone()
    
    if not result:
        # Non rivelare se l'email esiste o no (sicurezza)
        return {"message": "Se l'email esiste, riceverai le istruzioni per il reset"}
    
    user_id, username, user_email, nome, cognome = result
    
    # Genera password temporanea
    import secrets
    import string
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))
    
    # Aggiorna password nel database
    password_hash = get_password_hash(temp_password)
    update_query = text("""
        UPDATE utenti 
        SET password_hash = :password_hash
        WHERE id = :user_id
    """)
    
    db.execute(update_query, {
        "password_hash": password_hash,
        "user_id": user_id
    })
    db.commit()
    
    # TODO: Invia email (per ora solo log)
    print(f"Password temporanea per {user_email}: {temp_password}")
    
    # In produzione, qui invieresti l'email con SMTP
    # Per ora ritorniamo la password temporanea (SOLO PER SVILUPPO!)
    return {
        "message": "Password reimpostata. Controlla la tua email",
        "temp_password": temp_password  # RIMUOVERE IN PRODUZIONE!
    }

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Ottiene dati utente corrente"""
    return current_user

# ============================================
# ENDPOINTS ENTI (Multi-tenancy)
# ============================================

@app.get("/api/enti/my-enti")
async def get_my_enti(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ottiene lista enti accessibili dall'utente"""
    query = text("""
        SELECT 
            e.id, e.tipo, e.denominazione, e.comune, e.provincia,
            ue.ruolo, ue.permessi
        FROM enti e
        JOIN utenti_enti ue ON e.id = ue.ente_id
        WHERE ue.utente_id = :user_id
        ORDER BY e.denominazione
    """)
    
    results = db.execute(query, {"user_id": current_user["id"]}).fetchall()
    
    enti = []
    for row in results:
        enti.append({
            "id": str(row[0]),
            "tipo": row[1],
            "denominazione": row[2],
            "comune": row[3],
            "provincia": row[4],
            "ruolo": row[5],
            "permessi": row[6]
        })
    
    return {"enti": enti}

# ============================================
# ENDPOINTS ECONOMO (Super-Admin)
# ============================================

@app.post("/api/economo/enti")
async def create_ente(
    ente_data: dict,
    current_user: dict = Depends(is_economo),
    db: Session = Depends(get_db)
):
    """Crea nuovo ente (parrocchia) - Solo ECONOMO"""
    query = text("""
        INSERT INTO enti (tipo, denominazione, comune, provincia)
        VALUES (:tipo, :denominazione, :comune, :provincia)
        RETURNING id, denominazione
    """)
    
    result = db.execute(query, {
        "tipo": ente_data.get("tipo", "Parrocchia"),
        "denominazione": ente_data["denominazione"],
        "comune": ente_data.get("comune"),
        "provincia": ente_data.get("provincia")
    }).fetchone()
    
    db.commit()
    
    return {
        "id": str(result[0]),
        "denominazione": result[1],
        "message": "Ente creato con successo"
    }

@app.post("/api/economo/utenti")
async def create_user(
    user_data: dict,
    current_user: dict = Depends(is_economo),
    db: Session = Depends(get_db)
):
    """Crea nuovo utente e lo assegna a un ente - Solo ECONOMO"""
    query_user = text("""
        INSERT INTO utenti (username, email, password_hash, nome, cognome)
        VALUES (:username, :email, :password_hash, :nome, :cognome)
        RETURNING id, username, email
    """)
    
    password_hash = get_password_hash(user_data["password"])
    
    result = db.execute(query_user, {
        "username": user_data["email"],
        "email": user_data["email"],
        "password_hash": password_hash,
        "nome": user_data.get("nome"),
        "cognome": user_data.get("cognome")
    }).fetchone()
    
    user_id = result[0]
    
    query_assegna = text("""
        INSERT INTO utenti_enti (utente_id, ente_id, ruolo, permessi)
        VALUES (:user_id, :ente_id, :ruolo, :permessi::jsonb)
    """)
    
    import json
    
    permessi_json = json.dumps(user_data.get("permessi", {
        "anagrafica": True,
        "contabilita": True,
        "inventario": True
    }))
    
    query_assegna = text("""
        INSERT INTO utenti_enti (utente_id, ente_id, ruolo, permessi)
        VALUES (:user_id, :ente_id, :ruolo, CAST(:permessi AS jsonb))
    """)
    
    db.execute(query_assegna, {
        "user_id": user_id,
        "ente_id": user_data["ente_id"],
        "ruolo": user_data.get("ruolo", "operatore"),
        "permessi": permessi_json
    })
    
    db.commit()
    
    return {
        "user_id": str(user_id),
        "username": result[1],
        "email": result[2],
        "message": "Utente creato e assegnato all'ente"
    }

@app.get("/api/economo/enti")
async def list_all_enti(
    current_user: dict = Depends(is_economo),
    db: Session = Depends(get_db)
):
    """Lista tutti gli enti - Solo ECONOMO"""
    query = text("""
        SELECT id, tipo, denominazione, comune, provincia,
               (SELECT COUNT(*) FROM utenti_enti WHERE ente_id = enti.id) as num_utenti
        FROM enti
        ORDER BY denominazione
    """)
    
    results = db.execute(query).fetchall()
    
    enti = []
    for row in results:
        enti.append({
            "id": str(row[0]),
            "tipo": row[1],
            "denominazione": row[2],
            "comune": row[3],
            "provincia": row[4],
            "num_utenti": row[5]
        })
    
    return {"enti": enti}

# ============================================
# ENDPOINTS ANAGRAFICA
# ============================================

@app.get("/api/anagrafica/persone")
async def get_persone(
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
    search: Optional[str] = None
):
    """Ottiene lista persone"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    if search:
        query = text("""
            SELECT id, cognome, nome, data_nascita, comune, telefono, vivente
            FROM persone
            WHERE ente_id = :ente_id
            AND (cognome ILIKE :search OR nome ILIKE :search)
            ORDER BY cognome, nome
            LIMIT :limit OFFSET :offset
        """)
        params = {
            "ente_id": x_ente_id,
            "search": f"%{search}%",
            "limit": limit,
            "offset": offset
        }
    else:
        query = text("""
            SELECT id, cognome, nome, data_nascita, comune, telefono, vivente
            FROM persone
            WHERE ente_id = :ente_id
            ORDER BY cognome, nome
            LIMIT :limit OFFSET :offset
        """)
        params = {
            "ente_id": x_ente_id,
            "limit": limit,
            "offset": offset
        }
    
    results = db.execute(query, params).fetchall()
    
    persone = []
    for row in results:
        persone.append({
            "id": str(row[0]),
            "cognome": row[1],
            "nome": row[2],
            "data_nascita": row[3].isoformat() if row[3] else None,
            "comune": row[4],
            "telefono": row[5],
            "vivente": row[6]
        })
    
    return {"persone": persone, "count": len(persone)}

@app.post("/api/anagrafica/persone")
async def create_persona(
    persona_data: dict,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea nuova persona"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    query = text("""
        INSERT INTO persone (
            ente_id, cognome, nome, sesso, data_nascita,
            comune, telefono, email
        ) VALUES (
            :ente_id, :cognome, :nome, :sesso, :data_nascita,
            :comune, :telefono, :email
        ) RETURNING id, cognome, nome
    """)
    
    result = db.execute(query, {
        "ente_id": x_ente_id,
        "cognome": persona_data.get("cognome"),
        "nome": persona_data.get("nome"),
        "sesso": persona_data.get("sesso"),
        "data_nascita": persona_data.get("data_nascita"),
        "comune": persona_data.get("comune"),
        "telefono": persona_data.get("telefono"),
        "email": persona_data.get("email")
    }).fetchone()
    
    db.commit()
    
    return {
        "id": str(result[0]),
        "cognome": result[1],
        "nome": result[2],
        "message": "Persona creata"
    }

@app.get("/api/anagrafica/persone/{persona_id}")
async def get_persona(
    persona_id: str,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ottiene dettaglio persona"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    query = text("""
        SELECT * FROM persone 
        WHERE id = :persona_id AND ente_id = :ente_id
    """)
    
    result = db.execute(query, {
        "persona_id": persona_id,
        "ente_id": x_ente_id
    }).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Persona non trovata")
    
    return dict(result._mapping)

@app.delete("/api/anagrafica/persone/{persona_id}")
async def delete_persona(
    persona_id: str,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina persona"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    query = text("""
        DELETE FROM persone 
        WHERE id = :persona_id AND ente_id = :ente_id
    """)
    
    db.execute(query, {
        "persona_id": persona_id,
        "ente_id": x_ente_id
    })
    
    db.commit()
    
    return {"message": "Persona eliminata"}

# ============================================
# ENDPOINTS FAMIGLIE
# ============================================

@app.get("/api/anagrafica/famiglie")
async def get_famiglie(
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100,
    search: Optional[str] = None
):
    """Ottiene lista famiglie"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    if search:
        query = text("""
            SELECT f.id, f.cognome, f.indirizzo, f.telefono,
                   COUNT(DISTINCT pf.persona_id) as num_componenti
            FROM famiglie f
            LEFT JOIN persone_famiglie pf ON pf.famiglia_id = f.id
            LEFT JOIN persone p ON p.id = pf.persona_id AND p.vivente = true
            WHERE f.ente_id = :ente_id AND f.cognome ILIKE :search
            GROUP BY f.id
            ORDER BY f.cognome
            LIMIT :limit
        """)
        params = {"ente_id": x_ente_id, "search": f"%{search}%", "limit": limit}
    else:
        query = text("""
            SELECT f.id, f.cognome, f.indirizzo, f.telefono,
                   COUNT(DISTINCT pf.persona_id) as num_componenti
            FROM famiglie f
            LEFT JOIN persone_famiglie pf ON pf.famiglia_id = f.id
            LEFT JOIN persone p ON p.id = pf.persona_id AND p.vivente = true
            WHERE f.ente_id = :ente_id
            GROUP BY f.id
            ORDER BY f.cognome
            LIMIT :limit
        """)
        params = {"ente_id": x_ente_id, "limit": limit}
    
    results = db.execute(query, params).fetchall()
    
    famiglie = []
    for row in results:
        famiglie.append({
            "id": str(row[0]),
            "cognome": row[1],
            "indirizzo": row[2],
            "telefono": row[3],
            "num_componenti": row[4]
        })
    
    return {"famiglie": famiglie}

@app.post("/api/anagrafica/famiglie")
async def create_famiglia(
    famiglia_data: dict,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea nuova famiglia"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    query = text("""
        INSERT INTO famiglie (ente_id, cognome, indirizzo, telefono, note)
        VALUES (:ente_id, :cognome, :indirizzo, :telefono, :note)
        RETURNING id, cognome
    """)
    
    result = db.execute(query, {
        "ente_id": x_ente_id,
        "cognome": famiglia_data.get("cognome"),
        "indirizzo": famiglia_data.get("indirizzo"),
        "telefono": famiglia_data.get("telefono"),
        "note": famiglia_data.get("note")
    }).fetchone()
    
    db.commit()
    
    return {
        "id": str(result[0]),
        "cognome": result[1],
        "message": "Famiglia creata"
    }

@app.get("/api/anagrafica/famiglie/{famiglia_id}")
async def get_famiglia(
    famiglia_id: str,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ottiene dettaglio famiglia con componenti"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    # Dati famiglia
    query_famiglia = text("""
        SELECT * FROM famiglie 
        WHERE id = :famiglia_id AND ente_id = :ente_id
    """)
    
    famiglia = db.execute(query_famiglia, {
        "famiglia_id": famiglia_id,
        "ente_id": x_ente_id
    }).fetchone()
    
    if not famiglia:
        raise HTTPException(status_code=404, detail="Famiglia non trovata")
    
    # Componenti
    query_componenti = text("""
        SELECT p.id, p.cognome, p.nome, p.data_nascita, pf.parentela, p.vivente
        FROM persone p
        JOIN persone_famiglie pf ON p.id = pf.persona_id
        WHERE pf.famiglia_id = :famiglia_id
        ORDER BY pf.ordine, p.data_nascita
    """)
    
    componenti = db.execute(query_componenti, {
        "famiglia_id": famiglia_id
    }).fetchall()
    
    return {
        "famiglia": dict(famiglia._mapping),
        "componenti": [
            {
                "id": str(c[0]),
                "cognome": c[1],
                "nome": c[2],
                "data_nascita": c[3].isoformat() if c[3] else None,
                "parentela": c[4],
                "vivente": c[5]
            } for c in componenti
        ]
    }

@app.put("/api/anagrafica/famiglie/{famiglia_id}/aggiungi-componente")
async def add_componente_famiglia(
    famiglia_id: str,
    componente_data: dict,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggiungi persona esistente a famiglia"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    query = text("""
        INSERT INTO persone_famiglie (persona_id, famiglia_id, parentela, ordine)
        VALUES (:persona_id, :famiglia_id, :parentela, :ordine)
        ON CONFLICT (persona_id, famiglia_id) DO UPDATE
        SET parentela = :parentela, ordine = :ordine
    """)
    
    db.execute(query, {
        "persona_id": componente_data.get("persona_id"),
        "famiglia_id": famiglia_id,
        "parentela": componente_data.get("parentela", "figlio"),
        "ordine": componente_data.get("ordine", 0)
    })
    
    db.commit()
    
    return {"message": "Componente aggiunto alla famiglia"}

@app.delete("/api/anagrafica/famiglie/{famiglia_id}")
async def delete_famiglia(
    famiglia_id: str,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina famiglia (rimuove legami, non persone)"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    # Rimuovi legame famiglia dalle persone
    query_persone = text("""
        UPDATE persone 
        SET famiglia_id = NULL, ruolo_famiglia = NULL
        WHERE famiglia_id = :famiglia_id
    """)
    
    db.execute(query_persone, {"famiglia_id": famiglia_id})
    
    # Elimina famiglia
    query_famiglia = text("""
        DELETE FROM famiglie 
        WHERE id = :famiglia_id AND ente_id = :ente_id
    """)
    
    db.execute(query_famiglia, {
        "famiglia_id": famiglia_id,
        "ente_id": x_ente_id
    })
    
    db.commit()
    
    return {"message": "Famiglia eliminata"}

# ============================================
# ENDPOINTS SACRAMENTI
# ============================================

@app.get("/api/anagrafica/sacramenti/battesimi")
async def get_battesimi(
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100,
    anno: Optional[int] = None
):
    """Ottiene registro battesimi"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    if anno:
        query = text("""
            SELECT b.id, p.cognome, p.nome, b.data_battesimo, b.numero_atto
            FROM battesimi b
            JOIN persone p ON b.persona_id = p.id
            WHERE b.ente_id = :ente_id 
            AND EXTRACT(YEAR FROM b.data_battesimo) = :anno
            ORDER BY b.data_battesimo DESC
            LIMIT :limit
        """)
        params = {"ente_id": x_ente_id, "anno": anno, "limit": limit}
    else:
        query = text("""
            SELECT b.id, p.cognome, p.nome, b.data_battesimo, b.numero_atto
            FROM battesimi b
            JOIN persone p ON b.persona_id = p.id
            WHERE b.ente_id = :ente_id
            ORDER BY b.data_battesimo DESC
            LIMIT :limit
        """)
        params = {"ente_id": x_ente_id, "limit": limit}
    
    results = db.execute(query, params).fetchall()
    
    battesimi = []
    for row in results:
        battesimi.append({
            "id": str(row[0]),
            "cognome": row[1],
            "nome": row[2],
            "data_battesimo": row[3].isoformat() if row[3] else None,
            "numero_atto": row[4]
        })
    
    return {"battesimi": battesimi}

@app.post("/api/anagrafica/sacramenti/battesimi")
async def create_battesimo(
    battesimo_data: dict,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registra nuovo battesimo"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    query = text("""
        INSERT INTO battesimi (
            ente_id, persona_id, data_battesimo, celebrante,
            padrino, madrina, numero_atto, volume, pagina
        ) VALUES (
            :ente_id, :persona_id, :data_battesimo, :celebrante,
            :padrino, :madrina, :numero_atto, :volume, :pagina
        ) RETURNING id, numero_atto
    """)
    
    result = db.execute(query, {
        "ente_id": x_ente_id,
        "persona_id": battesimo_data.get("persona_id"),
        "data_battesimo": battesimo_data.get("data_battesimo"),
        "celebrante": battesimo_data.get("celebrante"),
        "padrino": battesimo_data.get("padrino"),
        "madrina": battesimo_data.get("madrina"),
        "numero_atto": battesimo_data.get("numero_atto"),
        "volume": battesimo_data.get("volume"),
        "pagina": battesimo_data.get("pagina")
    }).fetchone()
    
    db.commit()
    
    return {
        "id": str(result[0]),
        "numero_atto": result[1],
        "message": "Battesimo registrato"
    }

@app.get("/api/anagrafica/sacramenti/cresime")
async def get_cresime(
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100
):
    """Ottiene registro cresime"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    query = text("""
        SELECT c.id, p.cognome, p.nome, c.data_cresima, c.numero_atto
        FROM cresime c
        JOIN persone p ON c.persona_id = p.id
        WHERE c.ente_id = :ente_id
        ORDER BY c.data_cresima DESC
        LIMIT :limit
    """)
    
    results = db.execute(query, {"ente_id": x_ente_id, "limit": limit}).fetchall()
    
    cresime = []
    for row in results:
        cresime.append({
            "id": str(row[0]),
            "cognome": row[1],
            "nome": row[2],
            "data_cresima": row[3].isoformat() if row[3] else None,
            "numero_atto": row[4]
        })
    
    return {"cresime": cresime}

@app.post("/api/anagrafica/sacramenti/cresime")
async def create_cresima(
    cresima_data: dict,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registra nuova cresima"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    query = text("""
        INSERT INTO cresime (
            ente_id, persona_id, data_cresima, ministro,
            padrino, numero_atto, volume, pagina
        ) VALUES (
            :ente_id, :persona_id, :data_cresima, :ministro,
            :padrino, :numero_atto, :volume, :pagina
        ) RETURNING id, numero_atto
    """)
    
    result = db.execute(query, {
        "ente_id": x_ente_id,
        "persona_id": cresima_data.get("persona_id"),
        "data_cresima": cresima_data.get("data_cresima"),
        "ministro": cresima_data.get("ministro"),
        "padrino": cresima_data.get("padrino"),
        "numero_atto": cresima_data.get("numero_atto"),
        "volume": cresima_data.get("volume"),
        "pagina": cresima_data.get("pagina")
    }).fetchone()
    
    db.commit()
    
    return {
        "id": str(result[0]),
        "numero_atto": result[1],
        "message": "Cresima registrata"
    }

@app.get("/api/anagrafica/sacramenti/matrimoni")
async def get_matrimoni(
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100
):
    """Ottiene registro matrimoni"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    query = text("""
        SELECT m.id, 
               p.cognome, p.nome,
               m.coniuge_cognome, m.coniuge_nome,
               m.data_matrimonio, m.numero_atto
        FROM matrimoni m
        JOIN persone p ON m.persona_id = p.id
        WHERE m.ente_id = :ente_id
        ORDER BY m.data_matrimonio DESC
        LIMIT :limit
    """)
    
    results = db.execute(query, {"ente_id": x_ente_id, "limit": limit}).fetchall()
    
    matrimoni = []
    for row in results:
        matrimoni.append({
            "id": str(row[0]),
            "sposo": f"{row[1]} {row[2]}",
            "sposa": f"{row[3]} {row[4]}" if row[3] and row[4] else "N/D",
            "data_matrimonio": row[5].isoformat() if row[5] else None,
            "numero_atto": row[6]
        })
    
    return {"matrimoni": matrimoni}

@app.post("/api/anagrafica/sacramenti/matrimoni")
async def create_matrimonio(
    matrimonio_data: dict,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registra nuovo matrimonio"""
    check_modulo_permission("anagrafica", x_ente_id, current_user, db)
    
    query = text("""
        INSERT INTO matrimoni (
            ente_id, persona_id, data_matrimonio, celebrante,
            coniuge_cognome, coniuge_nome,
            numero_atto, volume, pagina
        ) VALUES (
            :ente_id, :persona_id, :data_matrimonio, :celebrante,
            :coniuge_cognome, :coniuge_nome,
            :numero_atto, :volume, :pagina
        ) RETURNING id, numero_atto
    """)
    
    result = db.execute(query, {
        "ente_id": x_ente_id,
        "persona_id": matrimonio_data.get("persona_id"),
        "data_matrimonio": matrimonio_data.get("data_matrimonio"),
        "celebrante": matrimonio_data.get("celebrante"),
        "coniuge_cognome": matrimonio_data.get("coniuge_cognome"),
        "coniuge_nome": matrimonio_data.get("coniuge_nome"),
        "numero_atto": matrimonio_data.get("numero_atto"),
        "volume": matrimonio_data.get("volume"),
        "pagina": matrimonio_data.get("pagina")
    }).fetchone()
    
    db.commit()
    
    return {
        "id": str(result[0]),
        "numero_atto": result[1],
        "message": "Matrimonio registrato"
    }

# ============================================
# ENDPOINTS CONTABILITÀ
# ============================================

@app.get("/api/contabilita/piano-conti")
async def get_piano_conti(
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ottiene piano dei conti"""
    check_modulo_permission("contabilita", x_ente_id, current_user, db)
    
    query = text("""
        SELECT id, codice, descrizione, tipo, categoria, livello
        FROM piano_conti
        WHERE ente_id = :ente_id AND attivo = true
        ORDER BY codice
    """)
    
    results = db.execute(query, {"ente_id": x_ente_id}).fetchall()
    
    conti = []
    for row in results:
        conti.append({
            "id": str(row[0]),
            "codice": row[1],
            "descrizione": row[2],
            "tipo": row[3],
            "categoria": row[4],
            "livello": row[5]
        })
    
    return {"conti": conti}

@app.post("/api/contabilita/movimenti")
async def create_movimento(
    movimento_data: dict,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea movimento contabile"""
    check_modulo_permission("contabilita", x_ente_id, current_user, db)
    
    query = text("""
        INSERT INTO movimenti_contabili (
            ente_id, data_registrazione, descrizione, tipo, importo,
            registro_id, created_by
        ) VALUES (
            :ente_id, :data_registrazione, :descrizione, :tipo, :importo,
            :registro_id, :created_by
        ) RETURNING id
    """)
    
    result = db.execute(query, {
        "ente_id": x_ente_id,
        "data_registrazione": movimento_data.get("data_registrazione"),
        "descrizione": movimento_data.get("descrizione"),
        "tipo": movimento_data.get("tipo"),
        "importo": movimento_data.get("importo"),
        "registro_id": movimento_data.get("registro_id"),
        "created_by": current_user["id"]
    }).fetchone()
    
    db.commit()
    
    return {
        "id": str(result[0]),
        "message": "Movimento creato"
    }

# ============================================
# ENDPOINTS INVENTARIO
# ============================================

@app.get("/api/inventario/beni")
async def get_beni(
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100
):
    """Ottiene lista beni inventario"""
    check_modulo_permission("inventario", x_ente_id, current_user, db)
    
    query = text("""
        SELECT 
            b.id, b.numero_inventario, b.descrizione, 
            c.nome as categoria, u.nome as ubicazione,
            b.data_registrazione
        FROM beni_inventario b
        LEFT JOIN categorie_inventario c ON b.categoria_id = c.id
        LEFT JOIN ubicazioni u ON b.ubicazione_id = u.id
        WHERE b.ente_id = :ente_id AND b.data_scarico IS NULL
        ORDER BY b.numero_inventario
        LIMIT :limit
    """)
    
    results = db.execute(query, {
        "ente_id": x_ente_id,
        "limit": limit
    }).fetchall()
    
    beni = []
    for row in results:
        beni.append({
            "id": str(row[0]),
            "numero_inventario": row[1],
            "descrizione": row[2],
            "categoria": row[3],
            "ubicazione": row[4],
            "data_registrazione": row[5].isoformat() if row[5] else None
        })
    
    return {"beni": beni}

@app.post("/api/inventario/beni")
async def create_bene(
    bene_data: dict,
    x_ente_id: str = Header(..., alias="X-Ente-Id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea nuovo bene inventario"""
    check_modulo_permission("inventario", x_ente_id, current_user, db)
    
    query = text("""
        INSERT INTO beni_inventario (
            ente_id, numero_inventario, descrizione, quantita
        ) VALUES (
            :ente_id, :numero_inventario, :descrizione, :quantita
        ) RETURNING id, numero_inventario
    """)
    
    result = db.execute(query, {
        "ente_id": x_ente_id,
        "numero_inventario": bene_data.get("numero_inventario"),
        "descrizione": bene_data.get("descrizione"),
        "quantita": bene_data.get("quantita", 1)
    }).fetchone()
    
    db.commit()
    
    return {
        "id": str(result[0]),
        "numero_inventario": result[1],
        "message": "Bene creato"
    }

# ============================================
# ENDPOINT ROOT E HEALTH
# ============================================

@app.get("/")
async def root():
    """Endpoint root"""
    return {
        "message": "Parrocchia App API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check con test database"""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database error: {str(e)}"
        )

# ============================================
# AVVIO SERVER
# ============================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )