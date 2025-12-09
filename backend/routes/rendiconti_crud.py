from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime, timedelta
from typing import Optional
import sys
import os
import uuid

# Import dal progetto esistente
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection, SessionLocal
from auth import get_current_user

router = APIRouter(prefix="/api/contabilita", tags=["Rendiconti"])

# ============================================
# MODELS
# ============================================

class RendicontoCreate(BaseModel):
    periodo_inizio: date
    periodo_fine: date
    note: Optional[str] = None

class RendicontoResponse(BaseModel):
    id: str
    ente_id: str
    periodo_inizio: str
    periodo_fine: str
    stato: str
    totale_entrate: float
    totale_uscite: float
    saldo: float
    note: Optional[str]
    data_invio: Optional[str]
    data_approvazione: Optional[str]
    data_respingimento: Optional[str]
    motivo_respingimento: Optional[str]
    created_at: str
    num_documenti: int

# ============================================
# CREA RENDICONTO (stato: bozza)
# ============================================

@router.post("/rendiconti", response_model=dict)
async def crea_rendiconto(
    dati: RendicontoCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un nuovo rendiconto in stato 'bozza'
    🆕 BLOCCA movimenti, CREA saldi iniziali, GENERA PDF
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Recupera ente_id dell'utente
        cur.execute("""
            SELECT ente_id FROM utenti_enti 
            WHERE utente_id = %s
            LIMIT 1
        """, (current_user['user_id'],))
        
        ente = cur.fetchone()
        if not ente:
            raise HTTPException(status_code=403, detail="Utente non associato a nessun ente")
        
        ente_id = ente[0]
        
        # Verifica che non esista già un rendiconto in bozza
        cur.execute("""
            SELECT id, stato FROM rendiconti
            WHERE ente_id = %s 
              AND stato = 'parrocchia'
        """, (ente_id,))
        
        existing = cur.fetchone()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Esiste già un rendiconto attivo. Eliminalo o invialo prima di crearne uno nuovo."
            )
        
        # Verifica sovrapposizione periodi
        cur.execute("""
            SELECT id FROM rendiconti
            WHERE ente_id = %s 
              AND stato != 'bozza'
              AND (
                  (periodo_inizio <= %s AND periodo_fine >= %s)
                  OR (periodo_inizio <= %s AND periodo_fine >= %s)
                  OR (periodo_inizio >= %s AND periodo_fine <= %s)
              )
        """, (ente_id, dati.periodo_inizio, dati.periodo_inizio,
              dati.periodo_fine, dati.periodo_fine,
              dati.periodo_inizio, dati.periodo_fine))
        
        if cur.fetchone():
            raise HTTPException(
                status_code=400,
                detail="Esiste già un rendiconto per un periodo sovrapposto"
            )
        
        # Calcola totali del periodo (escludi saldi iniziali e giroconti)
        cur.execute("""
            SELECT 
                COALESCE(SUM(CASE WHEN tipo_movimento = 'entrata' THEN importo ELSE 0 END), 0) as totale_entrate,
                COALESCE(SUM(CASE WHEN tipo_movimento = 'uscita' THEN importo ELSE 0 END), 0) as totale_uscite
            FROM movimenti_contabili
            WHERE ente_id = %s
              AND data_movimento >= %s
              AND data_movimento <= %s
              AND (tipo_speciale IS NULL OR tipo_speciale NOT IN ('saldo_iniziale', 'giroconto'))
        """, (ente_id, dati.periodo_inizio, dati.periodo_fine))
        
        totali = cur.fetchone()
        totale_entrate = float(totali[0]) if totali[0] else 0.0
        totale_uscite = float(totali[1]) if totali[1] else 0.0
        saldo = totale_entrate - totale_uscite
        
        # Prima di creare: rendi DEFINITIVO l'ultimo rendiconto 'parrocchia' precedente
        cur.execute("""
            UPDATE rendiconti 
            SET stato = 'definitivo'
            WHERE ente_id = %s 
              AND stato = 'parrocchia'
              AND periodo_fine < %s
        """, (ente_id, dati.periodo_inizio))
        
        resi_definitivi = cur.rowcount
        if resi_definitivi > 0:
            print(f"📌 Resi DEFINITIVI {resi_definitivi} rendiconti precedenti")
        
        # Crea il rendiconto in stato PARROCCHIA
        cur.execute("""
           INSERT INTO rendiconti 
           (ente_id, periodo_inizio, periodo_fine, totale_entrate, totale_uscite, saldo, stato)
           VALUES (%s, %s, %s, %s, %s, %s, 'parrocchia')
            RETURNING id, updated_at
        """, (
            ente_id,
            dati.periodo_inizio,
            dati.periodo_fine,
            totale_entrate,
            totale_uscite,
            saldo,
        ))
        
        new_rendiconto = cur.fetchone()
        rendiconto_id = str(new_rendiconto[0])
        
        # 🆕 BLOCCA MOVIMENTI DEL PERIODO
        print(f"🔒 Blocco movimenti periodo {dati.periodo_inizio} - {dati.periodo_fine}")
        cur.execute("""
            UPDATE movimenti_contabili
            SET bloccato = TRUE, rendiconto_id = %s
            WHERE ente_id = %s
              AND data_movimento BETWEEN %s AND %s
              AND tipo_speciale IS NULL
        """, (
            rendiconto_id,
            ente_id,
            dati.periodo_inizio,
            dati.periodo_fine
        ))
        
        movimenti_bloccati = cur.rowcount
        print(f"✅ Bloccati {movimenti_bloccati} movimenti")
        
        # COMMIT dopo blocco movimenti
        conn.commit()

        # 🆕 CREA SALDI INIZIALI (con psycopg2!)
        print(f"💰 Creazione saldi iniziali automatici...")
        
        try:
            # Data saldo iniziale = STESSA data di fine periodo
            # Es: periodo 01/01/2025 - 24/02/2026 → saldo iniziale 24/02/2026
            data_inizio_nuovo = dati.periodo_fine + timedelta(days=1)
            print(f"📅 Data saldi iniziali: {data_inizio_nuovo}")
            
            # Trova categoria "Riporto da bilancio precedente"
            cur.execute("""
                SELECT id FROM piano_conti 
                WHERE ente_id = %s 
                AND (descrizione = 'SALDO DA ESERCIZIO PRECEDENTE' 
                     OR descrizione = 'Riporto da bilancio precedente'
                     OR codice = '000')
                LIMIT 1
            """, (ente_id,))
            
            categoria_result = cur.fetchone()
            
            if not categoria_result:
                print(f"⚠️ Categoria saldi iniziali non trovata")
            else:
                categoria_id = categoria_result[0]
                
                # 🆕 Trova TUTTI i conti attivi (anche senza movimenti)
                cur.execute("""
                    SELECT id, nome
                    FROM registri_contabili
                    WHERE ente_id = %s
                      AND attivo = TRUE
                """, (ente_id,))
                
                conti = cur.fetchall()
                print(f"📊 Trovati {len(conti)} conti totali")
                
                # Per ogni conto, calcola saldo e crea movimento iniziale
                for conto in conti:
                    registro_id = conto[0]
                    nome_conto = conto[1]
                    
                    # Calcola SALDO FINALE del conto nel periodo
                    cur.execute("""
                        SELECT 
                            COALESCE(SUM(
                                CASE 
                                    WHEN tipo_movimento = 'entrata' THEN importo 
                                    ELSE -importo 
                                END
                            ), 0) as saldo
                        FROM movimenti_contabili
                        WHERE ente_id = %s
                          AND registro_id = %s
                          AND data_movimento BETWEEN %s AND %s
                          AND (tipo_speciale IS NULL OR tipo_speciale = 'saldo_iniziale')
                    """, (ente_id, registro_id, dati.periodo_inizio, dati.periodo_fine))
                    
                    saldo = cur.fetchone()[0]
                    
                    print(f"   💰 Conto {nome_conto}: saldo {saldo}")
                    
                    # 🆕 Crea movimento ANCHE se saldo = 0!
                    movimento_id = str(uuid.uuid4())
                    
                    cur.execute("""
                        INSERT INTO movimenti_contabili (
                            id, ente_id, registro_id, categoria_id,
                            data_movimento, tipo_movimento, importo,
                            causale, note,
                            tipo_speciale, riporto_saldo, bloccato
                        )
                        VALUES (
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s,
                            'saldo_iniziale', TRUE, FALSE
                        )
                    """, (
                        movimento_id,
                        ente_id,
                        registro_id,
                        categoria_id,
                        data_inizio_nuovo,
                        "entrata" if saldo >= 0 else "uscita",
                        abs(saldo) if saldo != 0 else 0,
                        "Saldo iniziale",
                        f"Riporto automatico da rendiconto {rendiconto_id}"
                    ))
                
                # Commit dopo creazione saldi
                conn.commit()
                print(f"✅ Saldi iniziali creati per tutti i conti")
                
        except Exception as e:
            print(f"⚠️ Errore creazione saldi iniziali: {e}")
            import traceback
            traceback.print_exc()
        
        # 🆕 GENERA PDF
        print(f"📄 Generazione PDF rendiconto...")
        pdf_path = None
        try:
            from routes.rendiconti_documenti import genera_pdf_rendiconto
            pdf_path = await genera_pdf_rendiconto(rendiconto_id, ente_id)
            
            # Salva path PDF nel rendiconto
            cur.execute("""
                UPDATE rendiconti 
                SET pdf_path = %s 
                WHERE id = %s
            """, (pdf_path, rendiconto_id))
            
            conn.commit()
            print(f"✅ PDF generato: {pdf_path}")
        except Exception as e:
            print(f"⚠️ Errore generazione PDF: {e}")
        
        
        return {
            "id": rendiconto_id,
            "ente_id": str(ente_id),
            "periodo_inizio": str(dati.periodo_inizio),
            "periodo_fine": str(dati.periodo_fine),
            "stato": "parrocchia",
            "totale_entrate": float(totale_entrate),
            "totale_uscite": float(totale_uscite),
            "saldo": float(saldo),
            "note": dati.note,
            "osservazioni_economo": None,
            "documenti_esonero": False,
            "data_invio": None,
            "data_revisione": None,
            "created_at": new_rendiconto[1].isoformat(),
            "num_documenti": 0,
            "movimenti_bloccati": movimenti_bloccati,
            "pdf_path": pdf_path,
            "message": "Rendiconto creato in bozza. Movimenti del periodo bloccati."
        }
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Errore creazione rendiconto: {str(e)}")
    finally:
        cur.close()
        conn.close()


# ============================================
# GET RENDICONTI (con filtro stato)
# ============================================

@router.get("/rendiconti")
async def get_rendiconti(
    stato: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Recupera tutti i rendiconti dell'ente
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            SELECT 
                r.id,
                r.ente_id,
                r.periodo_inizio,
                r.periodo_fine,
                r.stato,
                r.totale_entrate,
                r.totale_uscite,
                r.saldo,
                r.osservazioni_economo,
                r.documenti_esonero,
                r.data_invio,
                r.data_revisione,
                r.updated_at,
                (SELECT COUNT(*) FROM rendiconti_documenti WHERE rendiconto_id = r.id) as num_documenti
            FROM rendiconti r
            JOIN utenti_enti ue ON r.ente_id = ue.ente_id
            WHERE ue.utente_id = %s
        """
        
        params = [current_user['user_id']]
        
        if stato:
            query += " AND r.stato = %s"
            params.append(stato)
        
        query += " ORDER BY r.updated_at DESC"
        
        cur.execute(query, params)
        rows = cur.fetchall()
        
        rendiconti = []
        for row in rows:
            rendiconti.append({
                "id": str(row[0]),
                "ente_id": str(row[1]),
                "periodo_inizio": str(row[2]),
                "periodo_fine": str(row[3]),
                "stato": row[4],
                "totale_entrate": float(row[5]) if row[5] else 0.0,
                "totale_uscite": float(row[6]) if row[6] else 0.0,
                "saldo": float(row[7]) if row[7] else 0.0,
                "osservazioni_economo": row[8],
                "documenti_esonero": row[9] if row[9] else False,
                "data_invio": row[10].isoformat() if row[10] else None,
                "data_revisione": row[11].isoformat() if row[11] else None,
                "created_at": row[12].isoformat() if row[12] else None,
                "num_documenti": row[13]
            })
        
        return {"rendiconti": rendiconti}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore recupero rendiconti: {str(e)}")
    finally:
        cur.close()
        conn.close()


# ============================================
# GET RENDICONTO SINGOLO
# ============================================

@router.get("/rendiconti/{rendiconto_id}")
async def get_rendiconto(
    rendiconto_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Recupera dettagli di un singolo rendiconto
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                r.id,
                r.ente_id,
                r.periodo_inizio,
                r.periodo_fine,
                r.stato,
                r.totale_entrate,
                r.totale_uscite,
                r.saldo,
                r.osservazioni_economo,
                r.documenti_esonero,
                r.data_invio,
                r.data_revisione,
                r.data_respingimento,
                r.motivo_respingimento,
                r.updated_at
            FROM rendiconti r
            JOIN utenti_enti ue ON r.ente_id = ue.ente_id
            WHERE r.id = %s AND ue.utente_id = %s
        """, (str(rendiconto_id), current_user['user_id']))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        return {
            "id": str(row[0]),
            "ente_id": str(row[1]),
            "periodo_inizio": str(row[2]),
            "periodo_fine": str(row[3]),
            "stato": row[4],
            "totale_entrate": float(row[5]) if row[5] else 0.0,
            "totale_uscite": float(row[6]) if row[6] else 0.0,
            "saldo": float(row[7]) if row[7] else 0.0,
            "osservazioni_economo": row[8],
            "documenti_esonero": row[9] if row[9] else False,
            "data_invio": row[10].isoformat() if row[10] else None,
            "data_revisione": row[11].isoformat() if row[11] else None,
            "data_respingimento": row[12].isoformat() if row[12] else None,
            "motivo_respingimento": row[13],
            "created_at": row[14].isoformat() if row[14] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")
    finally:
        cur.close()
        conn.close()


# ============================================
# ELIMINA RENDICONTO (solo bozza o respinto)
# ============================================

@router.delete("/rendiconti/{rendiconto_id}")
async def elimina_rendiconto(
    rendiconto_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina un rendiconto (solo se in stato 'bozza' o 'respinto')
    🆕 SBLOCCA movimenti e ELIMINA saldi iniziali
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verifica che il rendiconto esista
        cur.execute("""
            SELECT r.id, r.stato, r.ente_id
            FROM rendiconti r
            JOIN utenti_enti ue ON r.ente_id = ue.ente_id
            WHERE r.id = %s AND ue.utente_id = %s
        """, (str(rendiconto_id), current_user['user_id']))
        
        rendiconto = cur.fetchone()
        if not rendiconto:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        stato = rendiconto[1]
        ente_id = rendiconto[2]
        
        # Verifica che sia eliminabile (solo parrocchia o respinto)
        if stato not in ['parrocchia', 'respinto']:
            raise HTTPException(
                status_code=403,
                detail=f"Impossibile eliminare un rendiconto in stato: {stato}. Solo i rendiconti in stato 'parrocchia' o 'respinto' possono essere eliminati."
            )
        
        # 🆕 SBLOCCA MOVIMENTI
        print(f"🔓 Sblocco movimenti del rendiconto {rendiconto_id}")
        cur.execute("""
            UPDATE movimenti_contabili
            SET bloccato = FALSE, rendiconto_id = NULL
            WHERE rendiconto_id = %s
        """, (str(rendiconto_id),))
        
        movimenti_sbloccati = cur.rowcount
        print(f"✅ Sbloccati {movimenti_sbloccati} movimenti")
        
        # 🆕 ELIMINA SALDI INIZIALI
        print(f"🗑️ Eliminazione saldi iniziali del rendiconto {rendiconto_id}")
        cur.execute("""
            DELETE FROM movimenti_contabili
            WHERE ente_id = %s
              AND tipo_speciale = 'saldo_iniziale'
              AND riporto_saldo = TRUE
        """, (str(ente_id),))
        
        saldi_eliminati = cur.rowcount
        print(f"✅ Eliminati {saldi_eliminati} saldi iniziali")
        
        # Elimina documenti fisici
        cur.execute("""
            SELECT path_storage FROM rendiconti_documenti
            WHERE rendiconto_id = %s
        """, (str(rendiconto_id),))
        
        documenti = cur.fetchall()
        for doc in documenti:
            if os.path.exists(doc[0]):
                os.remove(doc[0])
        
        # Elimina il rendiconto (CASCADE elimina documenti dal DB)
        cur.execute("DELETE FROM rendiconti WHERE id = %s", (str(rendiconto_id),))
        conn.commit()
        
        return {
            "message": f"Rendiconto eliminato con successo",
            "stato_precedente": stato,
            "movimenti_sbloccati": movimenti_sbloccati,
            "saldi_eliminati": saldi_eliminati
        }
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Errore eliminazione: {str(e)}")
    finally:
        cur.close()
        conn.close()

# ============================================
# ENDPOINT ECONOMO DIOCESANO
# ============================================

@router.get("/economo/rendiconti")
async def get_rendiconti_economo(
    stato: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Recupera tutti i rendiconti inviati alla diocesi (per Economo)
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verifica che l'utente sia economo
        cur.execute("""
            SELECT ruolo FROM utenti_enti 
            WHERE utente_id = %s AND ruolo = 'economo'
            LIMIT 1
        """, (current_user['user_id'],))
        
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Accesso riservato all'Economo Diocesano")
        
        query = """
            SELECT 
                r.id,
                r.ente_id,
                e.denominazione as nome_ente,
                r.periodo_inizio,
                r.periodo_fine,
                r.stato,
                r.totale_entrate,
                r.totale_uscite,
                r.saldo,
                r.data_invio,
                r.motivo_respingimento,
                r.data_respingimento,
                r.updated_at,
                (SELECT COUNT(*) FROM rendiconti_documenti WHERE rendiconto_id = r.id) as num_documenti
            FROM rendiconti r
            JOIN enti e ON r.ente_id = e.id
            WHERE r.stato IN ('inviato', 'approvato', 'respinto')
        """
        
        params = []
        
        if stato:
            query += " AND r.stato = %s"
            params.append(stato)
        
        query += " ORDER BY r.data_invio DESC"
        
        cur.execute(query, params)
        rows = cur.fetchall()
        
        rendiconti = []
        for row in rows:
            rendiconti.append({
                "id": str(row[0]),
                "ente_id": str(row[1]),
                "nome_ente": row[2],
                "periodo_inizio": str(row[3]),
                "periodo_fine": str(row[4]),
                "stato": row[5],
                "totale_entrate": float(row[6]) if row[6] else 0.0,
                "totale_uscite": float(row[7]) if row[7] else 0.0,
                "saldo": float(row[8]) if row[8] else 0.0,
                "data_invio": row[9].isoformat() if row[9] else None,
                "motivo_respingimento": row[10],
                "data_respingimento": row[11].isoformat() if row[11] else None,
                "updated_at": row[12].isoformat() if row[12] else None,
                "num_documenti": row[13]
            })
        
        return {"rendiconti": rendiconti}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/economo/rendiconti/{rendiconto_id}/approva")
async def approva_rendiconto(
    rendiconto_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Economo approva un rendiconto inviato → diventa DEFINITIVO
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verifica che l'utente sia economo
        cur.execute("""
            SELECT ruolo FROM utenti_enti 
            WHERE utente_id = %s AND ruolo = 'economo'
            LIMIT 1
        """, (current_user['user_id'],))
        
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Accesso riservato all'Economo Diocesano")
        
        # Verifica che il rendiconto esista e sia in stato 'inviato'
        cur.execute("""
            SELECT id, stato, ente_id FROM rendiconti
            WHERE id = %s
        """, (str(rendiconto_id),))
        
        rendiconto = cur.fetchone()
        if not rendiconto:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        if rendiconto[1] != 'inviato':
            raise HTTPException(
                status_code=400, 
                detail=f"Solo i rendiconti in stato 'inviato' possono essere approvati. Stato attuale: {rendiconto[1]}"
            )
        
        # Approva il rendiconto
        cur.execute("""
            UPDATE rendiconti 
            SET stato = 'approvato',
                data_revisione = NOW(),
                updated_at = NOW()
            WHERE id = %s
        """, (str(rendiconto_id),))
        
        conn.commit()
        
        return {
            "message": "Rendiconto approvato con successo",
            "id": str(rendiconto_id),
            "nuovo_stato": "approvato"
        }
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/economo/rendiconti/{rendiconto_id}/respingi")
async def respingi_rendiconto(
    rendiconto_id: UUID,
    motivazione: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Economo respinge un rendiconto inviato → torna a PARROCCHIA
    I movimenti restano BLOCCATI (si sbloccano solo se il parroco elimina)
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verifica che l'utente sia economo
        cur.execute("""
            SELECT ruolo FROM utenti_enti 
            WHERE utente_id = %s AND ruolo = 'economo'
            LIMIT 1
        """, (current_user['user_id'],))
        
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Accesso riservato all'Economo Diocesano")
        
        # Verifica che il rendiconto esista e sia in stato 'inviato'
        cur.execute("""
            SELECT id, stato, ente_id FROM rendiconti
            WHERE id = %s
        """, (str(rendiconto_id),))
        
        rendiconto = cur.fetchone()
        if not rendiconto:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        if rendiconto[1] != 'inviato':
            raise HTTPException(
                status_code=400, 
                detail=f"Solo i rendiconti in stato 'inviato' possono essere respinti. Stato attuale: {rendiconto[1]}"
            )
        
        # Respingi il rendiconto (movimenti restano bloccati!)
        cur.execute("""
            UPDATE rendiconti 
            SET stato = 'respinto',
                motivo_respingimento = %s,
                data_respingimento = NOW(),
                respinto_da = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (motivazione, current_user['user_id'], str(rendiconto_id)))
        
        conn.commit()
        
        return {
            "message": "Rendiconto respinto. Il parroco può eliminarlo per sbloccare i movimenti e correggere.",
            "id": str(rendiconto_id),
            "nuovo_stato": "respinto"
        }
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")
    finally:
        cur.close()
        conn.close()        