"""
COSTANTI GLOBALI — EcclesiaWeb
==============================
Enum per tutti i valori fissi usati nel progetto.
Usare sempre queste costanti invece di stringhe letterali.

IMPORTANTE: I valori stringa devono corrispondere esattamente
a quelli nel database. NON cambiare i valori, solo i nomi.
"""

from enum import Enum


class StatoRendiconto(str, Enum):
    """Stati del ciclo di vita di un rendiconto."""
    BOZZA = "bozza"
    PARROCCHIA = "parrocchia"   # inviato alla parrocchia per revisione
    INVIATO = "inviato"         # inviato alla diocesi
    APPROVATO = "approvato"
    RESPINTO = "respinto"
    DEFINITIVO = "definitivo"  # rendiconto precedente chiuso


class RuoloUtente(str, Enum):
    """Ruoli degli utenti nel sistema."""
    PARROCO = "parroco"
    ECONOMO = "economo"
    OPERATORE = "operatore"


class TipoMovimento(str, Enum):
    """Tipo di movimento contabile."""
    ENTRATA = "entrata"
    USCITA = "uscita"


class TipoSpecialeMovimento(str, Enum):
    """Tipo speciale per movimenti non ordinari."""
    SALDO_INIZIALE = "saldo_iniziale"
    GIROCONTO = "giroconto"


class TipoRegistro(str, Enum):
    """Tipo di registro contabile."""
    CASSA = "cassa"
    BANCA = "banca"
