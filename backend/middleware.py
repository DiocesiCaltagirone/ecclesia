# ============================================
# ECCLESIA - Middleware Permessi
# File: middleware.py
# ============================================
# Intercetta le richieste e verifica automaticamente i permessi

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Callable
import permissions
import re


class PermissionMiddleware:
    """
    Middleware per verificare i permessi automaticamente.
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Controlla se la route richiede permessi
        path = request.url.path
        method = request.method
        
        # Routes che non richiedono controllo permessi
        skip_paths = [
            "/api/auth/login",
            "/api/auth/logout",
            "/api/health",
            "/docs",
            "/openapi.json"
        ]
        
        if any(path.startswith(skip_path) for skip_path in skip_paths):
            await self.app(scope, receive, send)
            return
        
        # Verifica autenticazione
        user_id = request.headers.get("X-User-ID")
        if not user_id:
            response = JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Non autenticato"}
            )
            await response(scope, receive, send)
            return
        
        # Aggiungi user_id allo scope per usarlo nelle routes
        scope["user_id"] = user_id
        
        await self.app(scope, receive, send)


def verifica_permesso_operazione(
    utente_id: str,
    operazione: str,
    tabella: str,
    record_id: str = None
) -> bool:
    """
    Verifica se un utente può eseguire un'operazione.
    
    Args:
        utente_id: UUID dell'utente
        operazione: 'create', 'read', 'update', 'delete'
        tabella: Nome tabella ('persone', 'battesimi', ecc.)
        record_id: UUID del record (per update/delete)
    
    Returns:
        bool: True se può eseguire l'operazione
    """
    
    # L'economo può fare tutto
    if permissions.è_economo_diocesano(utente_id):
        return True
    
    # Operazioni di lettura sono sempre permesse
    if operazione == 'read':
        return True
    
    # Operazioni di creazione sono sempre permesse
    # (la paternità viene impostata automaticamente)
    if operazione == 'create':
        return True
    
    # Operazioni di modifica/cancellazione richiedono controllo paternità
    if operazione in ['update', 'delete']:
        if not record_id:
            return False
        
        if tabella == 'persone':
            return permissions.può_modificare_anagrafica(utente_id, record_id)
        
        elif tabella in ['battesimi', 'cresime', 'matrimoni', 'prime_comunioni']:
            return permissions.può_modificare_sacramento(utente_id, tabella, record_id)
        
        else:
            # Per altre tabelle, permetti solo alla stessa parrocchia
            parrocchia_utente = permissions.get_parrocchia_utente(utente_id)
            # Qui dovresti implementare controllo specifico per tabella
            return True  # Default permissivo, da personalizzare
    
    return False


def require_permission(operazione: str, tabella: str):
    """
    Decorator per verificare permessi su una route.
    
    Usage:
        @app.get("/api/persone/{persona_id}")
        @require_permission("read", "persone")
        async def get_persona(persona_id: str, request: Request):
            ...
    """
    def decorator(func: Callable):
        async def wrapper(*args, **kwargs):
            request = None
            
            # Trova il Request object negli argomenti
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                for key, value in kwargs.items():
                    if isinstance(value, Request):
                        request = value
                        break
            
            if not request:
                raise HTTPException(
                    status_code=500,
                    detail="Request object non trovato"
                )
            
            # Ottieni user_id
            user_id = request.headers.get("X-User-ID")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Non autenticato"
                )
            
            # Ottieni record_id se presente
            record_id = kwargs.get('persona_id') or kwargs.get('id') or kwargs.get('sacramento_id')
            
            # Verifica permesso
            if not verifica_permesso_operazione(user_id, operazione, tabella, record_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Non hai i permessi per questa operazione"
                )
            
            # Esegui la funzione originale
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


async def log_request_middleware(request: Request, call_next):
    """
    Middleware per loggare tutte le richieste.
    Utile per debugging e audit.
    """
    import time
    
    start_time = time.time()
    
    # Log richiesta
    print(f"[{request.method}] {request.url.path}")
    
    # Processa richiesta
    response = await call_next(request)
    
    # Log risposta
    process_time = time.time() - start_time
    print(f"Completato in {process_time:.2f}s - Status: {response.status_code}")
    
    return response


def get_client_ip(request: Request) -> str:
    """
    Ottiene l'IP del client dalla richiesta.
    Gestisce anche proxy e load balancer.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0]
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"


def get_user_agent(request: Request) -> str:
    """
    Ottiene lo user agent del client.
    """
    return request.headers.get("User-Agent", "unknown")


async def add_request_info_middleware(request: Request, call_next):
    """
    Middleware che aggiunge informazioni alla richiesta
    per uso successivo (logging, etc).
    """
    # Aggiungi IP e User Agent al request state
    request.state.client_ip = get_client_ip(request)
    request.state.user_agent = get_user_agent(request)
    
    response = await call_next(request)
    return response


# ============================================
# HELPER PER GESTIRE ERRORI PERMESSI
# ============================================

def handle_permission_error(error: permissions.PermissionError) -> JSONResponse:
    """
    Gestisce gli errori di permessi in modo uniforme.
    """
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "error": "Permesso negato",
            "message": str(error),
            "code": "PERMISSION_DENIED"
        }
    )


def handle_validation_error(error: Exception) -> JSONResponse:
    """
    Gestisce errori di validazione.
    """
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Dati non validi",
            "message": str(error),
            "code": "VALIDATION_ERROR"
        }
    )


# ============================================
# CONTEXT HELPERS
# ============================================

def get_current_user(request: Request) -> str:
    """
    Ottiene l'ID dell'utente corrente dalla richiesta.
    
    Args:
        request: Oggetto Request FastAPI
    
    Returns:
        str: UUID dell'utente
    
    Raises:
        HTTPException: Se utente non autenticato
    """
    user_id = request.headers.get("X-User-ID")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non autenticato"
        )
    
    return user_id


def get_current_parrocchia(request: Request) -> str:
    """
    Ottiene l'ID della parrocchia dell'utente corrente.
    
    Args:
        request: Oggetto Request FastAPI
    
    Returns:
        str: UUID della parrocchia
    
    Raises:
        HTTPException: Se utente non autenticato o parrocchia non trovata
    """
    user_id = get_current_user(request)
    parrocchia_id = permissions.get_parrocchia_utente(user_id)
    
    if not parrocchia_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parrocchia non trovata per questo utente"
        )
    
    return parrocchia_id


def require_economo(request: Request) -> None:
    """
    Verifica che l'utente corrente sia l'economo diocesano.
    
    Args:
        request: Oggetto Request FastAPI
    
    Raises:
        HTTPException: Se utente non è economo
    """
    user_id = get_current_user(request)
    
    if not permissions.è_economo_diocesano(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operazione riservata all'economo diocesano"
        )


# ============================================
# UTILITY LOGGING
# ============================================

async def log_operation(
    request: Request,
    tabella: str,
    record_id: str,
    tipo_operazione: str,
    dati_precedenti: dict = None,
    dati_nuovi: dict = None
):
    """
    Registra un'operazione nel log.
    Da chiamare dopo operazioni CRUD importanti.
    
    Args:
        request: Oggetto Request FastAPI
        tabella: Nome tabella modificata
        record_id: UUID record modificato
        tipo_operazione: 'INSERT', 'UPDATE', 'DELETE'
        dati_precedenti: Dati prima della modifica
        dati_nuovi: Dati dopo la modifica
    """
    try:
        user_id = get_current_user(request)
        parrocchia_id = get_current_parrocchia(request)
        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)
        
        permissions.log_modifica(
            utente_id=user_id,
            parrocchia_id=parrocchia_id,
            tabella=tabella,
            record_id=record_id,
            tipo_operazione=tipo_operazione,
            dati_precedenti=dati_precedenti,
            dati_nuovi=dati_nuovi,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        print(f"Errore logging operazione: {e}")
        # Non bloccare l'operazione se il logging fallisce
