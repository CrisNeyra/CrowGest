export const ROLES = {
  admin: {
    label: 'Administrador',
    permissions: ['*'],
  },
  supervisor: {
    label: 'Supervisor',
    permissions: [
      'orders:*',
      'purchases:*',
      'invoices:*',
      'payments:create',
      'stock:*',
    ],
  },
  vendedor: {
    label: 'Vendedor',
    permissions: ['orders:create', 'invoices:create'],
  },
  compras: {
    label: 'Compras',
    permissions: ['purchases:*', 'stock:adjust'],
  },
  tesoreria: {
    label: 'Tesorería',
    permissions: ['payments:create', 'payments:*', 'invoices:fiscal'],
  },
};

export const PERMISSION_LABELS = {
  'orders:authorize': 'Autorizar pedidos de venta',
  'orders:cancel': 'Cancelar pedidos pendientes',
  'orders:create': 'Crear pedidos y presupuestos',
  'orders:invoice': 'Facturar pedidos autorizados',
  'orders:dispatch': 'Emitir y anular remitos',
  'purchases:create': 'Crear órdenes de compra',
  'purchases:authorize': 'Autorizar órdenes de compra',
  'purchases:receive': 'Registrar recepción de mercadería',
  'purchases:return': 'Anular o devolver remitos de compra',
  'stock:adjust': 'Ajustar stock manualmente',
  'invoices:create': 'Generar facturas internas',
  'invoices:fiscal': 'Emitir comprobantes fiscales (CAE)',
  'payments:create': 'Registrar cobros y pagos',
  'users:manage': 'Administrar roles de usuarios',
};

export function getPermissionsForRole(rol) {
  const role = ROLES[rol];
  if (!role) return ROLES.vendedor.permissions;
  return role.permissions;
}

export function hasPermission(grantedList, required) {
  if (!grantedList?.length) return false;
  if (grantedList.includes('*')) return true;
  if (grantedList.includes(required)) return true;
  const [namespace] = required.split(':');
  return grantedList.includes(`${namespace}:*`);
}

export function assertPermission(grantedList, required) {
  if (!hasPermission(grantedList, required)) {
    const err = new Error('No tenés permiso para realizar esta acción');
    err.code = 'FORBIDDEN';
    throw err;
  }
}
