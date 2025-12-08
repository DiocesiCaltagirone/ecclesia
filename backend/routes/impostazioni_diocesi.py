from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import os
import shutil
from pathlib import Path
from datetime import datetime
import uuid

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection
from auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Impostazioni Diocesi"])

# Directory per i file
UPLOADS_DIR = Path("uploads/diocesi")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

class ImpostazioniDiocesiUpdate(BaseModel):
    nome_diocesi: Optional[str] = None
    vescovo_nome: Optional[str] = None
    vescovo_titolo: Optional[str] = None


@router.get("/impostazioni-diocesi")
async def get_impostazioni_diocesi(current_user: dict = Depends(get_current_user)):
    """Recupera le impostazioni della diocesi"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT id, nome_diocesi, vescovo_nome, vescovo_titolo,
                   logo_path, timbro_path, firma_path, updated_at,
                   logo_nome, logo_dimensione,
                   timbro_nome, timbro_dimensione,
                   firma_nome, firma_dimensione
            FROM impostazioni_diocesi
            LIMIT 1
        """)
        
        row = cur.fetchone()
        
        if not row:
            # Crea record di default
            cur.execute("""
                INSERT INTO impostazioni_diocesi (nome_diocesi, vescovo_nome)
                VALUES ('Diocesi di Caltagirone', 'S.E. Mons. Calogero Peri')
                RETURNING id, nome_diocesi, vescovo_nome, vescovo_titolo,
                          logo_path, timbro_path, firma_path, updated_at
            """)
            row = cur.fetchone()
            conn.commit()
        
        return {
            "id": str(row[0]),
            "nome_diocesi": row[1],
            "vescovo_nome": row[2],
            "vescovo_titolo": row[3],
            "logo_path": row[4],
            "timbro_path": row[5],
            "firma_path": row[6],
            "updated_at": row[7].isoformat() if row[7] else None,
            "logo_nome": row[8],
            "logo_dimensione": row[9],
            "timbro_nome": row[10],
            "timbro_dimensione": row[11],
            "firma_nome": row[12],
            "firma_dimensione": row[13]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.put("/impostazioni-diocesi")
async def update_impostazioni_diocesi(
    dati: ImpostazioniDiocesiUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Aggiorna le impostazioni della diocesi"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verifica che esista un record
        cur.execute("SELECT id FROM impostazioni_diocesi LIMIT 1")
        existing = cur.fetchone()
        
        if not existing:
            cur.execute("""
                INSERT INTO impostazioni_diocesi (nome_diocesi, vescovo_nome, vescovo_titolo)
                VALUES (%s, %s, %s)
            """, (dati.nome_diocesi, dati.vescovo_nome, dati.vescovo_titolo))
        else:
            updates = []
            params = []
            
            if dati.nome_diocesi is not None:
                updates.append("nome_diocesi = %s")
                params.append(dati.nome_diocesi)
            if dati.vescovo_nome is not None:
                updates.append("vescovo_nome = %s")
                params.append(dati.vescovo_nome)
            if dati.vescovo_titolo is not None:
                updates.append("vescovo_titolo = %s")
                params.append(dati.vescovo_titolo)
            
            updates.append("updated_at = NOW()")
            params.append(str(existing[0]))
            
            query = f"UPDATE impostazioni_diocesi SET {', '.join(updates)} WHERE id = %s"
            cur.execute(query, params)
        
        conn.commit()
        
        return {"message": "Impostazioni aggiornate con successo"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.post("/impostazioni-diocesi/upload/{tipo}")
async def upload_file_diocesi(
    tipo: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload file per la diocesi (logo, timbro, firma)
    tipo: 'logo', 'timbro', 'firma'
    """
    if tipo not in ['logo', 'timbro', 'firma']:
        raise HTTPException(status_code=400, detail="Tipo non valido. Usa: logo, timbro, firma")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verifica tipo file
        allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Formato file non supportato. Usa PNG, JPG o WEBP")
        
        # Genera nome univoco
        ext = Path(file.filename).suffix
        filename = f"{tipo}_{uuid.uuid4()}{ext}"
        filepath = UPLOADS_DIR / filename
        
        # Salva file
        with open(filepath, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Calcola dimensione file
        file_size = os.path.getsize(filepath)
        
        # Aggiorna database
        cur.execute(f"""
            UPDATE impostazioni_diocesi 
            SET {tipo}_path = %s, 
                {tipo}_nome = %s, 
                {tipo}_dimensione = %s,
                updated_at = NOW()
        """, (str(filepath), file.filename, file_size))
        
        conn.commit()
        
        return {
            "message": f"{tipo.capitalize()} caricato con successo",
            "path": str(filepath)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.delete("/impostazioni-diocesi/file/{tipo}")
async def delete_file_diocesi(
    tipo: str,
    current_user: dict = Depends(get_current_user)
):
    """Elimina un file (logo, timbro, firma)"""
    if tipo not in ['logo', 'timbro', 'firma']:
        raise HTTPException(status_code=400, detail="Tipo non valido")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        colonna = f"{tipo}_path"
        
        # Recupera path attuale
        cur.execute(f"SELECT {colonna} FROM impostazioni_diocesi LIMIT 1")
        row = cur.fetchone()
        
        if row and row[0]:
            # Elimina file fisico
            filepath = Path(row[0])
            if filepath.exists():
                filepath.unlink()
        
        # Aggiorna database
        cur.execute(f"""
            UPDATE impostazioni_diocesi 
            SET {tipo}_path = NULL, 
                {tipo}_nome = NULL, 
                {tipo}_dimensione = NULL,
                updated_at = NOW()
        """)
        
        conn.commit()
        
        return {"message": f"{tipo.capitalize()} eliminato con successo"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()