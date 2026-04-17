# Cliente Supabase en Python (Story Engine)

El Story Engine crea el cliente en `narrative_db.py` con **`ClientOptions`** (API oficial de `supabase-py` ≥ 2).

## Por qué no `options={"timeout": 10}`

Ese dict **no** es válido en `create_client`. Los timeouts se configuran así:

```python
from supabase import create_client
from supabase.lib.client_options import SyncClientOptions

options = SyncClientOptions(
    schema="public",
    postgrest_client_timeout=30,
    storage_client_timeout=60,
    auto_refresh_token=False,
    persist_session=False,
)
client = create_client(url, key, options=options)
```

`create_client` del cliente **síncrono** espera **`SyncClientOptions`** (no un `dict` ni siempre `ClientOptions` según versión).

## Variables en `apps/api/.env`

| Variable | Default | Uso |
|----------|---------|-----|
| `SUPABASE_POSTGREST_TIMEOUT` | `30` | Segundos para consultas REST / tablas (PostgREST). Bajar a `10` si quieres fallar rápido ante red colgada. |
| `SUPABASE_STORAGE_TIMEOUT` | `60` | Segundos para Storage (MP3, imágenes de referencia). |
| `SUPABASE_DB_SCHEMA` | `public` | Schema expuesto por PostgREST. |

## Conexiones

El código usa **un cliente singleton** por proceso (normal en FastAPI). Cada petición HTTP tiene **timeout**; no hace falta «cerrar» manualmente tras cada `select` — el pool de **httpx** gestiona conexiones. Si un worker se queda en mal estado, reinicia **uvicorn** o el despliegue.

## Código

- `_create_story_engine_supabase_client()` en `apps/api/app/story_engine/narrative_db.py`
