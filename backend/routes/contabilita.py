"""
MODULO CONTABILITÀ PARROCCHIALE
================================

Gestione completa della contabilità parrocchiale:
- CRUD Registri contabili (conti)
- CRUD Categorie (piano dei conti)
- CRUD Movimenti contabili
- Sistema allegati per movimenti
- Generazione report personalizzati
- API rendiconti per economo
- Download PDF rendiconti con firma digitale

Author: Sistema Parrocchia
Version: 1.0
Date: 2025-11-29
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from pathlib import Path
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal
import os
import time
import uuid
import shutil

from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/contabilita", tags=["contabilita"])

# ============================================
# CONFIGURAZIONE DIRECTORY
# ============================================

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

RENDICONTI_DIR = Path("rendiconti")
RENDICONTI_DIR.mkdir(exist_ok=True)

# ============================================
# CONFIGURAZIONE ALLEGATI
# ============================================

ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
]

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# ============================================
# ENDPOINTS: REGISTRI CONTABILI (CONTI)
# ============================================

@router.post("/registri", status_code=status.HTTP_201_CREATED)
def create_registro(
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Crea nuovo registro contabile (conto bancario/postale)
    
    Se viene fornito un saldo_iniziale > 0, crea automaticamente
    un movimento speciale di tipo 'saldo_iniziale' alla data odierna.
    """
    try:
        ente_id = current_user.get('ente_id') or x_ente_id
        
        if not ente_id:
            raise HTTPException(status_code=400, detail="Ente ID mancante")
        
        registro_id = str(uuid.uuid4())
        tipo = data.get('tipo')
        nome = data.get('nome')
        saldo_iniziale = float(data.get('saldo_iniziale', 0))
        data_inizio = data.get('data_inizio') or datetime.now().strftime('%Y-%m-%d')
        
        print(f"📊 Creazione conto: {nome} - Saldo iniziale: {saldo_iniziale}")
        
        # Crea il registro (saldo_attuale calcolato dai movimenti)
        query_conto = text("""
            INSERT INTO registri_contabili (
                id, ente_id, tipo, nome, saldo_attuale, attivo
            ) VALUES (
                :id, :ente_id, :tipo, :nome, 0, TRUE
            )
            RETURNING id, nome, tipo
        """)
        
        result = db.execute(query_conto, {
            "id": registro_id,
            "ente_id": ente_id,
            "tipo": tipo,
            "nome": nome
        })
        
        row = result.fetchone()
        
        # Se saldo iniziale > 0, crea movimento automatico
        if saldo_iniziale >= 0:  # Crea sempre il movimento, anche se importo è 0
            print(f"✅ Creo movimento saldo iniziale: €{saldo_iniziale}")
            
            movimento_id = str(uuid.uuid4())
            categoria_riporto_id = None
            
            query_movimento = text("""
                INSERT INTO movimenti_contabili (
                    id, ente_id, registro_id, categoria_id,
                    data_movimento, tipo_movimento, importo,
                    causale, bloccato, tipo_speciale, created_by
                ) VALUES (
                    :id, :ente_id, :registro_id, :categoria_id,
                    :data_inizio, 'entrata', :importo,
                    'Saldo iniziale alla creazione del conto',
                    FALSE, 'saldo_iniziale', :user_id
                )
            """)
            
            db.execute(query_movimento, {
                "id": movimento_id,
                "ente_id": ente_id,
                "registro_id": registro_id,
                "categoria_id": categoria_riporto_id,
                "importo": saldo_iniziale,
                "data_inizio": data_inizio,
                "user_id": current_user.get('id')
            })
            
            print(f"✅ Movimento saldo iniziale creato: ID {movimento_id}")
        
        db.commit()
        
        saldo_reale = saldo_iniziale
        
        return {
            "id": str(row[0]),
            "nome": row[1],
            "tipo": row[2],
            "saldo_attuale": saldo_reale
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ ERRORE creazione conto: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/registri/{registro_id}")
def update_registro(
    registro_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Modifica registro contabile (nome, tipo e saldo iniziale)
    
    Il saldo iniziale può essere modificato solo se non esistono
    rendiconti approvati che includono questo conto.
    """
    ente_id = current_user.get('ente_id') or x_ente_id
    nuovo_saldo_iniziale = data.get("saldo_iniziale")
    
    # Se si vuole modificare il saldo iniziale, verifica rendiconti approvati
    if nuovo_saldo_iniziale is not None:
        check_rendiconti = """
            SELECT COUNT(*) FROM rendiconti r
            WHERE r.ente_id = :ente_id
            AND r.stato = 'approvato'
            AND EXISTS (
                SELECT 1 FROM movimenti_contabili m
                WHERE m.rendiconto_id = r.id
                AND m.registro_id = :registro_id
            )
        """
        result = db.execute(text(check_rendiconti), {
            "ente_id": ente_id,
            "registro_id": registro_id
        })
        count = result.fetchone()[0]
        
        if count > 0:
            raise HTTPException(
                status_code=400,
                detail="Impossibile modificare il saldo iniziale: esistono rendiconti approvati per questo conto"
            )
        
        # Aggiorna o crea il movimento di saldo iniziale
        nuovo_saldo = float(nuovo_saldo_iniziale)
        
        # Cerca movimento saldo iniziale esistente
        check_movimento = """
            SELECT id, importo FROM movimenti_contabili
            WHERE registro_id = :registro_id
            AND tipo_speciale = 'saldo_iniziale'
        """
        mov_result = db.execute(text(check_movimento), {"registro_id": registro_id}).fetchone()
        
        if nuovo_saldo > 0:
            if mov_result:
                # Aggiorna movimento esistente
                update_mov = """
                    UPDATE movimenti_contabili
                    SET importo = :importo
                    WHERE id = :id
                """
                db.execute(text(update_mov), {
                    "id": mov_result[0],
                    "importo": nuovo_saldo
                })
            else:
                # Crea nuovo movimento saldo iniziale
                import uuid
                movimento_id = str(uuid.uuid4())
                insert_mov = """
                    INSERT INTO movimenti_contabili (
                        id, ente_id, registro_id, categoria_id,
                        data_movimento, tipo_movimento, importo,
                        causale, bloccato, tipo_speciale, created_by
                    ) VALUES (
                        :id, :ente_id, :registro_id, NULL,
                        CURRENT_DATE, 'entrata', :importo,
                        'Saldo iniziale alla creazione del conto',
                        FALSE, 'saldo_iniziale', :user_id
                    )
                """
                db.execute(text(insert_mov), {
                    "id": movimento_id,
                    "ente_id": ente_id,
                    "registro_id": registro_id,
                    "importo": nuovo_saldo,
                    "user_id": current_user.get('user_id')
                })
        else:
            # Se saldo = 0, elimina movimento saldo iniziale se esiste
            if mov_result:
                delete_mov = """
                    DELETE FROM movimenti_contabili WHERE id = :id
                """
                db.execute(text(delete_mov), {"id": mov_result[0]})
    
    # Aggiorna nome e tipo del registro
    query = """
        UPDATE registri_contabili 
        SET nome = :nome,
            tipo = :tipo
        WHERE id = :id AND ente_id = :ente_id
        RETURNING id, nome, tipo, saldo_attuale
    """
    
    result = db.execute(text(query), {
        "id": registro_id,
        "ente_id": ente_id,
        "nome": data.get("nome"),
        "tipo": data.get("tipo")
    })
    
    db.commit()
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Registro non trovato")
    
    return {
        "id": str(row[0]),
        "nome": row[1],
        "tipo": row[2],
        "saldo_attuale": float(row[3]) if row[3] is not None else 0.0
    }


@router.delete("/registri/{registro_id}")
def delete_registro(
    registro_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Elimina registro contabile (soft delete)
    
    Verifica che non ci siano movimenti NON di saldo iniziale prima di procedere.
    Elimina automaticamente i movimenti di saldo iniziale.
    Rimuove anche le associazioni con le categorie del piano dei conti.
    """
    ente_id = current_user.get('ente_id') or x_ente_id
    
    # Verifica movimenti NON di saldo iniziale
    check_query = """
        SELECT COUNT(*) FROM movimenti_contabili 
        WHERE registro_id = :registro_id
        AND (tipo_speciale IS NULL OR tipo_speciale != 'saldo_iniziale')
    """
    result = db.execute(text(check_query), {"registro_id": registro_id})
    count = result.fetchone()[0]
    
    if count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Impossibile eliminare: ci sono {count} movimenti associati a questo conto"
        )
    
    # Elimina movimenti di saldo iniziale
    delete_saldo_query = """
        DELETE FROM movimenti_contabili 
        WHERE registro_id = :registro_id
        AND tipo_speciale = 'saldo_iniziale'
    """
    db.execute(text(delete_saldo_query), {"registro_id": registro_id})
    
    # Rimuovi associazioni con categorie
    remove_assoc_query = """
        DELETE FROM categorie_registri 
        WHERE registro_id = :registro_id
    """
    db.execute(text(remove_assoc_query), {"registro_id": registro_id})
    
    # Hard delete del registro
    query = """
        DELETE FROM registri_contabili
        WHERE id = :id AND ente_id = :ente_id
        RETURNING id, nome
    """
    
    result = db.execute(text(query), {
        "id": registro_id,
        "ente_id": ente_id
    })
    
    db.commit()
    
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro non trovato")
    
    return {
        "message": "Registro eliminato con successo",
        "id": str(row[0]),
        "nome": row[1]
    }


@router.get("/registri")
async def get_registri(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Restituisce tutti i registri contabili dell'ente con saldo calcolato.
    
    Il saldo viene calcolato dalla somma di tutti i movimenti (entrate - uscite),
    includendo anche i movimenti speciali di tipo 'saldo_iniziale'.
    """
    try:
        print("=" * 80)
        print("🔍 DEBUG /registri")
        
        ente_id = current_user.get('ente_id') or x_ente_id
        
        if not ente_id:
            raise HTTPException(status_code=400, detail="Ente ID mancante")
        
        # Calcola saldo SOLO dai movimenti NON bloccati
        # Include anche il saldo_iniziale dal movimento speciale
        query = text("""
            SELECT 
                r.id, 
                r.nome, 
                r.tipo, 
                r.descrizione, 
                r.attivo,
                COALESCE(
                    (SELECT SUM(
                        CASE 
                            WHEN m.tipo_movimento = 'entrata' THEN m.importo
                            WHEN m.tipo_movimento = 'uscita' THEN -m.importo
                            ELSE 0
                        END
                    )
                    FROM movimenti_contabili m
                    WHERE m.registro_id = r.id
                      AND m.ente_id = :ente_id
                      AND (m.bloccato = FALSE OR m.bloccato IS NULL)),
                    0
                ) as saldo_attuale,
                COALESCE(
                    (SELECT m.importo
                    FROM movimenti_contabili m
                    WHERE m.registro_id = r.id
                      AND m.tipo_speciale = 'saldo_iniziale'
                    LIMIT 1),
                    0
                ) as saldo_iniziale
            FROM registri_contabili r
            WHERE r.ente_id = :ente_id
              AND r.attivo = TRUE
            ORDER BY r.nome
        """)
        
        result = db.execute(query, {"ente_id": ente_id})
        
        registri = []
        for row in result:
            saldo_attuale = float(row[5]) if row[5] else 0.0
            saldo_iniziale = float(row[6]) if row[6] else 0.0
            
            print(f"📊 Conto: {row[1]} - Saldo: {saldo_attuale} - Saldo Iniziale: {saldo_iniziale}")
            
            registri.append({
                "id": str(row[0]),
                "nome": row[1],
                "tipo": row[2],
                "descrizione": row[3],
                "saldo_attuale": saldo_attuale,
                "saldo_iniziale": saldo_iniziale,
                "attivo": row[4]
            })
        
        print(f"✅ Trovati {len(registri)} registri")
        print("=" * 80)
        return registri
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERRORE: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ENDPOINTS: CATEGORIE (PIANO DEI CONTI)
# ============================================

@router.get("/categorie")
def get_categorie(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Lista categorie del piano dei conti con registri abilitati.
    
    Restituisce anche la lista di tutti i conti attivi per permettere
    l'associazione categorie-registri nell'interfaccia.
    """
    ente_id = current_user.get('ente_id') or x_ente_id
    
    # Query categorie
    query_cat = """
        SELECT id, descrizione, 
               COALESCE(categoria_padre_id, conto_padre_id) as parent_id, 
               tipo
        FROM piano_conti
        WHERE ente_id = :ente_id 
          AND (is_sistema = FALSE OR is_sistema IS NULL)
        ORDER BY CAST(NULLIF(REGEXP_REPLACE(codice, '[^0-9]', '', 'g'), '') AS INTEGER) NULLS LAST, codice
    """
    categorie = db.execute(text(query_cat), {"ente_id": ente_id}).fetchall()
    
    # Query associazioni registri
    query_registri = """
        SELECT categoria_id, registro_id
        FROM categorie_registri
    """
    registri_assoc = db.execute(text(query_registri)).fetchall()
    
    # Raggruppa per categoria
    registri_per_categoria = {}
    for row in registri_assoc:
        cat_id = str(row[0])
        reg_id = str(row[1])
        if cat_id not in registri_per_categoria:
            registri_per_categoria[cat_id] = []
        registri_per_categoria[cat_id].append(reg_id)
    
    # Costruisci risposta categorie
    result = []
    for cat in categorie:
        cat_id = str(cat[0])
        result.append({
            "id": cat_id,
            "nome": cat[1],
            "parent_id": str(cat[2]) if cat[2] else None,
            "tipo": cat[3],
            "registri_abilitati": registri_per_categoria.get(cat_id, [])
        })
    
    # Query conti
    query_conti = """
        SELECT id, nome
        FROM registri_contabili
        WHERE ente_id = :ente_id AND attivo = TRUE
        ORDER BY nome
    """
    conti = db.execute(text(query_conti), {"ente_id": ente_id}).fetchall()
    
    return {
        "conti": [{"id": str(c[0]), "nome": c[1]} for c in conti],
        "categorie": result
    }


@router.post("/categorie")
def create_categoria(
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Crea nuova categoria nel piano dei conti.
    
    Genera automaticamente un codice progressivo e calcola
    il livello gerarchico in base alla categoria padre.
    """
    ente_id = current_user.get('ente_id') or x_ente_id
    categoria_id = str(uuid.uuid4())
    
    # Genera codice automatico progressivo
    codice_query = """
        SELECT COALESCE(MAX(CAST(NULLIF(codice, '') AS INTEGER)), 0) + 1 as next_code
        FROM piano_conti
        WHERE ente_id = :ente_id AND codice ~ '^[0-9]+$'
    """
    result = db.execute(text(codice_query), {"ente_id": ente_id}).fetchone()
    next_code = str(result[0]).zfill(3) if result else '001'
    
    # Calcola livello gerarchico
    livello = 1
    if data.get("parent_id"):
        parent_query = "SELECT livello FROM piano_conti WHERE id = :parent_id"
        parent_result = db.execute(text(parent_query), {"parent_id": data["parent_id"]}).fetchone()
        if parent_result:
            livello = parent_result[0] + 1
    
    query = """
        INSERT INTO piano_conti (id, ente_id, codice, descrizione, tipo, categoria_padre_id, livello)
        VALUES (:id, :ente_id, :codice, :nome, 'economico', :parent_id, :livello)
    """
    
    db.execute(text(query), {
        "id": categoria_id,
        "ente_id": ente_id,
        "codice": next_code,
        "nome": data["nome"],
        "parent_id": data.get("parent_id"),
        "livello": livello
    })
    
    db.commit()
    return {"id": categoria_id, "message": "Categoria creata"}


@router.put("/categorie/{categoria_id}")
def update_categoria(
    categoria_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """Modifica categoria del piano dei conti (solo se non di sistema)"""
    ente_id = current_user.get('ente_id') or x_ente_id

    # Verifica se è categoria di sistema
    check_sistema = db.execute(text("""
        SELECT is_sistema FROM piano_conti WHERE id = :id
    """), {"id": categoria_id}).fetchone()
    
    if check_sistema and check_sistema[0]:
        raise HTTPException(403, detail="Impossibile modificare categoria di sistema")
    
    db.execute(text("""
        UPDATE piano_conti 
        SET descrizione = :nome, categoria_padre_id = :parent_id
        WHERE id = :id AND ente_id = :ente_id
    """), {
        "nome": data["nome"],
        "parent_id": data.get("parent_id"),
        "id": categoria_id,
        "ente_id": ente_id
    })
    
    db.commit()
    return {"message": "Categoria aggiornata"}


@router.delete("/categorie/{categoria_id}")
def delete_categoria(
    categoria_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Elimina categoria del piano dei conti.
    
    Verifica che non ci siano movimenti associati e che non sia
    una categoria di sistema prima di procedere.
    """
    ente_id = current_user.get('ente_id') or x_ente_id

    # Verifica se è categoria di sistema
    check_sistema = db.execute(text("""
        SELECT is_sistema FROM piano_conti WHERE id = :id
    """), {"id": categoria_id}).fetchone()
    
    if check_sistema and check_sistema[0]:
        raise HTTPException(403, detail="Impossibile eliminare categoria di sistema")
    
    # Verifica movimenti associati
    check = db.execute(text("""
        SELECT COUNT(*) FROM movimenti_contabili WHERE conto_id = :id
    """), {"id": categoria_id}).fetchone()
    
    if check[0] > 0:
        raise HTTPException(400, detail=f"Impossibile eliminare: {check[0]} movimenti associati")
    
    # Elimina associazioni e categoria
    db.execute(text("DELETE FROM categorie_registri WHERE categoria_id = :id"), {"id": categoria_id})
    db.execute(text("DELETE FROM piano_conti WHERE id = :id AND ente_id = :ente_id"), {
        "id": categoria_id, 
        "ente_id": ente_id
    })
    
    db.commit()
    return {"message": "Categoria eliminata"}


@router.post("/categorie/{categoria_id}/toggle-registro")
def toggle_registro(
    categoria_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """Abilita/disabilita associazione registro-categoria"""
    registro_id = data["registro_id"]
    enabled = data["enabled"]
    
    if enabled:
        # Aggiungi associazione
        db.execute(text("""
            INSERT INTO categorie_registri (id, categoria_id, registro_id)
            VALUES (uuid_generate_v4(), :cat_id, :reg_id)
            ON CONFLICT (categoria_id, registro_id) DO NOTHING
        """), {"cat_id": categoria_id, "reg_id": registro_id})
    else:
        # Rimuovi associazione
        db.execute(text("""
            DELETE FROM categorie_registri
            WHERE categoria_id = :cat_id AND registro_id = :reg_id
        """), {"cat_id": categoria_id, "reg_id": registro_id})
    
    db.commit()
    return {"message": "Aggiornato"}


# ============================================
# ENDPOINTS: MOVIMENTI CONTABILI
# ============================================

@router.get("/movimenti")
def get_movimenti_generali(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id"),
    registro_id: str = Query(None),
    data_da: date = Query(None),
    data_a: date = Query(None),
    tipo: str = Query(None)
):
    """
    Lista movimenti generali con filtri opzionali.
    
    Filtri disponibili:
    - registro_id: filtra per conto specifico
    - data_da/data_a: intervallo date
    - tipo: 'entrata' o 'uscita'
    
    Restituisce i movimenti con categoria completa e saldo progressivo.
    """
    ente_id = current_user.get('ente_id') or x_ente_id
    
    query = """
    SELECT 
        m.id,
        m.data_movimento,
        m.tipo_movimento,
        m.importo,
        m.descrizione,
        m.note,
        m.allegati,
        m.bloccato,
        m.tipo_speciale,
        r.nome as conto_nome,
        r.id as registro_id,
        c.id as categoria_id,
        c.descrizione as categoria_nome,
        c.categoria_padre_id,
        m.created_at
    FROM movimenti_contabili m
        LEFT JOIN registri_contabili r ON m.registro_id = r.id
        LEFT JOIN piano_conti c ON m.categoria_id = c.id
        WHERE m.ente_id = :ente_id
    """
    
    params = {"ente_id": ente_id}
    
    # Applica filtri
    if registro_id:
        query += " AND m.registro_id = :registro_id"
        params["registro_id"] = registro_id
    
    if data_da:
        query += " AND m.data_movimento >= :data_da"
        params["data_da"] = data_da
    
    if data_a:
        query += " AND m.data_movimento <= :data_a"
        params["data_a"] = data_a
    
    if tipo:
        query += " AND m.tipo_movimento = :tipo"
        params["tipo"] = tipo
    
    query += " ORDER BY m.data_movimento DESC, m.created_at DESC"
    
    movimenti = db.execute(text(query), params).fetchall()
    
    # Costruisci risposta con categoria completa
    movimenti_list = []
    for mov in movimenti:
        # Costruisci gerarchia categoria
        categoria_completa = build_categoria_completa(db, mov[11], mov[12], mov[13])
        
        movimenti_list.append({
             "id": str(mov[0]),
             "data_movimento": mov[1].isoformat() if mov[1] else None,
             "tipo_movimento": mov[2],
             "importo": float(mov[3]) if mov[3] else 0,
             "descrizione": mov[4],
             "note": mov[5],
             "allegati": mov[6] or [],
             "bloccato": mov[7],
             "tipo_speciale": mov[8],
             "conto_nome": mov[9],
             "registro_id": str(mov[10]) if mov[10] else None,
             "categoria_id": str(mov[11]) if mov[11] else None,
             "categoria_completa": categoria_completa,
             "created_at": mov[14].isoformat() if mov[14] else None
        })
    
    # Calcola saldo progressivo per ogni conto
    movimenti_con_saldo = calcola_saldo_progressivo(movimenti_list)
    
    return {"movimenti": movimenti_con_saldo}


@router.get("/movimenti/conto/{registro_id}")
def get_movimenti_conto(
    registro_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Lista movimenti di un singolo conto con saldo progressivo.
    
    I movimenti sono ordinati cronologicamente e il saldo progressivo
    viene calcolato in tempo reale (entrate - uscite).
    """
    ente_id = current_user.get('ente_id') or x_ente_id
    
    # Verifica appartenenza conto
    check_query = "SELECT nome FROM registri_contabili WHERE id = :id AND ente_id = :ente_id"
    conto = db.execute(text(check_query), {"id": registro_id, "ente_id": ente_id}).fetchone()
    
    if not conto:
        raise HTTPException(status_code=404, detail="Conto non trovato")
    
    # Query movimenti
    query = """
        SELECT 
            m.id,
            m.data_movimento,
            m.tipo_movimento,
            m.importo,
            m.descrizione,
            m.note,
            m.allegati,
            m.bloccato,
            m.tipo_speciale,
            c.id as categoria_id,
            c.descrizione as categoria_nome,
            c.categoria_padre_id,
            m.created_at
        FROM movimenti_contabili m
        LEFT JOIN piano_conti c ON m.categoria_id = c.id
        WHERE m.ente_id = :ente_id AND m.registro_id = :registro_id
        ORDER BY m.data_movimento ASC, m.created_at ASC
    """
    
    movimenti = db.execute(text(query), {"ente_id": ente_id, "registro_id": registro_id}).fetchall()
    
    # Costruisci lista con saldo progressivo
    movimenti_list = []
    saldo_progressivo = 0
    
    for mov in movimenti:
        categoria_completa = build_categoria_completa(db, mov[9], mov[10], mov[11])
        
        # Calcola saldo progressivo SOLO per movimenti NON bloccati
        if not mov[7]:  # mov[7] = bloccato
            if mov[2] == 'entrata':
                saldo_progressivo += float(mov[3])
            else:
                saldo_progressivo -= float(mov[3])
        
        movimenti_list.append({
            "id": str(mov[0]),
            "data_movimento": mov[1].isoformat() if mov[1] else None,
            "tipo_movimento": mov[2],
            "importo": float(mov[3]) if mov[3] else 0,
            "descrizione": mov[4],
            "note": mov[5],
            "allegati": mov[6] or [],
            "bloccato": mov[7],
            "tipo_speciale": mov[8],
            "categoria_id": str(mov[9]) if mov[9] else None,
            "categoria_completa": categoria_completa,
            "saldo_progressivo": round(saldo_progressivo, 2),
            "created_at": mov[12].isoformat() if mov[12] else None
        })
    
    return {
        "conto_nome": conto[0],
        "saldo_attuale": round(saldo_progressivo, 2),
        "movimenti": movimenti_list
    }


@router.post("/movimenti")
def create_movimento(
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """Crea nuovo movimento contabile"""
    ente_id = current_user.get('ente_id') or x_ente_id
    movimento_id = str(uuid.uuid4())

# 🆕 CONTROLLO: Verifica che la data non sia prima del saldo iniziale del conto
    registro_id = data.get("registro_id")
    data_movimento = data["data_movimento"]
    
    query_saldo_iniziale = text("""
        SELECT data_movimento 
        FROM movimenti_contabili 
        WHERE registro_id = :registro_id 
        AND tipo_speciale = 'saldo_iniziale'
        LIMIT 1
    """)
    saldo_iniziale = db.execute(query_saldo_iniziale, {"registro_id": registro_id}).fetchone()
    
    if saldo_iniziale:
        data_saldo = saldo_iniziale[0]
        # Converti in date se necessario
        if isinstance(data_movimento, str):
            from datetime import datetime
            data_mov_date = datetime.strptime(data_movimento, "%Y-%m-%d").date()
        else:
            data_mov_date = data_movimento
            
        if data_mov_date < data_saldo:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossibile aggiungere movimenti con data {data_movimento}. Il conto è stato creato il {data_saldo.strftime('%d/%m/%Y')}. Puoi inserire movimenti solo da quella data in poi."
            )


    # 🆕 CONTROLLO: Verifica se la data è in un periodo già chiuso (bozza o approvato)
    query_rendiconto = text("""
        SELECT periodo_fine 
        FROM rendiconti 
        WHERE ente_id = :ente_id 
        ORDER BY periodo_fine DESC 
        LIMIT 1
    """)
    ultimo_rendiconto = db.execute(query_rendiconto, {"ente_id": ente_id}).fetchone()
    
    if ultimo_rendiconto:
        periodo_chiuso_fino_a = ultimo_rendiconto[0]
        # Converti in date se necessario
        if isinstance(data_movimento, str):
            from datetime import datetime
            data_mov_date = datetime.strptime(data_movimento, "%Y-%m-%d").date()
        else:
            data_mov_date = data_movimento
            
        if data_mov_date <= periodo_chiuso_fino_a:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossibile aggiungere movimenti con data {data_movimento}. Periodo contabile chiuso fino al {periodo_chiuso_fino_a.strftime('%d/%m/%Y')}. Puoi inserire movimenti solo dal giorno successivo in poi."
            )
    
    query = """
        INSERT INTO movimenti_contabili (
            id, ente_id, registro_id, categoria_id, 
            data_movimento, tipo_movimento, importo, causale,
            descrizione, note, created_by
        )
        VALUES (
            :id, :ente_id, :registro_id, :categoria_id,
            :data_movimento, :tipo_movimento, :importo, :causale,
            :descrizione, :note, :created_by
        )
    """
    
    db.execute(text(query), {
        "id": movimento_id,
        "ente_id": ente_id,
        "registro_id": data["registro_id"],
        "categoria_id": data.get("categoria_id"),
        "data_movimento": data["data_movimento"],
        "tipo_movimento": data["tipo_movimento"],
        "importo": data["importo"],
        "causale": data.get("note", "Movimento"),
        "descrizione": data.get("descrizione", ""),
        "note": data.get("note", ""),
        "created_by": current_user.get("id")
    })
    
    db.commit()
    return {"id": movimento_id, "message": "Movimento creato"}

@router.post("/movimenti/giroconto")
def create_giroconto(
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Crea un giroconto (trasferimento tra due conti).
    
    Genera automaticamente 2 movimenti collegati:
    - Uscita dal conto origine con nota "Giroconto per C/C [destinazione]"
    - Entrata nel conto destinazione con nota "Giroconto da C/C [origine]"
    """
    try:
        ente_id = current_user.get('ente_id') or x_ente_id
        
        if not ente_id:
            raise HTTPException(status_code=400, detail="Ente ID mancante")
        
        conto_origine_id = data.get('conto_origine_id')
        conto_destinazione_id = data.get('conto_destinazione_id')
        data_movimento = data.get('data_movimento')
        importo = float(data.get('importo', 0))
        note_utente = data.get('note', '').strip()
        
        # Validazioni
        if not conto_origine_id or not conto_destinazione_id:
            raise HTTPException(status_code=400, detail="Seleziona entrambi i conti")
        
        if conto_origine_id == conto_destinazione_id:
            raise HTTPException(status_code=400, detail="I conti origine e destinazione devono essere diversi")
        
        if importo <= 0:
            raise HTTPException(status_code=400, detail="L'importo deve essere maggiore di zero")
        
        if not data_movimento:
            raise HTTPException(status_code=400, detail="Data movimento obbligatoria")
        
        print(f"🔄 Creazione giroconto: €{importo} da {conto_origine_id} a {conto_destinazione_id}")
        
        # Recupera nomi dei conti
        query_conti = text("""
            SELECT id, nome FROM registri_contabili 
            WHERE id IN (:id1, :id2) AND ente_id = :ente_id
        """)
        conti_result = db.execute(query_conti, {
            "id1": conto_origine_id,
            "id2": conto_destinazione_id,
            "ente_id": ente_id
        }).fetchall()
        
        if len(conti_result) != 2:
            raise HTTPException(status_code=404, detail="Uno o entrambi i conti non trovati")
        
        conti_dict = {str(c[0]): c[1] for c in conti_result}
        nome_origine = conti_dict.get(conto_origine_id, "N/D")
        nome_destinazione = conti_dict.get(conto_destinazione_id, "N/D")
        
        # Trova o crea categoria "Giroconto"
        categoria_query = text("""
            SELECT id FROM piano_conti 
            WHERE ente_id = :ente_id 
            AND descrizione = 'Giroconto'
            LIMIT 1
        """)
        categoria_result = db.execute(categoria_query, {"ente_id": ente_id}).fetchone()
        
        if categoria_result:
            categoria_giroconto_id = str(categoria_result[0])
            print(f"✅ Categoria Giroconto esistente: {categoria_giroconto_id}")
        else:
            # Crea categoria di sistema
            categoria_giroconto_id = str(uuid.uuid4())
            db.execute(text("""
                INSERT INTO piano_conti (id, ente_id, codice, descrizione, tipo, is_sistema, livello)
                VALUES (:id, :ente_id, 'GIR', 'Giroconto', 'economico', TRUE, 1)
            """), {"id": categoria_giroconto_id, "ente_id": ente_id})
            print(f"✅ Categoria Giroconto creata: {categoria_giroconto_id}")
        
        # Genera ID per i due movimenti
        movimento_uscita_id = str(uuid.uuid4())
        movimento_entrata_id = str(uuid.uuid4())
        
        # Costruisci note automatiche
        nota_uscita = f"Giroconto per C/C {nome_destinazione}"
        nota_entrata = f"Giroconto da C/C {nome_origine}"
        
        # Aggiungi note utente se presenti
        if note_utente:
            nota_uscita += f" - {note_utente}"
            nota_entrata += f" - {note_utente}"
        
        # STEP 1: Crea movimento USCITA (SENZA collegamento)
        query_uscita = text("""
            INSERT INTO movimenti_contabili (
                id, ente_id, registro_id, categoria_id,
                data_movimento, tipo_movimento, importo,
                causale, note, tipo_speciale,
                bloccato, created_by
            ) VALUES (
                :id, :ente_id, :registro_id, :categoria_id,
                :data_movimento, 'uscita', :importo,
                :causale, :note, 'giroconto',
                FALSE, :user_id
            )
        """)
        
        db.execute(query_uscita, {
            "id": movimento_uscita_id,
            "ente_id": ente_id,
            "registro_id": conto_origine_id,
            "categoria_id": categoria_giroconto_id,
            "data_movimento": data_movimento,
            "importo": importo,
            "causale": nota_uscita,
            "note": nota_uscita,
            "user_id": current_user.get('id')
        })
        
        print(f"✅ Movimento uscita creato: {movimento_uscita_id}")
        
        # STEP 2: Crea movimento ENTRATA (SENZA collegamento)
        query_entrata = text("""
            INSERT INTO movimenti_contabili (
                id, ente_id, registro_id, categoria_id,
                data_movimento, tipo_movimento, importo,
                causale, note, tipo_speciale,
                bloccato, created_by
            ) VALUES (
                :id, :ente_id, :registro_id, :categoria_id,
                :data_movimento, 'entrata', :importo,
                :causale, :note, 'giroconto',
                FALSE, :user_id
            )
        """)
        
        db.execute(query_entrata, {
            "id": movimento_entrata_id,
            "ente_id": ente_id,
            "registro_id": conto_destinazione_id,
            "categoria_id": categoria_giroconto_id,
            "data_movimento": data_movimento,
            "importo": importo,
            "causale": nota_entrata,
            "note": nota_entrata,
            "user_id": current_user.get('id')
        })
        
        print(f"✅ Movimento entrata creato: {movimento_entrata_id}")
        
        # STEP 3: Aggiorna i collegamenti (ora entrambi esistono)
        query_update = text("""
            UPDATE movimenti_contabili 
            SET giroconto_collegato_id = :collegato_id
            WHERE id = :id
        """)
        
        db.execute(query_update, {
            "id": movimento_uscita_id,
            "collegato_id": movimento_entrata_id
        })
        
        db.execute(query_update, {
            "id": movimento_entrata_id,
            "collegato_id": movimento_uscita_id
        })
        
        print(f"✅ Collegamenti aggiornati")
        
        db.commit()
        
        print(f"✅ Giroconto completato: €{importo} da {nome_origine} a {nome_destinazione}")
        
        return {
            "message": "Giroconto creato con successo",
            "movimento_uscita_id": movimento_uscita_id,
            "movimento_entrata_id": movimento_entrata_id,
            "importo": importo,
            "da": nome_origine,
            "a": nome_destinazione
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ ERRORE creazione giroconto: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/movimenti/{movimento_id}")
def update_movimento(
    movimento_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Modifica movimento contabile.
    
    IMPORTANTE: Non permette modifiche su movimenti bloccati
    (inclusi in rendiconti in revisione).
    """
    ente_id = current_user.get('ente_id') or x_ente_id
    
    # Verifica se bloccato
    check_bloccato = """
        SELECT bloccato FROM movimenti_contabili 
        WHERE id = :id AND ente_id = :ente_id
    """
    result = db.execute(text(check_bloccato), {"id": movimento_id, "ente_id": ente_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Movimento non trovato")
    
    if row[0]:
        raise HTTPException(
            status_code=403, 
            detail="Impossibile modificare: movimento incluso in un rendiconto in revisione"
        )

    query = """
        UPDATE movimenti_contabili 
        SET 
            registro_id = :registro_id,
            categoria_id = :categoria_id,
            data_movimento = :data_movimento,
            tipo_movimento = :tipo_movimento,
            importo = :importo,
            descrizione = :descrizione,
            note = :note,
            updated_at = NOW()
        WHERE id = :id AND ente_id = :ente_id
    """
    
    db.execute(text(query), {
        "id": movimento_id,
        "ente_id": ente_id,
        "registro_id": data.get("registro_id"),
        "categoria_id": data.get("categoria_id"),
        "data_movimento": data["data_movimento"],
        "tipo_movimento": data["tipo_movimento"],
        "importo": data["importo"],
        "descrizione": data.get("descrizione", ""),
        "note": data.get("note", "")
    })
    
    db.commit()
    return {"message": "Movimento aggiornato"}


@router.delete("/movimenti/{movimento_id}")
def delete_movimento(
    movimento_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Elimina movimento contabile.
    
    IMPORTANTE: Non permette eliminazione di movimenti bloccati
    (inclusi in rendiconti in revisione).
    """
    ente_id = current_user.get('ente_id') or x_ente_id
    
    # Verifica se bloccato
    check_bloccato = """
        SELECT bloccato FROM movimenti_contabili 
        WHERE id = :id AND ente_id = :ente_id
    """
    result = db.execute(text(check_bloccato), {"id": movimento_id, "ente_id": ente_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Movimento non trovato")
    
    if row[0]:
        raise HTTPException(
            status_code=403, 
            detail="Impossibile eliminare: movimento incluso in un rendiconto in revisione"
        )
    
    query = "DELETE FROM movimenti_contabili WHERE id = :id AND ente_id = :ente_id"
    db.execute(text(query), {"id": movimento_id, "ente_id": ente_id})
    db.commit()
    
    return {"message": "Movimento eliminato"}


# ============================================
# ENDPOINTS: ALLEGATI MOVIMENTI
# ============================================

@router.post("/movimenti/{movimento_id}/allegati")
async def carica_allegato(
    movimento_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Carica allegato (PDF/immagine) per un movimento contabile.
    
    Tipi file supportati: PDF, JPG, PNG, WEBP
    Dimensione massima: 10MB
    """
    try:
        # Verifica esistenza movimento
        verifica_query = text("""
            SELECT id FROM movimenti_contabili 
            WHERE id = :movimento_id
        """)
        verifica_result = db.execute(verifica_query, {'movimento_id': movimento_id})
        if not verifica_result.fetchone():
            raise HTTPException(status_code=404, detail="Movimento non trovato")
        
        # Verifica tipo file
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo file non consentito. Consentiti: PDF, JPG, PNG, WEBP"
            )
        
        # Leggi e verifica dimensione
        contents = await file.read()
        file_size = len(contents)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File troppo grande. Massimo 10MB (ricevuto {file_size / 1024 / 1024:.2f}MB)"
            )
        
        # Crea directory anno/mese
        now = datetime.now()
        year_month_dir = UPLOAD_DIR / str(now.year) / f"{now.month:02d}"
        year_month_dir.mkdir(parents=True, exist_ok=True)
        
        # Genera nome file univoco
        file_extension = Path(file.filename).suffix.lower()
        if not file_extension:
            ext_map = {
                'application/pdf': '.pdf',
                'image/jpeg': '.jpg',
                'image/jpg': '.jpg',
                'image/png': '.png',
                'image/webp': '.webp'
            }
            file_extension = ext_map.get(file.content_type, '.bin')
        
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = year_month_dir / unique_filename
        
        # Salva file
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Percorso relativo per DB
        relative_path = str(file_path.relative_to(UPLOAD_DIR))
        
        # Inserisci record
        insert_query = text("""
            INSERT INTO movimenti_allegati 
            (movimento_id, nome_file, nome_originale, tipo_file, dimensione, percorso)
            VALUES (:movimento_id, :nome_file, :nome_originale, :tipo_file, :dimensione, :percorso)
            RETURNING id, created_at
        """)
        
        result = db.execute(insert_query, {
            'movimento_id': movimento_id,
            'nome_file': unique_filename,
            'nome_originale': file.filename,
            'tipo_file': file.content_type,
            'dimensione': file_size,
            'percorso': relative_path
        })
        
        row = result.fetchone()
        db.commit()
        
        print(f"✅ Allegato caricato: {file.filename} → {relative_path}")
        
        return {
            "success": True,
            "id": str(row[0]),
            "nome_file": file.filename,
            "dimensione": file_size,
            "created_at": row[1].isoformat() if row[1] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Errore caricamento allegato: {e}")
        raise HTTPException(status_code=500, detail=f"Errore caricamento: {str(e)}")


@router.get("/movimenti/{movimento_id}/allegati")
async def lista_allegati(
    movimento_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista tutti gli allegati di un movimento"""
    try:
        query = text("""
            SELECT id, nome_file, nome_originale, tipo_file, 
                   dimensione, percorso, created_at
            FROM movimenti_allegati
            WHERE movimento_id = :movimento_id
            ORDER BY created_at DESC
        """)
        
        result = db.execute(query, {'movimento_id': movimento_id})
        
        allegati = []
        for row in result:
            allegati.append({
                'id': str(row[0]),
                'nome_file': row[1],
                'nome_originale': row[2],
                'tipo_file': row[3],
                'dimensione': row[4],
                'percorso': row[5],
                'created_at': row[6].isoformat() if row[6] else None
            })
        
        return allegati
        
    except Exception as e:
        print(f"❌ Errore lista allegati: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/allegati/{allegato_id}/download")
async def scarica_allegato(
    allegato_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Scarica un allegato specifico"""
    try:
        query = text("""
            SELECT nome_originale, tipo_file, percorso
            FROM movimenti_allegati
            WHERE id = :allegato_id
        """)
        
        result = db.execute(query, {'allegato_id': allegato_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Allegato non trovato")
        
        nome_originale = row[0]
        tipo_file = row[1]
        percorso = row[2]
        
        file_path = UPLOAD_DIR / percorso
        
        if not file_path.exists():
            print(f"❌ File non trovato su disk: {file_path}")
            raise HTTPException(status_code=404, detail="File non trovato su filesystem")
        
        return FileResponse(
            path=str(file_path),
            media_type=tipo_file,
            filename=nome_originale,
            headers={"Content-Disposition": f'attachment; filename="{nome_originale}"'}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Errore download allegato: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/allegati/{allegato_id}")
async def elimina_allegato(
    allegato_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina allegato (filesystem + database)"""
    try:
        query = text("""
            SELECT percorso FROM movimenti_allegati
            WHERE id = :allegato_id
        """)
        
        result = db.execute(query, {'allegato_id': allegato_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Allegato non trovato")
        
        percorso = row[0]
        file_path = UPLOAD_DIR / percorso
        
        # Elimina file fisico
        if file_path.exists():
            file_path.unlink()
            print(f"✅ File eliminato da disk: {file_path}")
        else:
            print(f"⚠️ File non trovato su disk: {file_path}")
        
        # Elimina record
        delete_query = text("""
            DELETE FROM movimenti_allegati
            WHERE id = :allegato_id
        """)
        
        db.execute(delete_query, {'allegato_id': allegato_id})
        db.commit()
        
        print(f"✅ Record allegato eliminato: {allegato_id}")
        
        return {"success": True, "message": "Allegato eliminato con successo"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Errore eliminazione allegato: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/movimenti/{movimento_id}/allegati/count")
async def conta_allegati(
    movimento_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Conta allegati di un movimento (per badge UI)"""
    try:
        query = text("""
            SELECT COUNT(*) FROM movimenti_allegati
            WHERE movimento_id = :movimento_id
        """)
        
        result = db.execute(query, {'movimento_id': movimento_id})
        count = result.scalar()
        
        return {"count": count or 0}
        
    except Exception as e:
        print(f"❌ Errore conteggio allegati: {e}")
        return {"count": 0}


# ============================================
# ENDPOINTS: REPORT CONTABILI
# ============================================

@router.post("/report")
async def genera_report(
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    """
    Genera report contabile personalizzato con filtri.
    
    Filtri disponibili:
    - dataInizio/dataFine: intervallo temporale
    - contiSelezionati: array ID conti
    - categorieSelezionate: array ID categorie
    - tipiMovimento: {entrate: bool, uscite: bool}
    """
    try:
        ente_id = current_user.get('ente_id') or x_ente_id or data.get('ente_id')
        
        if not ente_id:
            raise HTTPException(status_code=400, detail="Ente ID mancante")
        
        # Recupera dati ente
        ente_query = text("""
            SELECT denominazione, indirizzo, cap, comune, provincia, 
                   codice_fiscale, telefono, parroco
            FROM enti WHERE id = :ente_id
        """)
        ente = db.execute(ente_query, {"ente_id": ente_id}).fetchone()
        
        # Estrai filtri
        data_inizio = data.get('dataInizio')
        data_fine = data.get('dataFine')
        conti_sel = data.get('contiSelezionati', [])
        cat_sel = data.get('categorieSelezionate', [])
        tipi_mov = data.get('tipiMovimento', {'entrate': True, 'uscite': True})
        
        # Query movimenti con gerarchia completa categorie
        query = """
            SELECT
                m.id, m.data_movimento, m.causale, m.importo, m.tipo_movimento,
                r.nome as conto_nome,
                c.descrizione as categoria_nome,
                c.id as categoria_id,
                cp.descrizione as categoria_padre_nome,
                cp.id as categoria_padre_id,
                cpp.descrizione as categoria_nonno_nome,
                cpp.id as categoria_nonno_id
            FROM movimenti_contabili m
            LEFT JOIN registri_contabili r ON m.registro_id = r.id
            LEFT JOIN piano_conti c ON m.categoria_id = c.id
            LEFT JOIN piano_conti cp ON c.categoria_padre_id = cp.id
            LEFT JOIN piano_conti cpp ON cp.categoria_padre_id = cpp.id
            WHERE m.ente_id = :ente_id
        """
        
        params = {"ente_id": ente_id}
        
        if data_inizio:
            query += " AND m.data_movimento >= :data_inizio"
            params["data_inizio"] = data_inizio
        
        if data_fine:
            query += " AND m.data_movimento <= :data_fine"
            params["data_fine"] = data_fine
        
        if conti_sel:
            placeholders = ','.join([f':conto_{i}' for i in range(len(conti_sel))])
            query += f" AND m.registro_id IN ({placeholders})"
            for i, conto_id in enumerate(conti_sel):
                params[f'conto_{i}'] = conto_id
        
        if cat_sel:
            placeholders = ','.join([f':cat_{i}' for i in range(len(cat_sel))])
            # Include categorie selezionate + tutte le sottocategorie (figli e nipoti)
            query += f""" AND (
                m.categoria_id IN ({placeholders})
                OR m.categoria_id IN (
                    SELECT id FROM piano_conti WHERE categoria_padre_id IN ({placeholders})
                )
                OR m.categoria_id IN (
                    SELECT id FROM piano_conti WHERE categoria_padre_id IN (
                        SELECT id FROM piano_conti WHERE categoria_padre_id IN ({placeholders})
                    )
                )
            )"""
            for i, cat_id in enumerate(cat_sel):
                params[f'cat_{i}'] = cat_id
        
        # Filtro tipo movimento
        tipi = []
        if tipi_mov.get('entrate'):
            tipi.append('entrata')
        if tipi_mov.get('uscite'):
            tipi.append('uscita')
        
        if tipi:
            placeholders = ','.join([f':tipo_{i}' for i in range(len(tipi))])
            query += f" AND m.tipo_movimento IN ({placeholders})"
            for i, tipo in enumerate(tipi):
                params[f'tipo_{i}'] = tipo
        
        query += " ORDER BY m.data_movimento DESC"
        
        movimenti = db.execute(text(query), params).fetchall()
        
        # Calcola totali
        totale_entrate = sum(float(m[3]) for m in movimenti if m[4] == 'entrata')
        totale_uscite = sum(float(m[3]) for m in movimenti if m[4] == 'uscita')
        
        # Costruisci risposta
        movimenti_list = []
        for m in movimenti:
            # Determina il livello della categoria
            # Livello 3 (micro): ha nonno
            # Livello 2 (sotto): ha padre ma non nonno  
            # Livello 1 (madre): non ha padre
            categoria_nome = m[6]
            categoria_id = str(m[7]) if m[7] else None
            categoria_padre_nome = m[8]
            categoria_padre_id = str(m[9]) if m[9] else None
            categoria_nonno_nome = m[10]
            categoria_nonno_id = str(m[11]) if m[11] else None
            
            if categoria_nonno_id:
                livello = 3
                gerarchia = f"{categoria_nonno_nome} > {categoria_padre_nome} > {categoria_nome}"
            elif categoria_padre_id:
                livello = 2
                gerarchia = f"{categoria_padre_nome} > {categoria_nome}"
            else:
                livello = 1
                gerarchia = categoria_nome
            
            movimenti_list.append({
                "id": str(m[0]),
                "data_movimento": m[1].isoformat() if m[1] else None,
                "causale": m[2],
                "importo": float(m[3]),
                "tipo_movimento": m[4],
                "conto": m[5],
                "categoria": categoria_nome or "Non categorizzato",
                "categoria_id": categoria_id,
                "categoria_padre": categoria_padre_nome,
                "categoria_padre_id": categoria_padre_id,
                "categoria_nonno": categoria_nonno_nome,
                "categoria_nonno_id": categoria_nonno_id,
                "livello": livello,
                "gerarchia": gerarchia or "Non categorizzato"
            })
        
        return {
            "ente": {
                "denominazione": ente[0] if ente else "",
                "indirizzo": ente[1] if ente else "",
                "cap": ente[2] if ente else "",
                "comune": ente[3] if ente else "",
                "provincia": ente[4] if ente else "",
                "codice_fiscale": ente[5] if ente else "",
                "telefono": ente[6] if ente else "",
                "parroco": ente[7] if ente else ""
            },
            "movimenti": movimenti_list,
            "totale_entrate": totale_entrate,
            "totale_uscite": totale_uscite,
            "numero_movimenti": len(movimenti_list),
            "conto": "TUTTI I CONTI" if not conti_sel else f"{len(conti_sel)} conti selezionati"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Errore generazione report: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ENDPOINTS: RENDICONTI (ECONOMO)
# ============================================

@router.get("/economo/rendiconti")
async def lista_rendiconti_economo(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    stato: str = Query(None),
    comune: str = Query(None)
):
    """
    Lista TUTTI i rendiconti di tutte le parrocchie (solo per economo).
    
    Filtri opzionali:
    - stato: filtra per stato rendiconto
    - comune: ricerca testuale per comune
    """
    try:
        # Verifica ruolo economo
        if not current_user.get('is_economo'):
            raise HTTPException(status_code=403, detail="Solo l'economo può accedere")
        
        query = """
            SELECT 
                r.id, r.periodo_inizio, r.periodo_fine, r.stato,
                r.totale_entrate, r.totale_uscite, r.saldo,
                r.pdf_path, r.pdf_firmato_path,
                r.osservazioni_economo, r.data_invio, r.data_revisione,
                e.denominazione, e.comune, e.provincia,
                (SELECT COUNT(*) FROM rendiconti_documenti WHERE rendiconto_id = r.id) as num_documenti,
                r.documenti_esonero
            FROM rendiconti r
            JOIN enti e ON r.ente_id = e.id
            WHERE 1=1
        """
        
        params = {}
        
        if stato:
            query += " AND r.stato = :stato"
            params["stato"] = stato
        
        if comune:
            query += " AND e.comune ILIKE :comune"
            params["comune"] = f"%{comune}%"
        
        query += " ORDER BY e.comune, e.denominazione, r.data_invio DESC"
        
        result = db.execute(text(query), params)
        
        rendiconti = []
        for row in result:
            rendiconti.append({
                "id": str(row[0]),
                "periodo_inizio": row[1].isoformat() if row[1] else None,
                "periodo_fine": row[2].isoformat() if row[2] else None,
                "stato": row[3],
                "totale_entrate": float(row[4]) if row[4] else 0,
                "totale_uscite": float(row[5]) if row[5] else 0,
                "saldo": float(row[6]) if row[6] else 0,
                "pdf_path": row[7],
                "pdf_firmato_path": row[8],
                "osservazioni_economo": row[9],
                "data_invio": row[10].isoformat() if row[10] else None,
                "data_revisione": row[11].isoformat() if row[11] else None,
                "parrocchia": row[12],
                "comune": row[13],
                "provincia": row[14],
                "num_documenti": row[15],
                "documenti_esonero": row[16]
            })
        
        return {"rendiconti": rendiconti}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Errore lista rendiconti economo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/economo/rendiconti/{rendiconto_id}/approva")
async def approva_rendiconto(
    rendiconto_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Approva rendiconto e applica firma digitale del Vescovo.
    
    Stato finale: 'approvato'
    Genera PDF firmato con timbro e firma del Vescovo.
    """
    try:
        print(f"🔍 Tentativo approvazione rendiconto: {rendiconto_id}")
        
        if not current_user.get('is_economo'):
            raise HTTPException(status_code=403, detail="Solo l'economo può approvare")
        
        # Recupera rendiconto
        query = text("""
            SELECT pdf_path, ente_id, stato FROM rendiconti WHERE id = :id
        """)
        result = db.execute(query, {"id": rendiconto_id}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        pdf_path = result[0]
        ente_id = result[1]
        stato = result[2]
        
        print(f"📊 Stato rendiconto: {stato}")
        
        if stato != 'in_revisione':
            raise HTTPException(
                status_code=400, 
                detail=f"Impossibile approvare: rendiconto in stato '{stato}'"
            )
        
        if not pdf_path:
            raise HTTPException(status_code=400, detail="PDF del rendiconto non trovato")
        
        # Applica firma digitale
        print("✍️ Applicazione firma digitale...")
        pdf_firmato_path = await applica_firma_vescovo(pdf_path)
        print(f"✅ Firma applicata: {pdf_firmato_path}")
        
        # Aggiorna stato
        update_query = text("""
            UPDATE rendiconti
            SET stato = 'approvato',
                pdf_firmato_path = :pdf_firmato,
                data_revisione = NOW(),
                osservazioni_economo = NULL
            WHERE id = :id
            RETURNING data_revisione
        """)
        
        update_result = db.execute(update_query, {
            "id": rendiconto_id,
            "pdf_firmato": pdf_firmato_path
        }).fetchone()
        
        db.commit()
        
        print(f"✅ Rendiconto approvato!")
        
        return {
            "message": "Rendiconto approvato con successo",
            "rendiconto_id": rendiconto_id,
            "pdf_firmato": pdf_firmato_path,
            "data_approvazione": update_result[0].isoformat() if update_result else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Errore approvazione: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/economo/rendiconti/{rendiconto_id}/respingi")
async def respingi_rendiconto(
    rendiconto_id: str,
    motivo: str = Form(...),
    allegato: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Respinge rendiconto con motivo testuale e allegato opzionale.
    
    Azioni eseguite:
    - Imposta stato 'respinto'
    - Sblocca movimenti del periodo
    - Salva allegato se presente
    """
    try:
        if not current_user.get('is_economo'):
            raise HTTPException(status_code=403, detail="Solo l'economo può respingere")
        
        # Aggiorna stato
        update_query = text("""
            UPDATE rendiconti
            SET 
                stato = 'respinto',
                motivo_respingimento = :motivo,
                data_respingimento = NOW(),
                respinto_da = :user_id
            WHERE id = :id
            RETURNING ente_id, periodo_inizio, periodo_fine
        """)
        
        result = db.execute(update_query, {
            "id": rendiconto_id,
            "motivo": motivo,
            "user_id": current_user['user_id']
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        # Salva allegato se presente
        allegato_id = None
        if allegato and allegato.filename:
            file_extension = Path(allegato.filename).suffix
            unique_filename = f"{rendiconto_id}_{int(time.time())}{file_extension}"
            filepath = UPLOAD_DIR / unique_filename
            
            with open(filepath, "wb") as f:
                content = await allegato.read()
                f.write(content)
            
            insert_allegato = text("""
                INSERT INTO rendiconti_allegati 
                (rendiconto_id, filename, filepath, mime_type, file_size, tipo, created_by)
                VALUES (:rendiconto_id, :filename, :filepath, :mime_type, :file_size, 'respingimento', :user_id)
                RETURNING id
            """)
            
            allegato_result = db.execute(insert_allegato, {
                "rendiconto_id": rendiconto_id,
                "filename": allegato.filename,
                "filepath": str(filepath),
                "mime_type": allegato.content_type,
                "file_size": len(content),
                "user_id": current_user['user_id']
            }).fetchone()
            
            allegato_id = str(allegato_result[0])
        
        # Sblocca movimenti
        sblocca_query = text("""
            UPDATE movimenti_contabili
            SET bloccato = FALSE
            WHERE rendiconto_id = :rendiconto_id
        """)
        
        db.execute(sblocca_query, {"rendiconto_id": rendiconto_id})
        
        db.commit()
        
        return {
            "message": "Rendiconto respinto. Il parroco può modificare i movimenti.",
            "allegato_id": allegato_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Errore respingimento: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rendiconti/allegati/{allegato_id}/download")
async def download_allegato_rendiconto(
    allegato_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Scarica allegato di un rendiconto (es. motivo respingimento)"""
    query = text("""
        SELECT filename, filepath, mime_type
        FROM rendiconti_allegati
        WHERE id = :id
    """)
    
    result = db.execute(query, {"id": allegato_id}).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Allegato non trovato")
    
    filename, filepath, mime_type = result
    
    if not Path(filepath).exists():
        raise HTTPException(status_code=404, detail="File non trovato sul server")
    
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type=mime_type
    )


@router.get("/rendiconti/{rendiconto_id}/pdf")
async def scarica_pdf_rendiconto(
    rendiconto_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Scarica PDF del rendiconto.
    
    Comportamento:
    - Approvato: PDF firmato con timbro Vescovo
    - In revisione: PDF base
    - Bozza/Respinto: genera PDF al volo (preview)
    """
    try:
        # Importa funzione generazione PDF
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from routes.rendiconti_documenti import genera_pdf_rendiconto
        
        # Recupera rendiconto
        query = text("""
            SELECT r.pdf_path, r.pdf_firmato_path, r.stato, r.ente_id,
                   r.periodo_inizio, r.periodo_fine
            FROM rendiconti r
            WHERE r.id = :id
        """)
        result = db.execute(query, {"id": rendiconto_id}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Rendiconto non trovato")
        
        pdf_path = result[0]
        pdf_firmato_path = result[1]
        stato = result[2]
        ente_id = result[3]
        
        print(f"📄 Download PDF - Stato: {stato}")
        
        # APPROVATO: PDF firmato
        if stato == 'approvato' and pdf_firmato_path:
            file_path = RENDICONTI_DIR / pdf_firmato_path
            
            if file_path.exists():
                return FileResponse(
                    path=str(file_path),
                    media_type="application/pdf",
                    filename=f"rendiconto_approvato_{rendiconto_id}.pdf"
                )
        
        # IN REVISIONE: PDF base
        if stato == 'in_revisione' and pdf_path:
            file_path = RENDICONTI_DIR / pdf_path
            
            if file_path.exists():
                return FileResponse(
                    path=str(file_path),
                    media_type="application/pdf",
                    filename=f"rendiconto_{rendiconto_id}.pdf"
                )
        
        # BOZZA/RESPINTO: genera al volo
        if stato in ['bozza', 'respinto']:
            print(f"🔄 Generazione PDF al volo")
            
            try:
                pdf_path_temp = await genera_pdf_rendiconto(rendiconto_id, ente_id)
                file_path = RENDICONTI_DIR / pdf_path_temp
                
                if file_path.exists():
                    return FileResponse(
                        path=str(file_path),
                        media_type="application/pdf",
                        filename=f"rendiconto_preview_{rendiconto_id}.pdf"
                    )
                else:
                    raise FileNotFoundError("PDF generato ma non trovato")
                    
            except Exception as e:
                print(f"❌ Errore generazione PDF: {e}")
                raise HTTPException(status_code=500, detail=f"Impossibile generare PDF: {str(e)}")
        
        raise HTTPException(status_code=404, detail="PDF non disponibile")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Errore download PDF: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# FUNZIONI HELPER
# ============================================

def build_categoria_completa(db, categoria_id, categoria_nome, parent_id):
    """
    Costruisce la stringa gerarchica completa della categoria.
    
    Esempio: "Entrate: Offerte: Matrimoni"
    
    Args:
        db: Sessione database
        categoria_id: ID categoria corrente
        categoria_nome: Nome categoria corrente
        parent_id: ID categoria padre
        
    Returns:
        str: Categoria gerarchica completa separata da ":"
    """
    if not categoria_id:
        return "Non categorizzato"
    
    gerarchia = [categoria_nome]
    current_parent = parent_id
    
    while current_parent:
        parent_query = "SELECT descrizione, categoria_padre_id FROM piano_conti WHERE id = :id"
        parent = db.execute(text(parent_query), {"id": current_parent}).fetchone()
        if parent:
            gerarchia.insert(0, parent[0])
            current_parent = parent[1]
        else:
            break
    
    return ": ".join(gerarchia)


def calcola_saldo_progressivo(movimenti):
    """
    Calcola il saldo progressivo per ogni movimento, raggruppato per conto.
    
    IMPORTANTE: Esclude i movimenti bloccati dal calcolo (già chiusi in rendiconti).
    
    Args:
        movimenti: Lista di movimenti con campo 'registro_id' e 'bloccato'
        
    Returns:
        list: Movimenti con campo 'saldo_progressivo' aggiunto
    """
    saldi_per_conto = {}
    
    # Ordina per data
    movimenti_ordinati = sorted(movimenti, key=lambda x: x["data_movimento"])
    
    for mov in movimenti_ordinati:
        conto_id = mov["registro_id"]
        
        if conto_id not in saldi_per_conto:
            saldi_per_conto[conto_id] = 0
        
        # ✅ Somma SOLO se movimento NON bloccato
        if not mov.get("bloccato", False):
            if mov["tipo_movimento"] == "entrata":
                saldi_per_conto[conto_id] += mov["importo"]
            else:
                saldi_per_conto[conto_id] -= mov["importo"]
        
        mov["saldo_progressivo"] = round(saldi_per_conto[conto_id], 2)
    
    return movimenti_ordinati


async def applica_firma_vescovo(pdf_path: str):
    """
    Applica timbro e firma digitale del Vescovo sul PDF del rendiconto.
    
    Posizionamento:
    - Timbro: angolo in alto a destra
    - Firma: in basso a destra con testo "Il Vescovo della Diocesi"
    
    Args:
        pdf_path: Percorso relativo del PDF originale
        
    Returns:
        str: Percorso relativo del PDF firmato
        
    Raises:
        FileNotFoundError: Se PDF originale o immagini firma non esistono
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.utils import ImageReader
        from io import BytesIO
        
        print(f"📄 Inizio firma PDF: {pdf_path}")
        
        # Percorsi
        original_path = RENDICONTI_DIR / pdf_path
        
        if not original_path.exists():
            raise FileNotFoundError(f"PDF originale non trovato: {original_path}")
        
        # Percorsi immagini
        timbro_path = Path("uploads/timbri/timbro_vescovo.png")
        firma_path = Path("uploads/firme/firma_vescovo.png")
        
        if not timbro_path.exists():
            raise FileNotFoundError(f"Timbro non trovato: {timbro_path}")
        if not firma_path.exists():
            raise FileNotFoundError(f"Firma non trovata: {firma_path}")
        
        print(f"✅ Timbro: {timbro_path}")
        print(f"✅ Firma: {firma_path}")
        
        # Leggi PDF originale
        pdf_reader = PdfReader(str(original_path))
        pdf_writer = PdfWriter()
        
        # Crea watermark
        packet = BytesIO()
        can = canvas.Canvas(packet, pagesize=A4)
        width, height = A4
        
        data_approvazione = datetime.now().strftime("%d/%m/%Y alle ore %H:%M")
        
        # TIMBRO (alto destra)
        timbro_img = ImageReader(str(timbro_path))
        can.drawImage(timbro_img, width - 150, height - 150, 
                      width=120, height=120, mask='auto', preserveAspectRatio=True)
        
        can.setFont("Helvetica-Bold", 11)
        can.setFillColorRGB(0, 0.5, 0)
        can.drawCentredString(width - 90, height - 165, "APPROVATO")
        
        can.setFont("Helvetica", 8)
        can.setFillColorRGB(0, 0, 0)
        can.drawCentredString(width - 90, height - 180, f"{data_approvazione}")
        
        # FIRMA (basso destra)
        firma_img = ImageReader(str(firma_path))
        can.drawImage(firma_img, width - 220, 100, 
                      width=200, height=70, mask='auto', preserveAspectRatio=True)
        
        can.setFont("Helvetica-Bold", 9)
        can.setFillColorRGB(0, 0, 0.8)
        can.drawCentredString(width - 120, 85, "Il Vescovo della Diocesi di Caltagirone")
        
        can.setFont("Helvetica-Oblique", 8)
        can.setFillColorRGB(0, 0, 0)
        can.drawCentredString(width - 120, 70, "S.E. Mons. Calogero Peri")
        
        can.save()
        
        # Applica watermark
        packet.seek(0)
        watermark_pdf = PdfReader(packet)
        watermark_page = watermark_pdf.pages[0]
        
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            page.merge_page(watermark_page)
            pdf_writer.add_page(page)
        
        # Salva PDF firmato
        filename = Path(pdf_path).stem
        year = Path(pdf_path).parent
        new_filename = f"{filename}_firmato.pdf"
        new_path = RENDICONTI_DIR / year / new_filename
        
        with open(str(new_path), "wb") as output_file:
            pdf_writer.write(output_file)
        
        print(f"✅ PDF firmato: {new_path}")
        
        return f"{year}/{new_filename}"
        
    except Exception as e:
        print(f"❌ Errore firma PDF: {e}")
        import traceback
        traceback.print_exc()
        raise