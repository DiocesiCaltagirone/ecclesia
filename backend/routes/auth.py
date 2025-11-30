# backend/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import timedelta
from pydantic import BaseModel
from typing import Optional

from database import get_db
from auth import (
    verify_password,
    create_access_token,
    get_current_user,
    get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# ============================================
# MODELS
# ============================================

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    titolo: Optional[str] = None
    nome: str
    cognome: str
    email: str

# ============================================
# ENDPOINT LOGIN
# ============================================

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login utente e generazione token JWT"""
    
    # Cerca utente per email
    query = text("""
    SELECT id, username, email, password_hash, nome, cognome, titolo, attivo, is_economo
    FROM utenti
    WHERE email = :email
    """)
    
    result = db.execute(query, {"email": form_data.username}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password errati",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id, username, email, password_hash, nome, cognome, titolo, attivo, is_economo = result
    
    # Verifica password
    if not verify_password(form_data.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password errati",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verifica che utente sia attivo
    if not attivo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disattivato"
        )
    
    # Crea token JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
    data={
        "sub": str(user_id),
        "email": email,
        "username": username,
        "is_economo": str(is_economo)  # ⭐ AGGIUNGI QUESTA RIGA
    },
    expires_delta=access_token_expires
)
    
    # Ottieni enti associati
    query_enti = text("""
        SELECT e.id, e.denominazione, ue.ruolo
        FROM enti e
        JOIN utenti_enti ue ON e.id = ue.ente_id
        WHERE ue.utente_id = :user_id
        ORDER BY e.denominazione
    """)
    
    enti_results = db.execute(query_enti, {"user_id": user_id}).fetchall()
    
    enti = []
    for ente_row in enti_results:
        enti.append({
            "id": str(ente_row[0]),
            "denominazione": ente_row[1],
            "ruolo": ente_row[2]
        })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user_id),
            "username": username,
            "email": email,
            "nome": nome,
            "cognome": cognome,
            "titolo": titolo
        },
        "enti": enti
    }

# ============================================
# ENDPOINT CAMBIO PASSWORD
# ============================================

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cambia password utente"""
    
    user_id = current_user["user_id"]
    
    # Ottieni password corrente
    query = text("""
        SELECT password_hash
        FROM utenti
        WHERE id = :user_id
    """)
    
    result = db.execute(query, {"user_id": user_id}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )
    
    current_password_hash = result[0]
    
    # Verifica vecchia password
    if not verify_password(request.old_password, current_password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password attuale errata"
        )
    
    # Hash nuova password
    new_password_hash = get_password_hash(request.new_password)
    
    # Aggiorna password
    update_query = text("""
        UPDATE utenti
        SET password_hash = :password_hash
        WHERE id = :user_id
    """)
    
    db.execute(update_query, {
        "user_id": user_id,
        "password_hash": new_password_hash
    })
    
    db.commit()
    
    return {
        "message": "Password cambiata con successo"
    }

# ============================================
# ENDPOINT AGGIORNA PROFILO
# ============================================

@router.put("/update-profile")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggiorna dati profilo utente"""
    
    user_id = current_user["user_id"]
    
    # Verifica che email non sia già usata da altro utente
    query_check = text("""
        SELECT id FROM utenti
        WHERE email = :email AND id != :user_id
    """)
    
    existing = db.execute(query_check, {
        "email": request.email,
        "user_id": user_id
    }).fetchone()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email già in uso da un altro utente"
        )
    
    # Aggiorna profilo
    update_query = text("""
        UPDATE utenti
        SET titolo = :titolo,
            nome = :nome,
            cognome = :cognome,
            email = :email
        WHERE id = :user_id
        RETURNING id, username, email, nome, cognome, titolo
    """)
    
    result = db.execute(update_query, {
        "user_id": user_id,
        "titolo": request.titolo,
        "nome": request.nome,
        "cognome": request.cognome,
        "email": request.email
    }).fetchone()
    
    db.commit()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )
    
    return {
        "id": str(result[0]),
        "username": result[1],
        "email": result[2],
        "nome": result[3],
        "cognome": result[4],
        "titolo": result[5],
        "message": "Profilo aggiornato con successo"
    }

# ============================================
# ENDPOINT UTENTE CORRENTE
# ============================================

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Ottiene dati utente corrente"""
    return current_user
