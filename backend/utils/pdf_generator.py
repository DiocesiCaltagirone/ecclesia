"""
Utility per generazione PDF rendiconti con WeasyPrint
"""
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from datetime import datetime
from decimal import Decimal

# Directory base
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
UPLOADS_DIR = BASE_DIR / "uploads"
RENDICONTI_DIR = UPLOADS_DIR / "rendiconti"

# Crea directory se non esistono
RENDICONTI_DIR.mkdir(parents=True, exist_ok=True)


def formatta_euro(valore):
    """
    Formatta un numero come valuta europea
    Es: 1234.56 → "1.234,56"
    """
    if valore is None:
        return "0,00"
    
    # Converti in Decimal se necessario
    if not isinstance(valore, Decimal):
        valore = Decimal(str(valore))
    
    # Formatta con separatori
    valore_str = f"{valore:,.2f}"
    
    # Sostituisci , con . per migliaia e . con , per decimali (stile italiano)
    valore_str = valore_str.replace(",", "X").replace(".", ",").replace("X", ".")
    
    return valore_str


def formatta_data(data):
    """
    Formatta una data in formato italiano
    Es: 2024-01-15 → "15/01/2024"
    """
    if isinstance(data, str):
        try:
            data = datetime.fromisoformat(data.replace('Z', '+00:00'))
        except:
            return data
    
    if isinstance(data, datetime):
        return data.strftime("%d/%m/%Y")
    
    return str(data)


def genera_pdf_rendiconto(dati: dict, output_path: str = None) -> str:
    """
    Genera PDF rendiconto da template Jinja2
    
    Args:
        dati: Dizionario con tutti i dati per il template
        output_path: Path dove salvare il PDF (opzionale)
    
    Returns:
        Path del PDF generato
    """
    # Setup Jinja2
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    env.filters['formatta_euro'] = formatta_euro
    env.filters['formatta_data'] = formatta_data
    
    # Carica template
    template = env.get_template('rendiconto.html')
    
    # Renderizza HTML
    html_content = template.render(**dati)
    
    # Genera nome file se non specificato
    if not output_path:
        anno = dati.get('anno', datetime.now().year)
        rendiconto_id = dati.get('rendiconto_id', 'temp')
        filename = f"rendiconto_{anno}_{rendiconto_id}.pdf"
        output_path = RENDICONTI_DIR / filename
    else:
        output_path = Path(output_path)
    
    # Crea directory se non esiste
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Genera PDF con WeasyPrint
    HTML(string=html_content, base_url=str(BASE_DIR)).write_pdf(str(output_path))
    
    return str(output_path)


def salva_firma_vescovo(file, rendiconto_id: str) -> str:
    """
    Salva immagine firma vescovo
    
    Returns:
        Path del file salvato
    """
    # Directory firme
    firme_dir = UPLOADS_DIR / "firme"
    firme_dir.mkdir(parents=True, exist_ok=True)
    
    # Nome file
    ext = Path(file.filename).suffix
    filename = f"firma_vescovo_{rendiconto_id}{ext}"
    filepath = firme_dir / filename
    
    # Salva file
    with open(filepath, 'wb') as f:
        f.write(file.file.read())
    
    return str(filepath)


def salva_timbro_diocesi(file, rendiconto_id: str) -> str:
    """
    Salva immagine timbro diocesi
    
    Returns:
        Path del file salvato
    """
    # Directory timbri
    timbri_dir = UPLOADS_DIR / "timbri"
    timbri_dir.mkdir(parents=True, exist_ok=True)
    
    # Nome file
    ext = Path(file.filename).suffix
    filename = f"timbro_diocesi_{rendiconto_id}{ext}"
    filepath = timbri_dir / filename
    
    # Salva file
    with open(filepath, 'wb') as f:
        f.write(file.file.read())
    
    return str(filepath)


def valida_immagine(file) -> bool:
    """
    Valida che il file sia un'immagine valida
    """
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
    
    # Verifica estensione
    ext = Path(file.filename).suffix.lower().replace('.', '')
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Estensione non valida. Ammesse: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Verifica dimensione
    file.file.seek(0, 2)  # Vai alla fine del file
    file_size = file.file.tell()
    file.file.seek(0)  # Torna all'inizio
    
    if file_size > MAX_FILE_SIZE:
        raise ValueError("File troppo grande (max 2MB)")
    
    # Verifica che sia davvero un'immagine
    try:
        from PIL import Image
        img = Image.open(file.file)
        img.verify()
        file.file.seek(0)  # Reset per uso successivo
    except Exception as e:
        raise ValueError(f"File non è un'immagine valida: {str(e)}")
    
    return True
