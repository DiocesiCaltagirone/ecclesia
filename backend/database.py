from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Carica variabili d'ambiente
load_dotenv()

# URL database da .env
DATABASE_URL = os.getenv("DATABASE_URL")

# Engine PostgreSQL
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base per i modelli
Base = declarative_base()

# Dependency per ottenere la sessione DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# ============================================
# Funzione per connessione diretta (per sistema permessi)
# ============================================
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    """
    Ottiene connessione diretta al database PostgreSQL.
    Usata dal sistema permessi per query ottimizzate.
    """
    # Estrai parametri da DATABASE_URL
    # Formato: postgresql://user:password@host:port/database
    
    import re
    match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', DATABASE_URL)
    
    if not match:
        raise ValueError("DATABASE_URL non valido")
    
    user, password, host, port, database = match.groups()
    
    conn = psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password
    )
    
    return conn