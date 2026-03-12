from fastapi import APIRouter, Depends, HTTPException, Header, status
from uuid import UUID
from datetime import datetime
import uuid
import json
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection
from auth import get_current_user
from services.audit import registra_audit_psycopg2
from routes.inventario import get_ente_id

router = APIRouter(prefix="/api/inventario", tags=["Inventario - Registri e Storico"])


# ============================================
# REGISTRI — LISTA
# ============================================

@router.get("/registri")
async def get_registri(
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT r.id, r.anno, r.numero_registro, r.data_generazione,
                   r.totale_beni, r.note, r.created_at,
                   u.email as generato_da_email
            FROM inventario_registri r
            LEFT JOIN utenti u ON r.generato_da = u.id
            WHERE r.ente_id = %s
            ORDER BY r.anno DESC, r.numero_registro DESC
        """, (ente_id,))
        rows = cur.fetchall()

        registri = []
        for r in rows:
            registri.append({
                "id": str(r[0]),
                "anno": r[1],
                "numero_registro": r[2],
                "data_generazione": str(r[3]) if r[3] else None,
                "totale_beni": r[4],
                "note": r[5],
                "created_at": r[6].isoformat() if r[6] else None,
                "generato_da": r[7]
            })
        return {"registri": registri, "totale": len(registri)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================
# REGISTRI — GENERA
# ============================================

@router.post("/registri/genera", status_code=status.HTTP_201_CREATED)
async def genera_registro(
    data: dict,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    anno = data.get("anno")
    if not anno:
        raise HTTPException(status_code=400, detail="Anno obbligatorio")

    try:
        anno = int(anno)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Anno non valido")

    note = data.get("note", "")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verifica registro già esistente per anno
        cur.execute("""
            SELECT id FROM inventario_registri
            WHERE ente_id = %s AND anno = %s
        """, (ente_id, anno))
        if cur.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Esiste già un registro per l'anno {anno}"
            )

        # Recupera beni attivi con categoria e ubicazione
        cur.execute("""
            SELECT
                b.id, b.numero_progressivo, b.descrizione, b.quantita,
                b.stato_conservazione, b.valore_stimato, b.valore_assicurato,
                b.data_acquisto, b.fornitore, b.provenienza,
                b.codice_regione, b.numero_catalogo_generale, b.codice_ente_competente,
                b.note, b.note_storiche,
                c.nome as categoria_nome,
                u.nome as ubicazione_nome,
                b.categoria_id, b.ubicazione_id
            FROM beni_inventario b
            LEFT JOIN inventario_categorie c ON b.categoria_id = c.id
            LEFT JOIN inventario_ubicazioni u ON b.ubicazione_id = u.id
            WHERE b.ente_id = %s AND b.stato = 'attivo'
            ORDER BY b.numero_progressivo
        """, (ente_id,))
        beni_rows = cur.fetchall()

        if len(beni_rows) == 0:
            raise HTTPException(
                status_code=400,
                detail="Nessun bene attivo da registrare"
            )

        # Costruisci snapshot
        snapshot_beni = []
        for b in beni_rows:
            snapshot_beni.append({
                "id": str(b[0]),
                "numero_progressivo": b[1],
                "descrizione": b[2],
                "quantita": b[3],
                "stato_conservazione": b[4],
                "valore_stimato": float(b[5]) if b[5] else None,
                "valore_assicurato": float(b[6]) if b[6] else None,
                "data_acquisto": str(b[7]) if b[7] else None,
                "fornitore": b[8],
                "provenienza": b[9],
                "codice_regione": b[10],
                "numero_catalogo_generale": b[11],
                "codice_ente_competente": b[12],
                "note": b[13],
                "note_storiche": b[14],
                "categoria_nome": b[15],
                "ubicazione_nome": b[16],
                "categoria_id": str(b[17]) if b[17] else None,
                "ubicazione_id": str(b[18]) if b[18] else None
            })

        totale_beni = len(snapshot_beni)

        # Prossimo numero_registro per ente
        cur.execute("""
            SELECT COALESCE(MAX(numero_registro), 0) + 1
            FROM inventario_registri WHERE ente_id = %s
        """, (ente_id,))
        numero_registro = cur.fetchone()[0]

        # Inserisci registro
        registro_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO inventario_registri (
                id, ente_id, anno, numero_registro, data_generazione,
                totale_beni, dati_snapshot, note, generato_da
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            registro_id, ente_id, anno, numero_registro,
            datetime.now().date(),
            totale_beni,
            json.dumps(snapshot_beni, ensure_ascii=False),
            note or None,
            current_user['user_id']
        ))
        row = cur.fetchone()

        # Blocca tutti i beni attivi
        cur.execute("""
            UPDATE beni_inventario
            SET bloccato = TRUE, registro_id = %s
            WHERE ente_id = %s AND stato = 'attivo'
        """, (registro_id, ente_id))

        registra_audit_psycopg2(
            cur=cur,
            azione="INSERT",
            tabella="inventario_registri",
            record_id=registro_id,
            utente_id=current_user.get('user_id'),
            utente_email=current_user.get('email'),
            ente_id=ente_id,
            dati_nuovi={"anno": anno, "totale_beni": totale_beni, "numero_registro": numero_registro},
            descrizione=f"Generato registro inventario N.{numero_registro} anno {anno} — {totale_beni} beni bloccati"
        )

        conn.commit()

        return {
            "id": str(row[0]),
            "anno": anno,
            "numero_registro": numero_registro,
            "totale_beni": totale_beni,
            "created_at": row[1].isoformat(),
            "message": f"Registro N.{numero_registro} generato con {totale_beni} beni"
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
# STORICO — LISTA CON FILTRI
# ============================================

@router.get("/storico")
async def get_storico(
    anno: int = None,
    motivo: str = None,
    current_user: dict = Depends(get_current_user),
    x_ente_id: str = Header(None, alias="X-Ente-Id")
):
    ente_id = get_ente_id(current_user, x_ente_id)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        query = """
            SELECT
                s.id, s.bene_id, s.numero_progressivo, s.snapshot_bene,
                s.data_rimozione, s.motivo_rimozione, s.note_rimozione,
                s.registro_era_generato, s.created_at,
                u.email as rimosso_da_email
            FROM inventario_storico s
            LEFT JOIN utenti u ON s.rimosso_da = u.id
            WHERE s.ente_id = %s
        """
        params = [ente_id]

        if anno:
            query += " AND EXTRACT(YEAR FROM s.data_rimozione) = %s"
            params.append(anno)

        if motivo:
            query += " AND s.motivo_rimozione = %s"
            params.append(motivo)

        query += " ORDER BY s.data_rimozione DESC, s.numero_progressivo"

        cur.execute(query, params)
        rows = cur.fetchall()

        storico = []
        for r in rows:
            snapshot = r[3] if r[3] else {}
            storico.append({
                "id": str(r[0]),
                "bene_id": str(r[1]) if r[1] else None,
                "numero_progressivo": r[2],
                "descrizione": snapshot.get("descrizione", ""),
                "categoria_nome": snapshot.get("categoria_nome", ""),
                "ubicazione_nome": snapshot.get("ubicazione_nome", ""),
                "valore_stimato": snapshot.get("valore_stimato"),
                "data_rimozione": str(r[4]) if r[4] else None,
                "motivo_rimozione": r[5],
                "note_rimozione": r[6],
                "registro_era_generato": r[7],
                "created_at": r[8].isoformat() if r[8] else None,
                "rimosso_da": r[9]
            })
        return {"storico": storico, "totale": len(storico)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


