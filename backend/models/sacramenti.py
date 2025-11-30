# backend/models/sacramenti.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from uuid import UUID

# ============================================
# BATTESIMO
# ============================================
class BattesimoBase(BaseModel):
    data_battesimo: date
    luogo: Optional[str] = None
    parrocchia: Optional[str] = None
    volume: Optional[str] = None
    pagina: Optional[str] = None
    numero_atto: Optional[str] = None
    celebrante: Optional[str] = None
    padrino: Optional[str] = None
    madrina: Optional[str] = None
    note: Optional[str] = None

class BattesimoCreate(BattesimoBase):
    persona_id: UUID

class BattesimoUpdate(BaseModel):
    data_battesimo: Optional[date] = None
    luogo: Optional[str] = None
    parrocchia: Optional[str] = None
    volume: Optional[str] = None
    pagina: Optional[str] = None
    numero_atto: Optional[str] = None
    celebrante: Optional[str] = None
    padrino: Optional[str] = None
    madrina: Optional[str] = None
    note: Optional[str] = None

class BattesimoResponse(BattesimoBase):
    id: UUID
    persona_id: UUID
    ente_id: UUID
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

# ============================================
# PRIMA COMUNIONE
# ============================================
class PrimaComunioneBase(BaseModel):
    data_comunione: date
    luogo: Optional[str] = None
    parrocchia: Optional[str] = None
    celebrante: Optional[str] = None
    note: Optional[str] = None

class PrimaComunioneCreate(PrimaComunioneBase):
    persona_id: UUID

class PrimaComunioneUpdate(BaseModel):
    data_comunione: Optional[date] = None
    luogo: Optional[str] = None
    parrocchia: Optional[str] = None
    celebrante: Optional[str] = None
    note: Optional[str] = None

class PrimaComunioneResponse(PrimaComunioneBase):
    id: UUID
    persona_id: UUID
    ente_id: UUID
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

# ============================================
# CRESIMA
# ============================================
class CresimaBase(BaseModel):
    data_cresima: date
    luogo: Optional[str] = None
    parrocchia: Optional[str] = None
    volume: Optional[str] = None
    pagina: Optional[str] = None
    numero_atto: Optional[str] = None
    ministro: Optional[str] = None
    padrino: Optional[str] = None
    madrina: Optional[str] = None
    note: Optional[str] = None

class CresimaCreate(CresimaBase):
    persona_id: UUID

class CresimaUpdate(BaseModel):
    data_cresima: Optional[date] = None
    luogo: Optional[str] = None
    parrocchia: Optional[str] = None
    volume: Optional[str] = None
    pagina: Optional[str] = None
    numero_atto: Optional[str] = None
    ministro: Optional[str] = None
    padrino: Optional[str] = None
    madrina: Optional[str] = None
    note: Optional[str] = None

class CresimaResponse(CresimaBase):
    id: UUID
    persona_id: UUID
    ente_id: UUID
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

# ============================================
# MATRIMONIO
# ============================================
class MatrimonioBase(BaseModel):
    data_matrimonio: date
    luogo: Optional[str] = None
    parrocchia: Optional[str] = None
    volume: Optional[str] = None
    pagina: Optional[str] = None
    numero_atto: Optional[str] = None
    celebrante: Optional[str] = None
    testimone1_sposo: Optional[str] = None
    testimone2_sposo: Optional[str] = None
    testimone1_sposa: Optional[str] = None
    testimone2_sposa: Optional[str] = None
    rito: Optional[str] = None
    note: Optional[str] = None

class MatrimonioCreate(MatrimonioBase):
    sposo_id: UUID
    sposa_id: UUID

class MatrimonioUpdate(BaseModel):
    data_matrimonio: Optional[date] = None
    sposo_id: Optional[UUID] = None
    sposa_id: Optional[UUID] = None
    luogo: Optional[str] = None
    parrocchia: Optional[str] = None
    volume: Optional[str] = None
    pagina: Optional[str] = None
    numero_atto: Optional[str] = None
    celebrante: Optional[str] = None
    testimone1_sposo: Optional[str] = None
    testimone2_sposo: Optional[str] = None
    testimone1_sposa: Optional[str] = None
    testimone2_sposa: Optional[str] = None
    rito: Optional[str] = None
    note: Optional[str] = None

class MatrimonioResponse(MatrimonioBase):
    id: UUID
    sposo_id: UUID
    sposa_id: UUID
    ente_id: UUID
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

# ============================================
# RIEPILOGO SACRAMENTI PERSONA
# ============================================
class SacramentiPersonaResponse(BaseModel):
    battesimo: Optional[BattesimoResponse] = None
    prima_comunione: Optional[PrimaComunioneResponse] = None
    cresima: Optional[CresimaResponse] = None
    matrimoni: list[MatrimonioResponse] = []