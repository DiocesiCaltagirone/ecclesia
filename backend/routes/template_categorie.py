from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/template-categorie", tags=["Template Categorie"])

# ============================================
# MODELLI PYDANTIC
# ============================================

class TemplateCategoriaCreate(BaseModel):
    codice: str
    descrizione: str
    categoria_padre_id: Optional[str] = None
    livello: int = 1
    ordine: int = 0

class TemplateCategoriaUpdate(BaseModel):
    codice: Optional[str] = None
    descrizione: Optional[str] = None
    ordine: Optional[int] = None
    attivo: Optional[bool] = None

# ============================================
# ENDPOINT: GET TUTTE LE CATEGORIE TEMPLATE
# ============================================

@router.get("")
async def get_template_categorie(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Recupera tutte le categorie del template diocesano.
    Solo economo può accedere.
    """
    # Verifica permessi economo
    if not current_user.get('is_economo'):
        raise HTTPException(status_code=403, detail="Solo l'economo può gestire il template")
    
    try:
        query = """
            SELECT 
                id, codice, descrizione, 
                categoria_padre_id, livello, ordine, attivo,
                created_at, updated_at
            FROM template_categorie_diocesano
            WHERE attivo = TRUE
            ORDER BY ordine, codice
        """
        
        result = db.execute(text(query)).fetchall()
        
        categorie = []
        for row in result:
            categorie.append({
                "id": str(row[0]),
                "codice": row[1],
                "descrizione": row[2],
                "categoria_padre_id": str(row[3]) if row[3] else None,
                "livello": row[4],
                "ordine": row[5],
                "attivo": row[6],
                "created_at": row[7].isoformat() if row[7] else None,
                "updated_at": row[8].isoformat() if row[8] else None
            })
        
        return categorie
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel recupero delle categorie: {str(e)}")

# ============================================
# ENDPOINT: CREA NUOVA CATEGORIA
# ============================================

@router.post("")
async def create_template_categoria(
    categoria: TemplateCategoriaCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Crea una nuova categoria nel template diocesano.
    """
    if not current_user.get('is_economo'):
        raise HTTPException(status_code=403, detail="Solo l'economo può creare categorie template")
    
    try:
        query = """
            INSERT INTO template_categorie_diocesano 
            (codice, descrizione, categoria_padre_id, livello, ordine)
            VALUES (:codice, :descrizione, :categoria_padre_id, :livello, :ordine)
            RETURNING id, codice, descrizione, categoria_padre_id, livello, ordine, attivo
        """
        
        result = db.execute(text(query), {
            "codice": categoria.codice,
            "descrizione": categoria.descrizione,
            "categoria_padre_id": categoria.categoria_padre_id,
            "livello": categoria.livello,
            "ordine": categoria.ordine
        }).fetchone()
        
        db.commit()
        
        return {
            "id": str(result[0]),
            "codice": result[1],
            "descrizione": result[2],
            "categoria_padre_id": str(result[3]) if result[3] else None,
            "livello": result[4],
            "ordine": result[5],
            "attivo": result[6]
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nella creazione: {str(e)}")

# ============================================
# ENDPOINT: AGGIORNA CATEGORIA
# ============================================

@router.put("/{categoria_id}")
async def update_template_categoria(
    categoria_id: str,
    categoria: TemplateCategoriaUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Aggiorna una categoria esistente.
    """
    if not current_user.get('is_economo'):
        raise HTTPException(status_code=403, detail="Solo l'economo può modificare categorie template")
    
    try:
        # Costruisci query dinamica
        updates = []
        params = {"id": categoria_id}
        
        if categoria.codice is not None:
            updates.append("codice = :codice")
            params["codice"] = categoria.codice
        
        if categoria.descrizione is not None:
            updates.append("descrizione = :descrizione")
            params["descrizione"] = categoria.descrizione
        
        if categoria.ordine is not None:
            updates.append("ordine = :ordine")
            params["ordine"] = categoria.ordine
        
        if categoria.attivo is not None:
            updates.append("attivo = :attivo")
            params["attivo"] = categoria.attivo
        
        if not updates:
            raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
        
        updates.append("updated_at = NOW()")
        
        query = f"""
            UPDATE template_categorie_diocesano 
            SET {', '.join(updates)}
            WHERE id = :id
            RETURNING id, codice, descrizione, categoria_padre_id, livello, ordine, attivo
        """
        
        result = db.execute(text(query), params).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Categoria non trovata")
        
        db.commit()
        
        return {
            "id": str(result[0]),
            "codice": result[1],
            "descrizione": result[2],
            "categoria_padre_id": str(result[3]) if result[3] else None,
            "livello": result[4],
            "ordine": result[5],
            "attivo": result[6]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nell'aggiornamento: {str(e)}")

# ============================================
# ENDPOINT: ELIMINA CATEGORIA
# ============================================

@router.delete("/{categoria_id}")
async def delete_template_categoria(
    categoria_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Elimina una categoria (soft delete).
    """
    if not current_user.get('is_economo'):
        raise HTTPException(status_code=403, detail="Solo l'economo può eliminare categorie template")
    
    try:
        query = """
            UPDATE template_categorie_diocesano 
            SET attivo = FALSE, updated_at = NOW()
            WHERE id = :id
            RETURNING id
        """
        
        result = db.execute(text(query), {"id": categoria_id}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Categoria non trovata")
        
        db.commit()
        
        return {"message": "Categoria eliminata con successo"}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nell'eliminazione: {str(e)}")

# ============================================
# SCRIPT CREAZIONE TABELLA (per reference)
# ============================================
"""
CREATE TABLE IF NOT EXISTS template_categorie_diocesano (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codice VARCHAR(20) UNIQUE NOT NULL,
    descrizione VARCHAR(200) NOT NULL,
    categoria_padre_id UUID REFERENCES template_categorie_diocesano(id) ON DELETE CASCADE,
    livello INTEGER NOT NULL DEFAULT 1,
    ordine INTEGER DEFAULT 0,
    attivo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_template_cat_padre ON template_categorie_diocesano(categoria_padre_id);
CREATE INDEX idx_template_cat_livello ON template_categorie_diocesano(livello);
CREATE INDEX idx_template_cat_ordine ON template_categorie_diocesano(ordine);
"""

@router.post("/applica-a-ente/{ente_id}")
async def applica_template_a_ente(
    ente_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Copia tutte le categorie dal template nel piano_conti della parrocchia
    """
    
    # Solo economo può applicare template
    if not current_user.get('is_economo'):
        raise HTTPException(
            status_code=403, 
            detail="Solo l'economo diocesano può applicare il template"
        )
    
    try:
        # Verifica che l'ente esista
        check_ente = """
            SELECT id, denominazione FROM enti WHERE id = :ente_id AND attivo = TRUE
        """
        result = db.execute(text(check_ente), {"ente_id": ente_id}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Ente non trovato")
        
        ente_denominazione = result[1]
        
        # Conta categorie già presenti
        count_existing = """
            SELECT COUNT(*) FROM piano_conti WHERE ente_id = :ente_id
        """
        existing_count = db.execute(text(count_existing), {"ente_id": ente_id}).fetchone()[0]
        
        # Prima copia le categorie principali (livello 1)
        query_livello1 = """
            INSERT INTO piano_conti (
                ente_id, 
                codice, 
                descrizione, 
                categoria_padre_id,
                livello, 
                ordine,
                attivo,
                created_at,
                updated_at
            )
            SELECT 
                :ente_id,
                t.codice,
                t.descrizione,
                NULL,
                t.livello,
                t.ordine,
                TRUE,
                NOW(),
                NOW()
            FROM template_categorie_diocesano t
            WHERE t.attivo = TRUE 
            AND t.livello = 1
            AND t.categoria_padre_id IS NULL
            ORDER BY t.ordine, t.codice
            ON CONFLICT (ente_id, codice) DO NOTHING
        """
        
        db.execute(text(query_livello1), {"ente_id": ente_id})
        db.commit()
        
        # Poi copia le sottocategorie (livello 2+)
        query_livello2 = """
            INSERT INTO piano_conti (
                ente_id, 
                codice, 
                descrizione, 
                categoria_padre_id,
                livello, 
                ordine,
                attivo,
                created_at,
                updated_at
            )
            SELECT 
                :ente_id,
                t.codice,
                t.descrizione,
                (
                    SELECT pc.id 
                    FROM piano_conti pc
                    INNER JOIN template_categorie_diocesano t_padre 
                        ON pc.codice = t_padre.codice
                    WHERE pc.ente_id = :ente_id
                    AND t_padre.id = t.categoria_padre_id
                    LIMIT 1
                ),
                t.livello,
                t.ordine,
                TRUE,
                NOW(),
                NOW()
            FROM template_categorie_diocesano t
            WHERE t.attivo = TRUE 
            AND t.livello > 1
            AND t.categoria_padre_id IS NOT NULL
            ORDER BY t.livello, t.ordine, t.codice
            ON CONFLICT (ente_id, codice) DO NOTHING
        """
        
        db.execute(text(query_livello2), {"ente_id": ente_id})
        db.commit()
        
        # Conta categorie totali dopo inserimento
        count_after = """
            SELECT COUNT(*) FROM piano_conti WHERE ente_id = :ente_id
        """
        total_count = db.execute(text(count_after), {"ente_id": ente_id}).fetchone()[0]
        
        categorie_copiate = total_count - existing_count
        
        return {
            "success": True,
            "message": f"Template applicato con successo a {ente_denominazione}",
            "ente_id": ente_id,
            "ente_denominazione": ente_denominazione,
            "categorie_gia_presenti": existing_count,
            "categorie_copiate": categorie_copiate,
            "categorie_totali": total_count
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Errore durante l'applicazione del template: {str(e)}"
        )


@router.delete("/rimuovi-da-ente/{ente_id}")
async def rimuovi_template_da_ente(
    ente_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Elimina tutte le categorie dal piano_conti della parrocchia
    ⚠️ ATTENZIONE: Questa operazione è irreversibile!
    """
    
    # Solo economo può rimuovere template
    if not current_user.get('is_economo'):
        raise HTTPException(
            status_code=403, 
            detail="Solo l'economo diocesano può rimuovere il template"
        )
    
    try:
        # Verifica che l'ente esista
        check_ente = """
            SELECT id, denominazione FROM enti WHERE id = :ente_id
        """
        result = db.execute(text(check_ente), {"ente_id": ente_id}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Ente non trovato")
        
        ente_denominazione = result[1]
        
        # Conta categorie prima di eliminare
        count_query = """
            SELECT COUNT(*) FROM piano_conti WHERE ente_id = :ente_id
        """
        count_result = db.execute(text(count_query), {"ente_id": ente_id}).fetchone()
        num_categorie = count_result[0]
        
        if num_categorie == 0:
            return {
                "success": True,
                "message": "Nessuna categoria da eliminare",
                "categorie_eliminate": 0
            }
        
        # Verifica se ci sono movimenti contabili collegati
        check_movimenti = """
            SELECT COUNT(*) 
            FROM movimenti_contabili m
            INNER JOIN piano_conti pc ON m.categoria_id = pc.id
            WHERE pc.ente_id = :ente_id
        """
        movimenti_count = db.execute(text(check_movimenti), {"ente_id": ente_id}).fetchone()[0]
        
        if movimenti_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Impossibile eliminare: ci sono {movimenti_count} movimenti contabili collegati alle categorie"
            )
        
        # Elimina tutte le categorie (CASCADE eliminerà anche le sottocategorie)
        query = """
            DELETE FROM piano_conti WHERE ente_id = :ente_id
        """
        
        db.execute(text(query), {"ente_id": ente_id})
        db.commit()
        
        return {
            "success": True,
            "message": f"Template rimosso con successo da {ente_denominazione}",
            "ente_id": ente_id,
            "ente_denominazione": ente_denominazione,
            "categorie_eliminate": num_categorie
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Errore durante la rimozione del template: {str(e)}"
        )