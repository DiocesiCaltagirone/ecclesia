# ============================================
# ECCLESIA - Generatore Certificati PDF Formato CEI
# File: certificati.py (VERSIONE DEFINITIVA)
# ============================================
# Genera certificati sacramentali in formato standard CEI

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from datetime import datetime
from typing import Optional, Dict
import os

# Dimensioni A4
A4_WIDTH, A4_HEIGHT = A4

# Margini
MARGIN_TOP = 10*mm
MARGIN_BOTTOM = 10*mm
MARGIN_LEFT = 20*mm
MARGIN_RIGHT = 20*mm


class CertificatoGeneratorCEI:
    """Classe per generare certificati PDF in formato standard CEI"""
    
    def __init__(self, output_path: str = "certificati"):
        self.output_path = output_path
        if not os.path.exists(output_path):
            os.makedirs(output_path)
    
    def _draw_header(self, c: canvas.Canvas, parrocchia: Dict, modulo: str):
        """Disegna l'intestazione standard CEI"""
        # Posizione iniziale (margine superiore 1cm)
        y = A4_HEIGHT - MARGIN_TOP
        
        # Mod. XX e Prot. n. (margini 2cm sx/dx)
        c.setFont("Helvetica", 10)
        c.drawString(MARGIN_LEFT, y, modulo)
        c.drawRightString(A4_WIDTH - MARGIN_RIGHT, y, "Prot. n. ")
        
        y -= 25
        
        # Diocesi (alzata)
        c.setFont("Helvetica-Bold", 14)
        diocesi_nome = parrocchia.get('diocesi_nome', 'Diocesi di Caltagirone')
        c.drawCentredString(A4_WIDTH/2, y, diocesi_nome)
        
        y -= 40  # Spazio dopo diocesi
        
        # PARROCCHIA
        c.setFont("Helvetica-Bold", 12)
        parrocchia_nome = parrocchia.get('denominazione', 'PARROCCHIA')
        c.drawCentredString(A4_WIDTH/2, y, parrocchia_nome.upper())
        
        y -= 12
        
        # Indirizzo completo su 1 riga: Via Roma, 123 - 95041 Caltagirone (CT)
        c.setFont("Helvetica", 10)
        # Costruisci indirizzo solo con campi compilati
        indirizzo = parrocchia.get('indirizzo') or ''
        cap = parrocchia.get('cap') or ''
        comune = parrocchia.get('comune') or ''
        provincia = parrocchia.get('provincia') or ''

        # Se ha indirizzo e cap, mostra completo
        if indirizzo and cap:
            indirizzo_completo = f"{indirizzo} - {cap} {comune} ({provincia})"
        # Altrimenti solo comune
        elif comune:
            indirizzo_completo = f"{comune} ({provincia})" if provincia else comune
        else:
            indirizzo_completo = ""
        c.drawCentredString(A4_WIDTH/2, y, indirizzo_completo)
        
        return y - 50  # Spazio di 50mm dopo intestazione
    
    def _draw_title(self, c: canvas.Canvas, y: float, titolo: str, sottotitolo: str = "") -> float:
        """Disegna il titolo del certificato"""
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(A4_WIDTH/2, y, titolo.upper())
        
        if sottotitolo:
            y -= 14
            c.setFont("Helvetica", 11)
            c.drawCentredString(A4_WIDTH/2, y, f"({sottotitolo})")
        
        return y - 50
    
    def _format_registro_value(self, value):
        """Formatta un valore del registro: se c'è mostra, se vuoto lascia spazi"""
        if value and str(value).strip():
            return str(value)
        else:
            return "     "
    
    def _draw_footer(self, c: canvas.Canvas):
        """Disegna il footer con data e firma"""
        y = 50*mm  # Posizione dal basso
        
        c.setFont("Helvetica", 11)
        
        # In fede
        c.drawString(MARGIN_LEFT, y, "In fede")
        
        y -= 25  # SPAZIO dopo "In fede"
        
        # Data (sinistra)
        c.drawString(MARGIN_LEFT, y, "Data ")
        
        # L.S. (centro)
        c.drawCentredString(A4_WIDTH/2, y, "L.S.")
        
        # IL PARROCO (destra)
        c.drawRightString(A4_WIDTH - MARGIN_RIGHT, y, "IL PARROCO")
        
        # Linea per firma
        y -= 5
        firma_x_start = A4_WIDTH - 70*mm
        firma_x_end = A4_WIDTH - MARGIN_RIGHT
        c.setLineWidth(0.5)
        c.line(firma_x_start, y, firma_x_end, y)
    
    # ============================================
    # CERTIFICATO BATTESIMO - PER USO MATRIMONIO
    # ============================================
    
    def genera_certificato_battesimo_matrimonio(
        self,
        dati_persona: Dict,
        dati_battesimo: Dict,
        dati_parrocchia: Dict,
        annotazioni: Dict = None
    ) -> str:
        """Genera certificato di battesimo per uso matrimonio (CON ANNOTAZIONI)"""
        filename = f"battesimo_matrimonio_{dati_persona['cognome']}_{dati_persona['nome']}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        # Header
        y = self._draw_header(c, dati_parrocchia, "Mod. II")
        
        # Titolo
        y = self._draw_title(c, y, "CERTIFICATO DI BATTESIMO", "per uso matrimonio")
        
        # Dal Registro dei Battesimi
        c.setFont("Helvetica", 11)
        x_start = MARGIN_LEFT
        
        vol = self._format_registro_value(dati_battesimo.get('volume'))
        pag = self._format_registro_value(dati_battesimo.get('pagina'))
        num = self._format_registro_value(dati_battesimo.get('numero_atto'))
        
        c.drawString(x_start, y, f"Dal Registro dei Battesimi (vol. {vol}  pag. {pag}  num. {num}) risulta che:")
        
        y -= 40
        
        # Nome CENTRATO
        c.setFont("Helvetica-Bold", 12)
        persona_text = f"{dati_persona['cognome']} {dati_persona['nome']}"
        c.drawCentredString(A4_WIDTH/2, y, persona_text)
        
        y -= 40  # Spazio dopo nome
        
        # Dati nascita
        c.setFont("Helvetica", 11)
        luogo = (dati_persona.get('luogo_nascita') or '').strip()
        data = (dati_persona.get('data_nascita') or '').strip()
        
        if luogo and data:
            nascita_text = f"nato/a a {luogo}  il {data}"
        else:
            nascita_text = f"nato/a a {luogo or '          '}  il {data or '          '}"
        
        c.drawString(x_start, y, nascita_text)
        
        y -= 14
        
        # Battesimo
        c.drawString(x_start, y, "è stato/a battezzato/a in questa Parrocchia")
        
        y -= 14
        
        data_batt = (dati_battesimo.get('data_battesimo') or '').strip()
        c.drawString(x_start, y, f"il giorno {data_batt or '          '}")
        
        y -= 28  # 2 SPAZI prima di ANNOTAZIONI
        
        # ANNOTAZIONI
        c.setFont("Helvetica-Bold", 12)
        c.drawString(x_start, y, "ANNOTAZIONI")
        
        y -= 18  # Spazio dopo ANNOTAZIONI
        
        c.setFont("Helvetica", 10)
        
        # 1. Cresima
        if annotazioni and annotazioni.get('cresima'):
            cres = annotazioni['cresima']
            data_cres = (cres.get('data') or '').strip() or '     '
            parr_cres = (cres.get('parrocchia') or '').strip() or '     '
            dioc_cres = (cres.get('diocesi') or '').strip() or '     '
            
            c.drawString(x_start + 5*mm, y, f"1. È stato/a cresimato/a in data {data_cres}")
            y -= 11
            c.drawString(x_start + 10*mm, y, f"nella Parrocchia di {parr_cres}")
            y -= 11
            c.drawString(x_start + 10*mm, y, f"Diocesi di {dioc_cres}")
        else:
            c.drawString(x_start + 5*mm, y, "1. È stato/a cresimato/a in data ")
            y -= 11
            c.drawString(x_start + 10*mm, y, "nella Parrocchia di ")
            y -= 11
            c.drawString(x_start + 10*mm, y, "Diocesi di ")
        
        y -= 14  # Spazio tra annotazioni
        
        # 2. Matrimonio
        if annotazioni and annotazioni.get('matrimonio'):
            mat = annotazioni['matrimonio']
            coniuge = (mat.get('coniuge') or '').strip() or '     '
            data_mat = (mat.get('data') or '').strip() or '     '
            parr_mat = (mat.get('parrocchia') or '').strip() or '     '
            dioc_mat = (mat.get('diocesi') or '').strip() or '     '
            
            c.drawString(x_start + 5*mm, y, f"2. Ha contratto matrimonio con {coniuge}")
            y -= 11
            c.drawString(x_start + 10*mm, y, f"il {data_mat}  nella Parrocchia di {parr_mat}")
            y -= 11
            c.drawString(x_start + 10*mm, y, f"Diocesi di {dioc_mat}")
        else:
            c.drawString(x_start + 5*mm, y, "2. Ha contratto matrimonio con ")
            y -= 11
            c.drawString(x_start + 10*mm, y, "il             nella Parrocchia di ")
            y -= 11
            c.drawString(x_start + 10*mm, y, "Diocesi di ")
        
        y -= 14  # Spazio tra annotazioni
        
        # 3. Altre annotazioni
        if annotazioni and annotazioni.get('altre'):
            altre = (annotazioni['altre'] or '').strip()
            c.drawString(x_start + 5*mm, y, f"3. Altre eventuali annotazioni o variazioni ¹")
            y -= 11
            c.drawString(x_start + 10*mm, y, altre)
        else:
            c.drawString(x_start + 5*mm, y, "3. Altre eventuali annotazioni o variazioni ¹")
        
        # Footer
        self._draw_footer(c)
        
        # Nota a piè di pagina
        c.setFont("Helvetica-Oblique", 8)
        c.drawString(MARGIN_LEFT, 25*mm, "¹ Cfr. Decreto generale, 7")
        
        c.save()
        return filepath
    
    # ============================================
    # CERTIFICATO BATTESIMO - CON ANNOTAZIONI (GENERICO)
    # ============================================
    
    def genera_certificato_battesimo_annotazioni(
        self,
        dati_persona: Dict,
        dati_battesimo: Dict,
        dati_parrocchia: Dict,
        annotazioni: Dict = None
    ) -> str:
        """Certificato battesimo con annotazioni SENZA dicitura 'per uso matrimonio'"""
        filename = f"battesimo_annotazioni_{dati_persona['cognome']}_{dati_persona['nome']}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        y = self._draw_header(c, dati_parrocchia, "Mod. II-BIS")
        y = self._draw_title(c, y, "CERTIFICATO DI BATTESIMO", "")
        
        c.setFont("Helvetica", 11)
        x_start = MARGIN_LEFT
        
        vol = self._format_registro_value(dati_battesimo.get('volume'))
        pag = self._format_registro_value(dati_battesimo.get('pagina'))
        num = self._format_registro_value(dati_battesimo.get('numero_atto'))
        
        c.drawString(x_start, y, f"Dal Registro dei Battesimi (vol. {vol}  pag. {pag}  num. {num}) risulta che:")
        
        y -= 40
        
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(A4_WIDTH/2, y, f"{dati_persona['cognome']} {dati_persona['nome']}")
        
        y -= 40
        
        c.setFont("Helvetica", 11)
        luogo = (dati_persona.get('luogo_nascita') or '').strip()
        data = (dati_persona.get('data_nascita') or '').strip()
        c.drawString(x_start, y, f"nato/a a {luogo or '          '}  il {data or '          '}")
        
        y -= 14
        c.drawString(x_start, y, "è stato/a battezzato/a in questa Parrocchia")
        
        y -= 14
        data_batt = (dati_battesimo.get('data_battesimo') or '').strip()
        c.drawString(x_start, y, f"il giorno {data_batt or '          '}")
        
        y -= 28
        
        # ANNOTAZIONI
        c.setFont("Helvetica-Bold", 12)
        c.drawString(x_start, y, "ANNOTAZIONI")
        
        y -= 18
        c.setFont("Helvetica", 10)
        
        if annotazioni and annotazioni.get('cresima'):
            cres = annotazioni['cresima']
            c.drawString(x_start + 5*mm, y, f"1. È stato/a cresimato/a in data {cres.get('data', '     ')}")
            y -= 11
            c.drawString(x_start + 10*mm, y, f"nella Parrocchia di {cres.get('parrocchia', '     ')}")
            y -= 11
            c.drawString(x_start + 10*mm, y, f"Diocesi di {cres.get('diocesi', '     ')}")
        else:
            c.drawString(x_start + 5*mm, y, "1. È stato/a cresimato/a in data ")
            y -= 11
            c.drawString(x_start + 10*mm, y, "nella Parrocchia di ")
            y -= 11
            c.drawString(x_start + 10*mm, y, "Diocesi di ")
        
        y -= 14
        
        if annotazioni and annotazioni.get('matrimonio'):
            mat = annotazioni['matrimonio']
            c.drawString(x_start + 5*mm, y, f"2. Ha contratto matrimonio con {mat.get('coniuge', '     ')}")
            y -= 11
            c.drawString(x_start + 10*mm, y, f"il {mat.get('data', '     ')}  nella Parrocchia di {mat.get('parrocchia', '     ')}")
            y -= 11
            c.drawString(x_start + 10*mm, y, f"Diocesi di {mat.get('diocesi', '     ')}")
        else:
            c.drawString(x_start + 5*mm, y, "2. Ha contratto matrimonio con ")
            y -= 11
            c.drawString(x_start + 10*mm, y, "il             nella Parrocchia di ")
            y -= 11
            c.drawString(x_start + 10*mm, y, "Diocesi di ")
        
        y -= 14
        
        if annotazioni and annotazioni.get('altre'):
            c.drawString(x_start + 5*mm, y, f"3. Altre eventuali annotazioni o variazioni:")
            y -= 11
            c.drawString(x_start + 10*mm, y, annotazioni['altre'])
        else:
            c.drawString(x_start + 5*mm, y, "3. Altre eventuali annotazioni o variazioni:")
        
        self._draw_footer(c)
        c.save()
        return filepath
    
    # ============================================
    # CERTIFICATO BATTESIMO - SEMPLICE
    # ============================================
    
    def genera_certificato_battesimo_semplice(
        self,
        dati_persona: Dict,
        dati_battesimo: Dict,
        dati_parrocchia: Dict
    ) -> str:
        """Certificato battesimo SEMPLICE senza annotazioni"""
        filename = f"battesimo_semplice_{dati_persona['cognome']}_{dati_persona['nome']}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        y = self._draw_header(c, dati_parrocchia, "Mod. II-A")
        y = self._draw_title(c, y, "CERTIFICATO DI BATTESIMO", "")
        
        c.setFont("Helvetica", 11)
        x_start = MARGIN_LEFT
        
        vol = self._format_registro_value(dati_battesimo.get('volume'))
        pag = self._format_registro_value(dati_battesimo.get('pagina'))
        num = self._format_registro_value(dati_battesimo.get('numero_atto'))
        
        c.drawString(x_start, y, f"Dal Registro dei Battesimi (vol. {vol}  pag. {pag}  num. {num}) risulta che:")
        
        y -= 40
        
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(A4_WIDTH/2, y, f"{dati_persona['cognome']} {dati_persona['nome']}")
        
        y -= 40
        
        c.setFont("Helvetica", 11)
        luogo = (dati_persona.get('luogo_nascita') or '').strip()
        data = (dati_persona.get('data_nascita') or '').strip()
        c.drawString(x_start, y, f"nato/a a {luogo or '          '}  il {data or '          '}")
        
        y -= 14
        c.drawString(x_start, y, "è stato/a battezzato/a in questa Parrocchia")
        
        y -= 14
        data_batt = (dati_battesimo.get('data_battesimo') or '').strip()
        c.drawString(x_start, y, f"il giorno {data_batt or '          '}")
        
        self._draw_footer(c)
        c.save()
        return filepath
    
    # ============================================
    # CERTIFICATO CRESIMA
    # ============================================
    
    def genera_certificato_cresima(
        self,
        dati_persona: Dict,
        dati_cresima: Dict,
        dati_parrocchia: Dict
    ) -> str:
        """Certificato di cresima"""
        filename = f"cresima_{dati_persona['cognome']}_{dati_persona['nome']}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        y = self._draw_header(c, dati_parrocchia, "Mod. III")
        y = self._draw_title(c, y, "CERTIFICATO DI CRESIMA", "")
        
        c.setFont("Helvetica", 11)
        x_start = MARGIN_LEFT
        
        vol = self._format_registro_value(dati_cresima.get('volume'))
        pag = self._format_registro_value(dati_cresima.get('pagina'))
        num = self._format_registro_value(dati_cresima.get('numero_atto'))
        
        c.drawString(x_start, y, f"Dal Registro delle Cresime (vol. {vol}  pag. {pag}  num. {num}) risulta che:")
        
        y -= 40
        
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(A4_WIDTH/2, y, f"{dati_persona['cognome']} {dati_persona['nome']}")
        
        y -= 40
        
        c.setFont("Helvetica", 11)
        luogo = (dati_persona.get('luogo_nascita') or '').strip()
        data = (dati_persona.get('data_nascita') or '').strip()
        c.drawString(x_start, y, f"nato/a a {luogo or '          '}  il {data or '          '}")
        
        y -= 14
        c.drawString(x_start, y, "è stato/a cresimato/a in questa Parrocchia")
        
        y -= 14
        data_cres = (dati_cresima.get('data_cresima') or '').strip()
        ministro = dati_cresima.get('ministro', '').strip()

        if data_cres and ministro:
            c.drawString(x_start, y, f"il giorno {data_cres}  dal Ministro {ministro}")
        else:
            c.drawString(x_start, y, f"il giorno {data_cres or '          '}  dal Ministro {ministro or '          '}")
        
        self._draw_footer(c)
        c.save()
        return filepath
    
    # ============================================
    # CERTIFICATO MATRIMONIO
    # ============================================
    
    def genera_certificato_matrimonio(
        self,
        dati_sposo: Dict,
        dati_sposa: Dict,
        dati_matrimonio: Dict,
        dati_parrocchia: Dict
    ) -> str:
        """Certificato di matrimonio"""
        filename = f"matrimonio_{dati_sposo['cognome']}_{dati_sposa['cognome']}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        y = self._draw_header(c, dati_parrocchia, "Mod. XV")
        y = self._draw_title(c, y, "CERTIFICATO DI MATRIMONIO", "")
        
        c.setFont("Helvetica", 11)
        x_start = MARGIN_LEFT
        
        vol = self._format_registro_value(dati_matrimonio.get('volume'))
        pag = self._format_registro_value(dati_matrimonio.get('pagina'))
        num = self._format_registro_value(dati_matrimonio.get('numero_atto'))
        
        c.drawString(x_start, y, f"Dal Registro dei Matrimoni (vol. {vol}  pag. {pag}  num. {num}) risulta che:")
        
        y -= 40
        
        # Sposo
        c.setFont("Helvetica-Bold", 12)
        c.drawString(x_start, y, f"{dati_sposo['cognome']} {dati_sposo['nome']}")
        
        y -= 18
        
        c.setFont("Helvetica", 11)
        luogo_s = (dati_sposo.get('luogo_nascita') or '').strip()
        data_s = (dati_sposo.get('data_nascita') or '').strip()
        c.drawString(x_start, y, f"nato a {luogo_s or '          '}  il {data_s or '          '}")
        
        y -= 18
        c.drawString(x_start, y, "e")
        
        y -= 14
        
        # Sposa
        c.setFont("Helvetica-Bold", 12)
        c.drawString(x_start, y, f"{dati_sposa['cognome']} {dati_sposa['nome']}")
        
        y -= 14
        
        c.setFont("Helvetica", 11)
        luogo_sp = (dati_sposa.get('luogo_nascita') or '').strip()
        data_sp = (dati_sposa.get('data_nascita') or '').strip()
        c.drawString(x_start, y, f"nata a {luogo_sp or '          '}  il {data_sp or '          '}")
        
        y -= 18
        
        # Matrimonio
        data_mat = (dati_matrimonio.get('data_matrimonio') or '').strip()
        celebrante = (dati_matrimonio.get('celebrante') or '').strip()
        
        c.drawString(x_start, y, f"hanno contratto matrimonio il giorno {data_mat or '          '}")
        
        y -= 14
        c.drawString(x_start, y, f"davanti al celebrante {celebrante or '          '}")
        
        self._draw_footer(c)
        c.save()
        return filepath


# Alias per compatibilità
CertificatoGenerator = CertificatoGeneratorCEI


# ============================================
# GENERA NUMERO PROTOCOLLO
# ============================================

def genera_numero_protocollo(parrocchia_id: str, tipo_sacramento: str, anno: int = None) -> str:
    """
    Genera numero protocollo certificato (solo per tracking, NON nel PDF).
    """
    if anno is None:
        anno = datetime.now().year
    
    from database import get_db_connection
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT COALESCE(MAX(CAST(SUBSTRING(numero_protocollo FROM '[0-9]+$') AS INTEGER)), 0) + 1
        FROM certificati
        WHERE parrocchia_id = %s 
        AND tipo_sacramento = %s
        AND EXTRACT(YEAR FROM data_emissione) = %s
    """, (parrocchia_id, tipo_sacramento, anno))
    
    numero = cur.fetchone()[0]
    conn.close()
    
    parr_code = parrocchia_id[:4].upper()
    
    return f"{parr_code}-{tipo_sacramento}-{anno}-{numero:04d}"
