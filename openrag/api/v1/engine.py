"""Engine registry API — list configured models."""

from fastapi import APIRouter

from openrag.engine.registry import EngineRegistry

router = APIRouter(prefix="/engine", tags=["engine"])


@router.get("/models")
async def list_models():
    registry = EngineRegistry()
    return {"models": registry.to_dict()}
