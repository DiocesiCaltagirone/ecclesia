# ============================================
# ECCLESIA - API Routes Persone
# File: routes/persone.py
# ============================================
# Gestisce tutte le operazioni CRUD sulle persone con controllo permessi

from fastapi import APIRouter, Request, HTTPException, status, Query
from typing import List, Optional
from pydantic import BaseModel, validator
from datetime import date
import permissions
import middleware
from database import get_db_connection
from psycopg2.extras import RealDictCursor
import uuid

router = APIRouter(prefix="/api/persone", tags=["Persone"])


# ============================================
# MODELS (Pydantic)
# ============================================

class PersonaCreate(BaseModel):
    """Dati per creare una nuova persona"""
    cognome: str
    nome: str
    secondo_nome: Optional[str] = None
    sesso: Optional[str] = None
    data_nascita: Optional[date] = None
    luogo_nascita: Optional[str] = None
    comune_nascita: Optional[str] = None
    provincia_nascita: Optional[str] = None
    cittadinanza: Optional[str] = "Italiana"
    codice_fiscale: Optional[str] = None
    
    # Residenza
    indirizzo: Optional[str] = None
    frazione: Optional[str] = None
    cap: Optional[str] = None
    comune: Optional[str] = None
    provincia: Optional[str] = None
    residente: Optional[bool] = True
    
    # Contatti
    telefono: Optional[str] = None
    cellulare: Optional[str] = None
    email: Optional[str] = None
    
    # Dati parrocchiali
    stato_civile: Optional[str] = None
    professione: Optional[str] = None
    titolo_studio: Optional[str] = None
    
    @validator('sesso')
    def valida_sesso(cls, v):
        if v and v not in ['M', 'F']:
            raise ValueError('Il sesso deve essere M o F')
        return v


class PersonaUpdate(BaseModel):
    """Dati per aggiornare una persona (tutti opzionali)"""
    cognome: Optional[str] = None
    nome: Optional[str] = None
    secondo_nome: Optional[str] = None
    sesso: Optional[str] = None
    data_nascita: Optional[date] = None
    luogo_nascita: Optional[str] = None
    comune_nascita: Optional[str] = None
    provincia_nascita: Optional[str] = None
    cittadinanza: Optional[str] = None
    codice_fiscale: Optional[str] = None
    
    indirizzo: Optional[str] = None
    frazione: Optional[str] = None
    cap: Optional[str] = None
    comune: Optional[str] = None
    provincia: Optional[str] = None
    residente: Optional[bool] = None
    
    telefono: Optional[str] = None
    cellulare: Optional[str] = None
    email: Optional[str] = None
    
    stato_civile: Optional[str] = None
    professione: Optional[str] = None
    titolo_studio: Optional[str] = None
    
    vivente: Optional[bool] = None
    data_morte: Optional[date] = None


class PersonaResponse(BaseModel):
    """Risposta con i dati di una persona"""
    id: str
    cognome: str
    nome: str
    data_nascita: Optional[date]
    comune: Optional[str]
    codice_fiscale: Optional[str]
    parrocchia_proprietaria: Optional[str]
    può_modificare: bool


# ============================================
# ROUTES - LETTURA
# ============================================

@router.get("/", response_model=List[PersonaResponse])
async def get_persone(
    request: Request,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None
):
    """
    Ottiene l'elenco delle persone visibili.
    TUTTE le persone sono visibili con indicazione se modificabili.
    """
    try:
        user_id = middleware.get_current_user(request)
        parrocchia_id = middleware.get_current_parrocchia(request)
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query base
        query = """
            SELECT 
                p.id,
                p.cognome,
                p.nome,
                p.data_nascita,
                p.comune,
                p.codice_fiscale,
                e.denominazione AS parrocchia_proprietaria,
                (p.parrocchia_proprietaria_id = %s) AS può_modificare
            FROM persone p
            LEFT JOIN enti e ON p.parrocchia_proprietaria_id = e.id
        """
        
        params = [parrocchia_id]
        
        # Filtro ricerca
        if search:
            query += """
                WHERE (
                    p.cognome ILIKE %s OR 
                    p.nome ILIKE %s OR 
                    p.codice_fiscale ILIKE %s
                )
            """
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        query += " ORDER BY p.cognome, p.nome LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cur.execute(query, params)
        
        persone = [dict(row) for row in cur.fetchall()]
        
        conn.close()
        
        return persone
        
    except Exception as e:
        print(f"Errore get_persone: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore recupero persone: {str(e)}"
        )


@router.get("/{persona_id}")
async def get_persona(persona_id: str, request: Request):
    """
    Ottiene i dati completi di una persona con tutti i sacramenti.
    Include flag per indicare quali dati sono modificabili.
    """
    try:
        user_id = middleware.get_current_user(request)
        parrocchia_id = middleware.get_current_parrocchia(request)
        
        # Usa la funzione che abbiamo creato
        persona = permissions.get_persona_completa(persona_id, parrocchia_id)
        
        if not persona:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persona non trovata"
            )
        
        return persona
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Errore get_persona: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore recupero persona: {str(e)}"
        )


# ============================================
# ROUTES - CREAZIONE
# ============================================

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_persona(persona: PersonaCreate, request: Request):
    """
    Crea una nuova persona.
    La parrocchia_proprietaria_id viene impostata automaticamente.
    """
    try:
        user_id = middleware.get_current_user(request)
        parrocchia_id = middleware.get_current_parrocchia(request)
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Genera UUID
        persona_id = str(uuid.uuid4())
        
        # Insert con parrocchia proprietaria automatica
        cur.execute("""
            INSERT INTO persone (
                id,
                ente_id,
                cognome,
                nome,
                secondo_nome,
                sesso,
                data_nascita,
                luogo_nascita,
                comune_nascita,
                provincia_nascita,
                cittadinanza,
                codice_fiscale,
                indirizzo,
                frazione,
                cap,
                comune,
                provincia,
                residente,
                telefono,
                cellulare,
                email,
                stato_civile,
                professione,
                titolo_studio,
                parrocchia_proprietaria_id,
                created_by
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s
            )
            RETURNING *
        """, (
            persona_id,
            parrocchia_id,
            persona.cognome,
            persona.nome,
            persona.secondo_nome,
            persona.sesso,
            persona.data_nascita,
            persona.luogo_nascita,
            persona.comune_nascita,
            persona.provincia_nascita,
            persona.cittadinanza,
            persona.codice_fiscale,
            persona.indirizzo,
            persona.frazione,
            persona.cap,
            persona.comune,
            persona.provincia,
            persona.residente,
            persona.telefono,
            persona.cellulare,
            persona.email,
            persona.stato_civile,
            persona.professione,
            persona.titolo_studio,
            parrocchia_id,  # parrocchia_proprietaria_id
            user_id
        ))
        
        nuova_persona = dict(cur.fetchone())
        conn.commit()
        
        # Log operazione
        await middleware.log_operation(
            request,
            tabella="persone",
            record_id=persona_id,
            tipo_operazione="INSERT",
            dati_nuovi=dict(persona)
        )
        
        conn.close()
        
        return {
            "message": "Persona creata con successo",
            "id": persona_id,
            "persona": nuova_persona
        }
        
    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        print(f"Errore create_persona: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore creazione persona: {str(e)}"
        )


# ============================================
# ROUTES - MODIFICA
# ============================================

@router.put("/{persona_id}")
async def update_persona(persona_id: str, persona: PersonaUpdate, request: Request):
    """
    Aggiorna i dati di una persona.
    SOLO la parrocchia proprietaria può modificare l'anagrafica base.
    """
    try:
        user_id = middleware.get_current_user(request)
        
        # VERIFICA PERMESSI
        try:
            permissions.verifica_permesso_anagrafica(user_id, persona_id)
        except permissions.PermissionError as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e)
            )
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Recupera dati precedenti per log
        cur.execute("SELECT * FROM persone WHERE id = %s", (persona_id,))
        dati_precedenti = dict(cur.fetchone())
        
        # Costruisci query dinamica solo con campi forniti
        update_fields = []
        params = []
        
        for field, value in persona.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nessun campo da aggiornare"
            )
        
        # Aggiungi updated_at
        update_fields.append("updated_at = NOW()")
        
        params.append(persona_id)
        
        query = f"""
            UPDATE persone 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING *
        """
        
        cur.execute(query, params)
        persona_aggiornata = dict(cur.fetchone())
        
        conn.commit()
        
        # Log operazione
        await middleware.log_operation(
            request,
            tabella="persone",
            record_id=persona_id,
            tipo_operazione="UPDATE",
            dati_precedenti=dati_precedenti,
            dati_nuovi=dict(persona.dict(exclude_unset=True))
        )
        
        conn.close()
        
        return {
            "message": "Persona aggiornata con successo",
            "persona": persona_aggiornata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        print(f"Errore update_persona: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore aggiornamento persona: {str(e)}"
        )


# ============================================
# ROUTES - CANCELLAZIONE
# ============================================

@router.delete("/{persona_id}")
async def delete_persona(persona_id: str, request: Request):
    """
    Cancella una persona.
    SOLO la parrocchia proprietaria può cancellare.
    """
    try:
        user_id = middleware.get_current_user(request)
        
        # VERIFICA PERMESSI
        try:
            permissions.verifica_permesso_anagrafica(user_id, persona_id)
        except permissions.PermissionError as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e)
            )
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Recupera dati per log
        cur.execute("SELECT * FROM persone WHERE id = %s", (persona_id,))
        dati_cancellati = dict(cur.fetchone())
        
        if not dati_cancellati:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persona non trovata"
            )
        
        # Cancella (CASCADE cancellerà anche i sacramenti)
        cur.execute("DELETE FROM persone WHERE id = %s", (persona_id,))
        
        conn.commit()
        
        # Log operazione
        await middleware.log_operation(
            request,
            tabella="persone",
            record_id=persona_id,
            tipo_operazione="DELETE",
            dati_precedenti=dati_cancellati
        )
        
        conn.close()
        
        return {
            "message": "Persona cancellata con successo"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        print(f"Errore delete_persona: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore cancellazione persona: {str(e)}"
        )


# ============================================
# ROUTES - RICERCA AVANZATA
# ============================================

@router.get("/ricerca/avanzata")
async def ricerca_avanzata(
    request: Request,
    cognome: Optional[str] = None,
    nome: Optional[str] = None,
    data_nascita: Optional[date] = None,
    comune: Optional[str] = None,
    codice_fiscale: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Ricerca avanzata persone con filtri multipli.
    """
    try:
        user_id = middleware.get_current_user(request)
        parrocchia_id = middleware.get_current_parrocchia(request)
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        where_clauses = []
        params = []
        
        if cognome:
            where_clauses.append("p.cognome ILIKE %s")
            params.append(f"%{cognome}%")
        
        if nome:
            where_clauses.append("p.nome ILIKE %s")
            params.append(f"%{nome}%")
        
        if data_nascita:
            where_clauses.append("p.data_nascita = %s")
            params.append(data_nascita)
        
        if comune:
            where_clauses.append("p.comune ILIKE %s")
            params.append(f"%{comune}%")
        
        if codice_fiscale:
            where_clauses.append("p.codice_fiscale ILIKE %s")
            params.append(f"%{codice_fiscale}%")
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        query = f"""
            SELECT 
                p.id,
                p.cognome,
                p.nome,
                p.data_nascita,
                p.comune,
                p.codice_fiscale,
                e.denominazione AS parrocchia_proprietaria,
                (p.parrocchia_proprietaria_id = %s) AS può_modificare
            FROM persone p
            LEFT JOIN enti e ON p.parrocchia_proprietaria_id = e.id
            WHERE {where_sql}
            ORDER BY p.cognome, p.nome
            LIMIT %s
        """
        
        params.insert(0, parrocchia_id)
        params.append(limit)
        
        cur.execute(query, params)
        
        risultati = [dict(row) for row in cur.fetchall()]
        
        conn.close()
        
        return {
            "total": len(risultati),
            "risultati": risultati
        }
        
    except Exception as e:
        print(f"Errore ricerca_avanzata: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore ricerca: {str(e)}"
        )
