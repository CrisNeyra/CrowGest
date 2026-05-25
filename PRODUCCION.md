# Checklist de Deploy Produccion

Checklist operativo para pasar CrowGest a un entorno productivo con Firebase Auth, Firestore y las reglas endurecidas por rol.

## 1. Preparacion local

- Instalar dependencias:
  ```bash
  npm install
  ```
- Verificar build frontend:
  ```bash
  npm run build
  ```
- Verificar reglas de Firestore con emulator:
  ```bash
  npm run test:rules
  ```
- Ejecutar verificacion completa antes del deploy:
  ```bash
  npm run verify:prod
  ```
- Revisar que no haya archivos sensibles sin commitear:
  ```bash
  git status
  ```

## 2. Firebase

- Confirmar proyecto Firebase correcto:
  ```bash
  firebase projects:list
  ```
- Si no existe `.firebaserc`, ejecutar deploy indicando proyecto:
  ```bash
  firebase deploy --project <firebase-project-id> --only firestore:rules
  ```
- Si ya existe `.firebaserc` con el proyecto productivo:
  ```bash
  npm run deploy:rules
  ```
- Confirmar en Firebase Console que `Firestore Database > Rules` muestra la version recien publicada.

## 3. Variables de entorno

- Configurar en el hosting productivo:
  ```env
  VITE_FIREBASE_API_KEY=
  VITE_FIREBASE_AUTH_DOMAIN=
  VITE_FIREBASE_PROJECT_ID=
  VITE_FIREBASE_STORAGE_BUCKET=
  VITE_FIREBASE_MESSAGING_SENDER_ID=
  VITE_FIREBASE_APP_ID=
  ```
- Verificar que las variables correspondan al mismo proyecto usado para desplegar las rules.
- No subir archivos `.env` con credenciales reales al repositorio.

## 4. Primer admin

- Las rules permiten que usuarios nuevos creen su propio perfil solo como `vendedor`.
- Antes de operar en produccion, promover manualmente al primer usuario administrador desde Firebase Console:
  - Coleccion: `usuarios`
  - Documento: UID del usuario
  - Campo: `rol`
  - Valor: `admin`
- Luego administrar roles desde `Configuracion > Usuarios y permisos`.

## 5. Smoke test por rol

- `admin`: lee y escribe todas las colecciones principales, cambia roles.
- `vendedor`: crea clientes, presupuestos y pedidos; no emite CAE, no paga, no ajusta stock, no cambia roles.
- `compras`: crea proveedores/productos, ordenes de compra y recepciones; no cobra ni paga.
- `tesoreria`: registra recibos, ordenes de pago, cuentas y movimientos; no autoriza pedidos ni modifica stock.
- Usuario autenticado sin documento en `usuarios`: no accede a datos de negocio.
- Verificar que `Auditoria` muestre eventos nuevos despues de:
  - autorizar un pedido,
  - registrar/anular un pago,
  - conciliar/desconciliar un movimiento,
  - crear una NC proveedor.
- Verificar que `Comisiones` muestre resultados por facturado, cobrado, acreditado y vendedor/producto.

## 6. Deploy frontend

- Generar build:
  ```bash
  npm run build
  ```
- Deploy segun hosting elegido:
  - Vercel: confirmar variables en Project Settings y desplegar desde la rama productiva.
  - Firebase Hosting, si se configura: `firebase deploy --only hosting`.

## 7. Rollback

- Si un rol productivo queda bloqueado por rules:
  - Confirmar que exista `usuarios/{uid}`.
  - Confirmar que `rol` sea uno de: `admin`, `supervisor`, `vendedor`, `compras`, `tesoreria`.
  - Corregir el documento desde Firebase Console con una cuenta dueña del proyecto.
- Si el problema esta en rules, volver a desplegar la version anterior desde Firebase Console o desde Git.

## 8. Checklist post-deploy

- Crear o confirmar cuenta admin inicial.
- Registrar un cliente, producto, proveedor y vendedor de prueba.
- Crear un presupuesto y convertirlo a pedido.
- Autorizar pedido, facturar y emitir remito si corresponde.
- Registrar recibo y orden de pago de prueba.
- Revisar `Auditoria` para confirmar trazabilidad.
- Exportar un reporte comercial a PDF y Excel.
- Descargar backup manual de Firestore desde Google Cloud/Firebase si el entorno ya tiene datos reales.

## 9. Datos reales y seguridad

- No cargar datos reales hasta confirmar que `firestore.rules` esta desplegado en el proyecto correcto.
- Mantener usuarios no administradores con roles minimos: `vendedor`, `compras` o `tesoreria`.
- Revisar periodicamente `audit_log` para detectar anulaciones, conciliaciones y cambios sensibles.
- Antes de cambios grandes en produccion, ejecutar:
  ```bash
  npm run verify:prod
  ```
