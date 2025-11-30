# ============================================
# ECCLESIA - API Routes Certificati
# File: routes/certificati.py
# ============================================
# Gestisce la generazione e il download dei certificati PDF

from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import FileResponse
from typing import Dict
import permissions
import middleware
from database import get_db_connection
from psycopg2.extras import RealDictCursor
from certificati import CertificatoGenerator, genera_numero_protocollo
from datetime import datetime
import os

router = APIRouter(prefix="/api/certificati", tags=["Certificati"])

# Inizializza generatore
cert_generator = CertificatoGenerator(output_path="certificati_output")


# ============================================
# UTILITY FUNCTIONS
# ============================================

def get_dati_parrocchia(parrocchia_id: str) -> Dict:
    """Ottiene i dati completi della parrocchia per l'intestazione"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("""
        SELECT 
            e.*,
            d.denominazione AS diocesi_nome
        FROM enti e
        LEFT JOIN diocesi d ON e.diocesi_id = d.id
        WHERE e.id = %s
    """, (parrocchia_id,))
    
    parrocchia = dict(cur.fetchone()) if cur.rowcount > 0 else None
    conn.close()
    
    return parrocchia


def get_dati_battesimo_completi(battesimo_id: str) -> Dict:
    """Ottiene dati battesimo con tutte le info persona"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("""
        SELECT 
            b.*,
            p.cognome, p.nome, p.data_nascita, p.luogo_nascita,
            p.comune_nascita, p.provincia_nascita,
            padre.cognome AS padre_cognome,
            padre.nome AS padre_nome,
            madre.cognome AS madre_cognome,
            madre.nome AS madre_nome
        FROM battesimi b
        JOIN persone p ON b.persona_id = p.id
        LEFT JOIN persone padre ON p.padre_id = padre.id
        LEFT JOIN persone madre ON p.madre_id = madre.id
        WHERE b.id = %s
    """, (battesimo_id,))
    
    dati = dict(cur.fetchone()) if cur.rowcount > 0 else None
    conn.close()
    
    return dati


def registra_certificato_emesso(
    parrocchia_id: str,
    tipo_sacramento: str,
    sacramento_id: str,
    numero_protocollo: str,
    filepath: str,
    utente_id: str
) -> None:
    """Registra l'emissione del certificato nel database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        INSERT INTO certificati (
            parrocchia_id,
            tipo_sacramento,
            sacramento_id,
            numero_protocollo,
            filepath,
            data_emissione,
            emesso_da
        ) VALUES (%s, %s, %s, %s, %s, NOW(), %s)
    """, (
        parrocchia_id,
        tipo_sacramento,
        sacramento_id,
        numero_protocollo,
        filepath,
        utente_id
    ))
    
    conn.commit()
    conn.close()


# ============================================
# ROUTES - GENERAZIONE CERTIFICATI
# ============================================

@router.post("/battesimo/{battesimo_id}")
async def genera_certificato_battesimo(battesimo_id: str, request: Request):
    """
    Genera certificato di battesimo in PDF.
    Richiede che l'utente appartenga alla parrocchia amministrante.
    """
    try:
        user_id = middleware.get_current_user(request)
        parrocchia_id = middleware.get_current_parrocchia(request)
        
        # Verifica permessi
        try:
            permissions.verifica_permesso_sacramento(user_id, "battesimi", battesimo_id)
        except permissions.PermissionError as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e)
            )
        
        # Ottieni dati
        dati_battesimo = get_dati_battesimo_completi(battesimo_id)
        
        if not dati_battesimo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Battesimo non trovato"
            )
        
        dati_parrocchia = get_dati_parrocchia(parrocchia_id)
        
        # Ottieni nome parroco
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT u.nome, u.cognome
            FROM utenti u
            JOIN utenti_enti ue ON u.id = ue.utente_id
            WHERE ue.ente_id = %s AND ue.ruolo = 'parroco'
            LIMIT 1
        """, (parrocchia_id,))
        
        parroco = cur.fetchone()
        parroco_nome = f"{parroco['nome']} {parroco['cognome']}" if parroco else "Il Parroco"
        conn.close()
        
        # Genera numero protocollo
        numero_protocollo = genera_numero_protocollo(parrocchia_id, 'BAT')
        
        # Prepara dati per certificato
        dati_persona = {
            'cognome': dati_battesimo['cognome'],
            'nome': dati_battesimo['nome'],
            'data_nascita': dati_battesimo['data_nascita'].strftime('%d/%m/%Y') if dati_battesimo.get('data_nascita') else '',
            'luogo_nascita': f"{dati_battesimo.get('luogo_nascita', '')} ({dati_battesimo.get('provincia_nascita', '')})"
        }
        
        dati_bat = {
            'data_battesimo': dati_battesimo['data_battesimo'].strftime('%d/%m/%Y') if dati_battesimo.get('data_battesimo') else '',
            'volume': dati_battesimo.get('volume', ''),
            'pagina': dati_battesimo.get('pagina', ''),
            'numero_atto': dati_battesimo.get('numero_atto', ''),
            'celebrante': dati_battesimo.get('celebrante', ''),
            'padrino': dati_battesimo.get('padrino', ''),
            'madrina': dati_battesimo.get('madrina', ''),
            'note': dati_battesimo.get('note', ''),
            'padre': f"{dati_battesimo.get('padre_nome', '')} {dati_battesimo.get('padre_cognome', '')}" if dati_battesimo.get('padre_nome') else '',
            'madre': f"{dati_battesimo.get('madre_nome', '')} {dati_battesimo.get('madre_cognome', '')}" if dati_battesimo.get('madre_nome') else ''
        }
        
        # Genera PDF
        filepath = cert_generator.genera_certificato_battesimo(
            dati_persona=dati_persona,
            dati_battesimo=dati_bat,
            dati_parrocchia=dati_parrocchia,
            numero_protocollo=numero_protocollo,
            parroco_nome=parroco_nome
        )
        
        # Registra emissione
        registra_certificato_emesso(
            parrocchia_id=parrocchia_id,
            tipo_sacramento='BAT',
            sacramento_id=battesimo_id,
            numero_protocollo=numero_protocollo,
            filepath=filepath,
            utente_id=user_id
        )
        
        # Log operazione
        await middleware.log_operation(
            request,
            tabella="certificati",
            record_id=battesimo_id,
            tipo_operazione="GENERA_CERTIFICATO",
            dati_nuovi={"numero_protocollo": numero_protocollo, "tipo": "battesimo"}
        )
        
        return {
            "message": "Certificato generato con successo",
            "numero_protocollo": numero_protocollo,
            "filepath": filepath,
            "download_url": f"/api/certificati/download/{numero_protocollo}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Errore genera_certificato_battesimo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore generazione certificato: {str(e)}"
        )


@router.post("/cresima/{cresima_id}")
async def genera_certificato_cresima(cresima_id: str, request: Request):
    """Genera certificato di cresima in PDF"""
    try:
        user_id = middleware.get_current_user(request)
        parrocchia_id = middleware.get_current_parrocchia(request)
        
        # Verifica permessi
        permissions.verifica_permesso_sacramento(user_id, "cresime", cresima_id)
        
        # Ottieni dati (simile a battesimo)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                c.*,
                p.cognome, p.nome, p.data_nascita, p.luogo_nascita,
                p.comune_nascita, p.provincia_nascita
            FROM cresime c
            JOIN persone p ON c.persona_id = p.id
            WHERE c.id = %s
        """, (cresima_id,))
        
        dati_cresima = dict(cur.fetchone()) if cur.rowcount > 0 else None
        conn.close()
        
        if not dati_cresima:
            raise HTTPException(status_code=404, detail="Cresima non trovata")
        
        dati_parrocchia = get_dati_parrocchia(parrocchia_id)
        
        # Parroco
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT u.nome, u.cognome
            FROM utenti u
            JOIN utenti_enti ue ON u.id = ue.utente_id
            WHERE ue.ente_id = %s AND ue.ruolo = 'parroco'
            LIMIT 1
        """, (parrocchia_id,))
        parroco = cur.fetchone()
        parroco_nome = f"{parroco['nome']} {parroco['cognome']}" if parroco else "Il Parroco"
        conn.close()
        
        # Numero protocollo
        numero_protocollo = genera_numero_protocollo(parrocchia_id, 'CRE')
        
        # Prepara dati
        dati_persona = {
            'cognome': dati_cresima['cognome'],
            'nome': dati_cresima['nome'],
            'data_nascita': dati_cresima['data_nascita'].strftime('%d/%m/%Y') if dati_cresima.get('data_nascita') else '',
            'luogo_nascita': f"{dati_cresima.get('luogo_nascita', '')} ({dati_cresima.get('provincia_nascita', '')})"
        }
        
        dati_cre = {
            'data_cresima': dati_cresima['data_cresima'].strftime('%d/%m/%Y') if dati_cresima.get('data_cresima') else '',
            'volume': dati_cresima.get('volume', ''),
            'pagina': dati_cresima.get('pagina', ''),
            'numero_atto': dati_cresima.get('numero_atto', ''),
            'ministro': dati_cresima.get('ministro', ''),
            'padrino': dati_cresima.get('padrino', ''),
            'note': dati_cresima.get('note', '')
        }
        
        # Genera PDF
        filepath = cert_generator.genera_certificato_cresima(
            dati_persona=dati_persona,
            dati_cresima=dati_cre,
            dati_parrocchia=dati_parrocchia,
            numero_protocollo=numero_protocollo,
            parroco_nome=parroco_nome
        )
        
        # Registra
        registra_certificato_emesso(
            parrocchia_id=parrocchia_id,
            tipo_sacramento='CRE',
            sacramento_id=cresima_id,
            numero_protocollo=numero_protocollo,
            filepath=filepath,
            utente_id=user_id
        )
        
        return {
            "message": "Certificato generato con successo",
            "numero_protocollo": numero_protocollo,
            "download_url": f"/api/certificati/download/{numero_protocollo}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ROUTES - DOWNLOAD CERTIFICATI
# ============================================

@router.get("/download/{numero_protocollo}")
async def download_certificato(numero_protocollo: str, request: Request):
    """
    Download del certificato PDF.
    Solo la parrocchia che lo ha emesso può scaricarlo.
    """
    try:
        user_id = middleware.get_current_user(request)
        parrocchia_id = middleware.get_current_parrocchia(request)
        
        # Cerca certificato
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT * FROM certificati
            WHERE numero_protocollo = %s
        """, (numero_protocollo,))
        
        certificato = dict(cur.fetchone()) if cur.rowcount > 0 else None
        conn.close()
        
        if not certificato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Certificato non trovato"
            )
        
        # Verifica permessi (solo stessa parrocchia)
        if certificato['parrocchia_id'] != parrocchia_id:
            # Economo può vedere tutto
            if not permissions.è_economo_diocesano(user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Non hai i permessi per scaricare questo certificato"
                )
        
        # Verifica esistenza file
        filepath = certificato['filepath']
        
        if not os.path.exists(filepath):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File certificato non trovato sul server"
            )
        
        # Download
        filename = os.path.basename(filepath)
        
        return FileResponse(
            path=filepath,
            filename=filename,
            media_type='application/pdf'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Errore download_certificato: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore download: {str(e)}"
        )


# ============================================
# ROUTES - STORICO CERTIFICATI
# ============================================

@router.get("/storico")
async def get_storico_certificati(request: Request):
    """
    Ottiene lo storico dei certificati emessi dalla parrocchia.
    """
    try:
        user_id = middleware.get_current_user(request)
        parrocchia_id = middleware.get_current_parrocchia(request)
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                c.*,
                u.nome AS emesso_da_nome,
                u.cognome AS emesso_da_cognome
            FROM certificati c
            LEFT JOIN utenti u ON c.emesso_da = u.id
            WHERE c.parrocchia_id = %s
            ORDER BY c.data_emissione DESC
            LIMIT 100
        """, (parrocchia_id,))
        
        certificati = [dict(row) for row in cur.fetchall()]
        conn.close()
        
        return {
            "certificati": certificati,
            "totale": len(certificati)
        }
        
    except Exception as e:
        print(f"Errore get_storico_certificati: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore recupero storico: {str(e)}"
        )
