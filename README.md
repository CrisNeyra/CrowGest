# CrowGest - Sistema de Gestión ERP/CRM

Un sistema completo de gestión empresarial (ERP/CRM) desarrollado con React, Vite y Tailwind CSS, integrado con Firebase para base de datos y autenticación en tiempo real.

## 🚀 Características Principales

*   **Autenticación Segura:** Sistema de login protegido utilizando Firebase Auth.
*   **Base de Datos en Tiempo Real:** Integración con Firestore para sincronización instantánea en todos los dispositivos.
*   **Dashboard Interactivo:** Gráficos avanzados (Ventas vs Egresos, Productos más vendidos, Ventas por categoría) usando Recharts.
*   **Gestión de Clientes y Proveedores:** ABM (Alta, Baja, Modificación) completo con control de saldos y deudas.
*   **Control de Inventario:** Gestión de productos, cálculo de costos, precios y alertas automáticas de stock bajo.
*   **Facturación y Ventas:** Registro de ventas con carrito integrado, generación de facturas y control de estados (Pendiente, Parcial, Pagada).
*   **Exportación de Reportes:** Descarga de reportes en PDF y Excel para Ventas, Facturas y Movimientos.
*   **Generación de Facturas en PDF:** Descarga individual de cada factura en formato PDF lista para imprimir.
*   **Modo Oscuro/Claro:** Interfaz moderna con soporte nativo para Dark Mode y diseño "Pastel" profesional.
*   **Notificaciones:** Sistema de alertas visuales (Toasts) para confirmar acciones.

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** React 18, Vite, React Router DOM
*   **Estilos:** Tailwind CSS, Framer Motion (Animaciones), Lucide React (Íconos)
*   **Backend & DB:** Firebase (Auth, Firestore)
*   **Gráficos:** Recharts
*   **Exportación:** jsPDF, jsPDF-AutoTable, XLSX
*   **Notificaciones:** Sonner

## 📦 Instalación y Configuración Local

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/CrisNeyra/CrowGest.git
    cd CrowGest
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo `.env` en la raíz del proyecto y agrega tus credenciales de Firebase:
    ```env
    VITE_FIREBASE_API_KEY=tu_api_key
    VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
    VITE_FIREBASE_PROJECT_ID=tu_project_id
    VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
    VITE_FIREBASE_APP_ID=tu_app_id
    ```

4.  **Iniciar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:3000` (o el puerto que asigne Vite).

## ☁️ Despliegue en Vercel

El proyecto está configurado para desplegarse fácilmente en Vercel. Asegúrate de agregar las mismas variables de entorno del archivo `.env` en la configuración de tu proyecto en el panel de Vercel (Sección Settings > Environment Variables).

---
*Desarrollado para optimizar la gestión de pequeñas y medianas empresas.*