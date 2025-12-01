from fastapi import FastAPI, Depends, HTTPException, status, Header, Request
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

# ============================================
# IMPORT NUOVO SISTEMA PERMESSI
# ============================================
import permissions
import middleware
from routes import persone, sacramenti, certificati, amministrazione, auth, contabilita, rendiconti_crud, rendiconti_documenti, stampe, template_categorie

# Inizializza FastAPI
app = FastAPI(
    title="Ecclesia - Parrocchia App API",
    description="API per gestione parrocchiale multi-ente con sistema paternità",
    version="2.0.0 - Sistema Paternità"
)

# ============================================
# MIDDLEWARE
# ============================================

# CORS - DEVE ESSERE IL PRIMO!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware per logging richieste
app.middleware("http")(middleware.log_request_middleware)

# Middleware per aggiungere info richiesta (IP, User Agent)
app.middleware("http")(middleware.add_request_info_middleware)

# ============================================
# INCLUDI NUOVE ROUTES CON SISTEMA PERMESSI
# ============================================

# Routes con sistema di paternità
app.include_router(persone.router)
app.include_router(sacramenti.router)
app.include_router(certificati.router)
app.include_router(amministrazione.router)
app.include_router(auth.router)
app.include_router(contabilita.router)
app.include_router(rendiconti_crud.router)
app.include_router(rendiconti_documenti.router)
app.include_router(stampe.router)
app.include_router(template_categorie.router)

# ============================================
# UTILITY FUNCTIONS (MANTENUTE PER COMPATIBILITÀ)
# ============================================

def get_current_user(
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Ottiene utente corrente dal token"""
    user_id = token_data.get("sub")
    
    query = text("""
        SELECT id, username, email, nome, cognome, attivo, titolo
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
        "cognome": result[4],
        "titolo": result[6] if len(result) > 6 else None
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
# ENDPOINTS ANAGRAFICA
# ============================================

@app.get("/api/anagrafica/persone")
async def get_persone(
    ente_id: str,
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ottiene lista persone"""
    
    if search:
        query = text("""
            SELECT id, cognome, nome, data_nascita, luogo_nascita, 
                   comune, telefono, email, vivente
            FROM persone
            WHERE ente_id = :ente_id
            AND (LOWER(cognome) LIKE LOWER(:search) OR LOWER(nome) LIKE LOWER(:search))
            ORDER BY cognome, nome
            LIMIT :limit OFFSET :skip
        """)
        results = db.execute(query, {
            "ente_id": ente_id,
            "search": f"%{search}%",
            "limit": limit,
            "skip": skip
        }).fetchall()
    else:
        query = text("""
            SELECT id, cognome, nome, data_nascita, luogo_nascita,
                   comune, telefono, email, vivente
            FROM persone
            WHERE ente_id = :ente_id
            ORDER BY cognome, nome
            LIMIT :limit OFFSET :skip
        """)
        results = db.execute(query, {
            "ente_id": ente_id,
            "limit": limit,
            "skip": skip
        }).fetchall()
    
    persone = []
    for row in results:
        persone.append({
            "id": str(row[0]),
            "cognome": row[1],
            "nome": row[2],
            "data_nascita": str(row[3]) if row[3] else None,
            "luogo_nascita": row[4],
            "comune": row[5],
            "telefono": row[6],
            "email": row[7],
            "vivente": row[8]
        })
    
    return {"persone": persone}

@app.post("/api/anagrafica/persone")
async def create_persona(
    persona_data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea nuova persona"""
    query = text("""
        INSERT INTO persone (
            ente_id, cognome, nome, sesso, data_nascita, luogo_nascita,
            indirizzo, cap, comune, provincia, telefono, email, vivente
        )
        VALUES (
            :ente_id, :cognome, :nome, :sesso, :data_nascita, :luogo_nascita,
            :indirizzo, :cap, :comune, :provincia, :telefono, :email, :vivente
        )
        RETURNING id, cognome, nome
    """)
    
    result = db.execute(query, {
        "ente_id": persona_data.get("ente_id"),
        "cognome": persona_data.get("cognome"),
        "nome": persona_data.get("nome"),
        "sesso": persona_data.get("sesso"),
        "data_nascita": persona_data.get("data_nascita"),
        "luogo_nascita": persona_data.get("luogo_nascita"),
        "indirizzo": persona_data.get("indirizzo"),
        "cap": persona_data.get("cap"),
        "comune": persona_data.get("comune"),
        "provincia": persona_data.get("provincia"),
        "telefono": persona_data.get("telefono"),
        "email": persona_data.get("email"),
        "vivente": persona_data.get("vivente", True)
    }).fetchone()
    
    db.commit()
    
    return {
        "id": str(result[0]),
        "cognome": result[1],
        "nome": result[2],
        "message": "Persona creata con successo"
    }

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
        SELECT id, username, password_hash, attivo, is_economo
        FROM utenti
        WHERE username = :username OR email = :username
    """)
    
    result = db.execute(query, {"username": form_data.username}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password non corretti"
        )
    
    # Accedi ai campi con indici
    user_id = str(result[0])  # Converti UUID in stringa SUBITO
    username = result[1]
    password_hash = result[2]
    attivo = result[3]
    is_economo = result[4]  # ⭐ AGGIUNGI QUESTA RIGA

    # ⭐ DEBUG: Stampa per vedere cosa c'è
    print(f"🔍 DEBUG LOGIN:")
    print(f"   user_id: {user_id}")
    print(f"   username: {username}")
    print(f"   is_economo: {is_economo}")
    print(f"   tipo: {type(is_economo)}")
    
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
        data={
            "sub": user_id,
            "is_economo": str(is_economo)  # ⭐ AGGIUNGI QUESTA RIGA
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Recupera anche email, nome, cognome, titolo
    query_dettagli = text("""
        SELECT email, nome, cognome, titolo
        FROM utenti WHERE id = :user_id
    """)
    dettagli = db.execute(query_dettagli, {"user_id": user_id}).fetchone()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "username": username,
            "email": dettagli[0] if dettagli else None,
            "nome": dettagli[1] if dettagli else None,
            "cognome": dettagli[2] if dettagli else None,
            "titolo": dettagli[3] if dettagli else None,
            "is_economo": is_economo
        }
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

@app.get("/api/enti/{ente_id}")
async def get_ente(
    ente_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ottiene dettagli ente"""
    query = text("""
        SELECT id, denominazione, codice_fiscale, partita_iva, indirizzo, cap, 
               comune, provincia, regione, telefono, fax, email, sito_web,
               parroco, vicario, diocesi, anno_fondazione, santo_patrono, numero_abitanti
        FROM enti
        WHERE id = :ente_id
    """)
    
    result = db.execute(query, {"ente_id": ente_id}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ente non trovato"
        )
    
    return {
        "id": str(result[0]),
        "denominazione": result[1],
        "codice_fiscale": result[2],
        "partita_iva": result[3],
        "indirizzo": result[4],
        "cap": result[5],
        "comune": result[6],
        "provincia": result[7],
        "regione": result[8],
        "telefono": result[9],
        "fax": result[10],
        "email": result[11],
        "sito_web": result[12],
        "parroco": result[13],
        "vicario": result[14],
        "diocesi": result[15],
        "anno_fondazione": result[16],
        "santo_patrono": result[17],
        "numero_abitanti": result[18]
    }

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
# ENDPOINT ROOT E HEALTH
# ============================================

@app.get("/")
async def root():
    """Endpoint root"""
    return {
        "message": "Ecclesia - Parrocchia App API",
        "version": "2.0.0 - Sistema Paternità",
        "status": "running"
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check con test database"""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy", 
            "database": "connected",
            "version": "2.0.0",
            "features": ["multi-tenancy", "paternità", "permessi-granulari"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database error: {str(e)}"
        )

@app.get("/api/test-permissions")
async def test_permissions(request: Request):
    """
    Route di test per verificare il sistema permessi.
    Richiede header: X-User-ID
    """
    try:
        user_id = middleware.get_current_user(request)
        parrocchia_id = middleware.get_current_parrocchia(request)
        è_economo = permissions.è_economo_diocesano(user_id)
        
        return {
            "user_id": user_id,
            "parrocchia_id": parrocchia_id,
            "è_economo": è_economo,
            "message": "Sistema permessi funzionante!",
            "status": "ok"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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