"""
Routes per generazione stampe rendiconti
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from datetime import datetime
from decimal import Decimal
import os

from database import get_db_connection
from auth import get_current_user
from utils.pdf_generator import (
    genera_pdf_rendiconto,
    salva_firma_vescovo,
    salva_timbro_diocesi,
    valida_immagine
)

# ✅ AGGIUNGI QUESTE RIGHE QUI!
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')
RENDICONTI_DIR = os.path.join(UPLOADS_DIR, 'rendiconti')
FIRME_DIR = os.path.join(UPLOADS_DIR, 'firme')
TIMBRI_DIR = os.path.join(UPLOADS_DIR, 'timbri')

# Crea directory se non esistono
os.makedirs(RENDICONTI_DIR, exist_ok=True)
os.makedirs(FIRME_DIR, exist_ok=True)
os.makedirs(TIMBRI_DIR, exist_ok=True)

router = APIRouter(prefix="/api/rendiconti", tags=["stampe"])


async def calcola_dati_rendiconto(rendiconto_id: str, db):
    """
    Recupera e calcola tutti i dati necessari per il PDF
    """
    # 1. Dati rendiconto base
    query_rendiconto = text("""
        SELECT 
            r.*,
            e.denominazione, e.indirizzo, e.cap, e.comune, e.provincia,
            e.codice_fiscale, e.telefono, e.email, e.parroco, e.diocesi, e.vescovo
        FROM rendiconti r
        JOIN enti e ON r.ente_id = e.id
        WHERE r.id = :rendiconto_id
    """)
    result = await db.execute(query_rendiconto, {"rendiconto_id": rendiconto_id})
    rendiconto = result.fetchone()
    
    if not rendiconto:
        raise HTTPException(404, "Rendiconto non trovato")
    
    # 2. Calcola saldo anno precedente (per saldo iniziale)
    query_saldo_precedente = text("""
        SELECT COALESCE(SUM(
            CASE 
                WHEN tipo_movimento = 'entrata' THEN importo
                WHEN tipo_movimento = 'uscita' THEN -importo
            END
        ), 0) as saldo_precedente
        FROM movimenti_contabili
        WHERE ente_id = :ente_id
          AND data_movimento < :periodo_inizio
    """)
    result = await db.execute(query_saldo_precedente, {
        "ente_id": rendiconto.ente_id,
        "periodo_inizio": rendiconto.periodo_inizio
    })
    saldo_precedente = result.scalar() or Decimal('0')
    
    # Saldo iniziale in entrate o uscite
    saldo_iniziale_entrate = saldo_precedente if saldo_precedente >= 0 else Decimal('0')
    saldo_iniziale_uscite = abs(saldo_precedente) if saldo_precedente < 0 else Decimal('0')
    
    # 3. Categorie ENTRATE con gerarchia
    categorie_entrate = await calcola_categorie_gerarchiche(
        rendiconto_id, rendiconto.ente_id, 'entrata', db
    )
    
    # 4. Categorie USCITE con gerarchia
    categorie_uscite = await calcola_categorie_gerarchiche(
        rendiconto_id, rendiconto.ente_id, 'uscita', db
    )
    
    # 5. Saldi registri iniziali e finali
    conti_iniziali, conti_finali = await calcola_saldi_registri(
        rendiconto.ente_id, 
        rendiconto.periodo_inizio, 
        rendiconto.periodo_fine,
        db
    )
    
    # 6. Totali
    totale_entrate = float(rendiconto.totale_entrate or 0) + float(saldo_iniziale_entrate)
    totale_uscite = float(rendiconto.totale_uscite or 0) + float(saldo_iniziale_uscite)
    saldo_finale = totale_entrate - totale_uscite
    
    # 7. Prepara dizionario dati per template
    dati = {
        # Informazioni ente
        'ente': {
            'denominazione': rendiconto.denominazione,
            'indirizzo': rendiconto.indirizzo,
            'cap': rendiconto.cap,
            'comune': rendiconto.comune,
            'provincia': rendiconto.provincia,
            'codice_fiscale': rendiconto.codice_fiscale,
            'telefono': rendiconto.telefono,
            'email': rendiconto.email,
            'diocesi': rendiconto.diocesi,
        },
        
        # Periodo
        'periodo_inizio': rendiconto.periodo_inizio.strftime('%d/%m/%Y'),
        'periodo_fine': rendiconto.periodo_fine.strftime('%d/%m/%Y'),
        'anno': rendiconto.periodo_fine.year,
        'rendiconto_id': str(rendiconto.id),
        
        # Responsabili
        'parroco_nome': rendiconto.parroco_nome or rendiconto.parroco or '',
        'vescovo_nome': rendiconto.vescovo_nome or rendiconto.vescovo or '',
        
        # Saldi iniziali
        'saldo_iniziale_entrate': float(saldo_iniziale_entrate),
        'saldo_iniziale_uscite': float(saldo_iniziale_uscite),
        
        # Categorie
        'categorie_entrate': categorie_entrate,
        'categorie_uscite': categorie_uscite,
        
        # Totali
        'totale_entrate': totale_entrate,
        'totale_uscite': totale_uscite,
        'saldo_finale': saldo_finale,
        
        # Dettaglio conti
        'conti_iniziali': conti_iniziali,
        'conti_finali': conti_finali,
        'totale_conti_iniziali': sum(c['saldo'] for c in conti_iniziali),
        'totale_conti_finali': sum(c['saldo'] for c in conti_finali),
        'variazione_periodo': sum(c['saldo'] for c in conti_finali) - sum(c['saldo'] for c in conti_iniziali),
        
        # Date e firme
        'data_invio': rendiconto.data_invio.strftime('%d/%m/%Y') if rendiconto.data_invio else '',
        'data_approvazione': rendiconto.data_revisione.strftime('%d/%m/%Y') if rendiconto.data_revisione else '',
        'stato': rendiconto.stato,
        'osservazioni_economo': rendiconto.osservazioni_economo or '',
        'luogo_firma': rendiconto.luogo_firma or 'Caltagirone',
        'firma_vescovo_path': rendiconto.firma_vescovo_path,
        'timbro_diocesi_path': rendiconto.timbro_diocesi_path,
    }
    
    return dati


async def calcola_categorie_gerarchiche(rendiconto_id: str, ente_id: str, tipo: str, db):
    """
    Calcola categorie con gerarchia (categoria → sottocategorie)
    """
    # Query categorie principali (livello 1)
    query_principali = text("""
        SELECT 
            pc.id, pc.codice, pc.descrizione, pc.livello,
            COALESCE(SUM(mc.importo), 0) as totale
        FROM piano_conti pc
        LEFT JOIN movimenti_contabili mc ON (
            mc.categoria_id = pc.id 
            AND mc.rendiconto_id = :rendiconto_id
            AND mc.tipo_movimento = :tipo
        )
        WHERE pc.ente_id = :ente_id 
          AND pc.categoria = :tipo
          AND pc.livello = 1
          AND pc.is_sistema = FALSE
        GROUP BY pc.id, pc.codice, pc.descrizione, pc.livello
        ORDER BY pc.codice
    """)
    
    result = await db.execute(query_principali, {
        "rendiconto_id": rendiconto_id,
        "ente_id": ente_id,
        "tipo": tipo
    })
    categorie_principali = result.fetchall()
    
    # Per ogni categoria principale, recupera sottocategorie
    categorie = []
    for cat_princ in categorie_principali:
        # Query sottocategorie
        query_sotto = text("""
            SELECT 
                pc.id, pc.codice, pc.descrizione, pc.livello,
                COALESCE(SUM(mc.importo), 0) as totale
            FROM piano_conti pc
            LEFT JOIN movimenti_contabili mc ON (
                mc.categoria_id = pc.id 
                AND mc.rendiconto_id = :rendiconto_id
                AND mc.tipo_movimento = :tipo
            )
            WHERE pc.ente_id = :ente_id 
              AND pc.conto_padre_id = :padre_id
            GROUP BY pc.id, pc.codice, pc.descrizione, pc.livello
            ORDER BY pc.codice
        """)
        
        result_sotto = await db.execute(query_sotto, {
            "rendiconto_id": rendiconto_id,
            "ente_id": ente_id,
            "tipo": tipo,
            "padre_id": cat_princ.id
        })
        sottocategorie = result_sotto.fetchall()
        
        sottocategorie_list = [
            {
                'descrizione': sotto.descrizione,
                'totale': float(sotto.totale)
            }
            for sotto in sottocategorie
        ]
        
        # Calcola subtotale (somma sottocategorie)
        subtotale = sum(s['totale'] for s in sottocategorie_list)
        
        categorie.append({
            'descrizione': cat_princ.descrizione,
            'sottocategorie': sottocategorie_list,
            'subtotale': subtotale
        })
    
    return categorie


async def calcola_saldi_registri(ente_id: str, data_inizio, data_fine, db):
    """
    Calcola saldi iniziali e finali per ogni registro
    """
    # Saldi finali (attuali)
    query_finali = text("""
        SELECT nome, tipo, saldo_attuale
        FROM registri_contabili
        WHERE ente_id = :ente_id AND attivo = TRUE
        ORDER BY tipo, nome
    """)
    result = await db.execute(query_finali, {"ente_id": ente_id})
    registri = result.fetchall()
    
    conti_finali = [
        {
            'nome': r.nome,
            'saldo': float(r.saldo_attuale or 0)
        }
        for r in registri
    ]
    
    # Saldi iniziali (finali - movimenti del periodo)
    conti_iniziali = []
    for registro in registri:
        # Somma movimenti del periodo per questo registro
        query_movimenti = text("""
            SELECT COALESCE(SUM(
                CASE 
                    WHEN tipo_movimento = 'entrata' THEN importo
                    WHEN tipo_movimento = 'uscita' THEN -importo
                END
            ), 0) as variazione
            FROM movimenti_contabili
            WHERE registro_id = :registro_id
              AND data_movimento BETWEEN :data_inizio AND :data_fine
        """)
        result_mov = await db.execute(query_movimenti, {
            "registro_id": registro.id,
            "data_inizio": data_inizio,
            "data_fine": data_fine
        })
        variazione = result_mov.scalar() or Decimal('0')
        
        saldo_iniziale = float(registro.saldo_attuale or 0) - float(variazione)
        
        conti_iniziali.append({
            'nome': registro.nome,
            'saldo': saldo_iniziale
        })
    
    return conti_iniziali, conti_finali


@router.get("/{rendiconto_id}/pdf")
async def genera_pdf(
    rendiconto_id: str,
    db=Depends(get_db_connection),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera e scarica PDF rendiconto
    """
    try:
        # Calcola dati
        dati = await calcola_dati_rendiconto(rendiconto_id, db)
        
        # Genera PDF
        pdf_path = genera_pdf_rendiconto(dati)
        
        # Salva path nel database (se non esiste)
        query_update = text("""
            UPDATE rendiconti 
            SET pdf_path = :pdf_path
            WHERE id = :rendiconto_id AND pdf_path IS NULL
        """)
        await db.execute(query_update, {
            "pdf_path": pdf_path,
            "rendiconto_id": rendiconto_id
        })
        await db.commit()
        
        # Ritorna file per download
        return FileResponse(
            pdf_path,
            media_type='application/pdf',
            filename=f"rendiconto_{rendiconto_id}.pdf"
        )
        
    except Exception as e:
        print(f"❌ Errore generazione PDF: {e}")
        raise HTTPException(500, f"Errore generazione PDF: {str(e)}")


@router.post("/{rendiconto_id}/approva")
async def approva_rendiconto(
    rendiconto_id: str,
    osservazioni: Optional[str] = Form(None),
    firma_vescovo: Optional[UploadFile] = File(None),
    timbro_diocesi: Optional[UploadFile] = File(None),
    vescovo_nome: Optional[str] = Form(None),
    luogo: Optional[str] = Form('Caltagirone'),
    db=Depends(get_db_connection),
    current_user: dict = Depends(get_current_user)
):
    """
    Approva rendiconto e genera PDF firmato
    """
    # Verifica permessi (solo economo)
    if not current_user.get('is_economo'):
        raise HTTPException(403, "Solo l'economo può approvare rendiconti")
    
    try:
        # Salva firma e timbro se presenti
        firma_path = None
        timbro_path = None
        
        if firma_vescovo and firma_vescovo.filename:
            valida_immagine(firma_vescovo)
            firma_path = salva_firma_vescovo(firma_vescovo, rendiconto_id)
        
        if timbro_diocesi and timbro_diocesi.filename:
            valida_immagine(timbro_diocesi)
            timbro_path = salva_timbro_diocesi(timbro_diocesi, rendiconto_id)
        
        # Aggiorna rendiconto
        query_update = text("""
            UPDATE rendiconti 
            SET 
                stato = 'approvato',
                data_revisione = NOW(),
                osservazioni_economo = :osservazioni,
                firma_vescovo_path = :firma_path,
                timbro_diocesi_path = :timbro_path,
                vescovo_nome = :vescovo_nome,
                luogo_firma = :luogo
            WHERE id = :rendiconto_id
        """)
        
        await db.execute(query_update, {
            "rendiconto_id": rendiconto_id,
            "osservazioni": osservazioni,
            "firma_path": firma_path,
            "timbro_path": timbro_path,
            "vescovo_nome": vescovo_nome,
            "luogo": luogo
        })
        await db.commit()
        
        # Rigenera PDF con firme
        dati = await calcola_dati_rendiconto(rendiconto_id, db)
        pdf_firmato_path = genera_pdf_rendiconto(
            dati,
            output_path=f"{RENDICONTI_DIR}/rendiconto_{rendiconto_id}_approvato.pdf"
        )
        
        # Salva path PDF firmato
        query_pdf = text("""
            UPDATE rendiconti 
            SET pdf_firmato_path = :pdf_path
            WHERE id = :rendiconto_id
        """)
        await db.execute(query_pdf, {
            "pdf_path": pdf_firmato_path,
            "rendiconto_id": rendiconto_id
        })
        await db.commit()
        
        return {
            "success": True,
            "message": "Rendiconto approvato con successo",
            "pdf_path": pdf_firmato_path
        }
        
    except Exception as e:
        await db.rollback()
        print(f"❌ Errore approvazione: {e}")
        raise HTTPException(500, f"Errore approvazione: {str(e)}")


@router.post("/{rendiconto_id}/respingi")
async def respingi_rendiconto(
    rendiconto_id: str,
    osservazioni: str = Form(...),
    db=Depends(get_db_connection),
    current_user: dict = Depends(get_current_user)
):
    """
    Respinge rendiconto
    """
    # Verifica permessi
    if not current_user.get('is_economo'):
        raise HTTPException(403, "Solo l'economo può respingere rendiconti")
    
    try:
        # Aggiorna stato
        query = text("""
            UPDATE rendiconti 
            SET 
                stato = 'respinto',
                data_revisione = NOW(),
                osservazioni_economo = :osservazioni
            WHERE id = :rendiconto_id
        """)
        
        await db.execute(query, {
            "rendiconto_id": rendiconto_id,
            "osservazioni": osservazioni
        })
        await db.commit()
        
        # Genera PDF con stato "NON APPROVATO"
        dati = await calcola_dati_rendiconto(rendiconto_id, db)
        pdf_path = genera_pdf_rendiconto(dati)
        
        return {
            "success": True,
            "message": "Rendiconto respinto",
            "pdf_path": pdf_path
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, f"Errore: {str(e)}")


@router.get("/{rendiconto_id}/pdf-firmato")
async def scarica_pdf_firmato(
    rendiconto_id: str,
    db=Depends(get_db_connection),
    current_user: dict = Depends(get_current_user)
):
    """
    Scarica PDF firmato (approvato)
    """
    query = text("""
        SELECT pdf_firmato_path 
        FROM rendiconti 
        WHERE id = :rendiconto_id AND stato = 'approvato'
    """)
    result = await db.execute(query, {"rendiconto_id": rendiconto_id})
    row = result.fetchone()
    
    if not row or not row.pdf_firmato_path:
        raise HTTPException(404, "PDF firmato non trovato")
    
    if not os.path.exists(row.pdf_firmato_path):
        raise HTTPException(404, "File PDF non trovato sul server")
    
    return FileResponse(
        row.pdf_firmato_path,
        media_type='application/pdf',
        filename=f"rendiconto_approvato_{rendiconto_id}.pdf"
    )
