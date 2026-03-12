from fastapi import APIRouter, Depends, HTTPException, Header, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from uuid import UUID
from datetime import datetime
from pathlib import Path
import uuid
import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection
from auth import get_current_user
from services.audit import registra_audit_psycopg2

router = APIRouter(prefix="/api/inventario", tags=["Inventario"])

# Directory upload foto inventario
FOTO_UPLOAD_DIR = Path("uploads/inventario")
FOTO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

FOTO_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
FOTO_MAX_SIZE = 10 * 1024 * 1024  # 10MB


# ============================================
# HELPER — Recupera ente_id
# ============================================

def get_ente_id(current_user: dict, x_ente_id: str = None):
    ente_id = current_user.get('ente_id') or x_ente_id
    if not ente_id:
        raise HTTPException(status_code=400, detail="Ente ID mancante")
    return ente_id


# ============================================
# CATEGORIE
# ============================================

@router.get("/categorie")
async def get_categorie(
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, nome, descrizione, ordine, attivo, is_sistema, created_at
            FROM inventario_categorie
            WHERE ente_id = %s AND attivo = TRUE
            ORDER BY ordine, nome
        """, (ente_id,))
        rows = cur.fetchall()
        categorie = []
        for r in rows:
            categorie.append({
                "id": str(r[0]),
                "nome": r[1],
                "descrizione": r[2],
                "ordine": r[3],
                "attivo": r[4],
                "is_sistema": r[5],
                "created_at": r[6].isoformat() if r[6] else None
            })
        return {"categorie": categorie}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.post("/categorie", status_code=status.HTTP_201_CREATED)
async def create_categoria(
    data: dict,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    nome = data.get("nome", "").strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Nome categoria obbligatorio")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verifica duplicato (case-insensitive)
        cur.execute("""
            SELECT id FROM inventario_categorie
            WHERE ente_id = %s AND LOWER(TRIM(nome)) = LOWER(%s) AND attivo = TRUE
        """, (ente_id, nome))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Categoria con questo nome già esistente")

        # Prossimo ordine
        cur.execute("""
            SELECT COALESCE(MAX(ordine), 0) + 1 FROM inventario_categorie WHERE ente_id = %s
        """, (ente_id,))
        ordine = cur.fetchone()[0]

        cat_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO inventario_categorie (id, ente_id, nome, descrizione, ordine, is_sistema)
            VALUES (%s, %s, %s, %s, %s, FALSE)
            RETURNING id, created_at
        """, (cat_id, ente_id, nome, data.get("descrizione"), ordine))
        row = cur.fetchone()
        conn.commit()

        return {"id": str(row[0]), "nome": nome, "ordine": ordine, "is_sistema": False, "created_at": row[1].isoformat()}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.put("/categorie/{categoria_id}")
async def update_categoria(
    categoria_id: UUID,
    data: dict,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT is_sistema FROM inventario_categorie
            WHERE id = %s AND ente_id = %s
        """, (str(categoria_id), ente_id))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail="Categoria non trovata")
        if cat[0]:
            raise HTTPException(status_code=403, detail="Le categorie di sistema non possono essere modificate")

        nome = data.get("nome", "").strip()
        if not nome:
            raise HTTPException(status_code=400, detail="Nome categoria obbligatorio")

        # Verifica duplicato (escludi se stessa)
        cur.execute("""
            SELECT id FROM inventario_categorie
            WHERE ente_id = %s AND LOWER(TRIM(nome)) = LOWER(%s) AND attivo = TRUE AND id != %s
        """, (ente_id, nome, str(categoria_id)))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Categoria con questo nome già esistente")

        cur.execute("""
            UPDATE inventario_categorie
            SET nome = %s, descrizione = %s
            WHERE id = %s AND ente_id = %s
        """, (nome, data.get("descrizione"), str(categoria_id), ente_id))
        conn.commit()

        return {"message": "Categoria aggiornata", "id": str(categoria_id)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.delete("/categorie/{categoria_id}")
async def delete_categoria(
    categoria_id: UUID,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT is_sistema FROM inventario_categorie
            WHERE id = %s AND ente_id = %s
        """, (str(categoria_id), ente_id))
        cat = cur.fetchone()
        if not cat:
            raise HTTPException(status_code=404, detail="Categoria non trovata")
        if cat[0]:
            raise HTTPException(status_code=403, detail="Le categorie di sistema non possono essere eliminate")

        # Verifica beni associati
        cur.execute("""
            SELECT COUNT(*) FROM beni_inventario
            WHERE categoria_id = %s AND stato = 'attivo'
        """, (str(categoria_id),))
        if cur.fetchone()[0] > 0:
            raise HTTPException(status_code=400, detail="Impossibile eliminare: ci sono beni associati a questa categoria")

        cur.execute("""
            UPDATE inventario_categorie SET attivo = FALSE WHERE id = %s
        """, (str(categoria_id),))
        conn.commit()

        return {"message": "Categoria eliminata"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# UBICAZIONI
# ============================================

@router.get("/ubicazioni")
async def get_ubicazioni(
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, nome, descrizione, ordine, attivo, created_at
            FROM inventario_ubicazioni
            WHERE ente_id = %s AND attivo = TRUE
            ORDER BY ordine, nome
        """, (ente_id,))
        rows = cur.fetchall()
        ubicazioni = []
        for r in rows:
            ubicazioni.append({
                "id": str(r[0]),
                "nome": r[1],
                "descrizione": r[2],
                "ordine": r[3],
                "attivo": r[4],
                "created_at": r[5].isoformat() if r[5] else None
            })
        return {"ubicazioni": ubicazioni}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.post("/ubicazioni", status_code=status.HTTP_201_CREATED)
async def create_ubicazione(
    data: dict,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    nome = data.get("nome", "").strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Nome ubicazione obbligatorio")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verifica duplicato
        cur.execute("""
            SELECT id FROM inventario_ubicazioni
            WHERE ente_id = %s AND LOWER(TRIM(nome)) = LOWER(%s) AND attivo = TRUE
        """, (ente_id, nome))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Ubicazione con questo nome già esistente")

        cur.execute("""
            SELECT COALESCE(MAX(ordine), 0) + 1 FROM inventario_ubicazioni WHERE ente_id = %s
        """, (ente_id,))
        ordine = cur.fetchone()[0]

        ub_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO inventario_ubicazioni (id, ente_id, nome, descrizione, ordine)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (ub_id, ente_id, nome, data.get("descrizione"), ordine))
        row = cur.fetchone()
        conn.commit()

        return {"id": str(row[0]), "nome": nome, "ordine": ordine, "created_at": row[1].isoformat()}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.put("/ubicazioni/{ubicazione_id}")
async def update_ubicazione(
    ubicazione_id: UUID,
    data: dict,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id FROM inventario_ubicazioni
            WHERE id = %s AND ente_id = %s
        """, (str(ubicazione_id), ente_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Ubicazione non trovata")

        nome = data.get("nome", "").strip()
        if not nome:
            raise HTTPException(status_code=400, detail="Nome ubicazione obbligatorio")

        # Verifica duplicato (escludi se stessa)
        cur.execute("""
            SELECT id FROM inventario_ubicazioni
            WHERE ente_id = %s AND LOWER(TRIM(nome)) = LOWER(%s) AND attivo = TRUE AND id != %s
        """, (ente_id, nome, str(ubicazione_id)))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Ubicazione con questo nome già esistente")

        cur.execute("""
            UPDATE inventario_ubicazioni
            SET nome = %s, descrizione = %s
            WHERE id = %s AND ente_id = %s
        """, (nome, data.get("descrizione"), str(ubicazione_id), ente_id))
        conn.commit()

        return {"message": "Ubicazione aggiornata", "id": str(ubicazione_id)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.delete("/ubicazioni/{ubicazione_id}")
async def delete_ubicazione(
    ubicazione_id: UUID,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id FROM inventario_ubicazioni
            WHERE id = %s AND ente_id = %s
        """, (str(ubicazione_id), ente_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Ubicazione non trovata")

        cur.execute("""
            SELECT COUNT(*) FROM beni_inventario
            WHERE ubicazione_id = %s AND stato = 'attivo'
        """, (str(ubicazione_id),))
        if cur.fetchone()[0] > 0:
            raise HTTPException(status_code=400, detail="Impossibile eliminare: ci sono beni in questa ubicazione")

        cur.execute("""
            UPDATE inventario_ubicazioni SET attivo = FALSE WHERE id = %s
        """, (str(ubicazione_id),))
        conn.commit()

        return {"message": "Ubicazione eliminata"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# BENI — LISTA CON FILTRI
# ============================================

@router.get("/beni")
async def get_beni(
    categoria: str = None,
    ubicazione: str = None,
    stato_conservazione: str = None,
    bloccato: str = None,
    ricerca: str = None,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        query = """
            SELECT
                b.id, b.numero_progressivo, b.descrizione, b.quantita,
                b.stato_conservazione, b.valore_stimato, b.bloccato, b.stato,
                b.data_acquisto, b.created_at,
                c.nome as categoria_nome,
                u.nome as ubicazione_nome,
                (SELECT path_file FROM inventario_foto
                 WHERE bene_id = b.id ORDER BY ordine LIMIT 1) as foto_principale
            FROM beni_inventario b
            LEFT JOIN inventario_categorie c ON b.categoria_id = c.id
            LEFT JOIN inventario_ubicazioni u ON b.ubicazione_id = u.id
            WHERE b.ente_id = %s AND b.stato = 'attivo'
        """
        params = [ente_id]

        if categoria:
            query += " AND b.categoria_id = %s"
            params.append(categoria)

        if ubicazione:
            query += " AND b.ubicazione_id = %s"
            params.append(ubicazione)

        if stato_conservazione:
            query += " AND b.stato_conservazione = %s"
            params.append(stato_conservazione)

        if bloccato is not None:
            if bloccato.lower() == 'true':
                query += " AND b.bloccato = TRUE"
            elif bloccato.lower() == 'false':
                query += " AND b.bloccato = FALSE"

        if ricerca:
            query += " AND (b.descrizione ILIKE %s OR b.note ILIKE %s OR b.provenienza ILIKE %s)"
            term = f"%{ricerca}%"
            params.extend([term, term, term])

        query += " ORDER BY b.numero_progressivo"

        cur.execute(query, params)
        rows = cur.fetchall()

        beni = []
        for r in rows:
            beni.append({
                "id": str(r[0]),
                "numero_progressivo": r[1],
                "descrizione": r[2],
                "quantita": r[3],
                "stato_conservazione": r[4],
                "valore_stimato": float(r[5]) if r[5] else None,
                "bloccato": r[6],
                "stato": r[7],
                "data_acquisto": str(r[8]) if r[8] else None,
                "created_at": r[9].isoformat() if r[9] else None,
                "categoria_nome": r[10],
                "ubicazione_nome": r[11],
                "foto_principale": r[12]
            })

        return {"beni": beni, "totale": len(beni)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# BENI — DETTAGLIO
# ============================================

@router.get("/beni/{bene_id}")
async def get_bene(
    bene_id: UUID,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT
                b.id, b.numero_progressivo, b.descrizione, b.quantita,
                b.stato_conservazione, b.valore_stimato, b.valore_assicurato,
                b.data_acquisto, b.fornitore, b.provenienza,
                b.codice_regione, b.numero_catalogo_generale, b.codice_ente_competente,
                b.note, b.note_storiche,
                b.stato, b.bloccato, b.registro_id,
                b.data_rimozione, b.motivo_rimozione, b.note_rimozione,
                b.created_by, b.created_at, b.updated_by, b.updated_at,
                b.categoria_id, b.ubicazione_id,
                c.nome as categoria_nome,
                u.nome as ubicazione_nome,
                cr.email as creato_da_email,
                ur.email as modificato_da_email
            FROM beni_inventario b
            LEFT JOIN inventario_categorie c ON b.categoria_id = c.id
            LEFT JOIN inventario_ubicazioni u ON b.ubicazione_id = u.id
            LEFT JOIN utenti cr ON b.created_by = cr.id
            LEFT JOIN utenti ur ON b.updated_by = ur.id
            WHERE b.id = %s AND b.ente_id = %s
        """, (str(bene_id), ente_id))

        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Bene non trovato")

        # Recupera foto
        cur.execute("""
            SELECT id, nome_file, path_file, mime_type, dimensione, ordine, didascalia, created_at
            FROM inventario_foto
            WHERE bene_id = %s
            ORDER BY ordine
        """, (str(bene_id),))
        foto_rows = cur.fetchall()
        foto = []
        for f in foto_rows:
            foto.append({
                "id": str(f[0]),
                "nome_file": f[1],
                "path_file": f[2],
                "mime_type": f[3],
                "dimensione": f[4],
                "ordine": f[5],
                "didascalia": f[6],
                "created_at": f[7].isoformat() if f[7] else None
            })

        return {
            "id": str(r[0]),
            "numero_progressivo": r[1],
            "descrizione": r[2],
            "quantita": r[3],
            "stato_conservazione": r[4],
            "valore_stimato": float(r[5]) if r[5] else None,
            "valore_assicurato": float(r[6]) if r[6] else None,
            "data_acquisto": str(r[7]) if r[7] else None,
            "fornitore": r[8],
            "provenienza": r[9],
            "codice_regione": r[10],
            "numero_catalogo_generale": r[11],
            "codice_ente_competente": r[12],
            "note": r[13],
            "note_storiche": r[14],
            "stato": r[15],
            "bloccato": r[16],
            "registro_id": str(r[17]) if r[17] else None,
            "data_rimozione": str(r[18]) if r[18] else None,
            "motivo_rimozione": r[19],
            "note_rimozione": r[20],
            "created_by": str(r[21]) if r[21] else None,
            "created_at": r[22].isoformat() if r[22] else None,
            "updated_by": str(r[23]) if r[23] else None,
            "updated_at": r[24].isoformat() if r[24] else None,
            "categoria_id": str(r[25]) if r[25] else None,
            "ubicazione_id": str(r[26]) if r[26] else None,
            "categoria_nome": r[27],
            "ubicazione_nome": r[28],
            "creato_da": r[29],
            "modificato_da": r[30],
            "foto": foto
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# BENI — CREA
# ============================================

@router.post("/beni", status_code=status.HTTP_201_CREATED)
async def create_bene(
    data: dict,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    descrizione = data.get("descrizione", "").strip()
    if not descrizione:
        raise HTTPException(status_code=400, detail="Descrizione obbligatoria")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Prossimo numero progressivo per ente
        cur.execute("""
            SELECT COALESCE(MAX(numero_progressivo), 0) + 1
            FROM beni_inventario WHERE ente_id = %s
        """, (ente_id,))
        numero = cur.fetchone()[0]

        bene_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO beni_inventario (
                id, ente_id, numero_progressivo, categoria_id, ubicazione_id,
                descrizione, quantita, provenienza, stato_conservazione,
                valore_stimato, valore_assicurato, data_acquisto, fornitore,
                codice_regione, numero_catalogo_generale, codice_ente_competente,
                note, note_storiche,
                created_by
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                %s
            )
            RETURNING id, numero_progressivo, created_at
        """, (
            bene_id, ente_id, numero,
            data.get("categoria_id"), data.get("ubicazione_id"),
            descrizione,
            data.get("quantita", 1),
            data.get("provenienza"),
            data.get("stato_conservazione"),
            data.get("valore_stimato"),
            data.get("valore_assicurato"),
            data.get("data_acquisto"),
            data.get("fornitore"),
            data.get("codice_regione"),
            data.get("numero_catalogo_generale"),
            data.get("codice_ente_competente"),
            data.get("note"),
            data.get("note_storiche"),
            current_user['user_id']
        ))
        row = cur.fetchone()

        registra_audit_psycopg2(
            cur=cur,
            azione="INSERT",
            tabella="beni_inventario",
            record_id=bene_id,
            utente_id=current_user.get('user_id'),
            utente_email=current_user.get('email'),
            ente_id=ente_id,
            dati_nuovi={"descrizione": descrizione, "numero_progressivo": numero},
            descrizione=f"Nuovo bene inventario N.{numero}: {descrizione[:50]}"
        )

        conn.commit()

        return {
            "id": str(row[0]),
            "numero_progressivo": row[1],
            "created_at": row[2].isoformat()
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# BENI — MODIFICA (solo se non bloccato)
# ============================================

@router.put("/beni/{bene_id}")
async def update_bene(
    bene_id: UUID,
    data: dict,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT bloccato, stato, descrizione FROM beni_inventario
            WHERE id = %s AND ente_id = %s
        """, (str(bene_id), ente_id))
        bene = cur.fetchone()
        if not bene:
            raise HTTPException(status_code=404, detail="Bene non trovato")
        if bene[0]:
            raise HTTPException(status_code=403, detail="Bene bloccato da un registro ufficiale. Non modificabile.")
        if bene[1] != 'attivo':
            raise HTTPException(status_code=403, detail="Bene rimosso. Non modificabile.")

        descrizione = data.get("descrizione", "").strip()
        if not descrizione:
            raise HTTPException(status_code=400, detail="Descrizione obbligatoria")

        cur.execute("""
            UPDATE beni_inventario SET
                categoria_id = %s,
                ubicazione_id = %s,
                descrizione = %s,
                quantita = %s,
                provenienza = %s,
                stato_conservazione = %s,
                valore_stimato = %s,
                valore_assicurato = %s,
                data_acquisto = %s,
                fornitore = %s,
                codice_regione = %s,
                numero_catalogo_generale = %s,
                codice_ente_competente = %s,
                note = %s,
                note_storiche = %s,
                updated_by = %s,
                updated_at = NOW()
            WHERE id = %s AND ente_id = %s
        """, (
            data.get("categoria_id"),
            data.get("ubicazione_id"),
            descrizione,
            data.get("quantita", 1),
            data.get("provenienza"),
            data.get("stato_conservazione"),
            data.get("valore_stimato"),
            data.get("valore_assicurato"),
            data.get("data_acquisto"),
            data.get("fornitore"),
            data.get("codice_regione"),
            data.get("numero_catalogo_generale"),
            data.get("codice_ente_competente"),
            data.get("note"),
            data.get("note_storiche"),
            current_user['user_id'],
            str(bene_id), ente_id
        ))

        registra_audit_psycopg2(
            cur=cur,
            azione="UPDATE",
            tabella="beni_inventario",
            record_id=str(bene_id),
            utente_id=current_user.get('user_id'),
            utente_email=current_user.get('email'),
            ente_id=ente_id,
            dati_precedenti={"descrizione": bene[2]},
            dati_nuovi={"descrizione": descrizione},
            descrizione=f"Modifica bene inventario: {descrizione[:50]}"
        )

        conn.commit()

        return {"message": "Bene aggiornato", "id": str(bene_id)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# BENI — RIMUOVI (soft delete → storico)
# ============================================

@router.delete("/beni/{bene_id}")
async def delete_bene(
    bene_id: UUID,
    data: dict = None,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    if data is None:
        data = {}

    motivo = data.get("motivo_rimozione", "altro")
    note_rimozione = data.get("note_rimozione", "")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Recupera bene completo per snapshot
        cur.execute("""
            SELECT
                b.id, b.numero_progressivo, b.descrizione, b.quantita,
                b.stato_conservazione, b.valore_stimato, b.valore_assicurato,
                b.data_acquisto, b.fornitore, b.provenienza,
                b.codice_regione, b.numero_catalogo_generale, b.codice_ente_competente,
                b.note, b.note_storiche, b.stato, b.bloccato, b.registro_id,
                b.created_at,
                c.nome as categoria_nome,
                u.nome as ubicazione_nome,
                b.categoria_id, b.ubicazione_id
            FROM beni_inventario b
            LEFT JOIN inventario_categorie c ON b.categoria_id = c.id
            LEFT JOIN inventario_ubicazioni u ON b.ubicazione_id = u.id
            WHERE b.id = %s AND b.ente_id = %s
        """, (str(bene_id), ente_id))

        bene = cur.fetchone()
        if not bene:
            raise HTTPException(status_code=404, detail="Bene non trovato")
        if bene[15] == 'rimosso':
            raise HTTPException(status_code=400, detail="Bene già rimosso")

        # Snapshot bene
        snapshot = {
            "id": str(bene[0]),
            "numero_progressivo": bene[1],
            "descrizione": bene[2],
            "quantita": bene[3],
            "stato_conservazione": bene[4],
            "valore_stimato": float(bene[5]) if bene[5] else None,
            "valore_assicurato": float(bene[6]) if bene[6] else None,
            "data_acquisto": str(bene[7]) if bene[7] else None,
            "fornitore": bene[8],
            "provenienza": bene[9],
            "codice_regione": bene[10],
            "numero_catalogo_generale": bene[11],
            "codice_ente_competente": bene[12],
            "note": bene[13],
            "note_storiche": bene[14],
            "bloccato": bene[16],
            "registro_id": str(bene[17]) if bene[17] else None,
            "created_at": bene[18].isoformat() if bene[18] else None,
            "categoria_nome": bene[19],
            "ubicazione_nome": bene[20],
            "categoria_id": str(bene[21]) if bene[21] else None,
            "ubicazione_id": str(bene[22]) if bene[22] else None
        }

        # Snapshot foto
        cur.execute("""
            SELECT path_file, nome_file, didascalia, ordine
            FROM inventario_foto WHERE bene_id = %s ORDER BY ordine
        """, (str(bene_id),))
        foto_rows = cur.fetchall()
        snapshot_foto = [
            {"path_file": f[0], "nome_file": f[1], "didascalia": f[2], "ordine": f[3]}
            for f in foto_rows
        ]

        # Inserisci nello storico
        storico_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO inventario_storico (
                id, ente_id, bene_id, numero_progressivo, snapshot_bene, snapshot_foto,
                data_rimozione, motivo_rimozione, note_rimozione,
                registro_era_generato, rimosso_da
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            storico_id, ente_id, str(bene_id), bene[1],
            json.dumps(snapshot, ensure_ascii=False),
            json.dumps(snapshot_foto, ensure_ascii=False) if snapshot_foto else None,
            datetime.now().date(), motivo, note_rimozione,
            bene[16],  # bloccato = registro era generato
            current_user['user_id']
        ))

        # Soft delete del bene
        cur.execute("""
            UPDATE beni_inventario SET
                stato = 'rimosso',
                data_rimozione = %s,
                motivo_rimozione = %s,
                note_rimozione = %s,
                rimosso_da = %s,
                rimosso_at = NOW()
            WHERE id = %s
        """, (
            datetime.now().date(), motivo, note_rimozione,
            current_user['user_id'], str(bene_id)
        ))

        registra_audit_psycopg2(
            cur=cur,
            azione="DELETE",
            tabella="beni_inventario",
            record_id=str(bene_id),
            utente_id=current_user.get('user_id'),
            utente_email=current_user.get('email'),
            ente_id=ente_id,
            dati_precedenti={"descrizione": bene[2], "numero_progressivo": bene[1]},
            descrizione=f"Rimozione bene N.{bene[1]}: {bene[2][:50]} — Motivo: {motivo}"
        )

        conn.commit()

        return {
            "message": f"Bene N.{bene[1]} rimosso e archiviato nello storico",
            "storico_id": storico_id
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# FOTO — LISTA
# ============================================

@router.get("/beni/{bene_id}/foto")
async def get_foto_bene(
    bene_id: UUID,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verifica bene appartenga all'ente
        cur.execute("""
            SELECT id FROM beni_inventario WHERE id = %s AND ente_id = %s
        """, (str(bene_id), ente_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Bene non trovato")

        cur.execute("""
            SELECT id, nome_file, path_file, mime_type, dimensione, ordine, didascalia, created_at
            FROM inventario_foto
            WHERE bene_id = %s
            ORDER BY ordine
        """, (str(bene_id),))
        rows = cur.fetchall()

        foto = []
        for r in rows:
            foto.append({
                "id": str(r[0]),
                "nome_file": r[1],
                "path_file": r[2],
                "mime_type": r[3],
                "dimensione": r[4],
                "ordine": r[5],
                "didascalia": r[6],
                "created_at": r[7].isoformat() if r[7] else None
            })
        return {"foto": foto, "totale": len(foto)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# FOTO — UPLOAD
# ============================================

@router.post("/beni/{bene_id}/foto", status_code=status.HTTP_201_CREATED)
async def upload_foto(
    bene_id: UUID,
    file: UploadFile = File(...),
    didascalia: str = Form(None),
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verifica bene appartenga all'ente
        cur.execute("""
            SELECT id FROM beni_inventario WHERE id = %s AND ente_id = %s AND stato = 'attivo'
        """, (str(bene_id), ente_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Bene non trovato o rimosso")

        # Verifica MIME type
        if file.content_type not in FOTO_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Tipo file non consentito. Consentiti: JPG, PNG, WEBP"
            )

        # Leggi e verifica dimensione
        contents = await file.read()
        file_size = len(contents)
        if file_size > FOTO_MAX_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File troppo grande. Massimo 10MB (ricevuto {file_size / 1024 / 1024:.1f}MB)"
            )

        # Crea directory per ente/bene
        bene_dir = FOTO_UPLOAD_DIR / str(ente_id) / str(bene_id)
        bene_dir.mkdir(parents=True, exist_ok=True)

        # Genera nome file univoco
        ext_map = {
            'image/jpeg': '.jpg', 'image/jpg': '.jpg',
            'image/png': '.png', 'image/webp': '.webp'
        }
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ['.jpg', '.jpeg', '.png', '.webp']:
            file_ext = ext_map.get(file.content_type, '.jpg')

        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = bene_dir / unique_filename

        # Salva file
        with open(file_path, "wb") as f:
            f.write(contents)

        # Percorso relativo per DB
        relative_path = str(file_path.relative_to(FOTO_UPLOAD_DIR))

        # Prossimo ordine
        cur.execute("""
            SELECT COALESCE(MAX(ordine), -1) + 1 FROM inventario_foto WHERE bene_id = %s
        """, (str(bene_id),))
        ordine = cur.fetchone()[0]

        foto_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO inventario_foto (
                id, bene_id, ente_id, nome_file, path_file, mime_type,
                dimensione, ordine, didascalia, uploaded_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            foto_id, str(bene_id), ente_id,
            file.filename, relative_path, file.content_type,
            file_size, ordine, didascalia,
            current_user['user_id']
        ))
        row = cur.fetchone()
        conn.commit()

        return {
            "id": str(row[0]),
            "nome_file": file.filename,
            "path_file": relative_path,
            "ordine": ordine,
            "dimensione": file_size,
            "created_at": row[1].isoformat()
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# FOTO — VISUALIZZA (serve immagine al browser)
# ============================================

@router.get("/foto/{foto_id}/visualizza")
async def visualizza_foto(
    foto_id: UUID,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT path_file, nome_file, mime_type
            FROM inventario_foto
            WHERE id = %s AND ente_id = %s
        """, (str(foto_id), ente_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Foto non trovata")

        full_path = FOTO_UPLOAD_DIR / row[0]
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="File non trovato sul server")

        return FileResponse(
            path=str(full_path),
            filename=row[1],
            media_type=row[2]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# FOTO — ELIMINA
# ============================================

@router.delete("/foto/{foto_id}")
async def delete_foto(
    foto_id: UUID,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT path_file, bene_id FROM inventario_foto
            WHERE id = %s AND ente_id = %s
        """, (str(foto_id), ente_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Foto non trovata")

        # Elimina file fisico
        full_path = FOTO_UPLOAD_DIR / row[0]
        if full_path.exists():
            os.remove(str(full_path))

        # Elimina dal DB
        cur.execute("DELETE FROM inventario_foto WHERE id = %s", (str(foto_id),))

        # Riordina foto rimanenti
        cur.execute("""
            SELECT id FROM inventario_foto
            WHERE bene_id = %s ORDER BY ordine
        """, (str(row[1]),))
        foto_rimanenti = cur.fetchall()
        for i, f in enumerate(foto_rimanenti):
            cur.execute("UPDATE inventario_foto SET ordine = %s WHERE id = %s", (i, str(f[0])))

        conn.commit()
        return {"message": "Foto eliminata"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# FOTO — RIORDINA
# ============================================

@router.put("/foto/{foto_id}/ordine")
async def update_ordine_foto(
    foto_id: UUID,
    data: dict,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    nuovo_ordine = data.get("ordine")
    if nuovo_ordine is None:
        raise HTTPException(status_code=400, detail="Campo 'ordine' obbligatorio")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT bene_id, ordine FROM inventario_foto
            WHERE id = %s AND ente_id = %s
        """, (str(foto_id), ente_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Foto non trovata")

        bene_id = row[0]
        vecchio_ordine = row[1]

        if nuovo_ordine == vecchio_ordine:
            return {"message": "Ordine invariato"}

        # Sposta le altre foto per fare spazio
        if nuovo_ordine < vecchio_ordine:
            # Spostamento verso l'alto: le foto tra nuovo e vecchio scalano di 1
            cur.execute("""
                UPDATE inventario_foto
                SET ordine = ordine + 1
                WHERE bene_id = %s AND ordine >= %s AND ordine < %s AND id != %s
            """, (str(bene_id), nuovo_ordine, vecchio_ordine, str(foto_id)))
        else:
            # Spostamento verso il basso: le foto tra vecchio e nuovo scalano di -1
            cur.execute("""
                UPDATE inventario_foto
                SET ordine = ordine - 1
                WHERE bene_id = %s AND ordine > %s AND ordine <= %s AND id != %s
            """, (str(bene_id), vecchio_ordine, nuovo_ordine, str(foto_id)))

        # Imposta nuovo ordine
        cur.execute("""
            UPDATE inventario_foto SET ordine = %s WHERE id = %s
        """, (nuovo_ordine, str(foto_id)))

        conn.commit()
        return {"message": "Ordine aggiornato", "ordine": nuovo_ordine}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
