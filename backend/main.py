from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import uvicorn

from database import get_db
from auth import get_current_user

import middleware
from routes import persone, sacramenti, certificati, amministrazione, auth, contabilita, rendiconti_crud, rendiconti_documenti, stampe, template_categorie, impostazioni_diocesi, audit, enti

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
app.include_router(enti.router)

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
        "user_id": current_user["user_id"],
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
