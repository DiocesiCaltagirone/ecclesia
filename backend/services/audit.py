"""
SERVIZIO AUDIT
==============
Registra tutte le operazioni CRUD sulle tabelle monitorate.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, Dict, Any
import uuid
import json

# Tabelle da monitorare
TABELLE_MONITORATE = [
    'movimenti_contabili',
    'registri_contabili', 
    'rendiconti',
    'persone',
    'enti',
    'utenti',
    'utenti_enti',
    'piano_conti'
]

def registra_audit(
    db: Session,
    azione: str,  # INSERT, UPDATE, DELETE
    tabella: str,
    record_id: str,
    utente_id: Optional[str] = None,
    utente_email: Optional[str] = None,
    ente_id: Optional[str] = None,
    dati_precedenti: Optional[Dict[str, Any]] = None,
    dati_nuovi: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    descrizione: Optional[str] = None
):
    """
    Registra un'operazione nel log di audit.
    """
    try:
        # Verifica se la tabella è monitorata
        if tabella not in TABELLE_MONITORATE:
            return None
            
        audit_id = str(uuid.uuid4())
        
        query = text("""
            INSERT INTO audit_log (
                id, utente_id, utente_email, ente_id, azione, tabella,
                record_id, dati_precedenti, dati_nuovi, ip_address, 
                user_agent, descrizione
            ) VALUES (
                :id, :utente_id, :utente_email, :ente_id, :azione, :tabella,
                :record_id, :dati_precedenti, :dati_nuovi, :ip_address,
                :user_agent, :descrizione
            )
            RETURNING id
        """)
        
        result = db.execute(query, {
            "id": audit_id,
            "utente_id": utente_id,
            "utente_email": utente_email,
            "ente_id": ente_id,
            "azione": azione,
            "tabella": tabella,
            "record_id": record_id,
            "dati_precedenti": json.dumps(dati_precedenti) if dati_precedenti else None,
            "dati_nuovi": json.dumps(dati_nuovi) if dati_nuovi else None,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "descrizione": descrizione
        })
        
        print(f"✅ AUDIT: {azione} su {tabella} - Record {record_id}")
        return audit_id
        
    except Exception as e:
        print(f"❌ Errore audit: {e}")
        # Non blocchiamo l'operazione principale se l'audit fallisce
        return None


def get_record_data(db: Session, tabella: str, record_id: str) -> Optional[Dict]:
    """
    Recupera i dati attuali di un record per salvarli prima di UPDATE/DELETE.
    """
    try:
        query = text(f"SELECT * FROM {tabella} WHERE id = :id")
        result = db.execute(query, {"id": record_id}).fetchone()
        
        if result:
            # Converti Row in dizionario
            columns = result._mapping.keys()
            data = {}
            for col in columns:
                val = result._mapping[col]
                # Converti tipi non serializzabili
                if hasattr(val, 'isoformat'):
                    data[col] = val.isoformat()
                elif isinstance(val, uuid.UUID):
                    data[col] = str(val)
                else:
                    data[col] = val
            return data
        return None
        
    except Exception as e:
        print(f"❌ Errore get_record_data: {e}")
        return None
    
def registra_audit_psycopg2(
    cur,
    azione: str,
    tabella: str,
    record_id: str,
    utente_id: Optional[str] = None,
    utente_email: Optional[str] = None,
    ente_id: Optional[str] = None,
    dati_precedenti: Optional[Dict[str, Any]] = None,
    dati_nuovi: Optional[Dict[str, Any]] = None,
    descrizione: Optional[str] = None
):
    """
    Versione per psycopg2 (usata da rendiconti_crud.py)
    """
    try:
        if tabella not in TABELLE_MONITORATE:
            return None
            
        audit_id = str(uuid.uuid4())
        
        cur.execute("""
            INSERT INTO audit_log (
                id, utente_id, utente_email, ente_id, azione, tabella,
                record_id, dati_precedenti, dati_nuovi, descrizione
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            audit_id,
            utente_id,
            utente_email,
            str(ente_id) if ente_id else None,
            azione,
            tabella,
            record_id,
            json.dumps(dati_precedenti) if dati_precedenti else None,
            json.dumps(dati_nuovi) if dati_nuovi else None,
            descrizione
        ))
        
        print(f"✅ AUDIT: {azione} su {tabella} - Record {record_id}")
        return audit_id
        
    except Exception as e:
        print(f"❌ Errore audit psycopg2: {e}")
        return None