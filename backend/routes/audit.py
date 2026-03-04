"""
API AUDIT LOG
=============
Endpoint per consultazione storico modifiche.
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import date

from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
async def get_audit_log(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id"),
    tabella: str = Query(None),
    record_id: str = Query(None),
    data_da: date = Query(None),
    data_a: date = Query(None),
    limit: int = Query(100, le=500)
):
    """
    Lista audit log con filtri opzionali.
    """
    try:
        ente_id = current_user.get('ente_id') or x_ente_id
        
        query = """
            SELECT 
                a.id, a.timestamp, a.utente_email, a.azione, 
                a.tabella, a.record_id, a.dati_precedenti, 
                a.dati_nuovi, a.ip_address, a.descrizione
            FROM audit_log a
            WHERE a.ente_id = :ente_id
        """
        
        params = {"ente_id": ente_id}
        
        if tabella:
            query += " AND a.tabella = :tabella"
            params["tabella"] = tabella
            
        if record_id:
            query += " AND a.record_id = :record_id"
            params["record_id"] = record_id
            
        if data_da:
            query += " AND a.timestamp >= :data_da"
            params["data_da"] = data_da
            
        if data_a:
            query += " AND a.timestamp <= :data_a"
            params["data_a"] = data_a
            
        query += " ORDER BY a.timestamp DESC LIMIT :limit"
        params["limit"] = limit
        
        result = db.execute(text(query), params)
        
        audit_list = []
        for row in result:
            audit_list.append({
                "id": str(row[0]),
                "timestamp": row[1].isoformat() if row[1] else None,
                "utente_email": row[2],
                "azione": row[3],
                "tabella": row[4],
                "record_id": str(row[5]) if row[5] else None,
                "dati_precedenti": row[6],
                "dati_nuovi": row[7],
                "ip_address": row[8],
                "descrizione": row[9]
            })
            
        return {"audit": audit_list, "count": len(audit_list)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/record/{tabella}/{record_id}")
async def get_storia_record(
    tabella: str,
    record_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Storia completa di un singolo record.
    """
    try:
        query = text("""
            SELECT 
                a.id, a.timestamp, a.utente_email, a.azione,
                a.dati_precedenti, a.dati_nuovi, a.descrizione
            FROM audit_log a
            WHERE a.tabella = :tabella AND a.record_id = :record_id
            ORDER BY a.timestamp ASC
        """)
        
        result = db.execute(query, {
            "tabella": tabella,
            "record_id": record_id
        })
        
        storia = []
        for row in result:
            storia.append({
                "id": str(row[0]),
                "timestamp": row[1].isoformat() if row[1] else None,
                "utente_email": row[2],
                "azione": row[3],
                "dati_precedenti": row[4],
                "dati_nuovi": row[5],
                "descrizione": row[6]
            })
            
        return {
            "tabella": tabella,
            "record_id": record_id,
            "storia": storia,
            "modifiche_totali": len(storia)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistiche")
async def get_statistiche_audit(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Statistiche audit per ente.
    """
    try:
        ente_id = current_user.get('ente_id') or x_ente_id
        
        query = text("""
            SELECT 
                tabella,
                azione,
                COUNT(*) as totale
            FROM audit_log
            WHERE ente_id = :ente_id
            GROUP BY tabella, azione
            ORDER BY tabella, azione
        """)
        
        result = db.execute(query, {"ente_id": ente_id})
        
        stats = {}
        for row in result:
            tabella = row[0]
            if tabella not in stats:
                stats[tabella] = {"INSERT": 0, "UPDATE": 0, "DELETE": 0}
            stats[tabella][row[1]] = row[2]
            
        return {"statistiche": stats}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))