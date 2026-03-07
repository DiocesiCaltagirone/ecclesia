from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/enti", tags=["enti"])


@router.get("/my-enti")
async def get_my_enti(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ottiene lista enti accessibili dall'utente"""
    query = text("""
        SELECT
            e.id, e.tipo, e.denominazione, e.comune, e.provincia,
            ue.ruolo, ue.permessi
        FROM enti e
        JOIN utenti_enti ue ON e.id = ue.ente_id
        WHERE ue.utente_id = :user_id
        ORDER BY e.denominazione
    """)
    results = db.execute(query, {"user_id": current_user["user_id"]}).fetchall()
    enti = []
    for row in results:
        enti.append({
            "id": str(row[0]),
            "tipo": row[1],
            "denominazione": row[2],
            "comune": row[3],
            "provincia": row[4],
            "ruolo": row[5],
            "permessi": row[6]
        })
    return {"enti": enti}


@router.get("/{ente_id}")
async def get_ente(
    ente_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ottiene dettagli ente"""
    query = text("""
        SELECT id, denominazione, codice_fiscale, partita_iva, indirizzo, cap,
               comune, provincia, regione, telefono, fax, email, sito_web,
               parroco, vicario, diocesi, anno_fondazione, santo_patrono, numero_abitanti,
               data_erezione_canonica, data_riconoscimento_civile, registro_pg,
               parroco_nato_a, parroco_nato_il, parroco_nominato_il,
               parroco_possesso_canonico_il, vicario_nominato_il
        FROM enti
        WHERE id = :ente_id
    """)
    result = db.execute(query, {"ente_id": ente_id}).fetchone()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ente non trovato")
    return {
        "id": str(result[0]),
        "denominazione": result[1],
        "codice_fiscale": result[2],
        "partita_iva": result[3],
        "indirizzo": result[4],
        "cap": result[5],
        "comune": result[6],
        "provincia": result[7],
        "regione": result[8],
        "telefono": result[9],
        "fax": result[10],
        "email": result[11],
        "sito_web": result[12],
        "parroco": result[13],
        "vicario": result[14],
        "diocesi": result[15],
        "anno_fondazione": result[16],
        "santo_patrono": result[17],
        "numero_abitanti": result[18],
        "data_erezione_canonica": str(result[19]) if result[19] else None,
        "data_riconoscimento_civile": str(result[20]) if result[20] else None,
        "registro_pg": result[21],
        "parroco_nato_a": result[22],
        "parroco_nato_il": str(result[23]) if result[23] else None,
        "parroco_nominato_il": str(result[24]) if result[24] else None,
        "parroco_possesso_canonico_il": str(result[25]) if result[25] else None,
        "vicario_nominato_il": str(result[26]) if result[26] else None
    }


@router.put("/{ente_id}")
async def update_ente(
    ente_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggiorna dati ente"""
    data = await request.json()
    check = db.execute(text("SELECT id FROM enti WHERE id = :ente_id"), {"ente_id": ente_id}).fetchone()
    if not check:
        raise HTTPException(status_code=404, detail="Ente non trovato")
    query = text("""
        UPDATE enti SET
            denominazione = COALESCE(:denominazione, denominazione),
            codice_fiscale = :codice_fiscale,
            partita_iva = :partita_iva,
            indirizzo = :indirizzo,
            cap = :cap,
            comune = :comune,
            provincia = :provincia,
            regione = :regione,
            telefono = :telefono,
            fax = :fax,
            email = :email,
            sito_web = :sito_web,
            parroco = :parroco,
            vicario = :vicario,
            diocesi = :diocesi,
            anno_fondazione = :anno_fondazione,
            santo_patrono = :santo_patrono,
            numero_abitanti = :numero_abitanti,
            data_erezione_canonica = :data_erezione_canonica,
            data_riconoscimento_civile = :data_riconoscimento_civile,
            registro_pg = :registro_pg,
            parroco_nato_a = :parroco_nato_a,
            parroco_nato_il = :parroco_nato_il,
            parroco_nominato_il = :parroco_nominato_il,
            parroco_possesso_canonico_il = :parroco_possesso_canonico_il,
            vicario_nominato_il = :vicario_nominato_il
        WHERE id = :ente_id
    """)
    db.execute(query, {
        "ente_id": ente_id,
        "denominazione": data.get("denominazione"),
        "codice_fiscale": data.get("codice_fiscale") or None,
        "partita_iva": data.get("partita_iva") or None,
        "indirizzo": data.get("indirizzo") or None,
        "cap": data.get("cap") or None,
        "comune": data.get("comune") or None,
        "provincia": data.get("provincia") or None,
        "regione": data.get("regione") or None,
        "telefono": data.get("telefono") or None,
        "fax": data.get("fax") or None,
        "email": data.get("email") or None,
        "sito_web": data.get("sito_web") or None,
        "parroco": data.get("parroco") or None,
        "vicario": data.get("vicario") or None,
        "diocesi": data.get("diocesi") or None,
        "anno_fondazione": int(data.get("anno_fondazione")) if data.get("anno_fondazione") else None,
        "santo_patrono": data.get("santo_patrono") or None,
        "numero_abitanti": int(data.get("numero_abitanti")) if data.get("numero_abitanti") else None,
        "data_erezione_canonica": data.get("data_erezione_canonica") or None,
        "data_riconoscimento_civile": data.get("data_riconoscimento_civile") or None,
        "registro_pg": data.get("registro_pg") or None,
        "parroco_nato_a": data.get("parroco_nato_a") or None,
        "parroco_nato_il": data.get("parroco_nato_il") or None,
        "parroco_nominato_il": data.get("parroco_nominato_il") or None,
        "parroco_possesso_canonico_il": data.get("parroco_possesso_canonico_il") or None,
        "vicario_nominato_il": data.get("vicario_nominato_il") or None
    })
    db.commit()
    return {"success": True, "message": "Ente aggiornato con successo"}
