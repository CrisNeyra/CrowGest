/**
 * Configuración central de colecciones Firestore y su mapeo a claves de estado.
 * Extraído de DataContext para reuso y testeo.
 */

export const COLLECTIONS = [
  'clientes',
  'productos',
  'proveedores',
  'ventas',
  'facturas',
  'pagos',
  'movimientos',
  'presupuestos',
  'pedidos',
  'remitos',
  'remitos_compra',
  'ordenes_compra',
  'comprobantes_proveedor',
  'cuentas_tesoreria',
  'movimientos_tesoreria',
  'importaciones_bancarias',
  'audit_log',
  'vendedores',
  'condiciones_venta',
  'tipos_comprobante',
  'bonificaciones',
];

/** Colecciones que pueden crecer mucho: se cargan bajo demanda en su página. */
export const ON_DEMAND_COLLECTIONS = ['movimientos', 'audit_log'];

/** Colecciones que se sincronizan en tiempo real al iniciar sesión. */
export const REALTIME_COLLECTIONS = COLLECTIONS.filter(
  (name) => !ON_DEMAND_COLLECTIONS.includes(name)
);

export const COLLECTION_KEYS = {
  remitos_compra: 'remitosCompra',
  ordenes_compra: 'ordenesCompra',
  comprobantes_proveedor: 'comprobantesProveedor',
  cuentas_tesoreria: 'cuentasTesoreria',
  movimientos_tesoreria: 'movimientosTesoreria',
  importaciones_bancarias: 'importacionesBancarias',
  audit_log: 'auditLog',
  condiciones_venta: 'condicionesVenta',
  tipos_comprobante: 'tiposComprobante',
};

export function stateKeyFor(collectionName) {
  return COLLECTION_KEYS[collectionName] || collectionName;
}

export const EMPTY_DATA = {
  clientes: [],
  productos: [],
  proveedores: [],
  ventas: [],
  facturas: [],
  pagos: [],
  movimientos: [],
  presupuestos: [],
  pedidos: [],
  remitos: [],
  remitosCompra: [],
  ordenesCompra: [],
  comprobantesProveedor: [],
  cuentasTesoreria: [],
  movimientosTesoreria: [],
  importacionesBancarias: [],
  auditLog: [],
  vendedores: [],
  condicionesVenta: [],
  tiposComprobante: [],
  bonificaciones: [],
};
