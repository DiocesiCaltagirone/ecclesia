# backend/routes/amministrazione.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import asyncpg
from auth import get_current_user
from database import get_db
import uuid

router = APIRouter(prefix="/api/amministrazione", tags=["amministrazione"])

# ============================================
# MODELS
# ============================================

class ComuneCreate(BaseModel):
    nome: str
    provincia: str
    cap: Optional[str] = None

class ParrocchiaCreate(BaseModel):
    denominazione: str
    comune: str
    provincia: str
    cap: Optional[str] = None
    indirizzo: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    parroco: Optional[str] = None

# ============================================
# ENDPOINT COMUNI
# ============================================

@router.get("/comuni")
async def get_comuni(
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Ottiene la lista di tutti i comuni
    """
    query = """
        SELECT DISTINCT comune as nome, provincia, cap
        FROM enti 
        WHERE comune IS NOT NULL AND attivo = TRUE
        ORDER BY comune
    """
    
    rows = await db.fetch(query)
    return [dict(row) for row in rows]

@router.post("/comuni")
async def create_comune(
    comune: ComuneCreate,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un nuovo comune
    Nota: salviamo nella tabella enti come segnaposto
    """
    # Per ora non creiamo una tabella separata per comuni
    # Li gestiamo attraverso le parrocchie
    return {"message": "Comune registrato", "comune": comune.nome}

# ============================================
# ENDPOINT PARROCCHIE
# ============================================

@router.get("/parrocchie")
async def get_parrocchie(
    comune: Optional[str] = None,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Ottiene la lista delle parrocchie
    Se viene passato 'comune', filtra per quella città
    """
    
    if comune:
        query = """
            SELECT id, denominazione, comune, provincia, cap, 
                   indirizzo, telefono, email, parroco, attivo
            FROM enti 
            WHERE comune = $1
            ORDER BY denominazione
        """
        rows = await db.fetch(query, comune)
    else:
        query = """
            SELECT id, denominazione, comune, provincia, cap,
                   indirizzo, telefono, email, parroco, attivo
            FROM enti 
            ORDER BY comune, denominazione
        """
        rows = await db.fetch(query)
    
    return [dict(row) for row in rows]

@router.post("/parrocchie")
async def create_parrocchia(
    parrocchia: ParrocchiaCreate,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea una nuova parrocchia
    """
    parrocchia_id = str(uuid.uuid4())
    
    query = """
        INSERT INTO enti (
            id, denominazione, comune, provincia, cap,
            indirizzo, telefono, email, parroco, attivo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
        RETURNING *
    """
    
    row = await db.fetchrow(
        query,
        parrocchia_id,
        parrocchia.denominazione,
        parrocchia.comune,
        parrocchia.provincia,
        parrocchia.cap,
        parrocchia.indirizzo,
        parrocchia.telefono,
        parrocchia.email,
        parrocchia.parroco
    )
    
    return dict(row)

@router.put("/parrocchie/{parrocchia_id}")
async def update_parrocchia(
    parrocchia_id: str,
    parrocchia: ParrocchiaCreate,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Modifica una parrocchia esistente
    """
    query = """
        UPDATE enti 
        SET denominazione = $2,
            comune = $3,
            provincia = $4,
            cap = $5,
            indirizzo = $6,
            telefono = $7,
            email = $8,
            parroco = $9
        WHERE id = $1
        RETURNING *
    """
    
    row = await db.fetchrow(
        query,
        parrocchia_id,
        parrocchia.denominazione,
        parrocchia.comune,
        parrocchia.provincia,
        parrocchia.cap,
        parrocchia.indirizzo,
        parrocchia.telefono,
        parrocchia.email,
        parrocchia.parroco
    )
    
    if not row:
        raise HTTPException(status_code=404, detail="Parrocchia non trovata")
    
    return dict(row)

@router.delete("/parrocchie/{parrocchia_id}")
async def delete_parrocchia(
    parrocchia_id: str,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Disattiva una parrocchia (soft delete)
    """
    query = """
        UPDATE enti 
        SET attivo = FALSE
        WHERE id = $1
        RETURNING id
    """
    
    row = await db.fetchrow(query, parrocchia_id)
    
    if not row:
        raise HTTPException(status_code=404, detail="Parrocchia non trovata")
    
    return {"message": "Parrocchia disattivata", "id": str(row['id'])}

@router.get("/parrocchie/{parrocchia_id}")
async def get_parrocchia(
    parrocchia_id: str,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Ottiene i dettagli di una parrocchia specifica
    """
    query = """
        SELECT id, denominazione, comune, provincia, cap,
               indirizzo, telefono, email, parroco, attivo,
               codice_fiscale, partita_iva, diocesi
        FROM enti 
        WHERE id = $1
    """
    
    row = await db.fetchrow(query, parrocchia_id)
    
    if not row:
        raise HTTPException(status_code=404, detail="Parrocchia non trovata")
    
    return dict(row)
