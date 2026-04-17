import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware  # CORS para el front Next.js (3000 / 3001)
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.story_engine.errors import StoryEngineError

# Orígenes CORS permitidos.
# En desarrollo: ALLOWED_ORIGINS no configurado → sólo localhost (no wildcard "*").
# En producción: ALLOWED_ORIGINS="https://tudominio.com,https://www.tudominio.com"
_raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
ALLOWED_ORIGINS: list[str] = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
)


def _cors_headers() -> dict[str, str]:
    """Cabeceras CORS en respuestas de error (el middleware a veces no las aplica al JSONResponse del handler)."""
    # Solo devolver el header con el primer origen permitido (Access-Control-Allow-Origin no acepta listas).
    origin_header = ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else "*"
    return {
        "Access-Control-Allow-Origin": origin_header,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }

# Load apps/api/.env (OpenAI, Replicate, etc.)
_API_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_API_ROOT / ".env")

# Audio TTS local: apps/api/static/audio/*.mp3 → http://localhost:8000/static/audio/...
(_API_ROOT / "static" / "audio").mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)

from contextlib import asynccontextmanager

from app.api.chapter_progress import router as chapter_progress_router
from app.api.creative_hub import router as creative_hub_router
from app.api.lore import router as lore_router
from app.api.pipeline import router as pipeline_router
from app.api.world_engine import router as world_engine_router
from app.story_engine.routes import router as story_engine_router
from app.utils.bond_bus import register_node


@asynccontextmanager
async def lifespan(_app):
    # Register this service with BOND Bus on startup (non-blocking)
    await register_node()
    yield


app = FastAPI(
    title="ConvergeVerse Studio API",
    description="Autonomous Anime Creator — Pipeline for Manga-Flow",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: lista de orígenes explícita (ver ALLOWED_ORIGINS arriba).
# El fetch del Story Engine no envía cookies. credentials=False.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(pipeline_router, prefix="/api", tags=["pipeline"])
app.include_router(world_engine_router, prefix="/api", tags=["world-engine"])
app.include_router(lore_router, prefix="/api", tags=["lore"])
app.include_router(chapter_progress_router, prefix="/api", tags=["chapters"])
app.include_router(creative_hub_router, prefix="/api", tags=["creative-hub"])
app.include_router(story_engine_router, prefix="/api/story-engine", tags=["story-engine"])

app.mount(
    "/static",
    StaticFiles(directory=str(_API_ROOT / "static")),
    name="static",
)


_logger = logging.getLogger(__name__)


@app.exception_handler(StoryEngineError)
async def story_engine_error_handler(_request: Request, exc: StoryEngineError):
    """503 JSON para fallos Supabase/.env; CORS explícito para que el navegador no bloquee el fetch."""
    return JSONResponse(
        status_code=503,
        content={"detail": "Servicio externo no disponible. Revisa la configuración de Supabase/.env."},
        headers=_cors_headers(),
    )


@app.exception_handler(HTTPException)
async def http_exception_cors_handler(_request: Request, exc: HTTPException):
    """
    Sanitiza detalles de error antes de enviarlos al cliente.
    - 400: el detail es de validación de usuario → se pasa tal cual (está controlado).
    - 4xx restantes: se pasan tal cual (son mensajes intencionales).
    - 500/503: se loguean internamente y se reemplazan con un mensaje genérico.
    """
    if exc.status_code >= 500:
        _logger.error("HTTP %d error: %s", exc.status_code, exc.detail)
        safe_detail = "Error interno del servidor." if exc.status_code == 500 else "Servicio externo no disponible."
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": safe_detail},
            headers=_cors_headers(),
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=_cors_headers(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    """Captura cualquier excepción no manejada y evita que el traceback llegue al cliente."""
    _logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor."},
        headers=_cors_headers(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_cors_handler(_request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=_cors_headers(),
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "convergeverse-api"}
