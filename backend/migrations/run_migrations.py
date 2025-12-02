#!/usr/bin/env python3
"""
============================================
ECCLESIA - Sistema Migrations Automatico
============================================
Esegue automaticamente tutte le migrations SQL pendenti.
Traccia lo storico nella tabella 'schema_migrations'.

USO:
    python run_migrations.py              # Esegue migrations pendenti
    python run_migrations.py --status     # Mostra stato migrations
    python run_migrations.py --init       # Inizializza tabella + segna come eseguite
    python run_migrations.py --mark-all   # Segna tutte come già eseguite (senza eseguirle)

AMBIENTI:
    - Locale: usa localhost:5432
    - Docker: rileva automaticamente il container
"""

import os
import sys
import glob
import argparse
from pathlib import Path
from datetime import datetime

# ============================================
# CONFIGURAZIONE DATABASE
# ============================================

def get_db_config():
    """Determina configurazione database in base all'ambiente"""
    
    # Se siamo dentro Docker, usa il nome del service
    if os.path.exists('/.dockerenv') or os.environ.get('DOCKER_CONTAINER'):
        return {
            'host': 'postgres',
            'port': '5432',
            'database': 'parrocchia_db',
            'user': 'parrocchia',
            'password': 'parrocchia2025'
        }
    
    # Altrimenti prova a leggere da .env o usa default locale
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    # Parse DATABASE_URL
                    url = line.strip().split('=', 1)[1]
                    # postgresql://user:pass@host:port/db
                    if '@' in url:
                        parts = url.replace('postgresql://', '').split('@')
                        user_pass = parts[0].split(':')
                        host_port_db = parts[1].split('/')
                        host_port = host_port_db[0].split(':')
                        return {
                            'host': host_port[0],
                            'port': host_port[1] if len(host_port) > 1 else '5432',
                            'database': host_port_db[1] if len(host_port_db) > 1 else 'parrocchia_db',
                            'user': user_pass[0],
                            'password': user_pass[1] if len(user_pass) > 1 else ''
                        }
    
    # Default: Docker locale
    return {
        'host': 'localhost',
        'port': '5432',
        'database': 'parrocchia_db',
        'user': 'parrocchia',
        'password': 'parrocchia'
    }

# ============================================
# CONNESSIONE DATABASE
# ============================================

def get_connection():
    """Crea connessione PostgreSQL"""
    try:
        import psycopg2
    except ImportError:
        print("❌ ERRORE: psycopg2 non installato")
        print("   Esegui: pip install psycopg2-binary")
        sys.exit(1)
    
    config = get_db_config()
    print(f"🔌 Connessione a {config['host']}:{config['port']}/{config['database']}")
    
    try:
        conn = psycopg2.connect(
            host=config['host'],
            port=config['port'],
            database=config['database'],
            user=config['user'],
            password=config['password']
        )
        conn.autocommit = False
        return conn
    except Exception as e:
        print(f"❌ ERRORE connessione: {e}")
        sys.exit(1)

# ============================================
# GESTIONE MIGRATIONS
# ============================================

def init_migrations_table(conn):
    """Crea tabella schema_migrations se non esiste"""
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT NOW(),
            checksum VARCHAR(64)
        )
    """)
    conn.commit()
    cur.close()

def get_executed_migrations(conn):
    """Ritorna set dei filename già eseguiti"""
    cur = conn.cursor()
    cur.execute("SELECT filename FROM schema_migrations")
    result = {row[0] for row in cur.fetchall()}
    cur.close()
    return result

def get_sql_files(migrations_dir):
    """Trova tutti i file .sql ordinati per nome"""
    pattern = os.path.join(migrations_dir, "*.sql")
    files = sorted(glob.glob(pattern))
    return files

def calculate_checksum(filepath):
    """Calcola hash MD5 del file"""
    import hashlib
    with open(filepath, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def execute_migration(conn, filepath):
    """Esegue una singola migration"""
    filename = os.path.basename(filepath)
    checksum = calculate_checksum(filepath)
    
    print(f"\n📄 Esecuzione: {filename}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    cur = conn.cursor()
    try:
        # Esegui SQL
        cur.execute(sql_content)
        
        # Registra nella tabella tracking
        cur.execute("""
            INSERT INTO schema_migrations (filename, checksum)
            VALUES (%s, %s)
            ON CONFLICT (filename) DO NOTHING
        """, (filename, checksum))
        
        conn.commit()
        print(f"   ✅ Completata")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"   ❌ ERRORE: {e}")
        return False
    finally:
        cur.close()

def mark_as_executed(conn, filepath):
    """Segna una migration come eseguita senza eseguirla"""
    filename = os.path.basename(filepath)
    checksum = calculate_checksum(filepath)
    
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO schema_migrations (filename, checksum)
        VALUES (%s, %s)
        ON CONFLICT (filename) DO NOTHING
    """, (filename, checksum))
    conn.commit()
    cur.close()
    print(f"   📌 Segnata: {filename}")

# ============================================
# COMANDI
# ============================================

def show_status(conn, migrations_dir):
    """Mostra stato delle migrations"""
    executed = get_executed_migrations(conn)
    sql_files = get_sql_files(migrations_dir)
    
    print("\n" + "=" * 60)
    print("📊 STATO MIGRATIONS")
    print("=" * 60)
    
    if not sql_files:
        print("   Nessun file .sql trovato")
        return
    
    for filepath in sql_files:
        filename = os.path.basename(filepath)
        status = "✅ Eseguita" if filename in executed else "⏳ Pendente"
        print(f"   {status} - {filename}")
    
    pending = [f for f in sql_files if os.path.basename(f) not in executed]
    print(f"\n   Totale: {len(sql_files)} | Eseguite: {len(executed)} | Pendenti: {len(pending)}")
    print("=" * 60)

def run_migrations(conn, migrations_dir):
    """Esegue tutte le migrations pendenti"""
    executed = get_executed_migrations(conn)
    sql_files = get_sql_files(migrations_dir)
    
    pending = [f for f in sql_files if os.path.basename(f) not in executed]
    
    if not pending:
        print("\n✅ Database aggiornato - nessuna migration pendente")
        return True
    
    print(f"\n📋 Migrations pendenti: {len(pending)}")
    
    success = 0
    failed = 0
    
    for filepath in pending:
        if execute_migration(conn, filepath):
            success += 1
        else:
            failed += 1
            print(f"\n❌ Migration fallita. Interrompo.")
            return False
    
    print(f"\n{'=' * 60}")
    print(f"✅ Completate {success} migrations")
    print(f"{'=' * 60}")
    return True

def mark_all_executed(conn, migrations_dir):
    """Segna tutte le migrations come eseguite (senza eseguirle)"""
    sql_files = get_sql_files(migrations_dir)
    
    print(f"\n📌 Segno {len(sql_files)} migrations come già eseguite...")
    
    for filepath in sql_files:
        mark_as_executed(conn, filepath)
    
    print(f"\n✅ Tutte le migrations sono ora tracciate")

# ============================================
# MAIN
# ============================================

def main():
    parser = argparse.ArgumentParser(
        description='ECCLESIA - Sistema Migrations Automatico',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Esempi:
  python run_migrations.py              # Esegue migrations pendenti
  python run_migrations.py --status     # Mostra stato
  python run_migrations.py --init       # Prima esecuzione (inizializza + segna esistenti)
  python run_migrations.py --mark-all   # Segna tutte come eseguite
        """
    )
    parser.add_argument('--status', action='store_true', help='Mostra stato migrations')
    parser.add_argument('--init', action='store_true', help='Inizializza e segna migrations esistenti')
    parser.add_argument('--mark-all', action='store_true', help='Segna tutte come eseguite')
    
    args = parser.parse_args()
    
    print("""
╔═══════════════════════════════════════════════════════════╗
║         ECCLESIA - Sistema Migrations Automatico          ║
╚═══════════════════════════════════════════════════════════╝
    """)
    
    # Directory migrations (dove si trova questo script)
    migrations_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"📁 Directory: {migrations_dir}")
    
    # Connessione
    conn = get_connection()
    print("✅ Connesso al database")
    
    # Inizializza tabella tracking
    init_migrations_table(conn)
    
    try:
        if args.status:
            show_status(conn, migrations_dir)
        elif args.init:
            # Prima esecuzione: segna tutte come eseguite
            print("\n🔧 Inizializzazione sistema migrations...")
            mark_all_executed(conn, migrations_dir)
            show_status(conn, migrations_dir)
        elif args.mark_all:
            mark_all_executed(conn, migrations_dir)
        else:
            run_migrations(conn, migrations_dir)
    finally:
        conn.close()

if __name__ == "__main__":
    main()