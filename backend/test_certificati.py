#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script di test per generare certificati di esempio
"""

import sys
import os

# Aggiungi path backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from certificati import CertificatoGenerator
from datetime import datetime, date

def test_certificato_battesimo():
    """Genera un certificato di battesimo di prova"""
    
    print("📄 Generazione certificato di BATTESIMO di prova...")
    
    # Inizializza generatore
    generator = CertificatoGenerator(output_path="test_certificati")
    
    # Dati FITTIZI per test
    dati_persona = {
        'cognome': 'ROSSI',
        'nome': 'Mario',
        'data_nascita': '15/03/2020',
        'luogo_nascita': 'Caltagirone (CT)'
    }
    
    dati_battesimo = {
        'data_battesimo': '10/05/2020',
        'volume': 'XV',
        'pagina': '142',
        'numero_atto': '25',
        'celebrante': 'Don Giuseppe Bianchi',
        'padrino': 'Giovanni Verdi',
        'madrina': 'Maria Neri',
        'note': '',
        'padre': 'Luigi Rossi',
        'madre': 'Anna Gialli'
    }
    
    dati_parrocchia = {
        'diocesi_id': 'caltagirone',
        'diocesi_nome': 'DIOCESI DI CALTAGIRONE',
        'denominazione': 'Parrocchia San Francesco di Paola',
        'indirizzo': 'Via Roma, 123',
        'comune': 'Caltagirone',
        'provincia': 'CT',
        'telefono': '0933 123456',
        'email': 'info@sanfrancesco.it'
    }
    
    numero_protocollo = 'SFRA-BAT-2024-0001'
    parroco_nome = 'Don Antonio Russo'
    
    # Genera PDF
    try:
        filepath = generator.genera_certificato_battesimo(
            dati_persona=dati_persona,
            dati_battesimo=dati_battesimo,
            dati_parrocchia=dati_parrocchia,
            numero_protocollo=numero_protocollo,
            parroco_nome=parroco_nome
        )
        
        print(f"✅ Certificato generato con successo!")
        print(f"📁 File salvato in: {filepath}")
        print(f"\n🔍 Apri il file per vedere il risultato!")
        
        return filepath
        
    except Exception as e:
        print(f"❌ Errore: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_certificato_cresima():
    """Genera un certificato di cresima di prova"""
    
    print("\n📄 Generazione certificato di CRESIMA di prova...")
    
    generator = CertificatoGenerator(output_path="test_certificati")
    
    dati_persona = {
        'cognome': 'BIANCHI',
        'nome': 'Laura',
        'data_nascita': '20/08/2010',
        'luogo_nascita': 'Catania (CT)'
    }
    
    dati_cresima = {
        'data_cresima': '15/05/2024',
        'volume': 'VIII',
        'pagina': '87',
        'numero_atto': '12',
        'ministro': 'S.E. Mons. Calogero Peri',
        'padrino': 'Paolo Verdi',
        'note': ''
    }
    
    dati_parrocchia = {
        'diocesi_id': 'caltagirone',
        'diocesi_nome': 'DIOCESI DI CALTAGIRONE',
        'denominazione': 'Parrocchia San Francesco di Paola',
        'indirizzo': 'Via Roma, 123',
        'comune': 'Caltagirone',
        'provincia': 'CT',
        'telefono': '0933 123456',
        'email': 'info@sanfrancesco.it'
    }
    
    numero_protocollo = 'SFRA-CRE-2024-0001'
    parroco_nome = 'Don Antonio Russo'
    
    try:
        filepath = generator.genera_certificato_cresima(
            dati_persona=dati_persona,
            dati_cresima=dati_cresima,
            dati_parrocchia=dati_parrocchia,
            numero_protocollo=numero_protocollo,
            parroco_nome=parroco_nome
        )
        
        print(f"✅ Certificato generato con successo!")
        print(f"📁 File salvato in: {filepath}")
        
        return filepath
        
    except Exception as e:
        print(f"❌ Errore: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_certificato_matrimonio():
    """Genera un certificato di matrimonio di prova"""
    
    print("\n📄 Generazione certificato di MATRIMONIO di prova...")
    
    generator = CertificatoGenerator(output_path="test_certificati")
    
    dati_sposo = {
        'cognome': 'VERDI',
        'nome': 'Giuseppe',
        'data_nascita': '12/02/1990',
        'luogo_nascita': 'Caltagirone (CT)'
    }
    
    dati_sposa = {
        'cognome': 'ROSSI',
        'nome': 'Anna',
        'data_nascita': '25/07/1992',
        'luogo_nascita': 'Catania (CT)'
    }
    
    dati_matrimonio = {
        'data_matrimonio': '15/06/2024',
        'volume': 'XX',
        'pagina': '45',
        'numero_atto': '8',
        'celebrante': 'Don Antonio Russo'
    }
    
    dati_parrocchia = {
        'diocesi_id': 'caltagirone',
        'diocesi_nome': 'DIOCESI DI CALTAGIRONE',
        'denominazione': 'Parrocchia San Francesco di Paola',
        'indirizzo': 'Via Roma, 123',
        'comune': 'Caltagirone',
        'provincia': 'CT',
        'telefono': '0933 123456',
        'email': 'info@sanfrancesco.it'
    }
    
    numero_protocollo = 'SFRA-MAT-2024-0001'
    parroco_nome = 'Don Antonio Russo'
    
    try:
        filepath = generator.genera_certificato_matrimonio(
            dati_sposo=dati_sposo,
            dati_sposa=dati_sposa,
            dati_matrimonio=dati_matrimonio,
            dati_parrocchia=dati_parrocchia,
            numero_protocollo=numero_protocollo,
            parroco_nome=parroco_nome
        )
        
        print(f"✅ Certificato generato con successo!")
        print(f"📁 File salvato in: {filepath}")
        
        return filepath
        
    except Exception as e:
        print(f"❌ Errore: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    print("=" * 60)
    print("🧪 TEST GENERAZIONE CERTIFICATI")
    print("=" * 60)
    print()
    
    # Genera tutti i certificati di test
    test_certificato_battesimo()
    test_certificato_cresima()
    test_certificato_matrimonio()
    
    print()
    print("=" * 60)
    print("✅ Test completato!")
    print("📁 I PDF sono nella cartella: test_certificati/")
    print("=" * 60)
