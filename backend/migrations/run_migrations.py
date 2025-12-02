#!/usr/bin/env python3
"""
Sistema di migrations automatico per Ecclesia
Tiene traccia delle migrations eseguite in una tabella schema_migrations
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Aggiungi path per imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Carica variabili ambiente
load_dotenv(Path(__file__).parent.parent / '.env')

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/parrocchia')

def get_engine():
    return create_engine(DATABASE_URL)

def init_migrations_table(engine):
    """Crea tabella schema_migrations se non esiste"""
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.commit()
    print("✅ Tabella schema_migrations pronta")

def get_executed_migrations(engine):
    """Ritorna lista migrations già eseguite"""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT filename FROM schema_migrations ORDER BY filename"))
        return [row[0] for row in result]

def get_pending_migrations(migrations_dir, executed):
    """Trova migrations da eseguire"""
    sql_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])
    return [f for f in sql_files if f not in executed]

def run_migration(engine, migrations_dir, filename):
    """Esegue una singola migration"""
    filepath = os.path.join(migrations_dir, filename)
    
    with open(filepath, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    with engine.connect() as conn:
        # Esegui migration
        conn.execute(text(sql_content))
        
        # Registra esecuzione
        conn.execute(text("""
            INSERT INTO schema_migrations (filename) VALUES (:filename)
        """), {"filename": filename})
        
        conn.commit()
    
    print(f"✅ Eseguita: {filename}")

def run_all_migrations():
    """Esegue tutte le migrations pendenti"""
    migrations_dir = Path(__file__).parent
    
    print("=" * 50)
    print("🚀 ECCLESIA - Sistema Migrations")
    print("=" * 50)
    
    engine = get_engine()
    
    # Inizializza tabella tracking
    init_migrations_table(engine)
    
    # Trova migrations pendenti
    executed = get_executed_migrations(engine)
    pending = get_pending_migrations(migrations_dir, executed)
    
    if not pending:
        print("✅ Nessuna migration da eseguire")
        return
    
    print(f"📋 Migrations pendenti: {len(pending)}")
    
    for filename in pending:
        try:
            run_migration(engine, migrations_dir, filename)
        except Exception as e:
            print(f"❌ ERRORE in {filename}: {e}")
            sys.exit(1)
    
    print("=" * 50)
    print(f"✅ Completate {len(pending)} migrations")
    print("=" * 50)

if __name__ == "__main__":
    run_all_migrations()