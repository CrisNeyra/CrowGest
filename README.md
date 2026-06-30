# Gest Crow — Sistema de Gestión ERP/CRM

**Gest Crow** es un ERP/CRM web para pymes argentinas: ventas, compras, stock, tesorería, cuentas corrientes, comisiones y facturación fiscal (AFIP/ARCA). Interfaz inspirada en sistemas de gestión corporativos, con navegación por módulos y tablas operativas densas.

**Producción:** [crowgest.vercel.app](https://crowgest.vercel.app)

## Módulos

| Módulo | Funcionalidad |
|--------|-----------------|
| **Inicio** | Dashboard con KPIs, gráficos y alertas operativas |
| **Ventas** | Clientes, presupuestos, pedidos, a facturar, remitos, cuenta corriente, mostrador |
| **Compras** | Proveedores, órdenes de compra, remitos de compra, comprobantes, cta. proveedores |
| **Almacén** | Productos, stock y kardex |
| **Tesorería** | Caja/bancos, pagos, movimientos |
| **Equipo** | Vendedores (maestros), comisiones |
| **Informes** | Reportes exportables (PDF/Excel), auditoría |
| **Administración** | Configuración, usuarios y permisos |

## Características principales

- **Autenticación** con Firebase Auth y roles (admin, supervisor, vendedor, compras, tesorería).
- **Datos en tiempo real** con Firestore.
- **Ciclo comercial:** presupuesto → pedido → autorización → remito → factura → cobranza.
- **Facturación fiscal:** emisión de CAE (modo simulado, homologación o producción vía backend FastAPI).
- **Cuentas corrientes** de clientes y proveedores con extractos y morosidad.
- **Exportación** a PDF y Excel (ventas, facturas, reportes, movimientos).
- **Modo claro/oscuro** y UI tipo Cloud Gestion (barra superior, módulos con íconos, sub-navegación celeste, breadcrumb).
- **Backend opcional** en Python (FastAPI + PostgreSQL) para API REST y WSFE AFIP.

## Stack

| Capa | Tecnologías |
|------|-------------|
| Frontend | React 18, Vite, Tailwind CSS, React Router, TanStack Query, Framer Motion, Recharts |
| Auth / DB | Firebase Auth, Firestore |
| Backend (opcional) | Python 3.12, FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| Exportación | jsPDF, jsPDF-AutoTable, XLSX |
| Calidad | ESLint, Prettier, Vitest, GitHub Actions |

## Instalación local

```bash
git clone https://github.com/CrisNeyra/CrowGest.git
cd CrowGest
npm install
```

Creá un `.env` en la raíz con tus credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

Arrancá el frontend:

```bash
npm run dev
```

La app queda en `http://localhost:3000`.

### Backend (opcional)

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

Ver [backend/README.md](backend/README.md) para Docker Compose con PostgreSQL.

## Scripts útiles

```bash
npm run lint      # ESLint
npm run test      # Vitest (lógica monetaria, comprobantes, etc.)
npm run build     # Build de producción
npm run test:rules  # Reglas Firestore (requiere JDK 21 + emulador)
```

## Acceso demo (solo desarrollo)

El modo demo (precarga de credenciales y rol admin automático) está **deshabilitado en producción**. Solo se activa con `npm run dev` o con `VITE_ENABLE_DEMO_ACCESS=true` en tu `.env` local — **nunca** en Vercel ni en repos públicos.

## Despliegue en Vercel

1. Conectá el repo [CrisNeyra/CrowGest](https://github.com/CrisNeyra/CrowGest) en Vercel.
2. En **Settings → Environment Variables**, cargá las mismas variables `VITE_FIREBASE_*` del `.env`.
3. Cada push a `master` dispara un deploy automático.

URL actual: **https://crowgest.vercel.app**

## Estructura del proyecto

```
├── src/                 # Frontend React (páginas, componentes, contexto)
│   ├── components/      # UI, layout (TopBar, ModuleNav, PageShell…)
│   ├── config/          # Navegación, demo, permisos
│   └── pages/           # Módulos funcionales
├── backend/             # API FastAPI (opcional)
├── firestore.rules      # Reglas de seguridad Firestore
└── docker-compose.yml   # Postgres + backend (desarrollo)
```

## Licencia y uso

Proyecto privado de gestión empresarial. Desarrollado para optimizar la operación de pequeñas y medianas empresas en Argentina.
