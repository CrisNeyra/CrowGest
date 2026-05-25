import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  FileText,
  Filter,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';

const loadExportTools = async () => {
  const [{ jsPDF }, autoTableModule, XLSX] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('xlsx'),
  ]);
  return { jsPDF, autoTable: autoTableModule.default || autoTableModule.autoTable, XLSX };
};

const REPORT_TYPES = [
  { id: 'ventas_cliente', label: 'Ventas por cliente', icon: TrendingUp },
  { id: 'ventas_producto', label: 'Ventas por producto', icon: Package },
  { id: 'ventas_vendedor', label: 'Ventas por vendedor', icon: TrendingUp },
  { id: 'pedidos_estado', label: 'Pedidos por estado', icon: BarChart3 },
  { id: 'conversion_presupuestos', label: 'Conversión presupuestos', icon: TrendingUp },
  { id: 'facturacion_deuda', label: 'Facturación vs deuda', icon: Wallet },
  { id: 'ranking_clientes', label: 'Ranking de clientes', icon: Wallet },
  { id: 'compras_proveedor', label: 'Compras por proveedor', icon: TrendingDown },
  { id: 'compras_producto', label: 'Compras por producto', icon: Package },
  { id: 'deuda_clientes', label: 'Deuda clientes', icon: Wallet },
  { id: 'deuda_proveedores', label: 'Deuda proveedores', icon: Wallet },
  { id: 'flujo_caja', label: 'Flujo caja/bancos', icon: Wallet },
  { id: 'conciliacion_bancaria', label: 'Conciliación bancaria', icon: BarChart3 },
  { id: 'pagos_proveedor', label: 'Pagos por proveedor', icon: TrendingDown },
  { id: 'aging_deuda', label: 'Aging deuda proveedores', icon: Wallet },
  { id: 'stock_bajo', label: 'Stock bajo', icon: Package },
  { id: 'movimientos', label: 'Movimientos', icon: BarChart3 },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-';

const inDateRange = (fecha, desde, hasta) => {
  if (!fecha) return false;
  const d = new Date(fecha);
  if (desde) {
    const start = new Date(`${desde}T00:00:00`);
    if (d < start) return false;
  }
  if (hasta) {
    const end = new Date(`${hasta}T23:59:59`);
    if (d > end) return false;
  }
  return true;
};

const getProductoNombre = (productos, productoId, fallback = 'Producto eliminado') =>
  productos.find((p) => p.id === productoId)?.nombre || fallback;

const getEntidadNombre = (list, id, fallback = 'Eliminado') =>
  list.find((item) => item.id === id)?.nombre || fallback;

const diasDesde = (fecha) => {
  if (!fecha) return 0;
  const diff = Date.now() - new Date(fecha).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const moneyColumns = [
  'Total',
  'Pendiente',
  'Monto',
  'Ingreso',
  'Egreso',
  'Facturado',
  'Cobrado',
  'Deuda',
  'Ticket promedio',
  '0-30',
  '31-60',
  '61-90',
  '+90',
];

const buildRows = ({
  reportType,
  data,
  dateFrom,
  dateTo,
  clienteId,
  proveedorId,
  productoId,
  searchTerm,
}) => {
  const term = searchTerm.toLowerCase();

  if (reportType === 'ventas_cliente') {
    const grouped = {};
    data.ventas
      .filter((venta) => inDateRange(venta.fecha, dateFrom, dateTo))
      .filter((venta) => !clienteId || venta.clienteId === clienteId)
      .forEach((venta) => {
        const cliente = getEntidadNombre(data.clientes, venta.clienteId, 'Cliente eliminado');
        if (!grouped[venta.clienteId]) {
          grouped[venta.clienteId] = {
            id: venta.clienteId,
            Cliente: cliente,
            Operaciones: 0,
            Unidades: 0,
            Total: 0,
          };
        }
        grouped[venta.clienteId].Operaciones += 1;
        grouped[venta.clienteId].Unidades +=
          venta.items?.reduce((acc, item) => acc + (item.cantidad || 0), 0) || 0;
        grouped[venta.clienteId].Total += venta.total || 0;
      });

    return Object.values(grouped)
      .filter((row) => row.Cliente.toLowerCase().includes(term))
      .sort((a, b) => b.Total - a.Total);
  }

  if (reportType === 'ventas_producto') {
    const grouped = {};
    data.ventas
      .filter((venta) => inDateRange(venta.fecha, dateFrom, dateTo))
      .forEach((venta) => {
        venta.items?.forEach((item) => {
          if (productoId && item.productoId !== productoId) return;
          const producto = getProductoNombre(data.productos, item.productoId, item.nombre);
          if (!grouped[item.productoId]) {
            grouped[item.productoId] = {
              id: item.productoId,
              Producto: producto,
              Unidades: 0,
              Total: 0,
            };
          }
          grouped[item.productoId].Unidades += item.cantidad || 0;
          grouped[item.productoId].Total += item.subtotal || (item.precioUnitario || item.precio || 0) * (item.cantidad || 0);
        });
      });

    return Object.values(grouped)
      .filter((row) => row.Producto.toLowerCase().includes(term))
      .sort((a, b) => b.Total - a.Total);
  }

  if (reportType === 'ventas_vendedor') {
    const grouped = {};
    data.facturas
      .filter((factura) => !factura.esNotaCredito && factura.estadoFiscal !== 'anulado')
      .filter((factura) => inDateRange(factura.fechaEmisionFiscal || factura.fecha, dateFrom, dateTo))
      .forEach((factura) => {
        const vendedorId = factura.vendedorId || 'sin-vendedor';
        const vendedor = factura.vendedorNombre || getEntidadNombre(data.vendedores, vendedorId, 'Sin vendedor');
        if (!grouped[vendedorId]) {
          grouped[vendedorId] = {
            id: vendedorId,
            Vendedor: vendedor,
            Comprobantes: 0,
            Facturado: 0,
            Cobrado: 0,
            Deuda: 0,
            'Ticket promedio': 0,
          };
        }
        const total = Number(factura.total) || 0;
        const pendiente = Number(factura.saldoPendiente) || 0;
        grouped[vendedorId].Comprobantes += 1;
        grouped[vendedorId].Facturado += total;
        grouped[vendedorId].Cobrado += Math.max(0, total - pendiente);
        grouped[vendedorId].Deuda += pendiente;
      });

    return Object.values(grouped)
      .map((row) => ({
        ...row,
        'Ticket promedio': row.Comprobantes ? row.Facturado / row.Comprobantes : 0,
      }))
      .filter((row) => row.Vendedor.toLowerCase().includes(term))
      .sort((a, b) => b.Facturado - a.Facturado);
  }

  if (reportType === 'pedidos_estado') {
    const labels = {
      pending: 'Pendiente',
      authorized: 'Autorizado',
      invoiced: 'Facturado',
      cancelled: 'Cancelado',
      delivered: 'Entregado',
    };
    const grouped = {};
    data.pedidos
      .filter((pedido) => inDateRange(pedido.fecha, dateFrom, dateTo))
      .filter((pedido) => !clienteId || pedido.clienteId === clienteId)
      .forEach((pedido) => {
        const estado = pedido.estado || 'sin_estado';
        if (!grouped[estado]) {
          grouped[estado] = {
            id: estado,
            Estado: labels[estado] || estado,
            Pedidos: 0,
            Total: 0,
            Pendiente: 0,
          };
        }
        grouped[estado].Pedidos += 1;
        grouped[estado].Total += Number(pedido.total) || 0;
        if (estado === 'pending') grouped[estado].Pendiente += Number(pedido.total) || 0;
      });

    return Object.values(grouped)
      .filter((row) => row.Estado.toLowerCase().includes(term))
      .sort((a, b) => b.Total - a.Total);
  }

  if (reportType === 'conversion_presupuestos') {
    return data.presupuestos
      .filter((presupuesto) => inDateRange(presupuesto.fecha, dateFrom, dateTo))
      .filter((presupuesto) => !clienteId || presupuesto.clienteId === clienteId)
      .map((presupuesto) => {
        const pedido = data.pedidos.find((p) => p.presupuestoId === presupuesto.id);
        const factura = pedido ? data.facturas.find((f) => f.pedidoId === pedido.id) : null;
        return {
          id: presupuesto.id,
          Presupuesto: presupuesto.numero,
          Cliente: getEntidadNombre(data.clientes, presupuesto.clienteId, 'Cliente eliminado'),
          Estado: factura ? 'Facturado' : pedido ? 'Convertido a pedido' : presupuesto.estado || 'Pendiente',
          Pedido: pedido?.numero || '-',
          Factura: factura?.numero || '-',
          Total: Number(presupuesto.total) || 0,
        };
      })
      .filter((row) => `${row.Presupuesto} ${row.Cliente} ${row.Estado}`.toLowerCase().includes(term))
      .sort((a, b) => b.Total - a.Total);
  }

  if (reportType === 'facturacion_deuda') {
    return data.clientes
      .map((cliente) => {
        const facturasCliente = data.facturas.filter(
          (factura) =>
            factura.clienteId === cliente.id &&
            !factura.esNotaCredito &&
            factura.estadoFiscal !== 'anulado' &&
            inDateRange(factura.fechaEmisionFiscal || factura.fecha, dateFrom, dateTo)
        );
        const facturado = facturasCliente.reduce((acc, factura) => acc + (Number(factura.total) || 0), 0);
        const deuda = facturasCliente.reduce((acc, factura) => acc + (Number(factura.saldoPendiente) || 0), 0);
        return {
          id: cliente.id,
          Cliente: cliente.nombre,
          Comprobantes: facturasCliente.length,
          Facturado: facturado,
          Cobrado: Math.max(0, facturado - deuda),
          Deuda: deuda,
        };
      })
      .filter((row) => row.Comprobantes > 0 || row.Deuda > 0)
      .filter((row) => row.Cliente.toLowerCase().includes(term))
      .sort((a, b) => b.Deuda - a.Deuda);
  }

  if (reportType === 'ranking_clientes') {
    return data.clientes
      .map((cliente) => {
        const facturasCliente = data.facturas.filter(
          (factura) =>
            factura.clienteId === cliente.id &&
            !factura.esNotaCredito &&
            factura.estadoFiscal !== 'anulado' &&
            inDateRange(factura.fechaEmisionFiscal || factura.fecha, dateFrom, dateTo)
        );
        const total = facturasCliente.reduce((acc, factura) => acc + (Number(factura.total) || 0), 0);
        return {
          id: cliente.id,
          Cliente: cliente.nombre,
          Operaciones: facturasCliente.length,
          Total: total,
          'Ticket promedio': facturasCliente.length ? total / facturasCliente.length : 0,
          Deuda: Number(cliente.saldo) || 0,
        };
      })
      .filter((row) => row.Total > 0)
      .filter((row) => row.Cliente.toLowerCase().includes(term))
      .sort((a, b) => b.Total - a.Total);
  }

  if (reportType === 'compras_proveedor') {
    const grouped = {};
    data.comprobantesProveedor
      .filter((comp) => inDateRange(comp.fecha, dateFrom, dateTo))
      .filter((comp) => !proveedorId || comp.proveedorId === proveedorId)
      .forEach((comp) => {
        const proveedor = getEntidadNombre(data.proveedores, comp.proveedorId, 'Proveedor eliminado');
        if (!grouped[comp.proveedorId]) {
          grouped[comp.proveedorId] = {
            id: comp.proveedorId,
            Proveedor: proveedor,
            Comprobantes: 0,
            Total: 0,
            Pendiente: 0,
          };
        }
        grouped[comp.proveedorId].Comprobantes += 1;
        grouped[comp.proveedorId].Total += comp.total || 0;
        grouped[comp.proveedorId].Pendiente += comp.saldoPendiente || 0;
      });

    return Object.values(grouped)
      .filter((row) => row.Proveedor.toLowerCase().includes(term))
      .sort((a, b) => b.Total - a.Total);
  }

  if (reportType === 'compras_producto') {
    const grouped = {};
    data.comprobantesProveedor
      .filter((comp) => inDateRange(comp.fecha, dateFrom, dateTo))
      .forEach((comp) => {
        comp.items?.forEach((item) => {
          if (productoId && item.productoId !== productoId) return;
          const producto = getProductoNombre(data.productos, item.productoId, item.nombre);
          if (!grouped[item.productoId]) {
            grouped[item.productoId] = {
              id: item.productoId,
              Producto: producto,
              Unidades: 0,
              Total: 0,
            };
          }
          grouped[item.productoId].Unidades += item.cantidad || 0;
          grouped[item.productoId].Total += item.subtotal || (item.precioUnitario || 0) * (item.cantidad || 0);
        });
      });

    return Object.values(grouped)
      .filter((row) => row.Producto.toLowerCase().includes(term))
      .sort((a, b) => b.Total - a.Total);
  }

  if (reportType === 'deuda_clientes') {
    return data.clientes
      .filter((cliente) => (cliente.saldo || 0) > 0)
      .filter((cliente) => cliente.nombre.toLowerCase().includes(term))
      .map((cliente) => {
        const facturasPendientes = data.facturas.filter(
          (f) => f.clienteId === cliente.id && (f.saldoPendiente || 0) > 0
        );
        return {
          id: cliente.id,
          Cliente: cliente.nombre,
          Comprobantes: facturasPendientes.length,
          Total: cliente.saldo || 0,
        };
      })
      .sort((a, b) => b.Total - a.Total);
  }

  if (reportType === 'deuda_proveedores') {
    return data.proveedores
      .filter((proveedor) => (proveedor.saldoPendiente || 0) > 0)
      .filter((proveedor) => proveedor.nombre.toLowerCase().includes(term))
      .map((proveedor) => {
        const comprobantesPendientes = data.comprobantesProveedor.filter(
          (c) => c.proveedorId === proveedor.id && (c.saldoPendiente || 0) > 0
        );
        return {
          id: proveedor.id,
          Proveedor: proveedor.nombre,
          Comprobantes: comprobantesPendientes.length,
          Total: proveedor.saldoPendiente || 0,
        };
      })
      .sort((a, b) => b.Total - a.Total);
  }

  if (reportType === 'stock_bajo') {
    return data.productos
      .filter((producto) => (producto.stock || 0) <= (producto.stockMinimo || 0))
      .filter((producto) => !productoId || producto.id === productoId)
      .filter((producto) => producto.nombre.toLowerCase().includes(term) || producto.codigo?.toLowerCase().includes(term))
      .map((producto) => ({
        id: producto.id,
        Código: producto.codigo,
        Producto: producto.nombre,
        Categoría: producto.categoria || 'Sin categoría',
        Stock: producto.stock || 0,
        Mínimo: producto.stockMinimo || 0,
        'A reponer': Math.max(0, (producto.stockMinimo || 0) - (producto.stock || 0)),
      }))
      .sort((a, b) => b['A reponer'] - a['A reponer']);
  }

  if (reportType === 'flujo_caja') {
    return data.movimientosTesoreria
      .filter((mov) => !mov.anulado)
      .filter((mov) => inDateRange(mov.fecha, dateFrom, dateTo))
      .filter((mov) => mov.concepto?.toLowerCase().includes(term) || mov.cuentaNombre?.toLowerCase().includes(term))
      .map((mov) => ({
        id: mov.id,
        Fecha: formatDate(mov.fecha),
        Cuenta: mov.cuentaNombre || 'Cuenta eliminada',
        Tipo: mov.tipo,
        Concepto: mov.concepto,
        Método: mov.metodoPago || '-',
        Ingreso: mov.tipo === 'ingreso' ? mov.monto || 0 : 0,
        Egreso: mov.tipo === 'egreso' ? mov.monto || 0 : 0,
        Monto: mov.tipo === 'ingreso' ? mov.monto || 0 : -(mov.monto || 0),
      }));
  }

  if (reportType === 'conciliacion_bancaria') {
    const grouped = {};
    data.movimientosTesoreria
      .filter((mov) => inDateRange(mov.fecha, dateFrom, dateTo))
      .forEach((mov) => {
        const cuentaId = mov.cuentaId || 'sin-cuenta';
        if (!grouped[cuentaId]) {
          grouped[cuentaId] = {
            id: cuentaId,
            Cuenta: mov.cuentaNombre || 'Cuenta eliminada',
            Movimientos: 0,
            Conciliados: 0,
            Pendientes: 0,
            Anulados: 0,
            Total: 0,
          };
        }
        grouped[cuentaId].Movimientos += 1;
        if (mov.anulado) grouped[cuentaId].Anulados += 1;
        else if (mov.conciliado) grouped[cuentaId].Conciliados += 1;
        else grouped[cuentaId].Pendientes += 1;
        if (!mov.anulado) {
          grouped[cuentaId].Total += mov.tipo === 'ingreso' ? mov.monto || 0 : -(mov.monto || 0);
        }
      });

    return Object.values(grouped)
      .filter((row) => row.Cuenta.toLowerCase().includes(term))
      .sort((a, b) => b.Pendientes - a.Pendientes);
  }

  if (reportType === 'pagos_proveedor') {
    return data.pagos
      .filter((pago) => pago.estado !== 'anulado' && pago.tipo === 'proveedor')
      .filter((pago) => inDateRange(pago.fecha, dateFrom, dateTo))
      .filter((pago) => !proveedorId || pago.proveedorId === proveedorId)
      .map((pago) => ({
        id: pago.id,
        Fecha: formatDate(pago.fecha),
        Proveedor: getEntidadNombre(data.proveedores, pago.proveedorId, 'Proveedor eliminado'),
        Pago: pago.numero,
        Imputaciones: pago.imputaciones?.length || (pago.comprobanteProveedorId ? 1 : 0),
        Método: pago.metodoPago || '-',
        Monto: pago.monto || 0,
      }))
      .filter((row) => row.Proveedor.toLowerCase().includes(term) || row.Pago.toLowerCase().includes(term))
      .sort((a, b) => b.Monto - a.Monto);
  }

  if (reportType === 'aging_deuda') {
    const grouped = {};
    data.comprobantesProveedor
      .filter((comp) => comp.estado !== 'anulado' && (comp.saldoPendiente || 0) > 0)
      .filter((comp) => !proveedorId || comp.proveedorId === proveedorId)
      .forEach((comp) => {
        const proveedor = getEntidadNombre(data.proveedores, comp.proveedorId, 'Proveedor eliminado');
        if (!grouped[comp.proveedorId]) {
          grouped[comp.proveedorId] = {
            id: comp.proveedorId,
            Proveedor: proveedor,
            '0-30': 0,
            '31-60': 0,
            '61-90': 0,
            '+90': 0,
            Pendiente: 0,
          };
        }
        const dias = diasDesde(comp.fechaVencimiento || comp.fechaEmision || comp.fecha);
        const saldo = comp.saldoPendiente || 0;
        if (dias <= 30) grouped[comp.proveedorId]['0-30'] += saldo;
        else if (dias <= 60) grouped[comp.proveedorId]['31-60'] += saldo;
        else if (dias <= 90) grouped[comp.proveedorId]['61-90'] += saldo;
        else grouped[comp.proveedorId]['+90'] += saldo;
        grouped[comp.proveedorId].Pendiente += saldo;
      });

    return Object.values(grouped)
      .filter((row) => row.Proveedor.toLowerCase().includes(term))
      .sort((a, b) => b.Pendiente - a.Pendiente);
  }

  if (reportType === 'movimientos') {
    return data.movimientos
      .filter((mov) => inDateRange(mov.fecha, dateFrom, dateTo))
      .filter((mov) => mov.descripcion?.toLowerCase().includes(term))
      .map((mov) => ({
        id: mov.id,
        Fecha: formatDate(mov.fecha),
        Tipo: mov.tipo,
        Descripción: mov.descripcion,
        Monto: mov.monto || 0,
      }))
      .sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
  }

  return [];
};

const getSummary = (rows, reportType) => {
  const total = rows.reduce((acc, row) => acc + (row.Total || row.Monto || row.Facturado || 0), 0);
  const unidades = rows.reduce((acc, row) => acc + (row.Unidades || 0), 0);
  const pendiente = rows.reduce((acc, row) => acc + (row.Pendiente || row.Deuda || 0), 0);

  if (reportType === 'stock_bajo') {
    return [
      { label: 'Productos críticos', value: rows.length.toLocaleString('es-AR'), tone: 'negative' },
      {
        label: 'Unidades a reponer',
        value: rows.reduce((acc, row) => acc + (row['A reponer'] || 0), 0).toLocaleString('es-AR'),
        tone: 'warning',
      },
    ];
  }

  if (reportType === 'conciliacion_bancaria') {
    return [
      { label: 'Cuentas', value: rows.length.toLocaleString('es-AR'), tone: 'neutral' },
      { label: 'Conciliados', value: rows.reduce((acc, row) => acc + (row.Conciliados || 0), 0).toLocaleString('es-AR'), tone: 'positive' },
      { label: 'Pendientes', value: rows.reduce((acc, row) => acc + (row.Pendientes || 0), 0).toLocaleString('es-AR'), tone: 'warning' },
      { label: 'Total vigente', value: formatCurrency(total), tone: total >= 0 ? 'positive' : 'negative' },
    ];
  }

  if (['ventas_vendedor', 'facturacion_deuda', 'ranking_clientes'].includes(reportType)) {
    return [
      { label: 'Registros', value: rows.length.toLocaleString('es-AR'), tone: 'neutral' },
      { label: 'Facturado', value: formatCurrency(rows.reduce((acc, row) => acc + (row.Facturado || row.Total || 0), 0)), tone: 'positive' },
      { label: 'Cobrado', value: formatCurrency(rows.reduce((acc, row) => acc + (row.Cobrado || 0), 0)), tone: 'positive' },
      { label: 'Deuda', value: formatCurrency(rows.reduce((acc, row) => acc + (row.Deuda || 0), 0)), tone: 'warning' },
    ];
  }

  if (reportType === 'conversion_presupuestos') {
    const convertidos = rows.filter((row) => row.Pedido !== '-').length;
    const facturados = rows.filter((row) => row.Factura !== '-').length;
    return [
      { label: 'Presupuestos', value: rows.length.toLocaleString('es-AR'), tone: 'neutral' },
      { label: 'Convertidos', value: convertidos.toLocaleString('es-AR'), tone: 'positive' },
      { label: 'Facturados', value: facturados.toLocaleString('es-AR'), tone: 'positive' },
      { label: 'Total', value: formatCurrency(total), tone: 'neutral' },
    ];
  }

  return [
    { label: 'Registros', value: rows.length.toLocaleString('es-AR'), tone: 'neutral' },
    { label: 'Unidades', value: unidades.toLocaleString('es-AR'), tone: 'neutral' },
    { label: 'Total', value: formatCurrency(total), tone: total >= 0 ? 'positive' : 'negative' },
    { label: 'Pendiente', value: formatCurrency(pendiente), tone: 'warning' },
  ];
};

export default function Reportes() {
  const data = useData();
  const [reportType, setReportType] = useState('ventas_cliente');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const activeReport = REPORT_TYPES.find((r) => r.id === reportType) || REPORT_TYPES[0];
  const ActiveIcon = activeReport.icon;

  const rows = useMemo(
    () =>
      buildRows({
        reportType,
        data,
        dateFrom,
        dateTo,
        clienteId,
        proveedorId,
        productoId,
        searchTerm,
      }),
    [reportType, data, dateFrom, dateTo, clienteId, proveedorId, productoId, searchTerm]
  );

  const summary = useMemo(() => getSummary(rows, reportType), [rows, reportType]);
  const columns = rows.length ? Object.keys(rows[0]).filter((key) => key !== 'id') : [];

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setClienteId('');
    setProveedorId('');
    setProductoId('');
    setSearchTerm('');
  };

  const exportToExcel = async () => {
    const { XLSX } = await loadExportTools();
    const ws = XLSX.utils.json_to_sheet(rows.map(({ id, ...row }) => row));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeReport.label.slice(0, 31));
    XLSX.writeFile(wb, `reporte_${reportType}.xlsx`);
    toast.success('Excel exportado');
  };

  const exportToPDF = async () => {
    const { jsPDF, autoTable } = await loadExportTools();
    const doc = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait' });
    doc.text(`Reporte - ${activeReport.label}`, 14, 15);
    autoTable(doc, {
      head: [columns],
      body: rows.map((row) =>
        columns.map((col) =>
          moneyColumns.includes(col) ? formatCurrency(row[col]) : row[col]
        )
      ),
      startY: 24,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [2, 132, 199] },
    });
    doc.save(`reporte_${reportType}.pdf`);
    toast.success('PDF exportado');
  };

  return (
    <Layout>
      <Header title="Reportes" subtitle="Ventas, compras, deuda, stock y movimientos" />

      <div className="space-y-6 p-6">
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {REPORT_TYPES.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                type="button"
                onClick={() => setReportType(report.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  reportType === report.id
                    ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-100'
                    : 'border-edge-light bg-white/70 text-pastel-ink hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                    <Icon size={20} />
                  </span>
                  <span className="font-semibold">{report.label}</span>
                </div>
                <p className="text-xs text-pastel-muted dark:text-slate-400">
                  Exportable a PDF y Excel
                </p>
              </button>
            );
          })}
        </section>

        <section className="card">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-3 text-sky-700 dark:bg-indigo-500/20 dark:text-indigo-300">
              <ActiveIcon size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-pastel-ink dark:text-slate-100">
                {activeReport.label}
              </h2>
              <p className="text-sm text-pastel-muted dark:text-slate-400">
                Filtrá, revisá y exportá el reporte seleccionado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted"
                size={18}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en el reporte..."
                className="input-field pl-10"
              />
            </div>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field"
            />

            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="select-field"
            >
              <option value="">Todos los clientes</option>
              {data.clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>

            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="select-field"
            >
              <option value="">Todos los proveedores</option>
              {data.proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>

            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="select-field lg:col-span-2"
            >
              <option value="">Todos los productos</option>
              {data.productos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.codigo ? `${producto.codigo} - ` : ''}{producto.nombre}
                </option>
              ))}
            </select>

            <button type="button" onClick={resetFilters} className="btn-secondary">
              <Filter size={18} />
              Limpiar filtros
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summary.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="card p-4"
            >
              <p className="text-sm text-pastel-muted dark:text-slate-400">{item.label}</p>
              <p
                className={`text-2xl font-bold ${
                  item.tone === 'negative'
                    ? 'text-rose-600 dark:text-rose-400'
                    : item.tone === 'warning'
                      ? 'text-amber-600 dark:text-amber-400'
                      : item.tone === 'positive'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-pastel-ink dark:text-slate-100'
                }`}
              >
                {item.value}
              </p>
            </motion.div>
          ))}
        </section>

        <section className="card overflow-hidden p-0">
          <div className="flex flex-col justify-between gap-3 border-b border-edge-light p-4 sm:flex-row sm:items-center dark:border-slate-800">
            <div>
              <h3 className="font-semibold text-pastel-ink dark:text-slate-100">
                Resultado ({rows.length})
              </h3>
              <p className="text-sm text-pastel-muted dark:text-slate-400">
                {activeReport.label}
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={exportToPDF} disabled={!rows.length} className="btn-secondary">
                <FileText size={18} className="text-red-500" /> PDF
              </button>
              <button type="button" onClick={exportToExcel} disabled={!rows.length} className="btn-secondary">
                <Download size={18} className="text-emerald-500" /> Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  {columns.map((column) => (
                    <th
                      key={column}
                      className={`p-4 ${
                        moneyColumns.includes(column)
                          ? 'text-right'
                          : 'text-left'
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <motion.tr
                    key={row.id || index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.01 }}
                    className="table-row"
                  >
                    {columns.map((column) => (
                      <td
                        key={column}
                        className={`p-4 ${
                          moneyColumns.includes(column)
                            ? 'text-right font-semibold text-pastel-ink dark:text-slate-100'
                            : 'text-pastel-muted dark:text-slate-400'
                        }`}
                      >
                        {moneyColumns.includes(column)
                          ? formatCurrency(row[column])
                          : row[column]}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="py-12 text-center">
              <BarChart3 size={48} className="mx-auto mb-4 text-pastel-muted/40 dark:text-slate-700" />
              <p className="text-pastel-muted dark:text-slate-500">
                No hay datos para el reporte seleccionado
              </p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
