# ============================================
# ECCLESIA - Generatore Certificati PDF Formato CEI
# File: certificati.py (VERSIONE 2.0)
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


class CertificatoGeneratorCEI:
    """Classe per generare certificati PDF in formato standard CEI"""
    
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
    
    def _draw_header(self, c: canvas.Canvas, parrocchia: Dict, modulo: str, protocollo: str = ""):
        """
        Disegna l'intestazione standard CEI.
        
        Args:
            c: Canvas ReportLab
            parrocchia: Dati parrocchia
            modulo: Numero modulo (es. "Mod. II")
            protocollo: Numero protocollo
        """
        y = A4_HEIGHT - 30*mm
        
        # Mod. XX e Prot. n.
        c.setFont("Helvetica", 10)
        c.drawString(30*mm, y, modulo)
        c.drawRightString(A4_WIDTH - 30*mm, y, f"Prot. n. {protocollo}")
        
        y -= 15
        
        # Diocesi
        c.setFont("Helvetica-Bold", 12)
        diocesi_nome = parrocchia.get('diocesi_nome', 'Diocesi di Caltagirone')
        c.drawCentredString(A4_WIDTH/2, y, diocesi_nome)
        
        y -= 12
        
        # PARROCCHIA
        c.setFont("Helvetica-Bold", 11)
        parrocchia_nome = parrocchia.get('denominazione', 'PARROCCHIA')
        c.drawCentredString(A4_WIDTH/2, y, f"PARROCCHIA {parrocchia_nome.upper()}")
        
        y -= 10
        
        # Indirizzo
        c.setFont("Helvetica", 9)
        indirizzo = parrocchia.get('indirizzo', '')
        c.drawCentredString(A4_WIDTH/2, y, indirizzo)
        
        y -= 9
        
        # Comune, Cap, Provincia
        comune_info = f"{parrocchia.get('comune', '')} {parrocchia.get('cap', '')} {parrocchia.get('provincia', '')}"
        c.drawCentredString(A4_WIDTH/2, y, comune_info)
        
        return y - 15  # Ritorna posizione Y dopo header
    
    def _draw_title(self, c: canvas.Canvas, y: float, titolo: str, sottotitolo: str = "") -> float:
        """
        Disegna il titolo del certificato.
        
        Args:
            c: Canvas
            y: Posizione Y
            titolo: Titolo principale
            sottotitolo: Sottotitolo opzionale (es. "per uso matrimonio")
        
        Returns:
            float: Nuova posizione Y
        """
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(A4_WIDTH/2, y, titolo.upper())
        
        if sottotitolo:
            y -= 12
            c.setFont("Helvetica", 10)
            c.drawCentredString(A4_WIDTH/2, y, f"({sottotitolo})")
        
        return y - 15
    
    def _draw_registro_info(self, c: canvas.Canvas, y: float, volume: str, pagina: str, numero: str) -> float:
        """
        Disegna la riga con info del registro.
        
        Args:
            c: Canvas
            y: Posizione Y
            volume, pagina, numero: Dati registro
        
        Returns:
            float: Nuova posizione Y
        """
        c.setFont("Helvetica", 10)
        
        # Testo a sinistra
        x_start = 30*mm
        c.drawString(x_start, y, "Dal Registro dei")
        
        # Spazi per compilazione (lasciati vuoti o precompilati)
        # Qui puoi mettere linee per compilazione manuale o valori
        registro_text = f"(vol. {volume}  pag. {pagina}  num. {numero}) risulta che:"
        c.drawString(x_start + 35*mm, y, registro_text)
        
        return y - 15
    
    def _draw_footer(self, c: canvas.Canvas, data_emissione: datetime):
        """
        Disegna il footer con data e firma.
        
        Args:
            c: Canvas
            data_emissione: Data emissione certificato
        """
        y = 40*mm
        
        c.setFont("Helvetica", 10)
        
        # In fede
        c.drawString(30*mm, y + 15, "In fede")
        
        # Data
        c.drawString(30*mm, y, f"Data {data_emissione.strftime('%d/%m/%Y')}")
        
        # L.S.
        c.drawCentredString(A4_WIDTH/2, y, "L.S.")
        
        # IL PARROCO
        c.drawRightString(A4_WIDTH - 30*mm, y, "IL PARROCO")
        
        # Linea per firma
        y -= 5
        firma_x_start = A4_WIDTH - 70*mm
        firma_x_end = A4_WIDTH - 30*mm
        c.line(firma_x_start, y, firma_x_end, y)
    
    # ============================================
    # CERTIFICATO BATTESIMO - PER USO MATRIMONIO
    # ============================================
    
    def genera_certificato_battesimo_matrimonio(
        self,
        dati_persona: Dict,
        dati_battesimo: Dict,
        dati_parrocchia: Dict,
        numero_protocollo: str,
        annotazioni: Dict = None
    ) -> str:
        """
        Genera certificato di battesimo per uso matrimonio (CON ANNOTAZIONI).
        
        Args:
            dati_persona: cognome, nome, data_nascita, luogo_nascita
            dati_battesimo: data_battesimo, volume, pagina, numero_atto
            dati_parrocchia: denominazione, indirizzo, ecc.
            numero_protocollo: Numero protocollo
            annotazioni: Dict con cresima, matrimonio, altre (opzionali)
        
        Returns:
            str: Path del file PDF
        """
        filename = f"battesimo_matrimonio_{dati_persona['cognome']}_{dati_persona['nome']}_{numero_protocollo}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        # Header
        y = self._draw_header(c, dati_parrocchia, "Mod. II", numero_protocollo)
        
        # Titolo
        y = self._draw_title(c, y, "CERTIFICATO DI BATTESIMO", "per uso matrimonio")
        
        # Info registro
        y = self._draw_registro_info(
            c, y,
            dati_battesimo.get('volume', ''),
            dati_battesimo.get('pagina', ''),
            dati_battesimo.get('numero_atto', '')
        )
        
        # Dati persona
        c.setFont("Helvetica-Bold", 11)
        persona_text = f"{dati_persona['cognome']} {dati_persona['nome']}"
        c.drawString(30*mm, y, persona_text)
        
        y -= 12
        
        c.setFont("Helvetica", 10)
        nascita_text = f"nato/a a {dati_persona.get('luogo_nascita', '')} il {dati_persona.get('data_nascita', '')}"
        c.drawString(30*mm, y, nascita_text)
        
        y -= 15
        
        # Testo battesimo
        battesimo_text = f"è stato/a battezzato/a in questa Parrocchia"
        c.drawString(30*mm, y, battesimo_text)
        
        y -= 12
        
        data_batt = dati_battesimo.get('data_battesimo', '')
        c.drawString(30*mm, y, f"il giorno {data_batt}")
        
        y -= 20
        
        # ANNOTAZIONI
        c.setFont("Helvetica-Bold", 11)
        c.drawString(30*mm, y, "ANNOTAZIONI")
        
        y -= 15
        
        c.setFont("Helvetica", 9)
        
        # Se ci sono annotazioni, le mostra, altrimenti lascia spazio vuoto
        if annotazioni:
            # 1. Cresima
            if annotazioni.get('cresima'):
                cres = annotazioni['cresima']
                c.drawString(35*mm, y, f"1. È stato/a cresimato/a in data {cres.get('data', '_______')}")
                y -= 10
                c.drawString(40*mm, y, f"nella Parrocchia di {cres.get('parrocchia', '_______')}")
                y -= 10
                c.drawString(40*mm, y, f"Diocesi di {cres.get('diocesi', '_______')}")
                y -= 12
            else:
                c.drawString(35*mm, y, "1. È stato/a cresimato/a in data _______")
                y -= 10
                c.drawString(40*mm, y, "nella Parrocchia di _______")
                y -= 10
                c.drawString(40*mm, y, "Diocesi di _______")
                y -= 12
            
            # 2. Matrimonio
            if annotazioni.get('matrimonio'):
                mat = annotazioni['matrimonio']
                c.drawString(35*mm, y, f"2. Ha contratto matrimonio con {mat.get('coniuge', '_______')}")
                y -= 10
                c.drawString(40*mm, y, f"il {mat.get('data', '_______')} nella Parrocchia di {mat.get('parrocchia', '_______')}")
                y -= 10
                c.drawString(40*mm, y, f"Diocesi di {mat.get('diocesi', '_______')}")
                y -= 12
            else:
                c.drawString(35*mm, y, "2. Ha contratto matrimonio con _______")
                y -= 10
                c.drawString(40*mm, y, "il _______ nella Parrocchia di _______")
                y -= 10
                c.drawString(40*mm, y, "Diocesi di _______")
                y -= 12
            
            # 3. Altre annotazioni
            if annotazioni.get('altre'):
                c.drawString(35*mm, y, f"3. Altre eventuali annotazioni o variazioni:")
                y -= 10
                c.drawString(40*mm, y, annotazioni['altre'])
            else:
                c.drawString(35*mm, y, "3. Altre eventuali annotazioni o variazioni:")
                y -= 10
                c.drawString(40*mm, y, "_______")
        else:
            # Lascia campi vuoti per compilazione manuale
            c.drawString(35*mm, y, "1. È stato/a cresimato/a in data _______")
            y -= 10
            c.drawString(40*mm, y, "nella Parrocchia di _______")
            y -= 10
            c.drawString(40*mm, y, "Diocesi di _______")
            y -= 12
            
            c.drawString(35*mm, y, "2. Ha contratto matrimonio con _______")
            y -= 10
            c.drawString(40*mm, y, "il _______ nella Parrocchia di _______")
            y -= 10
            c.drawString(40*mm, y, "Diocesi di _______")
            y -= 12
            
            c.drawString(35*mm, y, "3. Altre eventuali annotazioni o variazioni:")
            y -= 10
            c.drawString(40*mm, y, "_______")
        
        # Footer
        self._draw_footer(c, datetime.now())
        
        # Note a piè di pagina
        c.setFont("Helvetica-Oblique", 7)
        c.drawString(30*mm, 25*mm, "¹ Cfr. Decreto generale, 7")
        
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
        numero_protocollo: str,
        annotazioni: Dict = None
    ) -> str:
        """
        Genera certificato di battesimo con annotazioni (senza dicitura "per uso matrimonio").
        Identico al precedente ma senza sottotitolo.
        """
        filename = f"battesimo_annotazioni_{dati_persona['cognome']}_{dati_persona['nome']}_{numero_protocollo}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        y = self._draw_header(c, dati_parrocchia, "Mod. II-BIS", numero_protocollo)
        
        # Titolo SENZA sottotitolo
        y = self._draw_title(c, y, "CERTIFICATO DI BATTESIMO", "")
        
        y = self._draw_registro_info(
            c, y,
            dati_battesimo.get('volume', ''),
            dati_battesimo.get('pagina', ''),
            dati_battesimo.get('numero_atto', '')
        )
        
        c.setFont("Helvetica-Bold", 11)
        persona_text = f"{dati_persona['cognome']} {dati_persona['nome']}"
        c.drawString(30*mm, y, persona_text)
        
        y -= 12
        
        c.setFont("Helvetica", 10)
        nascita_text = f"nato/a a {dati_persona.get('luogo_nascita', '')} il {dati_persona.get('data_nascita', '')}"
        c.drawString(30*mm, y, nascita_text)
        
        y -= 15
        
        battesimo_text = f"è stato/a battezzato/a in questa Parrocchia"
        c.drawString(30*mm, y, battesimo_text)
        
        y -= 12
        
        data_batt = dati_battesimo.get('data_battesimo', '')
        c.drawString(30*mm, y, f"il giorno {data_batt}")
        
        y -= 20
        
        # ANNOTAZIONI (stesso codice del precedente)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(30*mm, y, "ANNOTAZIONI")
        
        y -= 15
        c.setFont("Helvetica", 9)
        
        if annotazioni:
            if annotazioni.get('cresima'):
                cres = annotazioni['cresima']
                c.drawString(35*mm, y, f"1. È stato/a cresimato/a in data {cres.get('data', '_______')}")
                y -= 10
                c.drawString(40*mm, y, f"nella Parrocchia di {cres.get('parrocchia', '_______')}")
                y -= 10
                c.drawString(40*mm, y, f"Diocesi di {cres.get('diocesi', '_______')}")
                y -= 12
            else:
                c.drawString(35*mm, y, "1. È stato/a cresimato/a in data _______")
                y -= 10
                c.drawString(40*mm, y, "nella Parrocchia di _______")
                y -= 10
                c.drawString(40*mm, y, "Diocesi di _______")
                y -= 12
            
            if annotazioni.get('matrimonio'):
                mat = annotazioni['matrimonio']
                c.drawString(35*mm, y, f"2. Ha contratto matrimonio con {mat.get('coniuge', '_______')}")
                y -= 10
                c.drawString(40*mm, y, f"il {mat.get('data', '_______')} nella Parrocchia di {mat.get('parrocchia', '_______')}")
                y -= 10
                c.drawString(40*mm, y, f"Diocesi di {mat.get('diocesi', '_______')}")
                y -= 12
            else:
                c.drawString(35*mm, y, "2. Ha contratto matrimonio con _______")
                y -= 10
                c.drawString(40*mm, y, "il _______ nella Parrocchia di _______")
                y -= 10
                c.drawString(40*mm, y, "Diocesi di _______")
                y -= 12
            
            if annotazioni.get('altre'):
                c.drawString(35*mm, y, f"3. Altre eventuali annotazioni o variazioni:")
                y -= 10
                c.drawString(40*mm, y, annotazioni['altre'])
            else:
                c.drawString(35*mm, y, "3. Altre eventuali annotazioni o variazioni:")
                y -= 10
                c.drawString(40*mm, y, "_______")
        else:
            c.drawString(35*mm, y, "1. È stato/a cresimato/a in data _______")
            y -= 10
            c.drawString(40*mm, y, "nella Parrocchia di _______")
            y -= 10
            c.drawString(40*mm, y, "Diocesi di _______")
            y -= 12
            
            c.drawString(35*mm, y, "2. Ha contratto matrimonio con _______")
            y -= 10
            c.drawString(40*mm, y, "il _______ nella Parrocchia di _______")
            y -= 10
            c.drawString(40*mm, y, "Diocesi di _______")
            y -= 12
            
            c.drawString(35*mm, y, "3. Altre eventuali annotazioni o variazioni:")
            y -= 10
            c.drawString(40*mm, y, "_______")
        
        self._draw_footer(c, datetime.now())
        
        c.save()
        
        return filepath
    
    # ============================================
    # CERTIFICATO BATTESIMO - SEMPLICE (SENZA ANNOTAZIONI)
    # ============================================
    
    def genera_certificato_battesimo_semplice(
        self,
        dati_persona: Dict,
        dati_battesimo: Dict,
        dati_parrocchia: Dict,
        numero_protocollo: str
    ) -> str:
        """
        Genera certificato di battesimo semplice SENZA annotazioni.
        """
        filename = f"battesimo_semplice_{dati_persona['cognome']}_{dati_persona['nome']}_{numero_protocollo}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        y = self._draw_header(c, dati_parrocchia, "Mod. II-A", numero_protocollo)
        
        y = self._draw_title(c, y, "CERTIFICATO DI BATTESIMO", "")
        
        y = self._draw_registro_info(
            c, y,
            dati_battesimo.get('volume', ''),
            dati_battesimo.get('pagina', ''),
            dati_battesimo.get('numero_atto', '')
        )
        
        c.setFont("Helvetica-Bold", 11)
        persona_text = f"{dati_persona['cognome']} {dati_persona['nome']}"
        c.drawString(30*mm, y, persona_text)
        
        y -= 12
        
        c.setFont("Helvetica", 10)
        nascita_text = f"nato/a a {dati_persona.get('luogo_nascita', '')} il {dati_persona.get('data_nascita', '')}"
        c.drawString(30*mm, y, nascita_text)
        
        y -= 15
        
        battesimo_text = f"è stato/a battezzato/a in questa Parrocchia"
        c.drawString(30*mm, y, battesimo_text)
        
        y -= 12
        
        data_batt = dati_battesimo.get('data_battesimo', '')
        c.drawString(30*mm, y, f"il giorno {data_batt}")
        
        # Footer (senza annotazioni!)
        self._draw_footer(c, datetime.now())
        
        c.save()
        
        return filepath
    
    # ============================================
    # CERTIFICATO CRESIMA
    # ============================================
    
    def genera_certificato_cresima(
        self,
        dati_persona: Dict,
        dati_cresima: Dict,
        dati_parrocchia: Dict,
        numero_protocollo: str
    ) -> str:
        """
        Genera certificato di cresima (SENZA annotazioni).
        """
        filename = f"cresima_{dati_persona['cognome']}_{dati_persona['nome']}_{numero_protocollo}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        y = self._draw_header(c, dati_parrocchia, "Mod. III", numero_protocollo)
        
        y = self._draw_title(c, y, "CERTIFICATO DI CRESIMA", "")
        
        # Dal Registro delle Cresime
        c.setFont("Helvetica", 10)
        x_start = 30*mm
        c.drawString(x_start, y, "Dal Registro delle Cresime")
        
        registro_text = f"(vol. {dati_cresima.get('volume', '')}  pag. {dati_cresima.get('pagina', '')}  num. {dati_cresima.get('numero_atto', '')}) risulta che:"
        c.drawString(x_start + 50*mm, y, registro_text)
        
        y -= 15
        
        c.setFont("Helvetica-Bold", 11)
        persona_text = f"{dati_persona['cognome']} {dati_persona['nome']}"
        c.drawString(30*mm, y, persona_text)
        
        y -= 12
        
        c.setFont("Helvetica", 10)
        nascita_text = f"nato/a a {dati_persona.get('luogo_nascita', '')} il {dati_persona.get('data_nascita', '')}"
        c.drawString(30*mm, y, nascita_text)
        
        y -= 15
        
        cresima_text = f"è stato/a cresimato/a in questa Parrocchia"
        c.drawString(30*mm, y, cresima_text)
        
        y -= 12
        
        data_cres = dati_cresima.get('data_cresima', '')
        ministro = dati_cresima.get('ministro', '')
        c.drawString(30*mm, y, f"il giorno {data_cres} dal Ministro {ministro}")
        
        self._draw_footer(c, datetime.now())
        
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
        dati_parrocchia: Dict,
        numero_protocollo: str
    ) -> str:
        """
        Genera certificato di matrimonio (SENZA annotazioni).
        """
        filename = f"matrimonio_{dati_sposo['cognome']}_{dati_sposa['cognome']}_{numero_protocollo}.pdf"
        filepath = os.path.join(self.output_path, filename)
        
        c = canvas.Canvas(filepath, pagesize=A4)
        
        y = self._draw_header(c, dati_parrocchia, "Mod. XV", numero_protocollo)
        
        y = self._draw_title(c, y, "CERTIFICATO DI MATRIMONIO", "")
        
        # Dal Registro dei Matrimoni
        c.setFont("Helvetica", 10)
        x_start = 30*mm
        c.drawString(x_start, y, "Dal Registro dei Matrimoni")
        
        registro_text = f"(vol. {dati_matrimonio.get('volume', '')}  pag. {dati_matrimonio.get('pagina', '')}  num. {dati_matrimonio.get('numero_atto', '')}) risulta che:"
        c.drawString(x_start + 50*mm, y, registro_text)
        
        y -= 15
        
        # Sposo
        c.setFont("Helvetica-Bold", 11)
        sposo_text = f"{dati_sposo['cognome']} {dati_sposo['nome']}"
        c.drawString(30*mm, y, sposo_text)
        
        y -= 12
        
        c.setFont("Helvetica", 10)
        nascita_sposo = f"nato a {dati_sposo.get('luogo_nascita', '')} il {dati_sposo.get('data_nascita', '')}"
        c.drawString(30*mm, y, nascita_sposo)
        
        y -= 15
        
        c.drawString(30*mm, y, "e")
        
        y -= 12
        
        # Sposa
        c.setFont("Helvetica-Bold", 11)
        sposa_text = f"{dati_sposa['cognome']} {dati_sposa['nome']}"
        c.drawString(30*mm, y, sposa_text)
        
        y -= 12
        
        c.setFont("Helvetica", 10)
        nascita_sposa = f"nata a {dati_sposa.get('luogo_nascita', '')} il {dati_sposa.get('data_nascita', '')}"
        c.drawString(30*mm, y, nascita_sposa)
        
        y -= 15
        
        # Hanno contratto matrimonio
        data_mat = dati_matrimonio.get('data_matrimonio', '')
        celebrante = dati_matrimonio.get('celebrante', '')
        
        c.drawString(30*mm, y, f"hanno contratto matrimonio il giorno {data_mat}")
        
        y -= 12
        
        c.drawString(30*mm, y, f"davanti al celebrante {celebrante}")
        
        self._draw_footer(c, datetime.now())
        
        c.save()
        
        return filepath


# ============================================
# FUNZIONE GENERA NUMERO PROTOCOLLO
# ============================================

def genera_numero_protocollo(parrocchia_id: str, tipo_sacramento: str, anno: int = None) -> str:
    """
    Genera numero di protocollo per il certificato.
    Formato: PARR-TIPO-ANNO-NUMERO
    
    Args:
        parrocchia_id: ID parrocchia (prime 4 lettere)
        tipo_sacramento: 'BAT', 'CRE', 'MAT', 'BAT-M' (battesimo matrimonio), 'BAT-A' (battesimo annotazioni), 'BAT-S' (battesimo semplice)
        anno: Anno (default: anno corrente)
    
    Returns:
        str: Numero protocollo
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


# Alias per compatibilità con vecchio codice
CertificatoGenerator = CertificatoGeneratorCEI
