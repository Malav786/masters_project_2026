from fastapi import APIRouter
from app.api.v1.endpoints import structures

api_router = APIRouter()
api_router.include_router(structures.router)