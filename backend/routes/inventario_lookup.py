from fastapi import APIRouter, Depends, HTTPException, Header, status
from uuid import UUID
import uuid
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection
from auth import get_current_user
from routes.inventario import get_ente_id

router = APIRouter(prefix="/api/inventario", tags=["Inventario - Categorie e Ubicazioni"])


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
