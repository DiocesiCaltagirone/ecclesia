import psycopg2
from dotenv import load_dotenv
import os
from urllib.parse import urlparse

# Leggi .env
load_dotenv()
db_url = os.getenv('DATABASE_URL')

# Parse URL
result = urlparse(db_url)

# Connetti
conn = psycopg2.connect(
    database=result.path[1:],
    user=result.username,
    password=result.password,
    host=result.hostname,
    port=result.port
)

cur = conn.cursor()

# Aggiorna constraint
sql = '''
ALTER TABLE registri_contabili DROP CONSTRAINT IF EXISTS registri_contabili_tipo_check;

ALTER TABLE registri_contabili ADD CONSTRAINT registri_contabili_tipo_check 
CHECK (tipo IN ('cassa', 'banca', 'postale', 'debito', 'credito', 'prepagata', 'deposito', 'risparmio', 'polizza', 'titoli'));
'''

cur.execute(sql)
conn.commit()

print('✅ Constraint aggiornato con successo!')

cur.close()
conn.close()
