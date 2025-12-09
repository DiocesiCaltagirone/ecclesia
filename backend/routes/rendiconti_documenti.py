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
# WeasyPrint opzionale (richiede GTK su Windows)
try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError):
    WEASYPRINT_AVAILABLE = False
    print("?? WeasyPrint non disponibile - generazione PDF disabilitata in locale")
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
        
        if rendiconto[1] != 'parrocchia':
            raise HTTPException(
                status_code=400,
                detail="Impossibile caricare documenti: il rendiconto non è in stato 'parrocchia'"
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
# DOWNLOAD PDF RENDICONTO
# ============================================

@router.get("/rendiconti/{rendiconto_id}/pdf")
async def download_pdf_rendiconto(
    rendiconto_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Download del PDF del rendiconto
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verifica permessi e recupera path PDF
        cur.execute("""
            SELECT r.pdf_path, r.periodo_inizio, r.periodo_fine
            FROM rendiconti r
            JOIN utenti_enti ue ON r.ente_id = ue.ente_id
            WHERE r.id = %s AND ue.utente_id = %s
        """, (str(rendiconto_id), current_user['user_id']))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        pdf_path = row[0]
        periodo_inizio = row[1]
        periodo_fine = row[2]
        
        if not pdf_path:
            raise HTTPException(status_code=404, detail="PDF non ancora generato per questo rendiconto")
        
        # Costruisci path completo
        BASE_DIR = Path(__file__).resolve().parent.parent
        full_path = BASE_DIR / "rendiconti" / pdf_path
        
        if not full_path.exists():
            raise HTTPException(status_code=404, detail=f"File PDF non trovato: {pdf_path}")
        
        # Nome file per download
        filename = f"rendiconto_{periodo_inizio}_{periodo_fine}.pdf"
        
        return FileResponse(
            path=str(full_path),
            filename=filename,
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore download PDF: {str(e)}")
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
        
        if doc[1] != 'parrocchia':
            raise HTTPException(
                status_code=400,
                detail="Impossibile eliminare: il rendiconto non è in stato 'parrocchia'"
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
    Invia il rendiconto alla Diocesi (parrocchia → inviato)
    Documenti obbligatori solo per enti tipo 'parrocchia'
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verifica che il rendiconto esista e sia in stato corretto
        cur.execute("""
            SELECT r.id, r.stato, r.ente_id
            FROM rendiconti r
            JOIN utenti_enti ue ON r.ente_id = ue.ente_id
            WHERE r.id = %s AND ue.utente_id = %s
        """, (str(rendiconto_id), current_user['user_id']))
        
        rendiconto = cur.fetchone()
        
        if not rendiconto:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        # Può inviare solo da 'parrocchia' o 'definitivo'
        if rendiconto[1] not in ['parrocchia', 'definitivo']:
            raise HTTPException(
                status_code=400,
                detail=f"Impossibile inviare: il rendiconto è in stato '{rendiconto[1]}'. Solo i rendiconti in stato 'parrocchia' o 'definitivo' possono essere inviati."
            )
        
        # Recupera tipo ente
        cur.execute("""
            SELECT COALESCE(tipo_ente, 'parrocchia') as tipo_ente
            FROM enti
            WHERE id = %s
        """, (str(rendiconto[2]),))
        
        ente_info = cur.fetchone()
        tipo_ente = ente_info[0] if ente_info else 'parrocchia'
        
        # VERIFICA DOCUMENTI SOLO PER PARROCCHIE
        if tipo_ente == 'parrocchia':
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
                    detail=f"Documenti obbligatori mancanti: {', '.join(documenti_mancanti)}"
                )
        
        # Aggiorna stato rendiconto → inviato
        cur.execute("""
            UPDATE rendiconti 
            SET stato = 'inviato', 
                data_invio = NOW(),
                updated_at = NOW()
            WHERE id = %s
        """, (str(rendiconto_id),))
        
        conn.commit()
        
        return {
            "message": "Rendiconto inviato con successo alla Diocesi",
            "rendiconto_id": str(rendiconto_id),
            "stato": "inviato",
            "data_invio": datetime.now().isoformat(),
            "tipo_ente": tipo_ente
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
# GENERA PDF RENDICONTO
# ============================================

async def genera_pdf_rendiconto(rendiconto_id: str, ente_id: str):
    """
    Genera PDF del rendiconto con movimenti organizzati per categoria
    """
    try:
        from collections import defaultdict
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        print(f"📄 Inizio generazione PDF per rendiconto: {rendiconto_id}")
        
        # 1. Recupera dati ente
        cur.execute("""
            SELECT denominazione, indirizzo, cap, comune, provincia, 
                   codice_fiscale, telefono, email, parroco, diocesi,
                   anno_fondazione, numero_abitanti, vescovo
            FROM enti WHERE id = %s
        """, (ente_id,))
        
        ente_row = cur.fetchone()
        if not ente_row:
            raise Exception("Ente non trovato")
        
        ente = {
            'denominazione': ente_row[0],
            'indirizzo': ente_row[1],
            'cap': ente_row[2],
            'comune': ente_row[3],
            'provincia': ente_row[4],
            'codice_fiscale': ente_row[5],
            'telefono': ente_row[6],
            'email': ente_row[7],
            'parroco': ente_row[8],
            'diocesi': ente_row[9],
            'anno_fondazione': ente_row[10],
            'numero_abitanti': ente_row[11],
            'vescovo': ente_row[12] or 'S.E. Mons. Calogero Peri'
        }
        
        # 2. Recupera dati rendiconto
        cur.execute("""
            SELECT periodo_inizio, periodo_fine, totale_entrate, 
                   totale_uscite, saldo, stato
            FROM rendiconti WHERE id = %s
        """, (rendiconto_id,))
        
        rend = cur.fetchone()
        if not rend:
            raise Exception("Rendiconto non trovato")
        
        periodo_inizio = rend[0]
        periodo_fine = rend[1]
        
        # 3. Recupera saldi conti
        cur.execute("""
            SELECT r.nome, 
                   COALESCE(SUM(CASE 
                       WHEN m.tipo_movimento = 'entrata' THEN m.importo
                       WHEN m.tipo_movimento = 'uscita' THEN -m.importo
                       ELSE 0
                   END), 0) as saldo
            FROM registri_contabili r
            LEFT JOIN movimenti_contabili m ON m.registro_id = r.id
                AND m.data_movimento <= %s
            WHERE r.ente_id = %s AND r.attivo = TRUE
            GROUP BY r.id, r.nome
            ORDER BY r.nome
        """, (periodo_fine, ente_id))
        
        conti = [{'nome': row[0], 'saldo': float(row[1])} for row in cur.fetchall()]
        totale_attivo = sum(c['saldo'] for c in conti)
        
        # 4. Recupera movimenti con categoria gerarchica
        cur.execute("""
            SELECT 
                m.data_movimento, 
                m.tipo_movimento, 
                m.importo, 
                COALESCE(m.descrizione, m.causale, 'Movimento') as descrizione,
                r.nome as conto_nome,
                c.descrizione as categoria_nome,
                c.id as categoria_id,
                cp.descrizione as categoria_padre_nome,
                cp.id as categoria_padre_id,
                cpp.descrizione as categoria_nonno_nome,
                cpp.id as categoria_nonno_id
            FROM movimenti_contabili m
            LEFT JOIN registri_contabili r ON m.registro_id = r.id
            LEFT JOIN piano_conti c ON m.categoria_id = c.id
            LEFT JOIN piano_conti cp ON c.categoria_padre_id = cp.id
            LEFT JOIN piano_conti cpp ON cp.categoria_padre_id = cpp.id
            WHERE m.ente_id = %s
              AND m.data_movimento BETWEEN %s AND %s
              AND m.tipo_speciale IS NULL
            ORDER BY m.tipo_movimento, 
                     COALESCE(cpp.descrizione, cp.descrizione, c.descrizione, 'ZZZ'),
                     COALESCE(cp.descrizione, c.descrizione, 'ZZZ'),
                     c.descrizione,
                     m.data_movimento
        """, (ente_id, periodo_inizio, periodo_fine))
        
        movimenti_raw = cur.fetchall()
        
        # 5. Organizza movimenti per categoria
        def organizza_per_categoria(movimenti, tipo_filtro):
            categorie = defaultdict(lambda: {
                'nome': '', 
                'totale': 0, 
                'sottocategorie': defaultdict(lambda: {
                    'nome': '', 
                    'totale': 0, 
                    'movimenti': []
                })
            })
            
            for mov in movimenti:
                if mov[1] != tipo_filtro:
                    continue
                    
                data_mov = mov[0].strftime('%d/%m/%Y')
                importo = float(mov[2])
                descrizione = mov[3] or 'Movimento'
                conto = mov[4] or ''
                
                # Determina categoria principale e sottocategoria
                cat_livello1 = mov[9] or mov[7] or mov[5] or 'Altre voci'
                cat_livello2 = mov[7] if mov[9] else (mov[5] if mov[7] else 'Generale')
                if cat_livello2 == cat_livello1:
                    cat_livello2 = 'Generale'
                
                movimento = {
                    'data': data_mov,
                    'descrizione': descrizione[:55] + '...' if len(descrizione) > 55 else descrizione,
                    'conto': conto,
                    'importo': importo
                }
                
                categorie[cat_livello1]['nome'] = cat_livello1
                categorie[cat_livello1]['sottocategorie'][cat_livello2]['nome'] = cat_livello2
                categorie[cat_livello1]['sottocategorie'][cat_livello2]['movimenti'].append(movimento)
                categorie[cat_livello1]['sottocategorie'][cat_livello2]['totale'] += importo
                categorie[cat_livello1]['totale'] += importo
            
            # Converti in lista ordinata
            result = []
            for cat_name in sorted(categorie.keys()):
                cat_data = categorie[cat_name]
                sottocategorie = []
                for sub_name in sorted(cat_data['sottocategorie'].keys()):
                    sub_data = cat_data['sottocategorie'][sub_name]
                    if sub_data['movimenti']:  # Solo se ci sono movimenti
                        sottocategorie.append({
                            'nome': sub_data['nome'],
                            'totale': sub_data['totale'],
                            'movimenti': sub_data['movimenti']
                        })
                if sottocategorie:  # Solo se ci sono sottocategorie
                    result.append({
                        'nome': cat_data['nome'],
                        'totale': cat_data['totale'],
                        'sottocategorie': sottocategorie
                    })
            return result
        
        categorie_entrate = organizza_per_categoria(movimenti_raw, 'entrata')
        categorie_uscite = organizza_per_categoria(movimenti_raw, 'uscita')
        
        # Calcola totali
        totale_entrate = sum(c['totale'] for c in categorie_entrate)
        totale_uscite = sum(c['totale'] for c in categorie_uscite)
        saldo = totale_entrate - totale_uscite
        
        # 6. Recupera riporto anno precedente
        cur.execute("""
            SELECT saldo FROM rendiconti 
            WHERE ente_id = %s AND periodo_fine < %s
            ORDER BY periodo_fine DESC LIMIT 1
        """, (ente_id, periodo_inizio))
        
        riporto_row = cur.fetchone()
        if riporto_row:
            riporto_precedente = float(riporto_row[0])
        else:
            # Se non c'è rendiconto precedente, cerca il saldo iniziale manuale
            cur.execute("""
                SELECT importo FROM movimenti_contabili
                WHERE ente_id = %s 
                  AND tipo_speciale = 'saldo_iniziale'
                  AND (riporto_saldo IS NULL OR riporto_saldo = FALSE)
                ORDER BY data_movimento ASC LIMIT 1
            """, (ente_id,))
            saldo_iniziale_row = cur.fetchone()
            riporto_precedente = float(saldo_iniziale_row[0]) if saldo_iniziale_row else 0
        
       # 7. Prepara dati per template
        # 8. Renderizza template
        BASE_DIR = Path(__file__).resolve().parent.parent
        TEMPLATES_DIR = BASE_DIR / "templates"
        
        # Carica logo e vescovo da impostazioni diocesi
        logo_diocesi = None
        vescovo_nome = None
        vescovo_titolo = "Vescovo"
        try:
            cur.execute("SELECT logo_path, vescovo_nome, vescovo_titolo FROM impostazioni_diocesi LIMIT 1")
            imp_diocesi = cur.fetchone()
            if imp_diocesi:
                if imp_diocesi[0]:  # logo_path
                    logo_from_db = BASE_DIR / imp_diocesi[0]
                    if logo_from_db.exists():
                        logo_diocesi = str(logo_from_db)
                vescovo_nome = imp_diocesi[1]  # vescovo_nome
                vescovo_titolo = imp_diocesi[2] or "Vescovo"  # vescovo_titolo
        except:
            pass
        
        # Fallback logo statico
        if not logo_diocesi:
            logo_path = TEMPLATES_DIR / "assets" / "Logo Diocesi - Economato.png"
            if logo_path.exists():
                logo_diocesi = str(logo_path)
        
        dati_template = {
            'ente': ente,
            'logo_diocesi': logo_diocesi,
            'vescovo': vescovo_nome or ente.get('vescovo') or "S.E. Mons. Calogero Peri",
            'vescovo_titolo': vescovo_titolo,
            'periodo_inizio_fmt': periodo_inizio.strftime('%d/%m/%Y'),
            'periodo_fine_fmt': periodo_fine.strftime('%d/%m/%Y'),
            'data_compilazione': datetime.now().strftime('%d/%m/%Y'),
            'totale_entrate': totale_entrate,
            'totale_uscite': totale_uscite,
            'saldo': saldo,
            'categorie_entrate': categorie_entrate,
            'categorie_uscite': categorie_uscite,
            'conti': conti,
            'totale_attivo': totale_attivo,
            'totale_disponibilita': totale_attivo,
            'riporto_precedente': riporto_precedente,
            'approvato': rend[5] == 'approvato'
        }
        
        env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

        # Filtro per formato numeri italiani (1.234,56)
        def formato_italiano(valore):
            try:
                numero = float(valore)
                formatted = "{:,.2f}".format(numero)
                formatted = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
                return formatted
            except:
                return valore

        env.filters['ita'] = formato_italiano

        template = env.get_template('rendiconto.html')
        html_content = template.render(**dati_template)
        
        # 9. Genera PDF (solo se WeasyPrint disponibile)
        if not WEASYPRINT_AVAILABLE:
            print("⚠️ WeasyPrint non disponibile - PDF non generato")
            raise Exception("WeasyPrint non disponibile in questo ambiente")
        
        year = periodo_inizio.year
        RENDICONTI_DIR = BASE_DIR / "rendiconti" / str(year)
        RENDICONTI_DIR.mkdir(parents=True, exist_ok=True)
        
        filename = f"rendiconto_{rendiconto_id}.pdf"
        pdf_path = RENDICONTI_DIR / filename
        
        HTML(string=html_content, base_url=str(BASE_DIR)).write_pdf(str(pdf_path))
        
        # 10. Aggiorna totali nel database
        cur.execute("""
            UPDATE rendiconti 
            SET pdf_path = %s
            WHERE id = %s
        """, (f"{year}/{filename}", rendiconto_id))
        
        conn.commit()
        
        print(f"✅ PDF generato: {pdf_path}")
        
        cur.close()
        conn.close()
        
        return f"{year}/{filename}"
        
    except Exception as e:
        print(f"❌ Errore generazione PDF: {e}")
        import traceback
        traceback.print_exc()
        raise