# backend/routers/sacramenti.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
import asyncpg
from datetime import datetime

from database import get_db
from auth import get_current_user
from models.sacramenti import (
    BattesimoCreate, BattesimoUpdate, BattesimoResponse,
    PrimaComunioneCreate, PrimaComunioneUpdate, PrimaComunioneResponse,
    CresimaCreate, CresimaUpdate, CresimaResponse,
    MatrimonioCreate, MatrimonioUpdate, MatrimonioResponse,
    SacramentiPersonaResponse
)

router = APIRouter(prefix="/sacramenti", tags=["sacramenti"])

# ============================================
# BATTESIMO
# ============================================

@router.get("/persone/{persona_id}/battesimo", response_model=Optional[BattesimoResponse])
async def get_battesimo_persona(
    persona_id: UUID,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Ottiene il battesimo di una persona"""
    query = """
        SELECT b.* 
        FROM battesimi b
        WHERE b.persona_id = $1 AND b.ente_id = $2
        LIMIT 1
    """
    row = await db.fetchrow(query, persona_id, UUID(current_user["ente_id"]))
    
    if not row:
        return None
    
    return dict(row)

@router.post("/battesimi", response_model=BattesimoResponse, status_code=status.HTTP_201_CREATED)
async def create_battesimo(
    battesimo: BattesimoCreate,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Crea un nuovo battesimo"""
    query = """
        INSERT INTO battesimi (
            persona_id, ente_id, data_battesimo, luogo, parrocchia,
            volume, pagina, numero_atto, celebrante, padrino, madrina, note
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
    """
    
    try:
        row = await db.fetchrow(
            query,
            battesimo.persona_id,
            UUID(current_user["ente_id"]),
            battesimo.data_battesimo,
            battesimo.luogo,
            battesimo.parrocchia,
            battesimo.volume,
            battesimo.pagina,
            battesimo.numero_atto,
            battesimo.celebrante,
            battesimo.padrino,
            battesimo.madrina,
            battesimo.note
        )
        return dict(row)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Errore creazione battesimo: {str(e)}")

@router.put("/battesimi/{battesimo_id}", response_model=BattesimoResponse)
async def update_battesimo(
    battesimo_id: UUID,
    battesimo: BattesimoUpdate,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Aggiorna un battesimo esistente"""
    
    # Verifica che il battesimo appartenga all'ente dell'utente
    check_query = "SELECT id FROM battesimi WHERE id = $1 AND ente_id = $2"
    exists = await db.fetchval(check_query, battesimo_id, UUID(current_user["ente_id"]))
    
    if not exists:
        raise HTTPException(status_code=404, detail="Battesimo non trovato")
    
    # Costruisci dinamicamente la query di update
    updates = []
    values = []
    param_count = 1
    
    for field, value in battesimo.dict(exclude_unset=True).items():
        if value is not None:
            updates.append(f"{field} = ${param_count}")
            values.append(value)
            param_count += 1
    
    if not updates:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    
    values.append(battesimo_id)
    query = f"""
        UPDATE battesimi 
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING *
    """
    
    row = await db.fetchrow(query, *values)
    return dict(row)

@router.delete("/battesimi/{battesimo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_battesimo(
    battesimo_id: UUID,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Elimina un battesimo"""
    query = "DELETE FROM battesimi WHERE id = $1 AND ente_id = $2"
    result = await db.execute(query, battesimo_id, UUID(current_user["ente_id"]))
    
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Battesimo non trovato")

# ============================================
# PRIMA COMUNIONE
# ============================================

@router.get("/persone/{persona_id}/prima-comunione", response_model=Optional[PrimaComunioneResponse])
async def get_prima_comunione_persona(
    persona_id: UUID,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Ottiene la prima comunione di una persona"""
    query = """
        SELECT pc.* 
        FROM prime_comunioni pc
        WHERE pc.persona_id = $1 AND pc.ente_id = $2
        LIMIT 1
    """
    row = await db.fetchrow(query, persona_id, UUID(current_user["ente_id"]))
    
    if not row:
        return None
    
    return dict(row)

@router.post("/prime-comunioni", response_model=PrimaComunioneResponse, status_code=status.HTTP_201_CREATED)
async def create_prima_comunione(
    comunione: PrimaComunioneCreate,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Crea una nuova prima comunione"""
    query = """
        INSERT INTO prime_comunioni (
            persona_id, ente_id, data_comunione, luogo, parrocchia, celebrante, note
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    """
    
    try:
        row = await db.fetchrow(
            query,
            comunione.persona_id,
            UUID(current_user["ente_id"]),
            comunione.data_comunione,
            comunione.luogo,
            comunione.parrocchia,
            comunione.celebrante,
            comunione.note
        )
        return dict(row)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Errore creazione prima comunione: {str(e)}")

@router.put("/prime-comunioni/{comunione_id}", response_model=PrimaComunioneResponse)
async def update_prima_comunione(
    comunione_id: UUID,
    comunione: PrimaComunioneUpdate,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Aggiorna una prima comunione esistente"""
    
    check_query = "SELECT id FROM prime_comunioni WHERE id = $1 AND ente_id = $2"
    exists = await db.fetchval(check_query, comunione_id, UUID(current_user["ente_id"]))
    
    if not exists:
        raise HTTPException(status_code=404, detail="Prima comunione non trovata")
    
    updates = []
    values = []
    param_count = 1
    
    for field, value in comunione.dict(exclude_unset=True).items():
        if value is not None:
            updates.append(f"{field} = ${param_count}")
            values.append(value)
            param_count += 1
    
    if not updates:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    
    values.append(comunione_id)
    query = f"""
        UPDATE prime_comunioni 
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING *
    """
    
    row = await db.fetchrow(query, *values)
    return dict(row)

@router.delete("/prime-comunioni/{comunione_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prima_comunione(
    comunione_id: UUID,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Elimina una prima comunione"""
    query = "DELETE FROM prime_comunioni WHERE id = $1 AND ente_id = $2"
    result = await db.execute(query, comunione_id, UUID(current_user["ente_id"]))
    
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Prima comunione non trovata")

# ============================================
# CRESIMA
# ============================================

@router.get("/persone/{persona_id}/cresima", response_model=Optional[CresimaResponse])
async def get_cresima_persona(
    persona_id: UUID,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Ottiene la cresima di una persona"""
    query = """
        SELECT c.* 
        FROM cresime c
        WHERE c.persona_id = $1 AND c.ente_id = $2
        LIMIT 1
    """
    row = await db.fetchrow(query, persona_id, UUID(current_user["ente_id"]))
    
    if not row:
        return None
    
    return dict(row)

@router.post("/cresime", response_model=CresimaResponse, status_code=status.HTTP_201_CREATED)
async def create_cresima(
    cresima: CresimaCreate,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Crea una nuova cresima"""
    query = """
        INSERT INTO cresime (
            persona_id, ente_id, data_cresima, luogo, parrocchia,
            volume, pagina, numero_atto, ministro, padrino, madrina, note
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
    """
    
    try:
        row = await db.fetchrow(
            query,
            cresima.persona_id,
            UUID(current_user["ente_id"]),
            cresima.data_cresima,
            cresima.luogo,
            cresima.parrocchia,
            cresima.volume,
            cresima.pagina,
            cresima.numero_atto,
            cresima.ministro,
            cresima.padrino,
            cresima.madrina,
            cresima.note
        )
        return dict(row)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Errore creazione cresima: {str(e)}")

@router.put("/cresime/{cresima_id}", response_model=CresimaResponse)
async def update_cresima(
    cresima_id: UUID,
    cresima: CresimaUpdate,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Aggiorna una cresima esistente"""
    
    check_query = "SELECT id FROM cresime WHERE id = $1 AND ente_id = $2"
    exists = await db.fetchval(check_query, cresima_id, UUID(current_user["ente_id"]))
    
    if not exists:
        raise HTTPException(status_code=404, detail="Cresima non trovata")
    
    updates = []
    values = []
    param_count = 1
    
    for field, value in cresima.dict(exclude_unset=True).items():
        if value is not None:
            updates.append(f"{field} = ${param_count}")
            values.append(value)
            param_count += 1
    
    if not updates:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    
    values.append(cresima_id)
    query = f"""
        UPDATE cresime 
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING *
    """
    
    row = await db.fetchrow(query, *values)
    return dict(row)

@router.delete("/cresime/{cresima_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cresima(
    cresima_id: UUID,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Elimina una cresima"""
    query = "DELETE FROM cresime WHERE id = $1 AND ente_id = $2"
    result = await db.execute(query, cresima_id, UUID(current_user["ente_id"]))
    
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Cresima non trovata")

# ============================================
# MATRIMONIO
# ============================================

@router.get("/persone/{persona_id}/matrimoni", response_model=List[MatrimonioResponse])
async def get_matrimoni_persona(
    persona_id: UUID,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Ottiene tutti i matrimoni di una persona (come sposo o sposa)"""
    query = """
        SELECT m.* 
        FROM matrimoni m
        WHERE (m.sposo_id = $1 OR m.sposa_id = $1) AND m.ente_id = $2
        ORDER BY m.data_matrimonio DESC
    """
    rows = await db.fetch(query, persona_id, UUID(current_user["ente_id"]))
    return [dict(row) for row in rows]

@router.post("/matrimoni", response_model=MatrimonioResponse, status_code=status.HTTP_201_CREATED)
async def create_matrimonio(
    matrimonio: MatrimonioCreate,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Crea un nuovo matrimonio"""
    query = """
        INSERT INTO matrimoni (
            sposo_id, sposa_id, ente_id, data_matrimonio, luogo, parrocchia,
            volume, pagina, numero_atto, celebrante,
            testimone1_sposo, testimone2_sposo, testimone1_sposa, testimone2_sposa,
            rito, note
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
    """
    
    try:
        row = await db.fetchrow(
            query,
            matrimonio.sposo_id,
            matrimonio.sposa_id,
            UUID(current_user["ente_id"]),
            matrimonio.data_matrimonio,
            matrimonio.luogo,
            matrimonio.parrocchia,
            matrimonio.volume,
            matrimonio.pagina,
            matrimonio.numero_atto,
            matrimonio.celebrante,
            matrimonio.testimone1_sposo,
            matrimonio.testimone2_sposo,
            matrimonio.testimone1_sposa,
            matrimonio.testimone2_sposa,
            matrimonio.rito,
            matrimonio.note
        )
        return dict(row)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Errore creazione matrimonio: {str(e)}")

@router.put("/matrimoni/{matrimonio_id}", response_model=MatrimonioResponse)
async def update_matrimonio(
    matrimonio_id: UUID,
    matrimonio: MatrimonioUpdate,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Aggiorna un matrimonio esistente"""
    
    check_query = "SELECT id FROM matrimoni WHERE id = $1 AND ente_id = $2"
    exists = await db.fetchval(check_query, matrimonio_id, UUID(current_user["ente_id"]))
    
    if not exists:
        raise HTTPException(status_code=404, detail="Matrimonio non trovato")
    
    updates = []
    values = []
    param_count = 1
    
    for field, value in matrimonio.dict(exclude_unset=True).items():
        if value is not None:
            updates.append(f"{field} = ${param_count}")
            values.append(value)
            param_count += 1
    
    if not updates:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    
    values.append(matrimonio_id)
    query = f"""
        UPDATE matrimoni 
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING *
    """
    
    row = await db.fetchrow(query, *values)
    return dict(row)

@router.delete("/matrimoni/{matrimonio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_matrimonio(
    matrimonio_id: UUID,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Elimina un matrimonio"""
    query = "DELETE FROM matrimoni WHERE id = $1 AND ente_id = $2"
    result = await db.execute(query, matrimonio_id, UUID(current_user["ente_id"]))
    
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Matrimonio non trovato")

# ============================================
# RIEPILOGO TUTTI I SACRAMENTI DI UNA PERSONA
# ============================================

@router.get("/persone/{persona_id}/riepilogo", response_model=SacramentiPersonaResponse)
async def get_sacramenti_persona(
    persona_id: UUID,
    db: asyncpg.Pool = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Ottiene tutti i sacramenti ricevuti da una persona"""
    
    ente_id = UUID(current_user["ente_id"])
    
    # Battesimo
    battesimo_query = "SELECT * FROM battesimi WHERE persona_id = $1 AND ente_id = $2 LIMIT 1"
    battesimo = await db.fetchrow(battesimo_query, persona_id, ente_id)
    
    # Prima Comunione
    comunione_query = "SELECT * FROM prime_comunioni WHERE persona_id = $1 AND ente_id = $2 LIMIT 1"
    comunione = await db.fetchrow(comunione_query, persona_id, ente_id)
    
    # Cresima
    cresima_query = "SELECT * FROM cresime WHERE persona_id = $1 AND ente_id = $2 LIMIT 1"
    cresima = await db.fetchrow(cresima_query, persona_id, ente_id)
    
    # Matrimoni
    matrimoni_query = """
        SELECT * FROM matrimoni 
        WHERE (sposo_id = $1 OR sposa_id = $1) AND ente_id = $2
        ORDER BY data_matrimonio DESC
    """
    matrimoni = await db.fetch(matrimoni_query, persona_id, ente_id)
    
    return {
        "battesimo": dict(battesimo) if battesimo else None,
        "prima_comunione": dict(comunione) if comunione else None,
        "cresima": dict(cresima) if cresima else None,
        "matrimoni": [dict(m) for m in matrimoni]
    }