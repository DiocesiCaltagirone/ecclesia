from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from uuid import UUID
import os
import shutil
from datetime import datetime
from pathlib import Path
import sys
# Aggiungi questi import
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from pathlib import Path
from datetime import datetime

# Import dal progetto esistente
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection
from auth import get_current_user

router = APIRouter(prefix="/api/contabilita", tags=["Rendiconti Documenti"])

# Directory per salvare i file
UPLOAD_DIR = Path("uploads/rendiconti_documenti")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

TIPI_DOCUMENTO_AMMESSI = [
    "verbale_caep",
    "estratto_bancario",
    "imu_tari",
    "fornitura_idrica",
    "agenzia_entrate",
    "altro"  # documento opzionale
]

# ============================================
# UPLOAD DOCUMENTO RENDICONTO
# ============================================

@router.post("/rendiconti/{rendiconto_id}/documenti")
async def upload_documento_rendiconto(
    rendiconto_id: UUID,
    tipo_documento: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload di un documento per il rendiconto (solo se in stato 'bozza')
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verifica tipo documento
        if tipo_documento not in TIPI_DOCUMENTO_AMMESSI:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo documento non valido. Ammessi: {', '.join(TIPI_DOCUMENTO_AMMESSI)}"
            )
        
        # Verifica che il rendiconto esista e sia in bozza
        cur.execute("""
            SELECT r.id, r.stato, r.ente_id
            FROM rendiconti r
            WHERE r.id = %s
        """, (str(rendiconto_id),))
        
        rendiconto = cur.fetchone()
        if not rendiconto:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        if rendiconto[1] != 'bozza':
            raise HTTPException(
                status_code=400,
                detail="Impossibile caricare documenti: il rendiconto non è in stato bozza"
            )
        
        # Verifica permessi
        cur.execute("""
            SELECT ue.ente_id 
            FROM utenti_enti ue 
            WHERE ue.utente_id = %s AND ue.ente_id = %s
        """, (current_user['user_id'], rendiconto[2]))
        
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Non hai permessi su questo ente")
        
        # Verifica se esiste già un documento di questo tipo
        cur.execute("""
            SELECT id, path_storage FROM rendiconti_documenti 
            WHERE rendiconto_id = %s AND tipo_documento = %s
        """, (str(rendiconto_id), tipo_documento))
        
        existing = cur.fetchone()
        
        # Se esiste, elimina il vecchio
        if existing:
            if os.path.exists(existing[1]):
                os.remove(existing[1])
            
            cur.execute("DELETE FROM rendiconti_documenti WHERE id = %s", (existing[0],))
        
        # Salva il nuovo file
        file_extension = os.path.splitext(file.filename)[1]
        file_name = f"{rendiconto_id}_{tipo_documento}_{int(datetime.now().timestamp())}{file_extension}"
        file_path = UPLOAD_DIR / file_name
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(file_path)
        
        # Inserisci nel database
        cur.execute("""
            INSERT INTO rendiconti_documenti 
            (rendiconto_id, tipo_documento, nome_file, tipo_file, dimensione, path_storage)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            str(rendiconto_id),
            tipo_documento,
            file.filename,
            file.content_type or 'application/octet-stream',
            file_size,
            str(file_path)
        ))
        
        new_doc = cur.fetchone()
        conn.commit()
        
        return {
            "id": str(new_doc[0]),
            "rendiconto_id": str(rendiconto_id),
            "tipo_documento": tipo_documento,
            "nome_file": file.filename,
            "tipo_file": file.content_type,
            "dimensione": file_size,
            "created_at": new_doc[1].isoformat()
        }
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Errore upload documento: {str(e)}")
    finally:
        cur.close()
        conn.close()


# ============================================
# LISTA DOCUMENTI RENDICONTO
# ============================================

@router.get("/rendiconti/{rendiconto_id}/documenti")
async def get_documenti_rendiconto(
    rendiconto_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Recupera tutti i documenti caricati per un rendiconto
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
    SELECT 
        rd.id,
        rd.rendiconto_id,
        rd.tipo_documento,
        rd.nome_file,
        rd.tipo_file,
        rd.dimensione,
        rd.path_storage,
        rd.created_at
    FROM rendiconti_documenti rd
    WHERE rd.rendiconto_id = %s
    ORDER BY rd.created_at DESC
""", (str(rendiconto_id),))
        
        rows = cur.fetchall()
        
        documenti = []
        for row in rows:
            documenti.append({
                "id": str(row[0]),
                "rendiconto_id": str(row[1]),
                "tipo_documento": row[2],
                "nome_file": row[3],
                "tipo_file": row[4],
                "dimensione": row[5],
                "path_storage": row[6],
                "created_at": row[7].isoformat()
            })
        
        return {"documenti": documenti}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore recupero documenti: {str(e)}")
    finally:
        cur.close()
        conn.close()


# ============================================
# DOWNLOAD DOCUMENTO
# ============================================

@router.get("/rendiconti/documenti/{documento_id}/download")
async def download_documento(
    documento_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Download di un documento rendiconto
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT rd.path_storage, rd.nome_file, rd.tipo_file
            FROM rendiconti_documenti rd
            JOIN rendiconti r ON rd.rendiconto_id = r.id
            JOIN utenti_enti ue ON r.ente_id = ue.ente_id
            WHERE rd.id = %s AND ue.utente_id = %s
        """, (str(documento_id), current_user['user_id']))
        
        doc = cur.fetchone()
        
        if not doc:
            raise HTTPException(status_code=404, detail="Documento non trovato")
        
        file_path = doc[0]
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File non trovato sul server")
        
        return FileResponse(
            path=file_path,
            filename=doc[1],
            media_type=doc[2]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore download: {str(e)}")
    finally:
        cur.close()
        conn.close()


# ============================================
# ELIMINA DOCUMENTO
# ============================================

@router.delete("/rendiconti/documenti/{documento_id}")
async def delete_documento(
    documento_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina un documento (solo se rendiconto in bozza)
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT rd.path_storage, r.stato
            FROM rendiconti_documenti rd
            JOIN rendiconti r ON rd.rendiconto_id = r.id
            JOIN utenti_enti ue ON r.ente_id = ue.ente_id
            WHERE rd.id = %s AND ue.utente_id = %s
        """, (str(documento_id), current_user['user_id']))
        
        doc = cur.fetchone()
        
        if not doc:
            raise HTTPException(status_code=404, detail="Documento non trovato")
        
        if doc[1] != 'bozza':
            raise HTTPException(
                status_code=400,
                detail="Impossibile eliminare: il rendiconto non è in stato bozza"
            )
        
        # Elimina file fisico
        if os.path.exists(doc[0]):
            os.remove(doc[0])
        
        # Elimina dal database
        cur.execute("DELETE FROM rendiconti_documenti WHERE id = %s", (str(documento_id),))
        conn.commit()
        
        return {"message": "Documento eliminato con successo"}
        
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
# INVIA RENDICONTO (da bozza a in_revisione)
# ============================================

@router.post("/rendiconti/{rendiconto_id}/invia")
async def invia_rendiconto(
    rendiconto_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Invia il rendiconto alla Diocesi (da bozza → in_revisione)
    🆕 SOLO cambio stato (blocco già fatto alla creazione)
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verifica che il rendiconto sia in bozza
        cur.execute("""
            SELECT r.id, r.stato, r.ente_id
            FROM rendiconti r
            JOIN utenti_enti ue ON r.ente_id = ue.ente_id
            WHERE r.id = %s AND ue.utente_id = %s
        """, (str(rendiconto_id), current_user['user_id']))
        
        rendiconto = cur.fetchone()
        
        if not rendiconto:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        if rendiconto[1] != 'bozza':
            raise HTTPException(
                status_code=400,
                detail=f"Il rendiconto è già in stato: {rendiconto[1]}"
            )
        
        # ✅ Recupera info ente e esonero
        cur.execute("""
    SELECT 
        COALESCE(e.documenti_obbligatori, TRUE) as ente_richiede,
        COALESCE(r.documenti_esonero, FALSE) as ha_esonero
    FROM rendiconti r
    JOIN enti e ON e.id = r.ente_id
    WHERE r.id = %s
""", (str(rendiconto_id),))
        
        info = cur.fetchone()
        ente_richiede_documenti = info[0] if info else True
        ha_esonero_economo = info[1] if info else False
        
        # ✅ VERIFICA DOCUMENTI SOLO SE NECESSARIO
        if ente_richiede_documenti and not ha_esonero_economo:
            # Verifica documenti obbligatori
            cur.execute("""
                SELECT tipo_documento 
                FROM rendiconti_documenti 
                WHERE rendiconto_id = %s
            """, (str(rendiconto_id),))
            
            documenti_caricati = [row[0] for row in cur.fetchall()]
            
            documenti_obbligatori = [doc for doc in TIPI_DOCUMENTO_AMMESSI if doc != 'altro']
            documenti_mancanti = [
                doc for doc in documenti_obbligatori 
                if doc not in documenti_caricati
            ]
            
            if documenti_mancanti:
                raise HTTPException(
                    status_code=400,
                    detail=f"Documenti obbligatori mancanti: {', '.join(documenti_mancanti)}. Contatta l'economo per richiedere un esonero."
                )
        
        # Aggiorna stato rendiconto → in_revisione
        cur.execute("""
            UPDATE rendiconti 
            SET stato = 'in_revisione', 
                data_invio = NOW()
            WHERE id = %s
        """, (str(rendiconto_id),))
        
        conn.commit()
        
        return {
            "message": "Rendiconto inviato con successo alla Diocesi",
            "rendiconto_id": str(rendiconto_id),
            "stato": "in_revisione",
            "data_invio": datetime.now().isoformat(),
            "documenti_esoneratio": ha_esonero_economo
        }
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Errore invio rendiconto: {str(e)}")
    finally:
        cur.close()
        conn.close()

 # ============================================
# ECONOMO: ESONERA DOCUMENTI
# ============================================

@router.post("/economo/rendiconti/{rendiconto_id}/esonera-documenti")
async def economo_esonera_documenti(
    rendiconto_id: UUID,
    motivo: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    L'economo può esonerare un rendiconto dai documenti mancanti
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verifica che il rendiconto esista e sia in bozza
        cur.execute("""
            SELECT id, stato, ente_id
            FROM rendiconti
            WHERE id = %s
        """, (str(rendiconto_id),))
        
        rendiconto = cur.fetchone()
        
        if not rendiconto:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        if rendiconto[1] != 'bozza':
            raise HTTPException(
                status_code=400,
                detail=f"Impossibile esonerare: il rendiconto è già in stato '{rendiconto[1]}'"
            )
        
        # Aggiorna rendiconto con esonero
        cur.execute("""
            UPDATE rendiconti
            SET documenti_esonero = TRUE,
                documenti_esonero_motivo = %s,
                documenti_esonero_da = %s,
                documenti_esonero_at = NOW()
            WHERE id = %s
        """, (motivo, current_user['user_id'], str(rendiconto_id)))
        
        conn.commit()
        
        return {
            "message": "Esonero documenti concesso con successo",
            "rendiconto_id": str(rendiconto_id),
            "motivo": motivo,
            "esonero_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Errore esonero documenti: {str(e)}")
    finally:
        cur.close()
        conn.close()       

# ============================================
# GENERA PDF RENDICONTO
# ============================================

async def genera_pdf_rendiconto(rendiconto_id: str, ente_id: str):
    """
    Genera PDF del rendiconto (senza firma vescovo)
    """
    try:
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from database import get_db_connection
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        print(f"📄 Inizio generazione PDF per rendiconto: {rendiconto_id}")
        
        # 1. Recupera dati ente
        cur.execute("""
            SELECT denominazione, indirizzo, cap, comune, provincia, 
                   codice_fiscale, telefono, email, parroco, diocesi
            FROM enti WHERE id = %s
        """, (ente_id,))
        
        ente = cur.fetchone()
        if not ente:
            raise Exception("Ente non trovato")
        
        # 2. Recupera dati rendiconto
        cur.execute("""
            SELECT periodo_inizio, periodo_fine, totale_entrate, 
                   totale_uscite, saldo
            FROM rendiconti WHERE id = %s
        """, (rendiconto_id,))
        
        rend = cur.fetchone()
        if not rend:
            raise Exception("Rendiconto non trovato")
        
        # 3. Recupera movimenti
        cur.execute("""
            SELECT m.data_movimento, m.tipo_movimento, m.importo, 
                   m.causale, m.descrizione,
                   r.nome as conto_nome,
                   c.descrizione as categoria_nome
            FROM movimenti_contabili m
            LEFT JOIN registri_contabili r ON m.registro_id = r.id
            LEFT JOIN piano_conti c ON m.categoria_id = c.id
            WHERE m.ente_id = %s
              AND m.data_movimento BETWEEN %s AND %s
            ORDER BY m.data_movimento, m.tipo_movimento
        """, (ente_id, rend[0], rend[1]))
        
        movimenti = cur.fetchall()
        
        # 4. Prepara dati per template
        dati_template = {
            'ente': {
                'denominazione': ente[0],
                'indirizzo': ente[1] or '',
                'cap': ente[2] or '',
                'comune': ente[3] or '',
                'provincia': ente[4] or '',
                'codice_fiscale': ente[5] or '',
                'telefono': ente[6] or '',
                'email': ente[7] or '',
                'parroco': ente[8] or '',
                'diocesi': ente[9] or '',
                'numero_abitanti': None
            },
            'periodo_inizio': rend[0].strftime('%d/%m/%Y'),
            'periodo_fine': rend[1].strftime('%d/%m/%Y'),
            'data_compilazione': datetime.now().strftime('%d/%m/%Y'),
            'totale_entrate': float(rend[2]) if rend[2] else 0,
            'totale_uscite': float(rend[3]) if rend[3] else 0,
            'saldo': float(rend[4]) if rend[4] else 0,
            'movimenti': [
                {
                    'data': mov[0].strftime('%d/%m/%Y'),
                    'tipo': mov[1],
                    'importo': float(mov[2]),
                    'causale': mov[3] or mov[4] or 'Movimento',
                    'conto': mov[5] or 'Non specificato',
                    'categoria': mov[6] or 'Non categorizzato'
                }
                for mov in movimenti
            ],
            'approvato': False,
            'parroco_nome': ente[8] or '',
            'conti': [
                {'nome': 'Cassa Parrocchia', 'saldo': 0},
                {'nome': 'Banca Unicredit', 'saldo': 0},
                {'nome': 'C/C Postale Parroco', 'saldo': 0}
            ],
            'totale_attivo': float(rend[4]) if rend[4] else 0
        }
        
        # 5. Renderizza template
        BASE_DIR = Path(__file__).resolve().parent.parent
        TEMPLATES_DIR = BASE_DIR / "templates"
        
        env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
        template = env.get_template('rendiconto.html')
        html_content = template.render(**dati_template)
        
        # 6. Genera PDF
        year = rend[0].year
        RENDICONTI_DIR = BASE_DIR / "rendiconti" / str(year)
        RENDICONTI_DIR.mkdir(parents=True, exist_ok=True)
        
        filename = f"rendiconto_{rendiconto_id}.pdf"
        pdf_path = RENDICONTI_DIR / filename
        
        HTML(string=html_content, base_url=str(BASE_DIR)).write_pdf(str(pdf_path))
        
        print(f"✅ PDF generato: {pdf_path}")
        
        cur.close()
        conn.close()
        
        # Ritorna path relativo
        return f"{year}/{filename}"
        
    except Exception as e:
        print(f"❌ Errore generazione PDF: {e}")
        import traceback
        traceback.print_exc()
        raise