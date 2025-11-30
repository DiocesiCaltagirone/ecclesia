# ============================================
# ECCLESIA - Generatore Certificati PDF
# File: certificati.py
# ============================================
# Genera certificati sacramentali in formato CEI

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph, Frame
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
from typing import Optional, Dict
import os

# Dimensioni A4
A4_WIDTH, A4_HEIGHT = A4


class CertificatoGenerator:
    """Classe per generare certificati PDF formato CEI"""
    
    def __init__(self, output_path: str = "certificati"):
        """
        Inizializza il generatore.
        
        Args:
            output_path: Cartella dove salvare i PDF
        """
        self.output_path = output_path
        
        # Crea cartella se non esiste
        if not os.path.exists(output_path):
            os.makedirs(output_path)
        
        # Stili di testo
        self.styles = getSampleStyleSheet()
        
        # Aggiungi stili personalizzati
        self.styles.add(ParagraphStyle(
            name='Intestazione',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#1a1a1a'),
            alignment=1,  # Centro
            spaceAfter=12,
            leading=18
        ))
        
        self.styles.add(ParagraphStyle(
            name='Titolo',
            parent=self.styles['Normal'],
            fontSize=18,
            textColor=colors.HexColor('#8B4513'),
            alignment=1,  # Centro
            spaceAfter=20,
            fontName='Helvetica-Bold',
            leading=22
        ))
        
        self.styles.add(ParagraphStyle(
            name='Corpo',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#1a1a1a'),
            alignment=4,  # Giustificato
            spaceAfter=8,
            leading=16
        ))
        
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#666666'),
            alignment=1,  # Centro
            spaceAfter=6,
            leading=12
        ))
    
    def _draw_header(self, c: canvas.Canvas, parrocchia: Dict):
        """
        Disegna l'intestazione del certificato.
        
        Args:
            c: Canvas ReportLab
            parrocchia: Dati parrocchia
        """
        # Logo diocesi (se presente)
        logo_path = f"assets/logo_diocesi_{parrocchia.get('diocesi_id', '')}.png"
        if os.path.exists(logo_path):
            c.drawImage(logo_path, 50*mm, A4_HEIGHT - 40*mm, width=25*mm, height=25*mm, 
                       preserveAspectRatio=True, mask='auto')
        
        # Intestazione testuale
        y = A4_HEIGHT - 30*mm
        
        # Diocesi
        c.setFont("Helvetica-Bold", 12)
        diocesi_nome = parrocchia.get('diocesi_nome', 'DIOCESI')
        c.drawCentredString(A4_WIDTH/2, y, diocesi_nome.upper())
        
        y -= 15
        
        # Parrocchia
        c.setFont("Helvetica-Bold", 14)
        parrocchia_nome = parrocchia.get('denominazione', '')
        c.drawCentredString(A4_WIDTH/2, y, parrocchia_nome.upper())
        
        y -= 12
        
        # Indirizzo
        c.setFont("Helvetica", 10)
        indirizzo = f"{parrocchia.get('indirizzo', '')}, {parrocchia.get('comune', '')} ({parrocchia.get('provincia', '')})"
        c.drawCentredString(A4_WIDTH/2, y, indirizzo)
        
        y -= 10
        
        # Contatti
        contatti = []
        if parrocchia.get('telefono'):
            contatti.append(f"Tel. {parrocchia['telefono']}")
        if parrocchia.get('email'):
            contatti.append(f"Email: {parrocchia['email']}")
        
        if contatti:
            c.setFont("Helvetica", 9)
            c.drawCentredString(A4_WIDTH/2, y, " - ".join(contatti))
        
        # Linea separatrice
        y -= 8
        c.setStrokeColor(colors.HexColor('#8B4513'))
        c.setLineWidth(1.5)
        c.line(40*mm, y, A4_WIDTH - 40*mm, y)
    
    def _draw_footer(self, c: canvas.Canvas, numero_protocollo: str, data_emissione: datetime):
        """
        Disegna il footer del certificato.
        
        Args:
            c: Canvas ReportLab
            numero_protocollo: Numero protocollo certificato
            data_emissione: Data di emissione
        """
        y = 30*mm
        
        # Linea separatrice
        c.setStrokeColor(colors.HexColor('#8B4513'))
        c.setLineWidth(0.5)
        c.line(40*mm, y + 10, A4_WIDTH - 40*mm, y + 10)
        
        # Info certificato
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor('#666666'))
        
        info_text = f"Certificato n. {numero_protocollo} - Emesso il {data_emissione.strftime('%d/%m/%Y')}"
        c.drawCentredString(A4_WIDTH/2, y, info_text)
        
        y -= 8
        
        # Disclaimer
        c.setFont("Helvetica-Oblique", 7)
        disclaimer = "Questo certificato è valido solo se porta il timbro della parrocchia e la firma del parroco."
        c.drawCentredString(A4_WIDTH/2, y, disclaimer)
    
    def _draw_firma_section(self, c: canvas.Canvas, y: float, parroco_nome: str):
        """
        Disegna la sezione firma.
        
        Args:
            c: Canvas ReportLab
            y: Posizione Y
            parroco_nome: Nome del parroco
        """
        # Data e luogo
        x_left = 40*mm
        
        c.setFont("Helvetica", 10)
        oggi = datetime.now()
        c.drawString(x_left, y, f"Dato a _______________, il {oggi.strftime('%d/%m/%Y')}")
        
        y -= 25
        
        # Spazio per timbro (a sinistra)
        c.setFont("Helvetica-Oblique", 8)
        c.drawCentredString(x_left + 25*mm, y, "Timbro della Parrocchia")
        
        # Rettangolo per timbro
        c.setStrokeColor(colors.HexColor('#CCCCCC'))
        c.setLineWidth(0.5)
        c.rect(x_left, y - 20*mm, 40*mm, 30*mm, stroke=1, fill=0)
        
        # Firma parroco (a destra)
        x_right = A4_WIDTH - 80*mm
        
        c.setFont("Helvetica", 10)
        c.drawString(x_right, y + 15, "Il Parroco")
        
        y_firma = y - 5
        
        # Linea per firma
        c.setStrokeColor(colors.HexColor('#000000'))
        c.setLineWidth(0.5)
        c.line(x_right, y_firma, x_right + 60*mm, y_firma)
        
        y_firma -= 8
        
        # Nome parroco
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(x_right, y_firma, f"({parroco_nome})")
    
    def genera_certificato_battesimo(
        self,
        dati_persona: Dict,
        dati_battesimo: Dict,
        dati_parrocchia: Dict,
        numero_protocollo: str,
        parroco_nome: str
    ) -> str:
        """
        Genera certificato di battesimo.
        
        Args:
            dati_persona: Dati della persona battezzata
            dati_battesimo: Dati del battesimo
            dati_parrocchia: Dati della parrocchia
            numero_protocollo: Numero protocollo del certificato
            parroco_nome: Nome del parroco
        
        Returns:
            str: Path del file PDF generato
        """
        # Nome file
        filename = f"battesimo_{dati_persona['cognome']}_{dati_persona['nome']}_{numero_protocollo}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        # Crea PDF
        c = canvas.Canvas(filepath, pagesize=A4)
        
        # Header
        self._draw_header(c, dati_parrocchia)
        
        # Titolo
        y = A4_HEIGHT - 75*mm
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(colors.HexColor('#8B4513'))
        c.drawCentredString(A4_WIDTH/2, y, "CERTIFICATO DI BATTESIMO")
        
        # Corpo del certificato
        y -= 25
        
        c.setFont("Helvetica", 11)
        c.setFillColor(colors.HexColor('#000000'))
        
        # Testo certificato
        testo_lines = [
            "Si certifica che nel Registro dei Battesimi di questa Parrocchia,",
            f"al Volume {dati_battesimo.get('volume', 'N/A')}, "
            f"Pagina {dati_battesimo.get('pagina', 'N/A')}, "
            f"Numero {dati_battesimo.get('numero_atto', 'N/A')},",
            "risulta la seguente registrazione:",
            "",
            ""
        ]
        
        for line in testo_lines:
            c.drawCentredString(A4_WIDTH/2, y, line)
            y -= 14
        
        # Dati persona in box
        y -= 5
        
        # Box dati
        box_x = 50*mm
        box_width = A4_WIDTH - 100*mm
        box_height = 60*mm
        
        c.setStrokeColor(colors.HexColor('#8B4513'))
        c.setLineWidth(1)
        c.rect(box_x, y - box_height, box_width, box_height, stroke=1, fill=0)
        
        # Dati dentro il box
        y_box = y - 12
        x_label = box_x + 10
        x_value = box_x + 40*mm
        
        c.setFont("Helvetica-Bold", 10)
        
        dati_certificato = [
            ("Cognome e Nome:", f"{dati_persona['cognome']} {dati_persona['nome']}"),
            ("Nato/a a:", f"{dati_persona.get('luogo_nascita', '')} il {dati_persona.get('data_nascita', '')}"),
            ("Figlio/a di:", f"{dati_battesimo.get('padre', 'N/A')} e {dati_battesimo.get('madre', 'N/A')}"),
            ("Battezzato/a il:", dati_battesimo.get('data_battesimo', '')),
            ("Celebrante:", dati_battesimo.get('celebrante', 'N/A')),
            ("Padrino:", dati_battesimo.get('padrino', 'N/A')),
            ("Madrina:", dati_battesimo.get('madrina', 'N/A'))
        ]
        
        for label, value in dati_certificato:
            c.setFont("Helvetica-Bold", 9)
            c.drawString(x_label, y_box, label)
            
            c.setFont("Helvetica", 9)
            c.drawString(x_value, y_box, str(value))
            
            y_box -= 12
        
        # Note (se presenti)
        if dati_battesimo.get('note'):
            y -= box_height + 15
            c.setFont("Helvetica-Oblique", 9)
            c.drawString(box_x, y, f"Note: {dati_battesimo['note']}")
            y -= 15
        else:
            y -= box_height + 10
        
        # Sezione firma
        y -= 20
        self._draw_firma_section(c, y, parroco_nome)
        
        # Footer
        self._draw_footer(c, numero_protocollo, datetime.now())
        
        # Salva PDF
        c.save()
        
        return filepath
    
    def genera_certificato_cresima(
        self,
        dati_persona: Dict,
        dati_cresima: Dict,
        dati_parrocchia: Dict,
        numero_protocollo: str,
        parroco_nome: str
    ) -> str:
        """
        Genera certificato di cresima (struttura simile al battesimo).
        """
        filename = f"cresima_{dati_persona['cognome']}_{dati_persona['nome']}_{numero_protocollo}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        self._draw_header(c, dati_parrocchia)
        
        y = A4_HEIGHT - 75*mm
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(colors.HexColor('#8B4513'))
        c.drawCentredString(A4_WIDTH/2, y, "CERTIFICATO DI CRESIMA")
        
        y -= 25
        
        c.setFont("Helvetica", 11)
        c.setFillColor(colors.HexColor('#000000'))
        
        testo_lines = [
            "Si certifica che nel Registro delle Cresime di questa Parrocchia,",
            f"al Volume {dati_cresima.get('volume', 'N/A')}, "
            f"Pagina {dati_cresima.get('pagina', 'N/A')}, "
            f"Numero {dati_cresima.get('numero_atto', 'N/A')},",
            "risulta la seguente registrazione:",
            "",
            ""
        ]
        
        for line in testo_lines:
            c.drawCentredString(A4_WIDTH/2, y, line)
            y -= 14
        
        y -= 5
        
        box_x = 50*mm
        box_width = A4_WIDTH - 100*mm
        box_height = 50*mm
        
        c.setStrokeColor(colors.HexColor('#8B4513'))
        c.setLineWidth(1)
        c.rect(box_x, y - box_height, box_width, box_height, stroke=1, fill=0)
        
        y_box = y - 12
        x_label = box_x + 10
        x_value = box_x + 40*mm
        
        dati_certificato = [
            ("Cognome e Nome:", f"{dati_persona['cognome']} {dati_persona['nome']}"),
            ("Nato/a a:", f"{dati_persona.get('luogo_nascita', '')} il {dati_persona.get('data_nascita', '')}"),
            ("Cresimato/a il:", dati_cresima.get('data_cresima', '')),
            ("Ministro:", dati_cresima.get('ministro', 'N/A')),
            ("Padrino/Madrina:", dati_cresima.get('padrino', 'N/A'))
        ]
        
        for label, value in dati_certificato:
            c.setFont("Helvetica-Bold", 9)
            c.drawString(x_label, y_box, label)
            
            c.setFont("Helvetica", 9)
            c.drawString(x_value, y_box, str(value))
            
            y_box -= 12
        
        y -= box_height + 10
        
        y -= 20
        self._draw_firma_section(c, y, parroco_nome)
        
        self._draw_footer(c, numero_protocollo, datetime.now())
        
        c.save()
        
        return filepath
    
    def genera_certificato_matrimonio(
        self,
        dati_sposo: Dict,
        dati_sposa: Dict,
        dati_matrimonio: Dict,
        dati_parrocchia: Dict,
        numero_protocollo: str,
        parroco_nome: str
    ) -> str:
        """
        Genera certificato di matrimonio.
        """
        filename = f"matrimonio_{dati_sposo['cognome']}_{dati_sposa['cognome']}_{numero_protocollo}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        self._draw_header(c, dati_parrocchia)
        
        y = A4_HEIGHT - 75*mm
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(colors.HexColor('#8B4513'))
        c.drawCentredString(A4_WIDTH/2, y, "CERTIFICATO DI MATRIMONIO")
        
        y -= 25
        
        c.setFont("Helvetica", 11)
        c.setFillColor(colors.HexColor('#000000'))
        
        testo_lines = [
            "Si certifica che nel Registro dei Matrimoni di questa Parrocchia,",
            f"al Volume {dati_matrimonio.get('volume', 'N/A')}, "
            f"Pagina {dati_matrimonio.get('pagina', 'N/A')}, "
            f"Numero {dati_matrimonio.get('numero_atto', 'N/A')},",
            "risulta la seguente registrazione:",
            "",
            ""
        ]
        
        for line in testo_lines:
            c.drawCentredString(A4_WIDTH/2, y, line)
            y -= 14
        
        y -= 5
        
        box_x = 50*mm
        box_width = A4_WIDTH - 100*mm
        box_height = 65*mm
        
        c.setStrokeColor(colors.HexColor('#8B4513'))
        c.setLineWidth(1)
        c.rect(box_x, y - box_height, box_width, box_height, stroke=1, fill=0)
        
        y_box = y - 12
        x_label = box_x + 10
        x_value = box_x + 40*mm
        
        dati_certificato = [
            ("SPOSO", ""),
            ("Cognome e Nome:", f"{dati_sposo['cognome']} {dati_sposo['nome']}"),
            ("Nato a:", f"{dati_sposo.get('luogo_nascita', '')} il {dati_sposo.get('data_nascita', '')}"),
            ("", ""),
            ("SPOSA", ""),
            ("Cognome e Nome:", f"{dati_sposa['cognome']} {dati_sposa['nome']}"),
            ("Nato a:", f"{dati_sposa.get('luogo_nascita', '')} il {dati_sposa.get('data_nascita', '')}"),
            ("", ""),
            ("Sposati il:", dati_matrimonio.get('data_matrimonio', '')),
            ("Celebrante:", dati_matrimonio.get('celebrante', 'N/A'))
        ]
        
        for label, value in dati_certificato:
            if label in ["SPOSO", "SPOSA"]:
                c.setFont("Helvetica-Bold", 10)
                c.drawString(x_label, y_box, label)
            elif label == "":
                pass  # Riga vuota
            else:
                c.setFont("Helvetica-Bold", 9)
                c.drawString(x_label, y_box, label)
                
                c.setFont("Helvetica", 9)
                c.drawString(x_value, y_box, str(value))
            
            y_box -= 11
        
        y -= box_height + 10
        
        y -= 20
        self._draw_firma_section(c, y, parroco_nome)
        
        self._draw_footer(c, numero_protocollo, datetime.now())
        
        c.save()
        
        return filepath


def genera_numero_protocollo(parrocchia_id: str, tipo_sacramento: str, anno: int = None) -> str:
    """
    Genera numero di protocollo per il certificato.
    Formato: PARR-TIPO-ANNO-NUMERO
    
    Args:
        parrocchia_id: ID parrocchia (prime 4 lettere)
        tipo_sacramento: 'BAT', 'CRE', 'MAT'
        anno: Anno (default: anno corrente)
    
    Returns:
        str: Numero protocollo
    """
    if anno is None:
        anno = datetime.now().year
    
    # Ottieni numero progressivo dal database
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
