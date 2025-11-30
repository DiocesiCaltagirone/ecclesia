# ============================================
# ECCLESIA - Sistema di Permessi
# File: permissions.py
# ============================================
# Gestisce i controlli di paternità per persone e sacramenti

from typing import Optional
from uuid import UUID
import psycopg2
from psycopg2.extras import RealDictCursor
from database import get_db_connection

class PermissionError(Exception):
    """Eccezione personalizzata per errori di permessi"""
    pass


# ============================================
# PERMESSI ANAGRAFICA
# ============================================

def può_modificare_anagrafica(utente_id: str, persona_id: str) -> bool:
    """
    Verifica se un utente può modificare l'anagrafica base di una persona.
    
    Args:
        utente_id: UUID dell'utente che vuole modificare
        persona_id: UUID della persona da modificare
    
    Returns:
        bool: True se può modificare, False altrimenti
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Usa la funzione PostgreSQL che abbiamo creato
        cur.execute(
            "SELECT può_modificare_anagrafica(%s, %s)",
            (utente_id, persona_id)
        )
        
        risultato = cur.fetchone()
        return risultato[0] if risultato else False
        
    except Exception as e:
        print(f"Errore verifica permessi anagrafica: {e}")
        return False
    finally:
        if conn:
            conn.close()


def get_parrocchia_proprietaria(persona_id: str) -> Optional[dict]:
    """
    Ottiene i dati della parrocchia proprietaria di un'anagrafica.
    
    Args:
        persona_id: UUID della persona
    
    Returns:
        dict: Dati parrocchia proprietaria o None
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                e.id,
                e.denominazione,
                e.comune,
                e.diocesi_id
            FROM persone p
            JOIN enti e ON p.parrocchia_proprietaria_id = e.id
            WHERE p.id = %s
        """, (persona_id,))
        
        return dict(cur.fetchone()) if cur.rowcount > 0 else None
        
    except Exception as e:
        print(f"Errore recupero parrocchia proprietaria: {e}")
        return None
    finally:
        if conn:
            conn.close()


def verifica_permesso_anagrafica(utente_id: str, persona_id: str) -> None:
    """
    Verifica permesso e solleva eccezione se non autorizzato.
    Usare prima di modificare un'anagrafica.
    
    Args:
        utente_id: UUID dell'utente
        persona_id: UUID della persona
    
    Raises:
        PermissionError: Se l'utente non ha i permessi
    """
    if not può_modificare_anagrafica(utente_id, persona_id):
        parrocchia = get_parrocchia_proprietaria(persona_id)
        parrocchia_nome = parrocchia['denominazione'] if parrocchia else 'sconosciuta'
        
        raise PermissionError(
            f"Non hai i permessi per modificare questa anagrafica. "
            f"L'anagrafica è di proprietà della parrocchia: {parrocchia_nome}"
        )


# ============================================
# PERMESSI SACRAMENTI
# ============================================

def può_modificare_sacramento(utente_id: str, tabella: str, sacramento_id: str) -> bool:
    """
    Verifica se un utente può modificare un sacramento.
    
    Args:
        utente_id: UUID dell'utente che vuole modificare
        tabella: Nome tabella sacramento ('battesimi', 'cresime', 'matrimoni')
        sacramento_id: UUID del sacramento da modificare
    
    Returns:
        bool: True se può modificare, False altrimenti
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Usa la funzione PostgreSQL che abbiamo creato
        cur.execute(
            "SELECT può_modificare_sacramento(%s, %s, %s)",
            (utente_id, tabella, sacramento_id)
        )
        
        risultato = cur.fetchone()
        return risultato[0] if risultato else False
        
    except Exception as e:
        print(f"Errore verifica permessi sacramento: {e}")
        return False
    finally:
        if conn:
            conn.close()


def get_parrocchia_amministrante(tabella: str, sacramento_id: str) -> Optional[dict]:
    """
    Ottiene i dati della parrocchia che ha amministrato un sacramento.
    
    Args:
        tabella: Nome tabella sacramento
        sacramento_id: UUID del sacramento
    
    Returns:
        dict: Dati parrocchia amministrante o None
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query dinamica (sicura perché tabella è controllata)
        tabelle_valide = ['battesimi', 'cresime', 'matrimoni', 'prime_comunioni']
        if tabella not in tabelle_valide:
            raise ValueError(f"Tabella non valida: {tabella}")
        
        query = f"""
            SELECT 
                e.id,
                e.denominazione,
                e.comune,
                e.diocesi_id
            FROM {tabella} s
            JOIN enti e ON s.parrocchia_amministrante_id = e.id
            WHERE s.id = %s
        """
        
        cur.execute(query, (sacramento_id,))
        
        return dict(cur.fetchone()) if cur.rowcount > 0 else None
        
    except Exception as e:
        print(f"Errore recupero parrocchia amministrante: {e}")
        return None
    finally:
        if conn:
            conn.close()


def verifica_permesso_sacramento(utente_id: str, tabella: str, sacramento_id: str) -> None:
    """
    Verifica permesso sacramento e solleva eccezione se non autorizzato.
    Usare prima di modificare un sacramento.
    
    Args:
        utente_id: UUID dell'utente
        tabella: Nome tabella sacramento
        sacramento_id: UUID del sacramento
    
    Raises:
        PermissionError: Se l'utente non ha i permessi
    """
    if not può_modificare_sacramento(utente_id, tabella, sacramento_id):
        parrocchia = get_parrocchia_amministrante(tabella, sacramento_id)
        parrocchia_nome = parrocchia['denominazione'] if parrocchia else 'sconosciuta'
        
        raise PermissionError(
            f"Non hai i permessi per modificare questo {tabella[:-1]}. "
            f"Il sacramento è stato amministrato dalla parrocchia: {parrocchia_nome}"
        )


# ============================================
# PERMESSI VISIBILITÀ
# ============================================

def get_persone_visibili(parrocchia_id: str, limit: int = 100, offset: int = 0) -> list:
    """
    Ottiene l'elenco delle persone visibili per una parrocchia.
    TUTTE le persone sono visibili, ma con indicazione se modificabili.
    
    Args:
        parrocchia_id: UUID della parrocchia
        limit: Numero massimo risultati
        offset: Offset per paginazione
    
    Returns:
        list: Lista di persone con flag può_modificare
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                p.id,
                p.cognome,
                p.nome,
                p.data_nascita,
                p.luogo_nascita,
                p.comune,
                p.codice_fiscale,
                e.denominazione AS parrocchia_proprietaria,
                e.id AS parrocchia_proprietaria_id,
                (p.parrocchia_proprietaria_id = %s) AS può_modificare
            FROM persone p
            LEFT JOIN enti e ON p.parrocchia_proprietaria_id = e.id
            ORDER BY p.cognome, p.nome
            LIMIT %s OFFSET %s
        """, (parrocchia_id, limit, offset))
        
        return [dict(row) for row in cur.fetchall()]
        
    except Exception as e:
        print(f"Errore recupero persone visibili: {e}")
        return []
    finally:
        if conn:
            conn.close()


def get_persona_completa(persona_id: str, parrocchia_id: str) -> Optional[dict]:
    """
    Ottiene i dati completi di una persona con tutti i sacramenti.
    Include flag per indicare quali sacramenti sono modificabili.
    
    Args:
        persona_id: UUID della persona
        parrocchia_id: UUID della parrocchia che richiede i dati
    
    Returns:
        dict: Dati completi persona con permessi
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Usa la vista che abbiamo creato
        cur.execute("""
            SELECT * FROM v_persone_complete
            WHERE id = %s
        """, (persona_id,))
        
        persona = dict(cur.fetchone()) if cur.rowcount > 0 else None
        
        if not persona:
            return None
        
        # Aggiungi flag permessi
        persona['può_modificare_anagrafica'] = (
            persona['parrocchia_proprietaria_id'] == parrocchia_id
        )
        
        persona['può_modificare_battesimo'] = (
            persona['parrocchia_battesimo_id'] == parrocchia_id
            if persona.get('parrocchia_battesimo_id') else False
        )
        
        persona['può_modificare_cresima'] = (
            persona['parrocchia_cresima_id'] == parrocchia_id
            if persona.get('parrocchia_cresima_id') else False
        )
        
        persona['può_modificare_matrimonio'] = (
            persona['parrocchia_matrimonio_id'] == parrocchia_id
            if persona.get('parrocchia_matrimonio_id') else False
        )
        
        return persona
        
    except Exception as e:
        print(f"Errore recupero persona completa: {e}")
        return None
    finally:
        if conn:
            conn.close()


# ============================================
# UTILITÀ
# ============================================

def get_parrocchia_utente(utente_id: str) -> Optional[str]:
    """
    Ottiene l'ID della parrocchia a cui appartiene un utente.
    
    Args:
        utente_id: UUID dell'utente
    
    Returns:
        str: UUID della parrocchia o None
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT ente_id 
            FROM utenti_enti 
            WHERE utente_id = %s 
            LIMIT 1
        """, (utente_id,))
        
        risultato = cur.fetchone()
        return str(risultato[0]) if risultato else None
        
    except Exception as e:
        print(f"Errore recupero parrocchia utente: {e}")
        return None
    finally:
        if conn:
            conn.close()


def è_economo_diocesano(utente_id: str) -> bool:
    """
    Verifica se un utente è l'economo diocesano.
    L'economo ha permessi totali su tutto.
    
    Args:
        utente_id: UUID dell'utente
    
    Returns:
        bool: True se è economo, False altrimenti
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT ruolo 
            FROM utenti_enti 
            WHERE utente_id = %s 
            AND ruolo = 'economo_diocesano'
        """, (utente_id,))
        
        return cur.rowcount > 0
        
    except Exception as e:
        print(f"Errore verifica economo: {e}")
        return False
    finally:
        if conn:
            conn.close()


# ============================================
# LOG MODIFICHE
# ============================================

def log_modifica(
    utente_id: str,
    parrocchia_id: str,
    tabella: str,
    record_id: str,
    tipo_operazione: str,
    dati_precedenti: dict = None,
    dati_nuovi: dict = None,
    ip_address: str = None,
    user_agent: str = None
) -> bool:
    """
    Registra una modifica nella tabella log_modifiche.
    
    Args:
        utente_id: UUID dell'utente che ha fatto la modifica
        parrocchia_id: UUID della parrocchia
        tabella: Nome della tabella modificata
        record_id: UUID del record modificato
        tipo_operazione: 'INSERT', 'UPDATE', 'DELETE'
        dati_precedenti: Dati prima della modifica (JSON)
        dati_nuovi: Dati dopo la modifica (JSON)
        ip_address: IP dell'utente
        user_agent: User agent del browser
    
    Returns:
        bool: True se registrato correttamente
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        import json
        
        cur.execute("""
            INSERT INTO log_modifiche (
                utente_id,
                parrocchia_id,
                tabella,
                record_id,
                tipo_operazione,
                dati_precedenti,
                dati_nuovi,
                ip_address,
                user_agent
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            utente_id,
            parrocchia_id,
            tabella,
            record_id,
            tipo_operazione,
            json.dumps(dati_precedenti) if dati_precedenti else None,
            json.dumps(dati_nuovi) if dati_nuovi else None,
            ip_address,
            user_agent
        ))
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"Errore registrazione log: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()


def get_log_modifiche(
    tabella: str = None,
    record_id: str = None,
    utente_id: str = None,
    limit: int = 50
) -> list:
    """
    Recupera il log delle modifiche con filtri opzionali.
    
    Args:
        tabella: Filtra per tabella
        record_id: Filtra per record specifico
        utente_id: Filtra per utente
        limit: Numero massimo risultati
    
    Returns:
        list: Lista log modifiche
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        where_clauses = []
        params = []
        
        if tabella:
            where_clauses.append("tabella = %s")
            params.append(tabella)
        
        if record_id:
            where_clauses.append("record_id = %s")
            params.append(record_id)
        
        if utente_id:
            where_clauses.append("utente_id = %s")
            params.append(utente_id)
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        params.append(limit)
        
        query = f"""
            SELECT 
                l.*,
                u.username,
                e.denominazione AS parrocchia
            FROM log_modifiche l
            LEFT JOIN utenti u ON l.utente_id = u.id
            LEFT JOIN enti e ON l.parrocchia_id = e.id
            WHERE {where_sql}
            ORDER BY l.timestamp DESC
            LIMIT %s
        """
        
        cur.execute(query, params)
        
        return [dict(row) for row in cur.fetchall()]
        
    except Exception as e:
        print(f"Errore recupero log modifiche: {e}")
        return []
    finally:
        if conn:
            conn.close()
