# backend/routes/amministrazione.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
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

class ParrocchiaDiocesiCreate(BaseModel):
    comune: str
    denominazione: str
    provincia: str
    diocesi: Optional[str] = None
    cap: Optional[str] = None

class UtenteCreate(BaseModel):
    username: str
    email: str
    nome: str
    cognome: str
    titolo: Optional[str] = None

class UtenteUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    nome: Optional[str] = None
    cognome: Optional[str] = None
    titolo: Optional[str] = None

# ============================================
# ENDPOINT COMUNI
# ============================================

@router.get("/comuni")
def get_comuni(
    db: Session = Depends(get_db),
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
    
    result = db.execute(text(query))
    rows = result.fetchall()
    return [dict(row) for row in rows]

@router.post("/comuni")
def create_comune(
    comune: ComuneCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un nuovo comune
    """
    return {"message": "Comune registrato", "comune": comune.nome}

# ============================================
# ENDPOINT PARROCCHIE (tabella ENTI)
# ============================================

@router.get("/parrocchie")
def get_parrocchie(
    comune: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Ottiene la lista delle parrocchie
    """
    
    if comune:
        query = """
            SELECT id, denominazione, comune, provincia, cap, 
                   indirizzo, telefono, email, parroco, attivo
            FROM enti 
            WHERE comune = :comune
            ORDER BY denominazione
        """
        result = db.execute(text(query), {"comune": comune})
    else:
        query = """
            SELECT id, denominazione, comune, provincia, cap,
                   indirizzo, telefono, email, parroco, attivo
            FROM enti 
            ORDER BY comune, denominazione
        """
        result = db.execute(text(query))
    
    rows = result.fetchall()
    return [
        {
            "id": str(row[0]),
            "denominazione": row[1],
            "comune": row[2],
            "provincia": row[3],
            "cap": row[4],
            "indirizzo": row[5],
            "telefono": row[6],
            "email": row[7],
            "parroco": row[8],
            "attivo": row[9]
        }
        for row in rows
    ]

@router.post("/parrocchie")
def create_parrocchia(
    parrocchia: ParrocchiaCreate,
    db: Session = Depends(get_db),
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
        ) VALUES (:id, :denominazione, :comune, :provincia, :cap, :indirizzo, :telefono, :email, :parroco, TRUE)
        RETURNING *
    """
    
    result = db.execute(text(query), {
        "id": parrocchia_id,
        "denominazione": parrocchia.denominazione,
        "comune": parrocchia.comune,
        "provincia": parrocchia.provincia,
        "cap": parrocchia.cap,
        "indirizzo": parrocchia.indirizzo,
        "telefono": parrocchia.telefono,
        "email": parrocchia.email,
        "parroco": parrocchia.parroco
    })
    
    db.commit()
    row = result.fetchone()
    return dict(row)

@router.put("/parrocchie/{parrocchia_id}")
def update_parrocchia(
    parrocchia_id: str,
    parrocchia: ParrocchiaCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Modifica una parrocchia esistente
    """
    query = """
        UPDATE enti 
        SET denominazione = :denominazione,
            comune = :comune,
            provincia = :provincia,
            cap = :cap,
            indirizzo = :indirizzo,
            telefono = :telefono,
            email = :email,
            parroco = :parroco
        WHERE id = :id
        RETURNING *
    """
    
    result = db.execute(text(query), {
        "id": parrocchia_id,
        "denominazione": parrocchia.denominazione,
        "comune": parrocchia.comune,
        "provincia": parrocchia.provincia,
        "cap": parrocchia.cap,
        "indirizzo": parrocchia.indirizzo,
        "telefono": parrocchia.telefono,
        "email": parrocchia.email,
        "parroco": parrocchia.parroco
    })
    
    db.commit()
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Parrocchia non trovata")
    
    return dict(row)

@router.delete("/parrocchie/{parrocchia_id}")
def delete_parrocchia(
    parrocchia_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Disattiva una parrocchia (soft delete)
    """
    query = """
        UPDATE enti 
        SET attivo = FALSE
        WHERE id = :id
        RETURNING id
    """
    
    result = db.execute(text(query), {"id": parrocchia_id})
    db.commit()
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Parrocchia non trovata")
    
    return {"message": "Parrocchia disattivata", "id": str(row['id'])}

@router.get("/parrocchie/{parrocchia_id}")
def get_parrocchia(
    parrocchia_id: str,
    db: Session = Depends(get_db),
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
        WHERE id = :id
    """
    
    result = db.execute(text(query), {"id": parrocchia_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Parrocchia non trovata")
    
    return dict(row)


# ============================================
# ENDPOINT ENTI (con operatori abbinati)
# ============================================

@router.get("/enti")
def get_enti(
    comune: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Ottiene la lista degli enti CON gli operatori abbinati
    """
    
    # Query per ottenere tutti gli enti
    if comune:
        query_enti = """
            SELECT id, denominazione, comune, provincia, cap, 
                   indirizzo, telefono, email, codice_fiscale, attivo
            FROM enti 
            WHERE comune = :comune AND attivo = TRUE
            ORDER BY denominazione
        """
        result = db.execute(text(query_enti), {"comune": comune})
    else:
        query_enti = """
            SELECT id, denominazione, comune, provincia, cap,
                   indirizzo, telefono, email, codice_fiscale, attivo
            FROM enti 
            WHERE attivo = TRUE
            ORDER BY comune, denominazione
        """
        result = db.execute(text(query_enti))
    
    enti_rows = result.fetchall()
    enti = []
    
    # Per ogni ente, recupera gli operatori abbinati
    for row in enti_rows:
        ente_id = str(row[0])
        
        # Query per ottenere operatori abbinati a questo ente
        query_operatori = """
            SELECT 
                u.id,
                u.titolo,
                u.nome,
                u.cognome,
                u.email,
                ue.ruolo,
                ue.permessi
            FROM utenti_enti ue
            JOIN utenti u ON ue.utente_id = u.id
            WHERE ue.ente_id = :ente_id
            ORDER BY 
                CASE ue.ruolo
                    WHEN 'parroco' THEN 1
                    WHEN 'economo' THEN 2
                    WHEN 'cassiere' THEN 3
                    ELSE 4
                END,
                u.cognome
        """
        
        result_operatori = db.execute(text(query_operatori), {"ente_id": ente_id})
        operatori_rows = result_operatori.fetchall()
        
        operatori = []
        for op_row in operatori_rows:
            operatori.append({
                "id": str(op_row[0]),
                "titolo": op_row[1],
                "nome": op_row[2],
                "cognome": op_row[3],
                "email": op_row[4],
                "ruolo": op_row[5],
                "permessi": op_row[6]
            })
        
        enti.append({
            "id": ente_id,
            "denominazione": row[1],
            "comune": row[2],
            "provincia": row[3],
            "cap": row[4],
            "indirizzo": row[5],
            "telefono": row[6],
            "email": row[7],
            "codice_fiscale": row[8],
            "attivo": row[9],
            "operatori": operatori
        })
    
    return enti


@router.post("/enti")
def create_ente(
    ente: ParrocchiaCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un nuovo ente
    """
    ente_id = str(uuid.uuid4())
    
    query = """
        INSERT INTO enti (
            id, denominazione, comune, provincia, cap,
            indirizzo, telefono, email, codice_fiscale, attivo
        ) VALUES (:id, :denominazione, :comune, :provincia, :cap, 
                  :indirizzo, :telefono, :email, :codice_fiscale, TRUE)
        RETURNING id, denominazione, comune, provincia, cap,
                  indirizzo, telefono, email, codice_fiscale, attivo
    """
    
    result = db.execute(text(query), {
        "id": ente_id,
        "denominazione": ente.denominazione,
        "comune": ente.comune,
        "provincia": ente.provincia,
        "cap": ente.cap,
        "indirizzo": ente.indirizzo,
        "telefono": ente.telefono,
        "email": ente.email,
        "codice_fiscale": None
    })
    
    db.commit()
    row = result.fetchone()
    
    return {
        "id": str(row[0]),
        "denominazione": row[1],
        "comune": row[2],
        "provincia": row[3],
        "cap": row[4],
        "indirizzo": row[5],
        "telefono": row[6],
        "email": row[7],
        "codice_fiscale": row[8],
        "attivo": row[9],
        "operatori": []
    }

# ============================================
# AGGIUNGI QUESTI 2 ENDPOINT in amministrazione.py
# DOPO @router.post("/enti")
# ============================================

@router.put("/enti/{ente_id}")
def update_ente(
    ente_id: str,
    ente: ParrocchiaCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Modifica un ente esistente
    """
    query = """
        UPDATE enti 
        SET denominazione = :denominazione,
            comune = :comune,
            provincia = :provincia,
            cap = :cap,
            indirizzo = :indirizzo,
            telefono = :telefono,
            email = :email,
            codice_fiscale = :codice_fiscale
        WHERE id = :id
        RETURNING id, denominazione, comune, provincia, cap,
                  indirizzo, telefono, email, codice_fiscale, attivo
    """
    
    result = db.execute(text(query), {
        "id": ente_id,
        "denominazione": ente.denominazione,
        "comune": ente.comune,
        "provincia": ente.provincia,
        "cap": ente.cap,
        "indirizzo": ente.indirizzo,
        "telefono": ente.telefono,
        "email": ente.email,
        "codice_fiscale": None
    })
    
    db.commit()
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Ente non trovato")
    
    # Recupera gli operatori abbinati
    query_operatori = """
        SELECT 
            u.id,
            u.titolo,
            u.nome,
            u.cognome,
            u.email,
            ue.ruolo,
            ue.permessi
        FROM utenti_enti ue
        JOIN utenti u ON ue.utente_id = u.id
        WHERE ue.ente_id = :ente_id
        ORDER BY 
            CASE ue.ruolo
                WHEN 'parroco' THEN 1
                WHEN 'economo' THEN 2
                WHEN 'cassiere' THEN 3
                ELSE 4
            END,
            u.cognome
    """
    
    result_operatori = db.execute(text(query_operatori), {"ente_id": ente_id})
    operatori_rows = result_operatori.fetchall()
    
    operatori = []
    for op_row in operatori_rows:
        operatori.append({
            "id": str(op_row[0]),
            "titolo": op_row[1],
            "nome": op_row[2],
            "cognome": op_row[3],
            "email": op_row[4],
            "ruolo": op_row[5],
            "permessi": op_row[6]
        })
    
    return {
        "id": str(row[0]),
        "denominazione": row[1],
        "comune": row[2],
        "provincia": row[3],
        "cap": row[4],
        "indirizzo": row[5],
        "telefono": row[6],
        "email": row[7],
        "codice_fiscale": row[8],
        "attivo": row[9],
        "operatori": operatori
    }

@router.delete("/enti/{ente_id}")
def delete_ente(
    ente_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Disattiva un ente (soft delete)
    """
    query = """
        UPDATE enti 
        SET attivo = FALSE
        WHERE id = :id
        RETURNING id, denominazione
    """
    
    result = db.execute(text(query), {"id": ente_id})
    db.commit()
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Ente non trovato")
    
    return {
        "message": "Ente disattivato con successo",
        "id": str(row[0]),
        "denominazione": row[1]
    }

@router.put("/utenti-enti/{utente_id}/{ente_id}/permessi")
def update_permessi_operatore(
    utente_id: str,
    ente_id: str,
    permessi: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Aggiorna i permessi di un operatore su un ente
    """
    import json
    
    query = """
        UPDATE utenti_enti 
        SET permessi = :permessi
        WHERE utente_id = :utente_id AND ente_id = :ente_id
        RETURNING *
    """
    
    result = db.execute(text(query), {
        "utente_id": utente_id,
        "ente_id": ente_id,
        "permessi": json.dumps(permessi)
    })
    
    db.commit()
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Abbinamento non trovato")
    
    return {"message": "Permessi aggiornati", "permessi": permessi}


@router.delete("/utenti-enti/{utente_id}/{ente_id}")
def rimuovi_operatore_da_ente(
    utente_id: str,
    ente_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Rimuove un operatore da un ente
    """
    query = """
        DELETE FROM utenti_enti 
        WHERE utente_id = :utente_id AND ente_id = :ente_id
        RETURNING id
    """
    
    result = db.execute(text(query), {
        "utente_id": utente_id,
        "ente_id": ente_id
    })
    
    db.commit()
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Abbinamento non trovato")
    
    return {"message": "Operatore rimosso dall'ente"}

# ============================================
# ENDPOINT UTENTI
# ============================================

@router.get("/utenti")
def get_utenti(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Ottiene la lista degli utenti CON gli enti abbinati
    """
    
    query_utenti = """
    SELECT id, username, email, titolo, nome, cognome, attivo, is_economo
    FROM utenti
    WHERE attivo = TRUE
    ORDER BY cognome, nome
    """
    result = db.execute(text(query_utenti))
    utenti_rows = result.fetchall()
    utenti = []
    
    for row in utenti_rows:
        utente_id = str(row[0])
        
        # Query per ottenere enti abbinati a questo utente
        query_enti = """
            SELECT 
                e.id,
                e.denominazione,
                ue.ruolo,
                ue.permessi
            FROM utenti_enti ue
            JOIN enti e ON ue.ente_id = e.id
            WHERE ue.utente_id = :utente_id
            ORDER BY e.denominazione
        """
        
        result_enti = db.execute(text(query_enti), {"utente_id": utente_id})
        enti_rows = result_enti.fetchall()
        
        enti = []
        for ente_row in enti_rows:
            enti.append({
                "id": str(ente_row[0]),
                "denominazione": ente_row[1],
                "ruolo": ente_row[2],
                "permessi": ente_row[3]
            })
        
        utenti.append({
            "id": utente_id,
            "username": row[1],
            "email": row[2],
            "titolo": row[3],
            "nome": row[4],
            "cognome": row[5],
            "attivo": row[6],
            "is_economo": row[7] if len(row) > 7 else False,
            "enti": enti
        })
    
    return utenti


@router.post("/utenti")
def create_utente(
    utente: UtenteCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un nuovo utente con password predefinita
    """
    import bcrypt
    
    # Genera password predefinita
    DEFAULT_PASSWORD = "Parrocchia2024!"
    password_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    utente_id = str(uuid.uuid4())
    
    query = """
        INSERT INTO utenti (
            id, username, email, password_hash, nome, cognome, titolo, attivo
        ) VALUES (:id, :username, :email, :password_hash, :nome, :cognome, :titolo, TRUE)
        RETURNING id, username, email, nome, cognome, titolo, attivo
    """
    
    try:
        result = db.execute(text(query), {
            "id": utente_id,
            "username": utente.username,
            "email": utente.email,
            "password_hash": password_hash,
            "nome": utente.nome,
            "cognome": utente.cognome,
            "titolo": utente.titolo
        })
        
        db.commit()
        row = result.fetchone()
        
        return {
            "id": str(row[0]),
            "username": row[1],
            "email": row[2],
            "nome": row[3],
            "cognome": row[4],
            "titolo": row[5],
            "attivo": row[6],
            "enti": [],
            "message": f"Utente creato! Password predefinita: {DEFAULT_PASSWORD}"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Errore creazione utente: {str(e)}")


@router.put("/utenti/{utente_id}")
def update_utente(
    utente_id: str,
    utente: UtenteUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Modifica un utente esistente
    """
    query = """
        UPDATE utenti 
        SET username = :username,
            email = :email,
            titolo = :titolo,
            nome = :nome,
            cognome = :cognome
        WHERE id = :id
        RETURNING id, username, email, titolo, nome, cognome, attivo
    """
    
    result = db.execute(text(query), {
        "id": utente_id,
        "username": utente.username,
        "email": utente.email,
        "titolo": utente.titolo,
        "nome": utente.nome,
        "cognome": utente.cognome
    })
    
    db.commit()
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Recupera enti abbinati
    query_enti = """
        SELECT 
            e.id,
            e.denominazione,
            ue.ruolo,
            ue.permessi
        FROM utenti_enti ue
        JOIN enti e ON ue.ente_id = e.id
        WHERE ue.utente_id = :utente_id
        ORDER BY e.denominazione
    """
    
    result_enti = db.execute(text(query_enti), {"utente_id": utente_id})
    enti_rows = result_enti.fetchall()
    
    enti = []
    for ente_row in enti_rows:
        enti.append({
            "id": str(ente_row[0]),
            "denominazione": ente_row[1],
            "ruolo": ente_row[2],
            "permessi": ente_row[3]
        })
    
    return {
        "id": str(row[0]),
        "username": row[1],
        "email": row[2],
        "titolo": row[3],
        "nome": row[4],
        "cognome": row[5],
        "attivo": row[6],
        "enti": enti
    }


@router.delete("/utenti/{utente_id}")
def delete_utente(
    utente_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Disattiva un utente (soft delete) e rimuove tutte le sue associazioni
    """
    # Prima disattiva l'utente
    query = """
        UPDATE utenti 
        SET attivo = FALSE
        WHERE id = :id
        RETURNING id, nome, cognome
    """
    
    result = db.execute(text(query), {"id": utente_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # ✅ AGGIUNGI QUESTA PARTE: Rimuovi TUTTE le associazioni utente-enti
    delete_associations = """
        DELETE FROM utenti_enti 
        WHERE utente_id = :utente_id
    """
    
    db.execute(text(delete_associations), {"utente_id": utente_id})
    
    # Commit di entrambe le operazioni
    db.commit()
    
    return {
        "message": "Utente disattivato e rimosso da tutte le parrocchie",
        "id": str(row[0]),
        "nome": row[1],
        "cognome": row[2]
    }


@router.post("/utenti/{utente_id}/reset-password")
def reset_password(
    utente_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Ripristina la password predefinita
    """
    import bcrypt
    
    DEFAULT_PASSWORD = "Parrocchia2024!"
    password_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    query = """
        UPDATE utenti 
        SET password_hash = :password_hash
        WHERE id = :id
        RETURNING id, email, nome, cognome
    """
    
    result = db.execute(text(query), {
        "id": utente_id,
        "password_hash": password_hash
    })
    
    db.commit()
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    return {
        "message": "Password ripristinata con successo",
        "password_predefinita": DEFAULT_PASSWORD,
        "utente": {
            "id": str(row[0]),
            "email": row[1],
            "nome": row[2],
            "cognome": row[3]
        }
    }
@router.post("/utenti-enti")
def create_utente_ente(
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea associazione utente-ente
    """
    import json
    
    assoc_id = str(uuid.uuid4())
    
    # Converti permessi in JSON
    permessi_json = json.dumps(data.get("permessi", {
        "anagrafica": False,
        "contabilita": False,
        "inventario": False
    }))
    
    query = """
        INSERT INTO utenti_enti (
            id, utente_id, ente_id, ruolo, permessi
        ) VALUES (:id, :utente_id, :ente_id, :ruolo, CAST(:permessi AS jsonb))
        RETURNING id
    """
    
    try:
        result = db.execute(text(query), {
            "id": assoc_id,
            "utente_id": data["utente_id"],
            "ente_id": data["ente_id"],
            "ruolo": data["ruolo"],
            "permessi": permessi_json
        })
        
        db.commit()
        
        return {
            "message": "Associazione creata con successo",
            "id": assoc_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Errore: {str(e)}")


@router.put("/utenti-enti/{utente_id}/{ente_id}")
def update_utente_ente(
    utente_id: str,
    ente_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Modifica associazione utente-ente (cambia ente o ruolo)
    """
    
    # Se cambia ente, elimina vecchia associazione e crea nuova
    if data.get("ente_id") and data["ente_id"] != ente_id:
        # Elimina vecchia
        delete_query = """
            DELETE FROM utenti_enti 
            WHERE utente_id = :utente_id AND ente_id = :old_ente_id
        """
        db.execute(text(delete_query), {
            "utente_id": utente_id,
            "old_ente_id": ente_id
        })
        
        # Crea nuova
        import json
        permessi_json = json.dumps({
            "anagrafica": False,
            "contabilita": False,
            "inventario": False
        })
        
        insert_query = """
            INSERT INTO utenti_enti (utente_id, ente_id, ruolo, permessi)
            VALUES (:utente_id, :ente_id, :ruolo, CAST(:permessi AS jsonb))
        """
        db.execute(text(insert_query), {
            "utente_id": utente_id,
            "ente_id": data["ente_id"],
            "ruolo": data.get("ruolo", "operatore"),
            "permessi": permessi_json
        })
    else:
        # Modifica solo ruolo
        update_query = """
            UPDATE utenti_enti 
            SET ruolo = :ruolo
            WHERE utente_id = :utente_id AND ente_id = :ente_id
        """
        db.execute(text(update_query), {
            "utente_id": utente_id,
            "ente_id": ente_id,
            "ruolo": data.get("ruolo", "operatore")
        })
    
    db.commit()
    
    return {"message": "Associazione aggiornata"}

# ============================================
# ENDPOINT PARROCCHIE DIOCESI
# ============================================

@router.get("/parrocchie-diocesi")
def get_parrocchie_diocesi(
    comune: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Ottiene l'elenco delle parrocchie diocesi
    """
    
    if comune:
        query = """
            SELECT id, comune, denominazione, provincia, diocesi, cap,
                   created_at, updated_at
            FROM parrocchie_diocesi 
            WHERE LOWER(comune) LIKE LOWER(:comune)
            ORDER BY comune, denominazione
        """
        result = db.execute(text(query), {"comune": f"%{comune}%"})
    else:
        query = """
            SELECT id, comune, denominazione, provincia, diocesi, cap,
                   created_at, updated_at
            FROM parrocchie_diocesi 
            ORDER BY comune, denominazione
        """
        result = db.execute(text(query))
    
    rows = result.fetchall()
    return [
        {
            "id": str(row[0]),
            "comune": row[1],
            "denominazione": row[2],
            "provincia": row[3],
            "diocesi": row[4],
            "cap": row[5],
            "created_at": row[6],
            "updated_at": row[7]
        }
        for row in rows
    ]


@router.get("/parrocchie-diocesi/{parrocchia_id}")
def get_parrocchia_diocesi_dettaglio(
    parrocchia_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Ottiene i dettagli di una parrocchia diocesi
    """
    query = """
        SELECT id, comune, denominazione, provincia, diocesi, cap,
               created_at, updated_at
        FROM parrocchie_diocesi 
        WHERE id = :id
    """
    
    result = db.execute(text(query), {"id": parrocchia_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Parrocchia diocesi non trovata")
    
    return {
        "id": str(row[0]),
        "comune": row[1],
        "denominazione": row[2],
        "provincia": row[3],
        "diocesi": row[4],
        "cap": row[5],
        "created_at": row[6],
        "updated_at": row[7]
    }


@router.post("/parrocchie-diocesi")
def create_parrocchia_diocesi(
    parrocchia: ParrocchiaDiocesiCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Aggiunge una nuova parrocchia diocesi
    """
    parrocchia_id = str(uuid.uuid4())
    
    query = """
        INSERT INTO parrocchie_diocesi (
            id, comune, denominazione, provincia, diocesi, cap
        ) VALUES (:id, :comune, :denominazione, :provincia, :diocesi, :cap)
        RETURNING *
    """
    
    result = db.execute(text(query), {
        "id": parrocchia_id,
        "comune": parrocchia.comune,
        "denominazione": parrocchia.denominazione,
        "provincia": parrocchia.provincia,
        "diocesi": parrocchia.diocesi,
        "cap": parrocchia.cap
    })
    
    db.commit()
    row = result.fetchone()
    
    return {
        "id": str(row[0]),
        "comune": row[1],
        "denominazione": row[2],
        "provincia": row[3],
        "diocesi": row[4],
        "cap": row[5],
        "created_at": row[6],
        "updated_at": row[7]
    }


@router.put("/parrocchie-diocesi/{parrocchia_id}")
def update_parrocchia_diocesi(
    parrocchia_id: str,
    parrocchia: ParrocchiaDiocesiCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Modifica una parrocchia diocesi
    """
    query = """
        UPDATE parrocchie_diocesi 
        SET comune = :comune,
            denominazione = :denominazione,
            provincia = :provincia,
            diocesi = :diocesi,
            cap = :cap,
            updated_at = NOW()
        WHERE id = :id
        RETURNING *
    """
    
    result = db.execute(text(query), {
        "id": parrocchia_id,
        "comune": parrocchia.comune,
        "denominazione": parrocchia.denominazione,
        "provincia": parrocchia.provincia,
        "diocesi": parrocchia.diocesi,
        "cap": parrocchia.cap
    })
    
    db.commit()
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Parrocchia diocesi non trovata")
    
    return {
        "id": str(row[0]),
        "comune": row[1],
        "denominazione": row[2],
        "provincia": row[3],
        "diocesi": row[4],
        "cap": row[5],
        "created_at": row[6],
        "updated_at": row[7]
    }


@router.delete("/parrocchie-diocesi/{parrocchia_id}")
def delete_parrocchia_diocesi(
    parrocchia_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina una parrocchia diocesi
    """
    query = """
        DELETE FROM parrocchie_diocesi 
        WHERE id = :id
        RETURNING id
    """
    
    result = db.execute(text(query), {"id": parrocchia_id})
    db.commit()
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Parrocchia diocesi non trovata")
    
    return {"message": "Parrocchia diocesi eliminata", "id": str(row[0])}


@router.get("/comuni-diocesi")
def get_comuni_diocesi(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Ottiene la lista dei comuni dalla diocesi
    """
    query = """
        SELECT DISTINCT comune, provincia
        FROM parrocchie_diocesi
        ORDER BY comune
    """
    
    result = db.execute(text(query))
    rows = result.fetchall()
    return [dict(row) for row in rows]