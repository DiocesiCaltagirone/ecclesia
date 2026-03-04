from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import uvicorn

from database import get_db
from auth import get_current_user

import middleware
from routes import persone, sacramenti, certificati, amministrazione, auth, contabilita, rendiconti_crud, rendiconti_documenti, stampe, template_categorie, impostazioni_diocesi, audit

# Inizializza FastAPI
app = FastAPI(
    title="Ecclesia - Parrocchia App API",
    description="API per gestione parrocchiale multi-ente",
    version="2.0.0"
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
# INCLUDI ROUTES
# ============================================

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
app.include_router(impostazioni_diocesi.router)
app.include_router(audit.router)

# ============================================
# UTILITY FUNCTIONS
# ============================================

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

    persone_list = []
    for row in results:
        persone_list.append({
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

    return {"persone": persone_list}

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
               parroco, vicario, diocesi, anno_fondazione, santo_patrono, numero_abitanti,
               data_erezione_canonica, data_riconoscimento_civile, registro_pg,
               parroco_nato_a, parroco_nato_il, parroco_nominato_il,
               parroco_possesso_canonico_il, vicario_nominato_il
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
        "numero_abitanti": result[18],
        "data_erezione_canonica": str(result[19]) if result[19] else None,
        "data_riconoscimento_civile": str(result[20]) if result[20] else None,
        "registro_pg": result[21],
        "parroco_nato_a": result[22],
        "parroco_nato_il": str(result[23]) if result[23] else None,
        "parroco_nominato_il": str(result[24]) if result[24] else None,
        "parroco_possesso_canonico_il": str(result[25]) if result[25] else None,
        "vicario_nominato_il": str(result[26]) if result[26] else None
    }

@app.put("/api/enti/{ente_id}")
async def update_ente(
    ente_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggiorna dati ente"""
    data = await request.json()

    # Verifica che l'ente esista
    check = db.execute(text("SELECT id FROM enti WHERE id = :ente_id"), {"ente_id": ente_id}).fetchone()
    if not check:
        raise HTTPException(status_code=404, detail="Ente non trovato")

    # Aggiorna i campi
    query = text("""
        UPDATE enti SET
            denominazione = COALESCE(:denominazione, denominazione),
            codice_fiscale = :codice_fiscale,
            partita_iva = :partita_iva,
            indirizzo = :indirizzo,
            cap = :cap,
            comune = :comune,
            provincia = :provincia,
            regione = :regione,
            telefono = :telefono,
            fax = :fax,
            email = :email,
            sito_web = :sito_web,
            parroco = :parroco,
            vicario = :vicario,
            diocesi = :diocesi,
            anno_fondazione = :anno_fondazione,
            santo_patrono = :santo_patrono,
            numero_abitanti = :numero_abitanti,
            data_erezione_canonica = :data_erezione_canonica,
            data_riconoscimento_civile = :data_riconoscimento_civile,
            registro_pg = :registro_pg,
            parroco_nato_a = :parroco_nato_a,
            parroco_nato_il = :parroco_nato_il,
            parroco_nominato_il = :parroco_nominato_il,
            parroco_possesso_canonico_il = :parroco_possesso_canonico_il,
            vicario_nominato_il = :vicario_nominato_il
        WHERE id = :ente_id
    """)

    db.execute(query, {
        "ente_id": ente_id,
        "denominazione": data.get("denominazione"),
        "codice_fiscale": data.get("codice_fiscale") or None,
        "partita_iva": data.get("partita_iva") or None,
        "indirizzo": data.get("indirizzo") or None,
        "cap": data.get("cap") or None,
        "comune": data.get("comune") or None,
        "provincia": data.get("provincia") or None,
        "regione": data.get("regione") or None,
        "telefono": data.get("telefono") or None,
        "fax": data.get("fax") or None,
        "email": data.get("email") or None,
        "sito_web": data.get("sito_web") or None,
        "parroco": data.get("parroco") or None,
        "vicario": data.get("vicario") or None,
        "diocesi": data.get("diocesi") or None,
        "anno_fondazione": int(data.get("anno_fondazione")) if data.get("anno_fondazione") else None,
        "santo_patrono": data.get("santo_patrono") or None,
        "numero_abitanti": int(data.get("numero_abitanti")) if data.get("numero_abitanti") else None,
        "data_erezione_canonica": data.get("data_erezione_canonica") or None,
        "data_riconoscimento_civile": data.get("data_riconoscimento_civile") or None,
        "registro_pg": data.get("registro_pg") or None,
        "parroco_nato_a": data.get("parroco_nato_a") or None,
        "parroco_nato_il": data.get("parroco_nato_il") or None,
        "parroco_nominato_il": data.get("parroco_nominato_il") or None,
        "parroco_possesso_canonico_il": data.get("parroco_possesso_canonico_il") or None,
        "vicario_nominato_il": data.get("vicario_nominato_il") or None
    })
    db.commit()

    return {"success": True, "message": "Ente aggiornato con successo"}

# ============================================
# ENDPOINT ROOT E HEALTH
# ============================================

@app.get("/")
async def root():
    """Endpoint root"""
    return {
        "message": "Ecclesia - Parrocchia App API",
        "version": "2.0.0",
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
            "version": "2.0.0"
        }
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
