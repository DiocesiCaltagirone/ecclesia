from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from uuid import UUID
from pathlib import Path
from io import BytesIO
from datetime import datetime
import base64
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection
from auth import get_current_user
from routes.inventario import get_ente_id

# WeasyPrint opzionale (richiede GTK su Windows)
try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError):
    WEASYPRINT_AVAILABLE = False

from jinja2 import Environment, FileSystemLoader

router = APIRouter(prefix="/api/inventario", tags=["Inventario - PDF"])

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
FOTO_UPLOAD_DIR = Path("uploads/inventario")


def get_jinja_env():
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

    def formato_italiano(valore):
        try:
            numero = float(valore)
            formatted = "{:,.2f}".format(numero)
            return formatted.replace(",", "X").replace(".", ",").replace("X", ".")
        except:
            return valore

    def formato_data(valore):
        if not valore:
            return ""
        try:
            if isinstance(valore, str):
                from datetime import date as dt_date
                valore = dt_date.fromisoformat(valore)
            return valore.strftime('%d/%m/%Y')
        except:
            return str(valore)

    env.filters['ita'] = formato_italiano
    env.filters['data'] = formato_data
    return env


def check_weasyprint():
    if not WEASYPRINT_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="Generazione PDF non disponibile in questo ambiente (WeasyPrint richiede Docker/Linux)"
        )


def get_ente_info(cur, ente_id):
    cur.execute("""
        SELECT denominazione, indirizzo, cap, comune, provincia,
               codice_fiscale, parroco, diocesi
        FROM enti WHERE id = %s
    """, (ente_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Ente non trovato")
    return {
        'denominazione': row[0],
        'indirizzo': row[1],
        'cap': row[2],
        'comune': row[3],
        'provincia': row[4],
        'codice_fiscale': row[5],
        'parroco': row[6],
        'diocesi': row[7]
    }


def get_logo_base64():
    logo_path = TEMPLATES_DIR / "assets" / "Logo Diocesi - Economato.png"
    if logo_path.exists():
        with open(logo_path, "rb") as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode()
    return None


def render_pdf(html_content, filename):
    buffer = BytesIO()
    HTML(string=html_content, base_url=str(BASE_DIR)).write_pdf(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============================================
# STAMPA BOZZA — tutti i beni attivi attuali
# ============================================

@router.get("/stampa/bozza")
async def stampa_bozza(
    categoria_id: str = None,
    ubicazione_id: str = None,
    stato_conservazione: str = None,
    data_da: str = None,
    data_a: str = None,
    valore_min: float = None,
    valore_max: float = None,
    bloccato: str = None,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    check_weasyprint()
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        ente = get_ente_info(cur, ente_id)

        query = """
            SELECT
                b.numero_progressivo, b.descrizione, b.quantita,
                b.stato_conservazione, b.valore_stimato, b.bloccato,
                c.nome as categoria_nome,
                u.nome as ubicazione_nome
            FROM beni_inventario b
            LEFT JOIN inventario_categorie c ON b.categoria_id = c.id
            LEFT JOIN inventario_ubicazioni u ON b.ubicazione_id = u.id
            WHERE b.ente_id = %s AND b.stato = 'attivo'
        """
        params = [ente_id]

        if categoria_id:
            query += " AND b.categoria_id = %s"
            params.append(categoria_id)
        if ubicazione_id:
            query += " AND b.ubicazione_id = %s"
            params.append(ubicazione_id)
        if stato_conservazione:
            query += " AND b.stato_conservazione = %s"
            params.append(stato_conservazione)
        if data_da:
            query += " AND b.data_acquisto >= %s"
            params.append(data_da)
        if data_a:
            query += " AND b.data_acquisto <= %s"
            params.append(data_a)
        if valore_min is not None:
            query += " AND b.valore_stimato >= %s"
            params.append(valore_min)
        if valore_max is not None:
            query += " AND b.valore_stimato <= %s"
            params.append(valore_max)
        if bloccato is not None:
            if bloccato.lower() == 'true':
                query += " AND b.bloccato = TRUE"
            elif bloccato.lower() == 'false':
                query += " AND b.bloccato = FALSE"

        query += " ORDER BY b.numero_progressivo"

        cur.execute(query, params)
        rows = cur.fetchall()

        beni = []
        valore_totale = 0
        for r in rows:
            valore = float(r[4]) if r[4] else 0
            valore_totale += valore
            beni.append({
                "numero_progressivo": r[0],
                "descrizione": r[1],
                "quantita": r[2],
                "stato_conservazione": r[3] or "",
                "valore_stimato": valore,
                "bloccato": r[5],
                "categoria_nome": r[6] or "",
                "ubicazione_nome": r[7] or ""
            })

        env = get_jinja_env()
        template = env.get_template('inventario_registro.html')
        html_content = template.render(
            ente=ente,
            logo_base64=get_logo_base64(),
            titolo="BOZZA REGISTRO DEI BENI",
            sottotitolo="Anteprima — documento non ufficiale",
            is_bozza=True,
            anno=datetime.now().year,
            data_generazione=datetime.now().strftime('%d/%m/%Y'),
            beni=beni,
            totale_beni=len(beni),
            valore_totale=valore_totale
        )

        return render_pdf(html_content, "bozza_registro_beni.pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# STAMPA SCHEDA SINGOLO BENE con foto
# ============================================

@router.get("/stampa/bene/{bene_id}")
async def stampa_scheda_bene(
    bene_id: UUID,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    check_weasyprint()
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        ente = get_ente_info(cur, ente_id)

        cur.execute("""
            SELECT
                b.numero_progressivo, b.descrizione, b.quantita,
                b.stato_conservazione, b.valore_stimato, b.valore_assicurato,
                b.data_acquisto, b.fornitore, b.provenienza,
                b.codice_regione, b.numero_catalogo_generale, b.codice_ente_competente,
                b.note, b.note_storiche, b.bloccato, b.stato,
                b.created_at,
                c.nome as categoria_nome,
                u.nome as ubicazione_nome
            FROM beni_inventario b
            LEFT JOIN inventario_categorie c ON b.categoria_id = c.id
            LEFT JOIN inventario_ubicazioni u ON b.ubicazione_id = u.id
            WHERE b.id = %s AND b.ente_id = %s
        """, (str(bene_id), ente_id))

        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Bene non trovato")

        bene = {
            "numero_progressivo": r[0],
            "descrizione": r[1],
            "quantita": r[2],
            "stato_conservazione": r[3] or "",
            "valore_stimato": float(r[4]) if r[4] else None,
            "valore_assicurato": float(r[5]) if r[5] else None,
            "data_acquisto": r[6],
            "fornitore": r[7] or "",
            "provenienza": r[8] or "",
            "codice_regione": r[9] or "",
            "numero_catalogo_generale": r[10] or "",
            "codice_ente_competente": r[11] or "",
            "note": r[12] or "",
            "note_storiche": r[13] or "",
            "bloccato": r[14],
            "stato": r[15],
            "created_at": r[16],
            "categoria_nome": r[17] or "",
            "ubicazione_nome": r[18] or ""
        }

        # Recupera foto e converti in base64
        cur.execute("""
            SELECT nome_file, path_file, mime_type, didascalia
            FROM inventario_foto
            WHERE bene_id = %s
            ORDER BY ordine
        """, (str(bene_id),))
        foto_rows = cur.fetchall()

        foto = []
        for f in foto_rows:
            full_path = FOTO_UPLOAD_DIR / f[1]
            if full_path.exists():
                with open(full_path, "rb") as img_file:
                    img_data = base64.b64encode(img_file.read()).decode()
                foto.append({
                    "nome_file": f[0],
                    "data_uri": f"data:{f[2]};base64,{img_data}",
                    "didascalia": f[3] or ""
                })

        env = get_jinja_env()
        template = env.get_template('inventario_scheda_bene.html')
        html_content = template.render(
            ente=ente,
            logo_base64=get_logo_base64(),
            bene=bene,
            foto=foto,
            data_stampa=datetime.now().strftime('%d/%m/%Y')
        )

        filename = f"scheda_bene_{r[0]}.pdf"
        return render_pdf(html_content, filename)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# PDF REGISTRO UFFICIALE (da snapshot)
# ============================================

@router.get("/registri/{registro_id}/pdf")
async def get_registro_pdf(
    registro_id: UUID,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    check_weasyprint()
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        ente = get_ente_info(cur, ente_id)

        cur.execute("""
            SELECT anno, numero_registro, data_generazione, totale_beni,
                   dati_snapshot, note
            FROM inventario_registri
            WHERE id = %s AND ente_id = %s
        """, (str(registro_id), ente_id))
        reg = cur.fetchone()
        if not reg:
            raise HTTPException(status_code=404, detail="Registro non trovato")

        anno = reg[0]
        numero_registro = reg[1]
        data_generazione = reg[2]
        totale_beni = reg[3]
        snapshot = reg[4] if reg[4] else []
        note = reg[5]

        # Costruisci lista beni dallo snapshot
        beni = []
        valore_totale = 0
        for s in snapshot:
            valore = s.get("valore_stimato") or 0
            valore_totale += valore
            beni.append({
                "numero_progressivo": s.get("numero_progressivo"),
                "descrizione": s.get("descrizione", ""),
                "quantita": s.get("quantita", 1),
                "stato_conservazione": s.get("stato_conservazione", ""),
                "valore_stimato": valore,
                "bloccato": True,
                "categoria_nome": s.get("categoria_nome", ""),
                "ubicazione_nome": s.get("ubicazione_nome", "")
            })

        env = get_jinja_env()
        template = env.get_template('inventario_registro.html')
        html_content = template.render(
            ente=ente,
            logo_base64=get_logo_base64(),
            titolo=f"REGISTRO DEI BENI — Anno {anno}",
            sottotitolo=f"Registro Ufficiale N. {numero_registro}",
            is_bozza=False,
            anno=anno,
            numero_registro=numero_registro,
            data_generazione=data_generazione.strftime('%d/%m/%Y') if data_generazione else "",
            note=note or "",
            beni=beni,
            totale_beni=totale_beni,
            valore_totale=valore_totale
        )

        filename = f"registro_beni_{anno}_N{numero_registro}.pdf"
        return render_pdf(html_content, filename)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# PDF STORICO BENI RIMOSSI
# ============================================

@router.get("/storico/pdf")
async def get_storico_pdf(
    anno: int = None,
    motivo: str = None,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    check_weasyprint()
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        ente = get_ente_info(cur, ente_id)

        query = """
            SELECT
                s.numero_progressivo, s.snapshot_bene,
                s.data_rimozione, s.motivo_rimozione, s.note_rimozione,
                u.email as rimosso_da_email
            FROM inventario_storico s
            LEFT JOIN utenti u ON s.rimosso_da = u.id
            WHERE s.ente_id = %s
        """
        params = [ente_id]

        if anno:
            query += " AND EXTRACT(YEAR FROM s.data_rimozione) = %s"
            params.append(anno)

        if motivo:
            query += " AND s.motivo_rimozione = %s"
            params.append(motivo)

        query += " ORDER BY s.data_rimozione DESC, s.numero_progressivo"

        cur.execute(query, params)
        rows = cur.fetchall()

        beni_rimossi = []
        for r in rows:
            snapshot = r[1] if r[1] else {}
            beni_rimossi.append({
                "numero_progressivo": r[0],
                "descrizione": snapshot.get("descrizione", ""),
                "categoria_nome": snapshot.get("categoria_nome", ""),
                "ubicazione_nome": snapshot.get("ubicazione_nome", ""),
                "valore_stimato": snapshot.get("valore_stimato"),
                "data_rimozione": r[2],
                "motivo_rimozione": r[3] or "",
                "note_rimozione": r[4] or "",
                "rimosso_da": r[5] or ""
            })

        # Titolo con filtri
        titolo = "STORICO BENI RIMOSSI"
        if anno:
            titolo += f" — Anno {anno}"

        env = get_jinja_env()
        template = env.get_template('inventario_storico.html')
        html_content = template.render(
            ente=ente,
            logo_base64=get_logo_base64(),
            titolo=titolo,
            filtro_anno=anno,
            filtro_motivo=motivo,
            beni_rimossi=beni_rimossi,
            totale_rimossi=len(beni_rimossi),
            data_stampa=datetime.now().strftime('%d/%m/%Y')
        )

        filename = f"storico_beni_rimossi{'_' + str(anno) if anno else ''}.pdf"
        return render_pdf(html_content, filename)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
