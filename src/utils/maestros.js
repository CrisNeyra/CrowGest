export const BONIFICACION_TIPOS = [
  { value: 'porcentaje', label: 'Porcentaje' },
  { value: 'monto_fijo', label: 'Monto fijo' },
];

export const BONIFICACION_APLICA_A = [
  { value: 'general', label: 'General' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'producto', label: 'Producto' },
];

export const LETRAS_COMPROBANTE = ['A', 'B', 'C', 'M', 'X'];

export const CONDICIONES_VENTA_DEFAULT = [
  {
    nombre: 'Contado',
    diasPago: 0,
    recargoPorcentaje: 0,
    descuentoPorcentaje: 0,
    activo: true,
  },
  {
    nombre: 'Cuenta corriente 30 días',
    diasPago: 30,
    recargoPorcentaje: 0,
    descuentoPorcentaje: 0,
    activo: true,
  },
];

export const TIPOS_COMPROBANTE_DEFAULT = [
  {
    codigo: 'FA',
    nombre: 'Factura A',
    letra: 'A',
    afipCodigo: '001',
    mueveStock: false,
    mueveCtaCte: true,
    activo: true,
  },
  {
    codigo: 'FB',
    nombre: 'Factura B',
    letra: 'B',
    afipCodigo: '006',
    mueveStock: false,
    mueveCtaCte: true,
    activo: true,
  },
  {
    codigo: 'FC',
    nombre: 'Factura C',
    letra: 'C',
    afipCodigo: '011',
    mueveStock: false,
    mueveCtaCte: true,
    activo: true,
  },
  {
    codigo: 'NC',
    nombre: 'Nota de Crédito',
    letra: 'A',
    afipCodigo: '003',
    mueveStock: false,
    mueveCtaCte: true,
    activo: true,
  },
  {
    codigo: 'ND',
    nombre: 'Nota de Débito',
    letra: 'A',
    afipCodigo: '002',
    mueveStock: false,
    mueveCtaCte: true,
    activo: true,
  },
];

export const MAESTROS = {
  vendedores: {
    label: 'Vendedores',
    singular: 'Vendedor',
    dataKey: 'vendedores',
    searchFields: ['nombre', 'email', 'telefono'],
    emptyForm: {
      nombre: '',
      email: '',
      telefono: '',
      comisionPorcentaje: '',
      activo: true,
    },
  },
  condiciones: {
    label: 'Condiciones de venta',
    singular: 'Condición de venta',
    dataKey: 'condicionesVenta',
    searchFields: ['nombre'],
    defaults: CONDICIONES_VENTA_DEFAULT,
    emptyForm: {
      nombre: '',
      diasPago: '',
      recargoPorcentaje: '',
      descuentoPorcentaje: '',
      activo: true,
    },
  },
  tipos: {
    label: 'Tipos de comprobante',
    singular: 'Tipo de comprobante',
    dataKey: 'tiposComprobante',
    searchFields: ['codigo', 'nombre', 'letra', 'afipCodigo'],
    defaults: TIPOS_COMPROBANTE_DEFAULT,
    emptyForm: {
      codigo: '',
      nombre: '',
      letra: 'A',
      afipCodigo: '',
      mueveStock: false,
      mueveCtaCte: true,
      activo: true,
    },
  },
  bonificaciones: {
    label: 'Bonificaciones',
    singular: 'Bonificación',
    dataKey: 'bonificaciones',
    searchFields: ['nombre', 'tipo', 'aplicaA'],
    emptyForm: {
      nombre: '',
      tipo: 'porcentaje',
      valor: '',
      aplicaA: 'general',
      activo: true,
    },
  },
};

export function formatPorcentaje(value) {
  return `${Number(value || 0).toLocaleString('es-AR')}%`;
}

export function formatBonificacion(item) {
  if (item.tipo === 'monto_fijo') {
    return `$${Number(item.valor || 0).toLocaleString('es-AR')}`;
  }
  return formatPorcentaje(item.valor);
}

export function normalizeMaestroForm(tab, form) {
  if (tab === 'vendedores') {
    return {
      ...form,
      comisionPorcentaje: Number(form.comisionPorcentaje) || 0,
      activo: form.activo ?? true,
    };
  }

  if (tab === 'condiciones') {
    return {
      ...form,
      diasPago: Number(form.diasPago) || 0,
      recargoPorcentaje: Number(form.recargoPorcentaje) || 0,
      descuentoPorcentaje: Number(form.descuentoPorcentaje) || 0,
      activo: form.activo ?? true,
    };
  }

  if (tab === 'tipos') {
    return {
      ...form,
      codigo: String(form.codigo || '').trim().toUpperCase(),
      afipCodigo: String(form.afipCodigo || '').trim(),
      mueveStock: Boolean(form.mueveStock),
      mueveCtaCte: Boolean(form.mueveCtaCte),
      activo: form.activo ?? true,
    };
  }

  return {
    ...form,
    valor: Number(form.valor) || 0,
    activo: form.activo ?? true,
  };
}
