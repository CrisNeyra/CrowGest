# CrowGest Backend

API REST en **FastAPI + SQLAlchemy + PostgreSQL** del sistema de gestion CrowGest (ERP/CRM).

Este servicio expone los modulos del roadmap (maestros, ventas, compras, tesoreria, cuentas corrientes, comisiones y reportes) y verifica autenticacion contra **Firebase Auth** (JWT).

## Stack

- Python 3.12
- FastAPI 0.115+ con uvicorn
- SQLAlchemy 2.x + Alembic
- PostgreSQL 16 (SQLite en tests / dev rapido)
- Pydantic v2 + pydantic-settings
- firebase-admin para verificar el `Authorization: Bearer <jwt>`
- Herramientas: `uv`, `ruff`, `mypy --strict`, `pytest`

## Estructura

```
backend/
├─ app/
│  ├─ core/        # settings, db, auth, logging
│  ├─ api/         # routers transversales (health, ...)
│  ├─ modules/     # maestros, ventas, compras, tesoreria, ctacte, comisiones, reportes
│  └─ main.py      # factory create_app() + endpoints montados
├─ alembic/        # migraciones
├─ tests/          # pytest
├─ pyproject.toml  # dependencias y tooling
└─ Dockerfile
```

## Puesta en marcha rapida (Docker Compose)

Desde la raiz del repo:

```bash
docker compose up --build
```

Esto levanta:

- `postgres` en `localhost:5432` (db `crowgest`, user `crowgest`, pass `crowgest`).
- `backend` (FastAPI) en `http://localhost:8000` con hot reload.
- Documentacion OpenAPI en `http://localhost:8000/api/v1/docs`.
- Endpoint de salud: `GET http://localhost:8000/api/v1/health`.

## Modulo ventas / comprobantes fiscales (v0.1)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/ventas/comprobantes` | Lista comprobantes |
| POST | `/api/v1/ventas/comprobantes` | Crea borrador |
| POST | `/api/v1/ventas/comprobantes/{id}/emitir` | Emite CAE (modo `AFIP_MODE=simulated`) |
| POST | `/api/v1/ventas/comprobantes/{id}/nota-credito` | Nota de credito |
| POST | `/api/v1/ventas/remitos/{rid}/vincular/{cid}` | Vincula remito ↔ comprobante |
| POST | `/api/v1/ventas/remitos/{rid}/desvincular/{cid}` | Desvincula con reversion explicita |

Todas las rutas (salvo health con auth deshabilitado en dev) requieren `Authorization: Bearer <Firebase JWT>`.

Variables AFIP en `.env`:

- `AFIP_MODE=simulated` — CAE de prueba (14 digitos).
- `AFIP_MODE=production` — reservado para integracion WSFE/ARCA (certificados).

Migracion inicial:

```bash
cd backend
alembic upgrade head
```

Cada operacion fiscal registra entrada en `audit_logs`.

Para sumar `pgadmin` (perfil opcional):

```bash
docker compose --profile tools up --build
```

`pgAdmin` queda en `http://localhost:5050` (user `admin@crowgest.local`, pass `admin`).

## Puesta en marcha local sin Docker

Requiere Python 3.12 y opcionalmente [`uv`](https://docs.astral.sh/uv/).

```bash
cd backend
cp .env.example .env

uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"

uv run uvicorn app.main:app --reload
```

Si preferis `pip` puro:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Para desarrollo sin Postgres podes apuntar a SQLite editando `.env`:

```bash
DATABASE_URL=sqlite+pysqlite:///./crowgest_dev.db
```

## Variables de entorno principales

Ver `.env.example` para el listado completo.

| Variable | Default | Descripcion |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | `development`, `staging`, `production`, `test` |
| `DATABASE_URL` | Postgres local | DSN SQLAlchemy |
| `AUTH_DISABLED` | `false` | Si es `true`, `get_current_user` devuelve un usuario stub (solo dev) |
| `FIREBASE_PROJECT_ID` | vacio | Project id de Firebase |
| `FIREBASE_CREDENTIALS_JSON` | vacio | Path al `serviceAccount.json` o JSON inline |
| `CORS_ORIGINS` | `["http://localhost:3000","http://localhost:5173"]` | Origenes permitidos |
| `LOG_LEVEL` | `INFO` | `DEBUG`/`INFO`/`WARNING`/`ERROR` |

## Migraciones (Alembic)

```bash
cd backend

uv run alembic revision --autogenerate -m "alta de tabla customers"

uv run alembic upgrade head

uv run alembic downgrade -1
```

Alembic lee la DSN desde `app.core.settings.Settings.database_url`, no es necesario editarla en `alembic.ini`.

## Tests

```bash
cd backend
uv run pytest -q
```

Los tests usan SQLite en memoria y `AUTH_DISABLED=true` automaticamente (ver `tests/conftest.py`).

## Lint y type-check

```bash
cd backend
uv run ruff check .
uv run ruff format --check .
uv run mypy app
```

## Endpoints actuales

| Metodo | Path | Descripcion |
| --- | --- | --- |
| GET | `/api/v1/health` | Healthcheck (`{ "status": "ok", "version": "0.1.0", "environment": "..." }`) |
| GET | `/api/v1/docs` | Swagger UI |
| GET | `/api/v1/redoc` | ReDoc |
| GET | `/api/v1/openapi.json` | Esquema OpenAPI |

## Proxima iteracion sugerida

1. Modelos de `maestros` (Customer, Supplier, Product, ProductCategory, SalesCondition, VoucherType, Discount, DiscountProfile, SalesPerson) + migracion inicial.
2. CRUD REST de `customers` con tests (`/api/v1/customers`).
3. Capa `src/api/` en el frontend con TanStack Query consumiendo `/customers`.
