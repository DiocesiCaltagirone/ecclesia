from fastapi import APIRouter, HTTPException
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

router = APIRouter()


# ============================================
# HELPER — Recupera ente_id (usato da tutti i sub-moduli)
# ============================================

def get_ente_id(current_user: dict, x_ente_id: str = None):
    ente_id = current_user.get('ente_id') or x_ente_id
    if not ente_id:
        raise HTTPException(status_code=400, detail="Ente ID mancante")
    return ente_id


# ============================================
# INCLUDE SUB-ROUTERS
# ============================================

from routes.inventario_lookup import router as lookup_router
from routes.inventario_beni import router as beni_router
from routes.inventario_registri import router as registri_router

router.include_router(lookup_router)
router.include_router(beni_router)
router.include_router(registri_router)
