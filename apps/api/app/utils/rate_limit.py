"""
Rate limiter in-memory para endpoints FastAPI de ConvergeVerse.
Ventana fija por clave (IP + ruta). Thread-safe mediante Lock.
"""
import time
from threading import Lock

# { key: (count, reset_timestamp) }
_store: dict[str, tuple[int, float]] = {}
_lock = Lock()


def is_rate_limited(key: str, limit: int, window_seconds: int) -> bool:
    """
    Devuelve True si la clave ha superado el límite en la ventana actual.
    Incrementa el contador en cada llamada.
    """
    now = time.time()
    with _lock:
        entry = _store.get(key)
        if not entry or now >= entry[1]:
            _store[key] = (1, now + window_seconds)
            return False
        count, reset_at = entry
        if count >= limit:
            return True
        _store[key] = (count + 1, reset_at)
        return False


def prune_store() -> None:
    """Elimina entradas expiradas. Llamar periódicamente si el proceso dura mucho tiempo."""
    now = time.time()
    with _lock:
        expired = [k for k, (_, reset_at) in _store.items() if now >= reset_at]
        for k in expired:
            del _store[k]
