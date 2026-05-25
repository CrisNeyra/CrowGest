import { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { assertPermission } from '../utils/permissions';
import { getActivePermissions } from '../utils/permissionStore';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { currentUser } = useAuth();
  const [data, setData] = useState({
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
  });
  const [loading, setLoading] = useState(true);

  // Cargar datos desde Firestore en tiempo real
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const collections = [
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

    const collectionKeys = {
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

    const unsubscribes = collections.map((collName) => {
      const stateKey = collectionKeys[collName] || collName;
      return onSnapshot(
        collection(db, collName),
        (snapshot) => {
          const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setData((prev) => ({ ...prev, [stateKey]: items }));
        },
        (error) => {
          console.error(`Error al escuchar la colección ${collName}:`, error);
        }
      );
    });

    // Simulamos que la carga inicial terminó después de 1.5s
    // (En un escenario real, podríamos esperar a que todos los snapshots emitan su primer valor)
    const timer = setTimeout(() => setLoading(false), 1500);

    return () => {
      clearTimeout(timer);
      unsubscribes.forEach(unsub => unsub());
    };
  }, [currentUser]);

  const buildAuditLog = ({ action, entity, entityId, entityLabel = '', amount = null, metadata = {} }) => ({
    action,
    entity,
    entityId: entityId || null,
    entityLabel,
    amount,
    metadata,
    userId: currentUser?.uid || null,
    userEmail: currentUser?.email || 'Sistema',
    createdAt: new Date().toISOString(),
  });

  const auditInBatch = (batch, payload) => {
    const auditRef = doc(collection(db, 'audit_log'));
    batch.set(auditRef, buildAuditLog(payload));
    return auditRef.id;
  };

  const registrarAuditoria = async (payload) => {
    await addDoc(collection(db, 'audit_log'), buildAuditLog(payload));
  };

  // ================= CLIENTES =================
  const addCliente = async (cliente) => {
    const newCliente = { ...cliente, createdAt: new Date().toISOString(), saldo: 0 };
    await addDoc(collection(db, 'clientes'), newCliente);
  };

  const updateCliente = async (id, updates) => {
    await updateDoc(doc(db, 'clientes', id), updates);
  };

  const deleteCliente = async (id) => {
    await deleteDoc(doc(db, 'clientes', id));
  };

  // ================= PRODUCTOS =================
  const addProducto = async (producto) => {
    const newProducto = { ...producto, createdAt: new Date().toISOString() };
    await addDoc(collection(db, 'productos'), newProducto);
  };

  const updateProducto = async (id, updates) => {
    await updateDoc(doc(db, 'productos', id), updates);
  };

  const deleteProducto = async (id) => {
    await deleteDoc(doc(db, 'productos', id));
  };

  const updateStock = async (productoId, cantidad, tipo) => {
    const producto = data.productos.find(p => p.id === productoId);
    if (!producto) return;
    const newStock = tipo === 'entrada' ? producto.stock + cantidad : producto.stock - cantidad;
    await updateDoc(doc(db, 'productos', productoId), { stock: Math.max(0, newStock) });
  };

  const ajustarStockManual = async ({ productoId, cantidad, motivo }) => {
    assertPermission(getActivePermissions(), 'stock:adjust');
    const producto = data.productos.find((p) => p.id === productoId);
    if (!producto) {
      throw new Error('Producto no encontrado');
    }
    const delta = Number(cantidad) || 0;
    if (delta === 0) {
      throw new Error('El ajuste debe ser distinto de cero');
    }

    const batch = writeBatch(db);
    const fecha = new Date().toISOString();
    const nuevoStock = Math.max(0, (producto.stock || 0) + delta);

    batch.update(doc(db, 'productos', productoId), { stock: nuevoStock });

    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: 'ajuste_stock',
      descripcion: `Ajuste stock ${producto.nombre}: ${motivo}`,
      productoId,
      productoNombre: producto.nombre,
      cantidad: delta,
      stockAnterior: producto.stock || 0,
      stockNuevo: nuevoStock,
      monto: Math.abs(delta) * (producto.costo || 0),
      referencia: productoId,
      fecha,
    });

    await batch.commit();
    return { stockAnterior: producto.stock || 0, stockNuevo: nuevoStock };
  };

  // ================= PROVEEDORES =================
  const addProveedor = async (proveedor) => {
    const newProveedor = { ...proveedor, createdAt: new Date().toISOString(), saldoPendiente: 0 };
    await addDoc(collection(db, 'proveedores'), newProveedor);
  };

  const updateProveedor = async (id, updates) => {
    await updateDoc(doc(db, 'proveedores', id), updates);
  };

  const deleteProveedor = async (id) => {
    await deleteDoc(doc(db, 'proveedores', id));
  };

  // ================= MAESTROS COMERCIALES =================
  const addVendedor = async (vendedor) => {
    const newVendedor = {
      ...vendedor,
      comisionPorcentaje: Number(vendedor.comisionPorcentaje) || 0,
      activo: vendedor.activo ?? true,
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'vendedores'), newVendedor);
  };

  const updateVendedor = async (id, updates) => {
    const cleanUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if (updates.comisionPorcentaje !== undefined) {
      cleanUpdates.comisionPorcentaje = Number(updates.comisionPorcentaje) || 0;
    }
    await updateDoc(doc(db, 'vendedores', id), cleanUpdates);
  };

  const deleteVendedor = async (id) => {
    await deleteDoc(doc(db, 'vendedores', id));
  };

  const addCondicionVenta = async (condicion) => {
    const newCondicion = {
      ...condicion,
      diasPago: Number(condicion.diasPago) || 0,
      recargoPorcentaje: Number(condicion.recargoPorcentaje) || 0,
      descuentoPorcentaje: Number(condicion.descuentoPorcentaje) || 0,
      activo: condicion.activo ?? true,
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'condiciones_venta'), newCondicion);
  };

  const updateCondicionVenta = async (id, updates) => {
    const cleanUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if (updates.diasPago !== undefined) cleanUpdates.diasPago = Number(updates.diasPago) || 0;
    if (updates.recargoPorcentaje !== undefined) {
      cleanUpdates.recargoPorcentaje = Number(updates.recargoPorcentaje) || 0;
    }
    if (updates.descuentoPorcentaje !== undefined) {
      cleanUpdates.descuentoPorcentaje = Number(updates.descuentoPorcentaje) || 0;
    }
    await updateDoc(doc(db, 'condiciones_venta', id), cleanUpdates);
  };

  const deleteCondicionVenta = async (id) => {
    await deleteDoc(doc(db, 'condiciones_venta', id));
  };

  const addTipoComprobante = async (tipo) => {
    const newTipo = {
      ...tipo,
      afipCodigo: String(tipo.afipCodigo || '').trim(),
      mueveStock: Boolean(tipo.mueveStock),
      mueveCtaCte: Boolean(tipo.mueveCtaCte),
      activo: tipo.activo ?? true,
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'tipos_comprobante'), newTipo);
  };

  const updateTipoComprobante = async (id, updates) => {
    const cleanUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if (updates.mueveStock !== undefined) cleanUpdates.mueveStock = Boolean(updates.mueveStock);
    if (updates.mueveCtaCte !== undefined) cleanUpdates.mueveCtaCte = Boolean(updates.mueveCtaCte);
    await updateDoc(doc(db, 'tipos_comprobante', id), cleanUpdates);
  };

  const deleteTipoComprobante = async (id) => {
    await deleteDoc(doc(db, 'tipos_comprobante', id));
  };

  const addBonificacion = async (bonificacion) => {
    const newBonificacion = {
      ...bonificacion,
      valor: Number(bonificacion.valor) || 0,
      activo: bonificacion.activo ?? true,
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'bonificaciones'), newBonificacion);
  };

  const updateBonificacion = async (id, updates) => {
    const cleanUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if (updates.valor !== undefined) cleanUpdates.valor = Number(updates.valor) || 0;
    await updateDoc(doc(db, 'bonificaciones', id), cleanUpdates);
  };

  const deleteBonificacion = async (id) => {
    await deleteDoc(doc(db, 'bonificaciones', id));
  };

  // ================= VENTAS =================
  const addVenta = async (venta) => {
    const batch = writeBatch(db);
    
    // 1. Crear venta
    const ventaRef = doc(collection(db, 'ventas'));
    const newVenta = {
      ...venta,
      numero: `V-${String(data.ventas.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString(),
      estado: 'completada'
    };
    batch.set(ventaRef, newVenta);

    // 2. Actualizar stock
    venta.items.forEach(item => {
      const productoRef = doc(db, 'productos', item.productoId);
      const producto = data.productos.find(p => p.id === item.productoId);
      if (producto) {
        batch.update(productoRef, { stock: Math.max(0, producto.stock - item.cantidad) });
      }
    });

    // 3. Crear movimiento
    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: 'venta',
      descripcion: `Venta ${newVenta.numero}`,
      monto: newVenta.total,
      referencia: ventaRef.id,
      fecha: new Date().toISOString()
    });

    await batch.commit();
  };

  // ================= PRESUPUESTOS =================
  const addPresupuesto = async (presupuesto) => {
    assertPermission(getActivePermissions(), 'orders:create');
    const validezDias = presupuesto.validezDias ?? 15;
    const fecha = new Date();
    const validezHasta = new Date(fecha);
    validezHasta.setDate(validezHasta.getDate() + validezDias);

    const newPresupuesto = {
      clienteId: presupuesto.clienteId,
      vendedorId: presupuesto.vendedorId || null,
      vendedorNombre: presupuesto.vendedorNombre || null,
      condicionVentaId: presupuesto.condicionVentaId || null,
      condicionVentaNombre: presupuesto.condicionVentaNombre || null,
      condicionVentaDiasPago: presupuesto.condicionVentaDiasPago || 0,
      bonificacionId: presupuesto.bonificacionId || null,
      bonificacionNombre: presupuesto.bonificacionNombre || null,
      bonificacionTipo: presupuesto.bonificacionTipo || null,
      bonificacionValor: presupuesto.bonificacionValor || 0,
      items: presupuesto.items,
      subtotalBruto: presupuesto.subtotalBruto ?? presupuesto.total,
      descuentoCondicion: presupuesto.descuentoCondicion || 0,
      recargoCondicion: presupuesto.recargoCondicion || 0,
      descuentoBonificacion: presupuesto.descuentoBonificacion || 0,
      total: presupuesto.total,
      observaciones: presupuesto.observaciones || '',
      numero: `PRE-${String(data.presupuestos.length + 1).padStart(6, '0')}`,
      fecha: fecha.toISOString(),
      validezDias,
      validezHasta: validezHasta.toISOString(),
      estado: 'vigente',
    };
    await addDoc(collection(db, 'presupuestos'), newPresupuesto);
  };

  const anularPresupuesto = async (id) => {
    const presupuesto = data.presupuestos.find((p) => p.id === id);
    if (!presupuesto || presupuesto.estado !== 'vigente') {
      throw new Error('Solo se pueden anular presupuestos vigentes');
    }
    await updateDoc(doc(db, 'presupuestos', id), { estado: 'anulado' });
  };

  const convertirPresupuestoAPedido = async (presupuestoId) => {
    const presupuesto = data.presupuestos.find((p) => p.id === presupuestoId);
    if (!presupuesto || presupuesto.estado !== 'vigente') {
      throw new Error('El presupuesto no está disponible para convertir');
    }

    const batch = writeBatch(db);
    const pedidoRef = doc(collection(db, 'pedidos'));
    const newPedido = {
      clienteId: presupuesto.clienteId,
      presupuestoId: presupuesto.id,
      presupuestoNumero: presupuesto.numero,
      vendedorId: presupuesto.vendedorId || null,
      vendedorNombre: presupuesto.vendedorNombre || null,
      condicionVentaId: presupuesto.condicionVentaId || null,
      condicionVentaNombre: presupuesto.condicionVentaNombre || null,
      condicionVentaDiasPago: presupuesto.condicionVentaDiasPago || 0,
      bonificacionId: presupuesto.bonificacionId || null,
      bonificacionNombre: presupuesto.bonificacionNombre || null,
      bonificacionTipo: presupuesto.bonificacionTipo || null,
      bonificacionValor: presupuesto.bonificacionValor || 0,
      items: presupuesto.items,
      subtotalBruto: presupuesto.subtotalBruto ?? presupuesto.total,
      descuentoCondicion: presupuesto.descuentoCondicion || 0,
      recargoCondicion: presupuesto.recargoCondicion || 0,
      descuentoBonificacion: presupuesto.descuentoBonificacion || 0,
      total: presupuesto.total,
      observaciones: presupuesto.observaciones || '',
      numero: `PED-${String(data.pedidos.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString(),
      estado: 'pending',
    };
    batch.set(pedidoRef, newPedido);
    batch.update(doc(db, 'presupuestos', presupuestoId), { estado: 'convertido', pedidoId: pedidoRef.id });
    await batch.commit();
  };

  // ================= PEDIDOS =================
  const addPedido = async (pedido) => {
    assertPermission(getActivePermissions(), 'orders:create');
    const newPedido = {
      clienteId: pedido.clienteId,
      presupuestoId: pedido.presupuestoId || null,
      presupuestoNumero: pedido.presupuestoNumero || null,
      vendedorId: pedido.vendedorId || null,
      vendedorNombre: pedido.vendedorNombre || null,
      condicionVentaId: pedido.condicionVentaId || null,
      condicionVentaNombre: pedido.condicionVentaNombre || null,
      condicionVentaDiasPago: pedido.condicionVentaDiasPago || 0,
      bonificacionId: pedido.bonificacionId || null,
      bonificacionNombre: pedido.bonificacionNombre || null,
      bonificacionTipo: pedido.bonificacionTipo || null,
      bonificacionValor: pedido.bonificacionValor || 0,
      items: pedido.items,
      subtotalBruto: pedido.subtotalBruto ?? pedido.total,
      descuentoCondicion: pedido.descuentoCondicion || 0,
      recargoCondicion: pedido.recargoCondicion || 0,
      descuentoBonificacion: pedido.descuentoBonificacion || 0,
      total: pedido.total,
      observaciones: pedido.observaciones || '',
      numero: `PED-${String(data.pedidos.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString(),
      estado: 'pending',
    };
    await addDoc(collection(db, 'pedidos'), newPedido);
  };

  const autorizarPedido = async (id) => {
    assertPermission(getActivePermissions(), 'orders:authorize');
    const pedido = data.pedidos.find((p) => p.id === id);
    if (!pedido || pedido.estado !== 'pending') {
      throw new Error('Solo se pueden autorizar pedidos pendientes');
    }
    const batch = writeBatch(db);
    batch.update(doc(db, 'pedidos', id), {
      estado: 'authorized',
      fechaAutorizacion: new Date().toISOString(),
    });
    auditInBatch(batch, {
      action: 'orders.authorize',
      entity: 'pedidos',
      entityId: id,
      entityLabel: pedido.numero,
      amount: pedido.total || 0,
      metadata: { clienteId: pedido.clienteId },
    });
    await batch.commit();
  };

  const cancelarPedido = async (id) => {
    assertPermission(getActivePermissions(), 'orders:cancel');
    const pedido = data.pedidos.find((p) => p.id === id);
    if (!pedido || pedido.estado !== 'pending') {
      throw new Error('Solo se pueden cancelar pedidos pendientes');
    }
    const batch = writeBatch(db);
    batch.update(doc(db, 'pedidos', id), { estado: 'cancelled' });
    auditInBatch(batch, {
      action: 'orders.cancel',
      entity: 'pedidos',
      entityId: id,
      entityLabel: pedido.numero,
      amount: pedido.total || 0,
      metadata: { clienteId: pedido.clienteId },
    });
    await batch.commit();
  };

  const validarStockItems = (items) => {
    for (const item of items) {
      const producto = data.productos.find((p) => p.id === item.productoId);
      if (!producto) {
        throw new Error('Hay productos que ya no existen en el catálogo');
      }
      if (producto.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para ${producto.nombre} (disponible: ${producto.stock})`);
      }
    }
  };

  // ================= REMITOS =================
  const emitirRemito = async (pedidoId, observaciones = '') => {
    assertPermission(getActivePermissions(), 'orders:dispatch');
    const pedido = data.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }
    if (!['authorized', 'invoiced'].includes(pedido.estado)) {
      throw new Error('Solo pedidos autorizados o facturados pueden emitir remito');
    }
    if (pedido.remitoId) {
      throw new Error('Este pedido ya tiene un remito emitido');
    }

    validarStockItems(pedido.items);

    const batch = writeBatch(db);
    const remitoRef = doc(collection(db, 'remitos'));
    const numero = `REM-${String(data.remitos.length + 1).padStart(6, '0')}`;
    const fecha = new Date().toISOString();

    const newRemito = {
      pedidoId: pedido.id,
      pedidoNumero: pedido.numero,
      presupuestoNumero: pedido.presupuestoNumero || null,
      clienteId: pedido.clienteId,
      items: pedido.items,
      total: pedido.total,
      observaciones: observaciones.trim(),
      numero,
      fecha,
      estado: 'emitido',
      facturaIds: pedido.facturaId ? [pedido.facturaId] : [],
    };
    batch.set(remitoRef, newRemito);

    pedido.items.forEach((item) => {
      const producto = data.productos.find((p) => p.id === item.productoId);
      if (producto) {
        batch.update(doc(db, 'productos', item.productoId), {
          stock: Math.max(0, producto.stock - item.cantidad),
        });
      }
    });

    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: 'remito',
      descripcion: `Remito ${numero} — Pedido ${pedido.numero}`,
      monto: pedido.total,
      referencia: remitoRef.id,
      pedidoId: pedido.id,
      fecha,
    });

    batch.update(doc(db, 'pedidos', pedidoId), {
      remitoId: remitoRef.id,
      remitoNumero: numero,
      fechaRemito: fecha,
    });

    if (pedido.facturaId) {
      batch.update(doc(db, 'facturas', pedido.facturaId), {
        remitoId: remitoRef.id,
        remitoNumero: numero,
      });
    }

    auditInBatch(batch, {
      action: 'remitos.emit',
      entity: 'remitos',
      entityId: remitoRef.id,
      entityLabel: numero,
      amount: pedido.total || 0,
      metadata: { pedidoId: pedido.id, clienteId: pedido.clienteId },
    });

    await batch.commit();
    return { remitoId: remitoRef.id, numero };
  };

  const anularRemito = async (remitoId) => {
    assertPermission(getActivePermissions(), 'orders:dispatch');
    const remito = data.remitos.find((r) => r.id === remitoId);
    if (!remito || remito.estado !== 'emitido') {
      throw new Error('Solo se pueden anular remitos emitidos');
    }

    const batch = writeBatch(db);
    const fecha = new Date().toISOString();

    remito.items.forEach((item) => {
      const producto = data.productos.find((p) => p.id === item.productoId);
      if (producto) {
        batch.update(doc(db, 'productos', item.productoId), {
          stock: producto.stock + item.cantidad,
        });
      }
    });

    batch.update(doc(db, 'remitos', remitoId), {
      estado: 'anulado',
      fechaAnulacion: fecha,
    });

    if (remito.pedidoId) {
      batch.update(doc(db, 'pedidos', remito.pedidoId), {
        remitoId: null,
        remitoNumero: null,
        fechaRemito: null,
      });
    }

    data.facturas
      .filter((f) => f.remitoId === remitoId)
      .forEach((factura) => {
        batch.update(doc(db, 'facturas', factura.id), {
          remitoId: null,
          remitoNumero: null,
        });
      });

    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: 'anulacion_remito',
      descripcion: `Anulación remito ${remito.numero}`,
      monto: remito.total,
      referencia: remitoId,
      pedidoId: remito.pedidoId || null,
      fecha,
    });

    auditInBatch(batch, {
      action: 'remitos.cancel',
      entity: 'remitos',
      entityId: remitoId,
      entityLabel: remito.numero,
      amount: remito.total || 0,
      metadata: { pedidoId: remito.pedidoId, clienteId: remito.clienteId },
    });

    await batch.commit();
  };

  const vincularFacturaARemito = async (facturaId, remitoId) => {
    const factura = data.facturas.find((f) => f.id === facturaId);
    const remito = data.remitos.find((r) => r.id === remitoId);
    if (!factura || !remito || remito.estado !== 'emitido') {
      throw new Error('Factura o remito no válidos para vincular');
    }
    if (factura.clienteId !== remito.clienteId) {
      throw new Error('El remito y la factura deben ser del mismo cliente');
    }

    const facturaIds = [...new Set([...(remito.facturaIds || []), facturaId])];
    const batch = writeBatch(db);
    batch.update(doc(db, 'remitos', remitoId), { facturaIds });
    batch.update(doc(db, 'facturas', facturaId), {
      remitoId,
      remitoNumero: remito.numero,
      pedidoId: remito.pedidoId || factura.pedidoId || null,
      pedidoNumero: remito.pedidoNumero || factura.pedidoNumero || null,
    });
    await batch.commit();
  };

  const aplicarCtaCteEnBatch = (batch, clienteId, monto, operacion) => {
    const cliente = data.clientes.find((c) => c.id === clienteId);
    if (!cliente) return;
    const saldoActual = cliente.saldo || 0;
    const nuevoSaldo = operacion === 'sumar' ? saldoActual + monto : saldoActual - monto;
    batch.update(doc(db, 'clientes', clienteId), { saldo: nuevoSaldo });
  };

  const desvincularFacturaDeRemito = async (
    facturaId,
    { motivo, revertirStock = false, revertirCtaCte = false }
  ) => {
    const factura = data.facturas.find((f) => f.id === facturaId);
    if (!factura?.remitoId) {
      throw new Error('La factura no está vinculada a un remito');
    }
    if (factura.bloqueado || factura.cae) {
      throw new Error(
        'No se puede desvincular un comprobante fiscal con CAE. Usá Nota de Crédito para anularlo.'
      );
    }

    const remito = data.remitos.find((r) => r.id === factura.remitoId);
    if (!remito || remito.estado !== 'emitido') {
      throw new Error('Remito no válido para desvincular');
    }

    const facturaIdsActuales = remito.facturaIds || [];
    if (!facturaIdsActuales.includes(facturaId)) {
      throw new Error('La factura no figura vinculada a este remito');
    }

    const nuevasFacturaIds = facturaIdsActuales.filter((id) => id !== facturaId);
    const esUltimaFactura = nuevasFacturaIds.length === 0;
    const puedeRevertirStock = revertirStock && esUltimaFactura && !remito.stockRevertido;

    if (revertirStock && !esUltimaFactura) {
      throw new Error(
        'No se puede revertir stock: el remito sigue vinculado a otras facturas'
      );
    }

    const batch = writeBatch(db);
    const fecha = new Date().toISOString();
    const registro = {
      fecha,
      facturaId,
      facturaNumero: factura.numero,
      motivo,
      revertirStock: puedeRevertirStock,
      revertirCtaCte: Boolean(revertirCtaCte && factura.ctaCteImpactada),
      stockAjustado: false,
      ctaCteAjustada: false,
      montoCtaCte: 0,
    };

    batch.update(doc(db, 'remitos', remito.id), {
      facturaIds: nuevasFacturaIds,
      historialDesvinculaciones: [...(remito.historialDesvinculaciones || []), registro],
    });

    batch.update(doc(db, 'facturas', facturaId), {
      remitoId: null,
      remitoNumero: null,
      historialDesvinculaciones: [...(factura.historialDesvinculaciones || []), {
        ...registro,
        remitoId: remito.id,
        remitoNumero: remito.numero,
      }],
    });

    if (revertirCtaCte && factura.ctaCteImpactada) {
      const monto = factura.saldoPendiente ?? factura.total ?? 0;
      if (monto > 0) {
        aplicarCtaCteEnBatch(batch, factura.clienteId, monto, 'restar');
        registro.ctaCteAjustada = true;
        registro.montoCtaCte = monto;
        batch.update(doc(db, 'facturas', facturaId), {
          ctaCteImpactada: false,
        });
      }
    }

    if (puedeRevertirStock) {
      remito.items.forEach((item) => {
        const producto = data.productos.find((p) => p.id === item.productoId);
        if (producto) {
          batch.update(doc(db, 'productos', item.productoId), {
            stock: producto.stock + item.cantidad,
          });
        }
      });
      registro.stockAjustado = true;

      const movRef = doc(collection(db, 'movimientos'));
      batch.set(movRef, {
        tipo: 'desvinculacion_remito',
        descripcion: `Reversión stock — desvinculación ${factura.numero} / ${remito.numero}`,
        monto: remito.total,
        referencia: remito.id,
        facturaId,
        pedidoId: remito.pedidoId || null,
        fecha,
      });

      batch.update(doc(db, 'remitos', remito.id), {
        stockRevertido: true,
        fechaReversionStock: fecha,
      });
    }

    const movDesvinculacion = doc(collection(db, 'movimientos'));
    batch.set(movDesvinculacion, {
      tipo: 'desvinculacion_comprobante',
      descripcion: `Desvinculación ${factura.numero} ↔ ${remito.numero}: ${motivo}`,
      monto: factura.total,
      referencia: facturaId,
      remitoId: remito.id,
      fecha,
    });

    await batch.commit();
    return registro;
  };

  // ================= FACTURAS =================
  const addFactura = async (factura) => {
    const newFactura = {
      ...factura,
      numero: `F-${String(data.facturas.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString(),
      estado: 'pendiente',
      saldoPendiente: factura.total,
    };
    await addDoc(collection(db, 'facturas'), newFactura);
  };

  // ================= COMPRAS =================
  const addOrdenCompra = async (orden) => {
    assertPermission(getActivePermissions(), 'purchases:create');
    const newOrden = {
      proveedorId: orden.proveedorId,
      items: orden.items,
      total: orden.total,
      observaciones: orden.observaciones || '',
      numero: `OC-${String(data.ordenesCompra.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString(),
      estado: 'pending',
      recepciones: [],
    };
    await addDoc(collection(db, 'ordenes_compra'), newOrden);
  };

  const autorizarOrdenCompra = async (id) => {
    assertPermission(getActivePermissions(), 'purchases:authorize');
    const orden = data.ordenesCompra.find((o) => o.id === id);
    if (!orden || orden.estado !== 'pending') {
      throw new Error('Solo se pueden autorizar órdenes pendientes');
    }
    await updateDoc(doc(db, 'ordenes_compra', id), {
      estado: 'authorized',
      fechaAutorizacion: new Date().toISOString(),
    });
  };

  const cancelarOrdenCompra = async (id) => {
    assertPermission(getActivePermissions(), 'purchases:create');
    const orden = data.ordenesCompra.find((o) => o.id === id);
    if (!orden || orden.estado !== 'pending') {
      throw new Error('Solo se pueden cancelar órdenes pendientes');
    }
    await updateDoc(doc(db, 'ordenes_compra', id), { estado: 'cancelled' });
  };

  const registrarRecepcionCompra = async (ordenId, lineas, recepcion = '') => {
    assertPermission(getActivePermissions(), 'purchases:receive');
    const orden = data.ordenesCompra.find((o) => o.id === ordenId);
    if (!orden || !['authorized', 'partial'].includes(orden.estado)) {
      throw new Error('La orden no está habilitada para recepción');
    }
    const proveedor = data.proveedores.find((p) => p.id === orden.proveedorId);
    if (!proveedor) {
      throw new Error('Proveedor no encontrado');
    }

    const batch = writeBatch(db);
    const fecha = new Date().toISOString();
    const recepcionData =
      typeof recepcion === 'string'
        ? { observaciones: recepcion }
        : {
            numeroRemitoProveedor: recepcion?.numeroRemitoProveedor || '',
            fechaRemitoProveedor: recepcion?.fechaRemitoProveedor || '',
            observaciones: recepcion?.observaciones || '',
          };
    const observaciones = recepcionData.observaciones.trim();
    const numeroRecepcion = `REC-${String((orden.recepciones?.length || 0) + 1).padStart(4, '0')}`;
    const remitoCompraRef = doc(collection(db, 'remitos_compra'));
    const numeroRemitoCompra = `RC-${String(data.remitosCompra.length + 1).padStart(6, '0')}`;
    const comprobanteProveedorRef = doc(collection(db, 'comprobantes_proveedor'));
    const numeroComprobanteProveedor = `CP-${String(data.comprobantesProveedor.length + 1).padStart(6, '0')}`;
    let montoRecibido = 0;
    const itemsRecibidos = [];

    const itemsActualizados = orden.items.map((item) => {
      const linea = lineas.find((l) => l.productoId === item.productoId);
      if (!linea || linea.cantidad <= 0) return item;

      const pendiente = item.cantidad - (item.cantidadRecibida || 0);
      if (linea.cantidad > pendiente) {
        throw new Error(`Cantidad excedida para ${item.nombre} (pendiente: ${pendiente})`);
      }

      const producto = data.productos.find((p) => p.id === item.productoId);
      if (producto) {
        batch.update(doc(db, 'productos', item.productoId), {
          stock: producto.stock + linea.cantidad,
        });
      }

      montoRecibido += linea.cantidad * (item.precioUnitario || 0);
      itemsRecibidos.push({
        productoId: item.productoId,
        nombre: item.nombre,
        cantidad: linea.cantidad,
        precioUnitario: item.precioUnitario || 0,
        subtotal: linea.cantidad * (item.precioUnitario || 0),
      });
      return {
        ...item,
        cantidadRecibida: (item.cantidadRecibida || 0) + linea.cantidad,
      };
    });

    if (montoRecibido <= 0 || itemsRecibidos.length === 0) {
      throw new Error('La recepción debe incluir al menos un ítem con cantidad mayor a cero');
    }

    const totalPedido = itemsActualizados.reduce((acc, i) => acc + i.cantidad, 0);
    const totalRecibido = itemsActualizados.reduce((acc, i) => acc + (i.cantidadRecibida || 0), 0);
    const nuevoEstado = totalRecibido >= totalPedido ? 'received' : 'partial';

    const registroRecepcion = {
      numero: numeroRecepcion,
      fecha,
      numeroRemitoCompra,
      remitoCompraId: remitoCompraRef.id,
      remitoProveedorNumero: recepcionData.numeroRemitoProveedor,
      remitoProveedorFecha: recepcionData.fechaRemitoProveedor,
      observaciones,
      lineas,
      monto: montoRecibido,
      comprobanteProveedorId: comprobanteProveedorRef.id,
      comprobanteProveedorNumero: numeroComprobanteProveedor,
    };

    batch.update(doc(db, 'ordenes_compra', ordenId), {
      items: itemsActualizados,
      estado: nuevoEstado,
      recepciones: [...(orden.recepciones || []), registroRecepcion],
      fechaUltimaRecepcion: fecha,
    });

    batch.set(remitoCompraRef, {
      numero: numeroRemitoCompra,
      numeroProveedor: recepcionData.numeroRemitoProveedor,
      fechaProveedor: recepcionData.fechaRemitoProveedor,
      proveedorId: orden.proveedorId,
      proveedorNombre: proveedor.nombre || '',
      ordenCompraId: orden.id,
      ordenCompraNumero: orden.numero,
      recepcionNumero: numeroRecepcion,
      comprobanteProveedorId: comprobanteProveedorRef.id,
      comprobanteProveedorNumero: numeroComprobanteProveedor,
      fecha,
      items: itemsRecibidos,
      total: montoRecibido,
      estado: 'registrado',
      observaciones,
    });

    batch.set(comprobanteProveedorRef, {
      proveedorId: orden.proveedorId,
      ordenCompraId: orden.id,
      ordenCompraNumero: orden.numero,
      remitoCompraId: remitoCompraRef.id,
      remitoCompraNumero: numeroRemitoCompra,
      recepcionNumero: numeroRecepcion,
      numero: numeroComprobanteProveedor,
      tipo: 'remito_compra',
      fecha,
      items: itemsRecibidos,
      total: montoRecibido,
      saldoPendiente: montoRecibido,
      estado: 'pendiente',
      observaciones,
    });

    batch.update(doc(db, 'proveedores', proveedor.id), {
      saldoPendiente: (proveedor.saldoPendiente || 0) + montoRecibido,
    });

    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: 'recepcion_compra',
      descripcion: `Recepción ${numeroRecepcion} — ${orden.numero} / ${numeroRemitoCompra}`,
      monto: montoRecibido,
      referencia: ordenId,
      proveedorId: orden.proveedorId,
      remitoCompraId: remitoCompraRef.id,
      comprobanteProveedorId: comprobanteProveedorRef.id,
      fecha,
    });

    auditInBatch(batch, {
      action: 'purchases.receive',
      entity: 'remitos_compra',
      entityId: remitoCompraRef.id,
      entityLabel: numeroRemitoCompra,
      amount: montoRecibido,
      metadata: { ordenCompraId: orden.id, proveedorId: orden.proveedorId, comprobanteProveedorId: comprobanteProveedorRef.id },
    });

    await batch.commit();
    return {
      numeroRecepcion,
      numeroRemitoCompra,
      numeroComprobanteProveedor,
      remitoCompraId: remitoCompraRef.id,
      comprobanteProveedorId: comprobanteProveedorRef.id,
      estado: nuevoEstado,
    };
  };

  const anularRemitoCompra = async (remitoCompraId, motivo = '') => {
    assertPermission(getActivePermissions(), 'purchases:return');
    const remito = data.remitosCompra.find((r) => r.id === remitoCompraId);
    if (!remito || remito.estado === 'anulado') {
      throw new Error('El remito de compra no está disponible para anular');
    }

    const comprobante = data.comprobantesProveedor.find((c) => c.id === remito.comprobanteProveedorId);
    if (!comprobante) {
      throw new Error('Comprobante de proveedor no encontrado');
    }

    const pagosComprobante = data.pagos.filter((p) => p.comprobanteProveedorId === comprobante.id);
    const total = Number(remito.total) || 0;
    const saldoComprobante = Number(comprobante.saldoPendiente) || 0;
    if (
      pagosComprobante.length > 0 ||
      (comprobante.pagos || []).length > 0 ||
      saldoComprobante < total ||
      comprobante.estado === 'pagado'
    ) {
      throw new Error('No se puede anular: el comprobante proveedor tiene pagos aplicados');
    }

    const proveedor = data.proveedores.find((p) => p.id === remito.proveedorId);
    const orden = data.ordenesCompra.find((o) => o.id === remito.ordenCompraId);
    const fecha = new Date().toISOString();
    const motivoFinal = motivo.trim() || 'Anulación de remito de compra';

    remito.items?.forEach((item) => {
      const producto = data.productos.find((p) => p.id === item.productoId);
      const cantidad = Number(item.cantidad) || 0;
      if (producto && (Number(producto.stock) || 0) < cantidad) {
        throw new Error(`No hay stock suficiente para revertir ${item.nombre}`);
      }
    });

    const batch = writeBatch(db);

    remito.items?.forEach((item) => {
      const producto = data.productos.find((p) => p.id === item.productoId);
      const cantidad = Number(item.cantidad) || 0;
      if (producto) {
        batch.update(doc(db, 'productos', item.productoId), {
          stock: (Number(producto.stock) || 0) - cantidad,
        });
      }
    });

    if (orden) {
      const itemsActualizados = orden.items.map((item) => {
        const itemRemito = remito.items?.find((r) => r.productoId === item.productoId);
        if (!itemRemito) return item;
        return {
          ...item,
          cantidadRecibida: Math.max(
            0,
            (Number(item.cantidadRecibida) || 0) - (Number(itemRemito.cantidad) || 0)
          ),
        };
      });
      const totalRecibido = itemsActualizados.reduce((acc, item) => acc + (Number(item.cantidadRecibida) || 0), 0);
      const totalPedido = itemsActualizados.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0);
      const nuevoEstado = totalRecibido <= 0 ? 'authorized' : totalRecibido >= totalPedido ? 'received' : 'partial';
      const recepciones = (orden.recepciones || []).map((recepcion) =>
        recepcion.remitoCompraId === remito.id
          ? {
              ...recepcion,
              estado: 'anulado',
              fechaAnulacion: fecha,
              motivoAnulacion: motivoFinal,
            }
          : recepcion
      );

      batch.update(doc(db, 'ordenes_compra', orden.id), {
        items: itemsActualizados,
        estado: nuevoEstado,
        recepciones,
        fechaUltimaAnulacionRecepcion: fecha,
      });
    }

    batch.update(doc(db, 'remitos_compra', remito.id), {
      estado: 'anulado',
      fechaAnulacion: fecha,
      motivoAnulacion: motivoFinal,
    });

    batch.update(doc(db, 'comprobantes_proveedor', comprobante.id), {
      estado: 'anulado',
      saldoPendiente: 0,
      fechaAnulacion: fecha,
      motivoAnulacion: motivoFinal,
      remitoCompraAnulado: true,
    });

    if (proveedor) {
      batch.update(doc(db, 'proveedores', proveedor.id), {
        saldoPendiente: Math.max(0, (Number(proveedor.saldoPendiente) || 0) - total),
      });
    }

    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: 'anulacion_remito_compra',
      descripcion: `Anulación remito compra ${remito.numero} — ${motivoFinal}`,
      monto: total,
      referencia: remito.id,
      proveedorId: remito.proveedorId,
      ordenCompraId: remito.ordenCompraId || null,
      comprobanteProveedorId: comprobante.id,
      fecha,
    });

    auditInBatch(batch, {
      action: 'purchases.return',
      entity: 'remitos_compra',
      entityId: remito.id,
      entityLabel: remito.numero,
      amount: total,
      metadata: { motivo: motivoFinal, proveedorId: remito.proveedorId, comprobanteProveedorId: comprobante.id },
    });

    await batch.commit();
    return { remitoCompraId: remito.id, numero: remito.numero };
  };

  const addComprobanteProveedor = async (comprobante) => {
    assertPermission(getActivePermissions(), 'purchases:create');
    const proveedor = data.proveedores.find((p) => p.id === comprobante.proveedorId);
    if (!proveedor) {
      throw new Error('Proveedor no encontrado');
    }

    const total = Number(comprobante.total) || 0;
    if (total <= 0) {
      throw new Error('El comprobante debe tener un total mayor a cero');
    }

    const tipo = comprobante.tipo || 'factura_a';
    const esNotaCredito = tipo === 'nota_credito';
    const fecha = comprobante.fecha || new Date().toISOString();
    const batch = writeBatch(db);
    const compRef = doc(collection(db, 'comprobantes_proveedor'));
    const numeroInterno = `CP-${String(data.comprobantesProveedor.length + 1).padStart(6, '0')}`;
    let saldoPendiente = esNotaCredito ? 0 : total;
    let estado = esNotaCredito ? 'aplicada' : 'pendiente';

    let imputacionesNc = [];
    if (esNotaCredito) {
      const imputacionesSolicitadas = Array.isArray(comprobante.imputaciones)
        ? comprobante.imputaciones
            .map((imp) => ({
              comprobanteProveedorId: imp.comprobanteProveedorId,
              monto: Number(imp.monto) || 0,
            }))
            .filter((imp) => imp.comprobanteProveedorId && imp.monto > 0)
        : comprobante.comprobanteOrigenId
          ? [{ comprobanteProveedorId: comprobante.comprobanteOrigenId, monto: total }]
          : [];

      const totalImputado = imputacionesSolicitadas.reduce((acc, imp) => acc + imp.monto, 0);
      if (Math.abs(totalImputado - total) > 0.01) {
        throw new Error('La suma de imputaciones debe coincidir con el total de la nota de crédito');
      }

      imputacionesNc = imputacionesSolicitadas.map((imp) => {
        const origen = data.comprobantesProveedor.find((c) => c.id === imp.comprobanteProveedorId);
        if (!origen || origen.proveedorId !== proveedor.id || origen.estado === 'anulado') {
          throw new Error('Comprobante origen inválido para aplicar la nota de crédito');
        }
        if (imp.monto > (Number(origen.saldoPendiente) || 0)) {
          throw new Error(`La nota de crédito supera el saldo de ${origen.numero}`);
        }
        const nuevoSaldoOrigen = Math.max(0, (Number(origen.saldoPendiente) || 0) - imp.monto);
        batch.update(doc(db, 'comprobantes_proveedor', origen.id), {
          saldoPendiente: nuevoSaldoOrigen,
          estado: nuevoSaldoOrigen <= 0 ? 'pagado' : 'parcial',
          notaCreditoId: compRef.id,
          fechaUltimaImputacion: fecha,
        });
        return {
          comprobanteProveedorId: origen.id,
          numeroComprobante: origen.numero,
          monto: imp.monto,
        };
      });
    }

    batch.set(compRef, {
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre || '',
      numero: numeroInterno,
      numeroProveedor: comprobante.numeroProveedor || '',
      tipo,
      fecha,
      fechaEmision: comprobante.fechaEmision || fecha,
      fechaVencimiento: comprobante.fechaVencimiento || '',
      total,
      saldoPendiente,
      estado,
      items: comprobante.items || [],
      remitoCompraIds: comprobante.remitoCompraIds || [],
      comprobanteOrigenId: comprobante.comprobanteOrigenId || imputacionesNc[0]?.comprobanteProveedorId || null,
      imputaciones: imputacionesNc,
      observaciones: comprobante.observaciones || '',
      origenManual: true,
      createdAt: new Date().toISOString(),
    });

    batch.update(doc(db, 'proveedores', proveedor.id), {
      saldoPendiente: Math.max(
        0,
        (Number(proveedor.saldoPendiente) || 0) + (esNotaCredito ? -total : total)
      ),
    });

    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: esNotaCredito ? 'nota_credito_proveedor' : 'comprobante_proveedor',
      descripcion: `${esNotaCredito ? 'Nota de crédito' : 'Comprobante proveedor'} ${comprobante.numeroProveedor || numeroInterno}`,
      monto: total,
      referencia: compRef.id,
      proveedorId: proveedor.id,
      fecha,
    });

    auditInBatch(batch, {
      action: esNotaCredito ? 'supplier_credit_note.create' : 'supplier_invoice.create',
      entity: 'comprobantes_proveedor',
      entityId: compRef.id,
      entityLabel: comprobante.numeroProveedor || numeroInterno,
      amount: total,
      metadata: { proveedorId: proveedor.id, imputaciones: imputacionesNc.length },
    });

    await batch.commit();
    return { comprobanteProveedorId: compRef.id, numero: numeroInterno };
  };

  const updateComprobanteProveedor = async (id, updates) => {
    assertPermission(getActivePermissions(), 'purchases:create');
    const comprobante = data.comprobantesProveedor.find((c) => c.id === id);
    if (!comprobante || comprobante.estado === 'anulado') {
      throw new Error('Comprobante no disponible para editar');
    }

    const cleanUpdates = {};
    [
      'tipo',
      'numeroProveedor',
      'fechaEmision',
      'fechaVencimiento',
      'observaciones',
    ].forEach((key) => {
      if (updates[key] !== undefined) cleanUpdates[key] = updates[key];
    });

    if (Object.keys(cleanUpdates).length === 0) return;

    await updateDoc(doc(db, 'comprobantes_proveedor', id), {
      ...cleanUpdates,
      updatedAt: new Date().toISOString(),
    });
  };

  const anularComprobanteProveedor = async (id, motivo = '') => {
    assertPermission(getActivePermissions(), 'purchases:create');
    const comprobante = data.comprobantesProveedor.find((c) => c.id === id);
    if (!comprobante || comprobante.estado === 'anulado') {
      throw new Error('Comprobante no disponible para anular');
    }
    if (comprobante.remitoCompraId) {
      throw new Error('Este comprobante viene de un remito. Anulalo desde Rem. Compra para revertir stock');
    }
    if ((comprobante.pagos || []).length > 0 || data.pagos.some((p) => p.comprobanteProveedorId === id)) {
      throw new Error('No se puede anular un comprobante con pagos aplicados');
    }

    const proveedor = data.proveedores.find((p) => p.id === comprobante.proveedorId);
    const fecha = new Date().toISOString();
    const total = Number(comprobante.total) || 0;
    const saldo = Number(comprobante.saldoPendiente) || 0;
    const batch = writeBatch(db);
    const esNotaCredito = comprobante.tipo === 'nota_credito';
    if (!esNotaCredito && comprobante.notaCreditoId) {
      throw new Error('Este comprobante tiene una nota de crédito aplicada. Anulá primero la nota de crédito');
    }

    if (esNotaCredito) {
      const imputaciones = (comprobante.imputaciones || []).length
        ? comprobante.imputaciones
        : comprobante.comprobanteOrigenId
          ? [{ comprobanteProveedorId: comprobante.comprobanteOrigenId, monto: total }]
          : [];

      imputaciones.forEach((imputacion) => {
        const origen = data.comprobantesProveedor.find((c) => c.id === imputacion.comprobanteProveedorId);
        if (!origen || origen.estado === 'anulado') {
          throw new Error('Comprobante origen no disponible para revertir la nota de crédito');
        }
        const montoImputado = Number(imputacion.monto) || 0;
        const nuevoSaldo = (Number(origen.saldoPendiente) || 0) + montoImputado;
        batch.update(doc(db, 'comprobantes_proveedor', origen.id), {
          saldoPendiente: nuevoSaldo,
          estado: nuevoSaldo >= (Number(origen.total) || 0) ? 'pendiente' : 'parcial',
          fechaUltimaAnulacionNotaCredito: fecha,
        });
      });
    }

    batch.update(doc(db, 'comprobantes_proveedor', id), {
      estado: 'anulado',
      saldoPendiente: 0,
      fechaAnulacion: fecha,
      motivoAnulacion: motivo.trim() || 'Anulación de comprobante proveedor',
    });

    if (proveedor) {
      batch.update(doc(db, 'proveedores', proveedor.id), {
        saldoPendiente: Math.max(
          0,
          (Number(proveedor.saldoPendiente) || 0) + (esNotaCredito ? total : -saldo)
        ),
      });
    }

    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: 'anulacion_comprobante_proveedor',
      descripcion: `Anulación comprobante proveedor ${comprobante.numeroProveedor || comprobante.numero}`,
      monto: total,
      referencia: id,
      proveedorId: comprobante.proveedorId,
      fecha,
    });

    auditInBatch(batch, {
      action: 'supplier_invoice.cancel',
      entity: 'comprobantes_proveedor',
      entityId: id,
      entityLabel: comprobante.numeroProveedor || comprobante.numero,
      amount: total,
      metadata: { proveedorId: comprobante.proveedorId, motivo: motivo.trim() || 'Anulación de comprobante proveedor' },
    });

    await batch.commit();
  };

  const facturarPedido = async (pedidoId) => {
    assertPermission(getActivePermissions(), 'orders:invoice');
    const pedido = data.pedidos.find((p) => p.id === pedidoId);
    if (!pedido || pedido.estado !== 'authorized') {
      throw new Error('Solo se pueden facturar pedidos autorizados');
    }
    const yaFacturado = data.facturas.some((f) => f.pedidoId === pedidoId);
    if (yaFacturado) {
      throw new Error('Este pedido ya tiene factura asociada');
    }

    const batch = writeBatch(db);
    const facturaRef = doc(collection(db, 'facturas'));
    const numeroFactura = `F-${String(data.facturas.length + 1).padStart(6, '0')}`;
    const fecha = new Date().toISOString();

    const newFactura = {
      pedidoId: pedido.id,
      pedidoNumero: pedido.numero,
      presupuestoId: pedido.presupuestoId || null,
      presupuestoNumero: pedido.presupuestoNumero || null,
      remitoId: pedido.remitoId || null,
      remitoNumero: pedido.remitoNumero || null,
      clienteId: pedido.clienteId,
      vendedorId: pedido.vendedorId || null,
      vendedorNombre: pedido.vendedorNombre || null,
      condicionVentaId: pedido.condicionVentaId || null,
      condicionVentaNombre: pedido.condicionVentaNombre || null,
      condicionVentaDiasPago: pedido.condicionVentaDiasPago || 0,
      bonificacionId: pedido.bonificacionId || null,
      bonificacionNombre: pedido.bonificacionNombre || null,
      bonificacionTipo: pedido.bonificacionTipo || null,
      bonificacionValor: pedido.bonificacionValor || 0,
      items: pedido.items,
      subtotalBruto: pedido.subtotalBruto ?? pedido.total,
      descuentoCondicion: pedido.descuentoCondicion || 0,
      recargoCondicion: pedido.recargoCondicion || 0,
      descuentoBonificacion: pedido.descuentoBonificacion || 0,
      total: pedido.total,
      observaciones: pedido.observaciones || '',
      numero: numeroFactura,
      fecha,
      estado: 'pendiente',
      saldoPendiente: pedido.total,
    };

    batch.set(facturaRef, newFactura);
    if (pedido.remitoId) {
      const remito = data.remitos.find((r) => r.id === pedido.remitoId);
      const facturaIds = [...new Set([...(remito?.facturaIds || []), facturaRef.id])];
      batch.update(doc(db, 'remitos', pedido.remitoId), { facturaIds });
    }
    batch.update(doc(db, 'pedidos', pedidoId), {
      estado: 'invoiced',
      facturaId: facturaRef.id,
      facturaNumero: numeroFactura,
      fechaFacturacion: fecha,
    });

    await batch.commit();
    return { facturaId: facturaRef.id, numero: numeroFactura };
  };

  const updateFactura = async (id, updates) => {
    const factura = data.facturas.find((f) => f.id === id);
    if (factura?.bloqueado) {
      throw new Error('El comprobante fiscal está bloqueado y no puede modificarse');
    }
    await updateDoc(doc(db, 'facturas', id), updates);
  };

  const emitirComprobanteFiscal = async (
    facturaId,
    {
      tipoComprobante,
      tipoComprobanteNombre,
      afipCodigo,
      letra,
      puntoVenta,
      cae,
      caeVencimiento,
      usarCaeSimulado = false,
    }
  ) => {
    assertPermission(getActivePermissions(), 'invoices:fiscal');
    const factura = data.facturas.find((f) => f.id === facturaId);
    if (!factura) throw new Error('Factura no encontrada');
    if (factura.bloqueado || factura.cae) {
      throw new Error('El comprobante ya fue emitido fiscalmente');
    }
    if (factura.estado === 'pagada' && factura.saldoPendiente <= 0) {
      throw new Error('La factura ya está cancelada');
    }

    const caeFinal = usarCaeSimulado
      ? String(Date.now()).slice(-10) + String(Math.floor(Math.random() * 9999)).padStart(4, '0')
      : String(cae || '').replace(/\s/g, '');

    if (!/^\d{14}$/.test(caeFinal)) {
      throw new Error('El CAE debe tener 14 dígitos (o usá emisión simulada en desarrollo)');
    }

    const pv = Number(puntoVenta) || 1;
    const secuencial =
      data.facturas.filter((f) => f.puntoVenta === pv && f.cae).length + 1;
    const numeroFiscal = String(secuencial).padStart(8, '0');
    const fecha = new Date().toISOString();
    const vencimiento =
      caeVencimiento || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const batch = writeBatch(db);
    const updates = {
      esComprobanteFiscal: true,
      tipoComprobante,
      tipoComprobanteNombre: tipoComprobanteNombre || tipoComprobante || '',
      afipCodigo: afipCodigo || null,
      letra,
      puntoVenta: pv,
      numeroFiscal,
      cae: caeFinal,
      caeVencimiento: vencimiento,
      estadoFiscal: 'emitido',
      bloqueado: true,
      fechaEmisionFiscal: fecha,
    };

    if (!factura.ctaCteImpactada) {
      const monto = factura.saldoPendiente ?? factura.total ?? 0;
      if (monto > 0 && factura.clienteId) {
        aplicarCtaCteEnBatch(batch, factura.clienteId, monto, 'sumar');
        updates.ctaCteImpactada = true;
      }
    }

    batch.update(doc(db, 'facturas', facturaId), updates);

    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: 'comprobante_fiscal',
      descripcion: `Comprobante ${letra} ${pv}-${numeroFiscal} CAE ${caeFinal}`,
      monto: factura.total,
      referencia: facturaId,
      clienteId: factura.clienteId,
      fecha,
    });

    auditInBatch(batch, {
      action: 'invoices.fiscal_emit',
      entity: 'facturas',
      entityId: facturaId,
      entityLabel: `${letra} ${pv}-${numeroFiscal}`,
      amount: factura.total || 0,
      metadata: { clienteId: factura.clienteId, cae: caeFinal },
    });

    await batch.commit();
    return { cae: caeFinal, numeroFiscal, puntoVenta: pv, letra };
  };

  const crearNotaCreditoFiscal = async (facturaOrigenId, { motivo, usarCaeSimulado = true }) => {
    assertPermission(getActivePermissions(), 'invoices:fiscal');
    const origen = data.facturas.find((f) => f.id === facturaOrigenId);
    if (!origen?.cae || !origen.bloqueado) {
      throw new Error('Solo se puede anular fiscalmente un comprobante emitido con CAE');
    }
    if (origen.estadoFiscal === 'anulado') {
      throw new Error('El comprobante origen ya fue anulado con NC');
    }

    const batch = writeBatch(db);
    const ncRef = doc(collection(db, 'facturas'));
    const numeroInterno = `F-${String(data.facturas.length + 1).padStart(6, '0')}`;
    const fecha = new Date().toISOString();
    const pv = origen.puntoVenta || 1;
    const secuencial =
      data.facturas.filter((f) => f.tipoComprobante === 'NC' && f.puntoVenta === pv).length + 1;
    const caeNc = usarCaeSimulado
      ? String(Date.now()).slice(-10) + String(Math.floor(Math.random() * 9999)).padStart(4, '0')
      : '';

    const notaCredito = {
      numero: numeroInterno,
      facturaOrigenId: origen.id,
      facturaOrigenNumero: origen.numeroFiscal
        ? `${origen.letra} ${String(origen.puntoVenta).padStart(4, '0')}-${origen.numeroFiscal}`
        : origen.numero,
      clienteId: origen.clienteId,
      pedidoId: origen.pedidoId || null,
      remitoId: origen.remitoId || null,
      items: origen.items,
      total: origen.total,
      saldoPendiente: 0,
      estado: 'pagada',
      fecha,
      esComprobanteFiscal: true,
      tipoComprobante: 'NC',
      letra: origen.letra || 'A',
      puntoVenta: pv,
      numeroFiscal: String(secuencial).padStart(8, '0'),
      cae: caeNc,
      caeVencimiento: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      estadoFiscal: 'emitido',
      bloqueado: true,
      motivoAnulacion: motivo,
      esNotaCredito: true,
    };

    batch.set(ncRef, notaCredito);
    batch.update(doc(db, 'facturas', facturaOrigenId), {
      estadoFiscal: 'anulado',
      notaCreditoId: ncRef.id,
      fechaAnulacionFiscal: fecha,
    });

    if (origen.ctaCteImpactada && origen.clienteId) {
      const monto = origen.saldoPendiente ?? origen.total ?? 0;
      if (monto > 0) {
        aplicarCtaCteEnBatch(batch, origen.clienteId, monto, 'restar');
        batch.update(doc(db, 'facturas', facturaOrigenId), {
          ctaCteImpactada: false,
          saldoPendiente: 0,
          estado: 'pagada',
        });
      }
    }

    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: 'nota_credito',
      descripcion: `NC por ${origen.numero} — ${motivo}`,
      monto: origen.total,
      referencia: ncRef.id,
      facturaOrigenId: origen.id,
      fecha,
    });

    auditInBatch(batch, {
      action: 'invoices.credit_note',
      entity: 'facturas',
      entityId: ncRef.id,
      entityLabel: numeroInterno,
      amount: origen.total || 0,
      metadata: { facturaOrigenId: origen.id, motivo },
    });

    await batch.commit();
    return { notaCreditoId: ncRef.id, numero: numeroInterno };
  };

  // ================= PAGOS =================
  const aplicarMovimientoTesoreriaEnBatch = (batch, movimiento, fecha, pagoRef = null) => {
    const cuenta = data.cuentasTesoreria.find((c) => c.id === movimiento.cuentaId);
    if (!cuenta || cuenta.activa === false) {
      throw new Error('Cuenta de tesorería no disponible');
    }

    const monto = Number(movimiento.monto) || 0;
    if (monto <= 0) {
      throw new Error('El movimiento de tesorería debe tener monto mayor a cero');
    }

    const delta = movimiento.tipo === 'egreso' ? -monto : monto;
    const saldoActual = cuenta.saldoActual ?? cuenta.saldoInicial ?? 0;
    const movTesRef = doc(collection(db, 'movimientos_tesoreria'));

    batch.update(doc(db, 'cuentas_tesoreria', cuenta.id), {
      saldoActual: saldoActual + delta,
      updatedAt: fecha,
    });

    batch.set(movTesRef, {
      numero: `MT-${String(data.movimientosTesoreria.length + 1).padStart(6, '0')}`,
      cuentaId: cuenta.id,
      cuentaNombre: cuenta.nombre,
      tipo: movimiento.tipo,
      concepto: movimiento.concepto,
      monto,
      metodoPago: movimiento.metodoPago || 'transferencia',
      referenciaTipo: movimiento.referenciaTipo || null,
      referenciaId: movimiento.referenciaId || null,
      pagoId: pagoRef?.id || movimiento.pagoId || null,
      conciliado: Boolean(movimiento.conciliado),
      fecha,
    });

    return movTesRef.id;
  };

  const addPago = async (pago) => {
    assertPermission(getActivePermissions(), 'payments:create');
    const batch = writeBatch(db);
    
    // 1. Crear pago
    const pagoRef = doc(collection(db, 'pagos'));
    const fecha = new Date().toISOString();
    const newPago = {
      ...pago,
      numero: `P-${String(data.pagos.length + 1).padStart(6, '0')}`,
      fecha
    };
    let imputacionesAplicadas = [];

    // 2. Actualizar factura si corresponde
    if (pago.facturaId) {
      const facturaRef = doc(db, 'facturas', pago.facturaId);
      const factura = data.facturas.find(f => f.id === pago.facturaId);
      if (factura) {
        const nuevoSaldo = factura.saldoPendiente - pago.monto;
        batch.update(facturaRef, {
          saldoPendiente: nuevoSaldo,
          estado: nuevoSaldo <= 0 ? 'pagada' : 'parcial'
        });
        if (pago.tipo === 'cliente' && factura.ctaCteImpactada && pago.clienteId) {
          aplicarCtaCteEnBatch(batch, pago.clienteId, pago.monto, 'restar');
        }
      }
    }

    // 3. Actualizar proveedor si corresponde
    if (pago.proveedorId) {
      const proveedorRef = doc(db, 'proveedores', pago.proveedorId);
      const proveedor = data.proveedores.find(p => p.id === pago.proveedorId);
      if (proveedor) {
        if (pago.monto > (proveedor.saldoPendiente || 0)) {
          throw new Error('El pago no puede superar la deuda del proveedor');
        }

        const imputacionesSolicitadas = Array.isArray(pago.imputaciones)
          ? pago.imputaciones
              .map((imp) => ({
                comprobanteProveedorId: imp.comprobanteProveedorId,
                monto: Number(imp.monto) || 0,
              }))
              .filter((imp) => imp.comprobanteProveedorId && imp.monto > 0)
          : [];

        let aplicaciones = [];
        if (imputacionesSolicitadas.length > 0) {
          const totalImputado = imputacionesSolicitadas.reduce((acc, imp) => acc + imp.monto, 0);
          if (Math.abs(totalImputado - pago.monto) > 0.01) {
            throw new Error('La suma de imputaciones debe coincidir con el monto de la orden de pago');
          }

          aplicaciones = imputacionesSolicitadas.map((imp) => {
            const comprobante = data.comprobantesProveedor.find((c) => c.id === imp.comprobanteProveedorId);
            if (!comprobante || comprobante.proveedorId !== pago.proveedorId) {
              throw new Error('Comprobante de proveedor no encontrado');
            }
            if (imp.monto > (comprobante.saldoPendiente || 0)) {
              throw new Error(`La imputación supera el saldo de ${comprobante.numero}`);
            }
            return { comprobante, aplicado: imp.monto };
          });
        } else {
          let montoRestante = pago.monto;
          const comprobantesObjetivo = (pago.comprobanteProveedorId
            ? data.comprobantesProveedor.filter((c) => c.id === pago.comprobanteProveedorId)
            : data.comprobantesProveedor
                .filter((c) => c.proveedorId === pago.proveedorId && (c.saldoPendiente || 0) > 0)
                .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)));

          if (pago.comprobanteProveedorId) {
            const comprobante = comprobantesObjetivo[0];
            if (!comprobante) {
              throw new Error('Comprobante de proveedor no encontrado');
            }
            if (pago.monto > (comprobante.saldoPendiente || 0)) {
              throw new Error('El pago no puede superar el saldo del comprobante seleccionado');
            }
          }

          aplicaciones = comprobantesObjetivo
            .map((comprobante) => {
              if (montoRestante <= 0) return null;
              const saldo = comprobante.saldoPendiente || 0;
              const aplicado = Math.min(saldo, montoRestante);
              montoRestante -= aplicado;
              return aplicado > 0 ? { comprobante, aplicado } : null;
            })
            .filter(Boolean);
        }

        aplicaciones.forEach(({ comprobante, aplicado }) => {
          const saldo = comprobante.saldoPendiente || 0;
          const nuevoSaldo = saldo - aplicado;
          const imputacion = {
            comprobanteProveedorId: comprobante.id,
            numeroComprobante: comprobante.numero,
            monto: aplicado,
          };
          imputacionesAplicadas.push(imputacion);
          batch.update(doc(db, 'comprobantes_proveedor', comprobante.id), {
            saldoPendiente: nuevoSaldo,
            estado: nuevoSaldo <= 0 ? 'pagado' : 'parcial',
            pagos: [
              ...(comprobante.pagos || []),
              {
                pagoId: pagoRef.id,
                numeroPago: newPago.numero,
                monto: aplicado,
                fecha: newPago.fecha,
              },
            ],
          });
        });

        batch.update(proveedorRef, {
          saldoPendiente: Math.max(0, (proveedor.saldoPendiente || 0) - pago.monto)
        });
      }
    }

    batch.set(pagoRef, {
      ...newPago,
      imputaciones: imputacionesAplicadas.length ? imputacionesAplicadas : newPago.imputaciones || [],
    });

    // 4. Crear movimiento
    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: pago.tipo === 'cliente' ? 'cobro' : 'pago_proveedor',
      descripcion: `Pago ${newPago.numero}`,
      monto: pago.monto,
      referencia: pagoRef.id,
      fecha
    });

    if (pago.cuentaTesoreriaId) {
      aplicarMovimientoTesoreriaEnBatch(
        batch,
        {
          cuentaId: pago.cuentaTesoreriaId,
          tipo: pago.tipo === 'cliente' ? 'ingreso' : 'egreso',
          concepto:
            pago.conceptoTesoreria ||
            (pago.tipo === 'cliente'
              ? `Recibo ${newPago.numero}`
              : `Orden de pago ${newPago.numero}`),
          monto: pago.monto,
          metodoPago: pago.metodoPago,
          referenciaTipo:
            pago.referenciaTesoreriaTipo ||
            (pago.tipo === 'cliente' ? 'recibo_cliente' : 'orden_pago_proveedor'),
          referenciaId: pago.facturaId || pago.comprobanteProveedorId || null,
          conciliado: pago.conciliado || false,
        },
        fecha,
        pagoRef
      );
    }

    auditInBatch(batch, {
      action: pago.tipo === 'cliente' ? 'payments.receipt_create' : 'payments.supplier_payment_create',
      entity: 'pagos',
      entityId: pagoRef.id,
      entityLabel: newPago.numero,
      amount: pago.monto,
      metadata: {
        clienteId: pago.clienteId || null,
        proveedorId: pago.proveedorId || null,
        facturaId: pago.facturaId || null,
        comprobanteProveedorId: pago.comprobanteProveedorId || null,
        imputaciones: imputacionesAplicadas.length,
      },
    });

    await batch.commit();
    return { pagoId: pagoRef.id, numero: newPago.numero };
  };

  const anularPago = async (pagoId, motivo = '') => {
    assertPermission(getActivePermissions(), 'payments:create');
    const pago = data.pagos.find((p) => p.id === pagoId);
    if (!pago || pago.estado === 'anulado') {
      throw new Error('El pago no está disponible para anular');
    }

    const monto = Number(pago.monto) || 0;
    if (monto <= 0) {
      throw new Error('El pago no tiene monto válido para revertir');
    }

    const movimientosTesoreriaPago = data.movimientosTesoreria.filter(
      (mov) => mov.pagoId === pagoId && !mov.anulado
    );
    if (movimientosTesoreriaPago.some((mov) => mov.conciliado)) {
      throw new Error('No se puede anular un pago con movimiento de tesorería conciliado');
    }

    const batch = writeBatch(db);
    const fecha = new Date().toISOString();
    const motivoFinal = motivo.trim() || 'Anulación de pago';

    if (pago.tipo === 'cliente') {
      const factura = data.facturas.find((f) => f.id === pago.facturaId);
      if (factura) {
        const nuevoSaldo = (Number(factura.saldoPendiente) || 0) + monto;
        batch.update(doc(db, 'facturas', factura.id), {
          saldoPendiente: nuevoSaldo,
          estado: nuevoSaldo >= (Number(factura.total) || 0) ? 'pendiente' : 'parcial',
          fechaUltimaAnulacionPago: fecha,
        });
        if (factura.ctaCteImpactada && pago.clienteId) {
          aplicarCtaCteEnBatch(batch, pago.clienteId, monto, 'sumar');
        }
      }
    }

    if (pago.tipo === 'proveedor') {
      const proveedor = data.proveedores.find((p) => p.id === pago.proveedorId);
      const imputaciones = (pago.imputaciones || []).length
        ? pago.imputaciones
        : pago.comprobanteProveedorId
          ? [
              {
                comprobanteProveedorId: pago.comprobanteProveedorId,
                monto,
              },
            ]
          : [];

      if (!imputaciones.length) {
        throw new Error('No se puede anular un pago proveedor sin detalle de imputación');
      }

      imputaciones.forEach((imputacion) => {
        const comprobante = data.comprobantesProveedor.find(
          (c) => c.id === imputacion.comprobanteProveedorId
        );
        if (!comprobante) {
          throw new Error('Comprobante de proveedor no encontrado para revertir la imputación');
        }
        const montoImputado = Number(imputacion.monto) || 0;
        const nuevoSaldo = (Number(comprobante.saldoPendiente) || 0) + montoImputado;
        batch.update(doc(db, 'comprobantes_proveedor', comprobante.id), {
          saldoPendiente: nuevoSaldo,
          estado: nuevoSaldo >= (Number(comprobante.total) || 0) ? 'pendiente' : 'parcial',
          pagos: (comprobante.pagos || []).filter((registro) => registro.pagoId !== pagoId),
          fechaUltimaAnulacionPago: fecha,
        });
      });

      if (proveedor) {
        batch.update(doc(db, 'proveedores', proveedor.id), {
          saldoPendiente: (Number(proveedor.saldoPendiente) || 0) + monto,
        });
      }
    }

    movimientosTesoreriaPago.forEach((mov) => {
      batch.update(doc(db, 'movimientos_tesoreria', mov.id), {
        anulado: true,
        fechaAnulacion: fecha,
        motivoAnulacion: motivoFinal,
      });
      aplicarMovimientoTesoreriaEnBatch(
        batch,
        {
          cuentaId: mov.cuentaId,
          tipo: mov.tipo === 'ingreso' ? 'egreso' : 'ingreso',
          concepto: `Anulación ${mov.concepto}`,
          monto: mov.monto,
          metodoPago: mov.metodoPago,
          referenciaTipo: 'anulacion_pago',
          referenciaId: pagoId,
          conciliado: false,
        },
        fecha
      );
    });

    batch.update(doc(db, 'pagos', pagoId), {
      estado: 'anulado',
      fechaAnulacion: fecha,
      motivoAnulacion: motivoFinal,
    });

    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: pago.tipo === 'cliente' ? 'anulacion_cobro' : 'anulacion_pago_proveedor',
      descripcion: `Anulación ${pago.numero} — ${motivoFinal}`,
      monto,
      referencia: pagoId,
      clienteId: pago.clienteId || null,
      proveedorId: pago.proveedorId || null,
      fecha,
    });

    auditInBatch(batch, {
      action: pago.tipo === 'cliente' ? 'payments.receipt_cancel' : 'payments.supplier_payment_cancel',
      entity: 'pagos',
      entityId: pagoId,
      entityLabel: pago.numero,
      amount: monto,
      metadata: { motivo: motivoFinal, clienteId: pago.clienteId || null, proveedorId: pago.proveedorId || null },
    });

    await batch.commit();
    return { pagoId, numero: pago.numero };
  };

  // ================= TESORERÍA =================
  const addCuentaTesoreria = async (cuenta) => {
    assertPermission(getActivePermissions(), 'payments:create');
    const saldoInicial = Number(cuenta.saldoInicial) || 0;
    const newCuenta = {
      nombre: cuenta.nombre,
      tipo: cuenta.tipo || 'caja',
      saldoInicial,
      saldoActual: saldoInicial,
      activa: cuenta.activa ?? true,
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'cuentas_tesoreria'), newCuenta);
  };

  const updateCuentaTesoreria = async (id, updates) => {
    assertPermission(getActivePermissions(), 'payments:create');
    await updateDoc(doc(db, 'cuentas_tesoreria', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  };

  const conciliarMovimientoTesoreria = async (id, conciliado) => {
    assertPermission(getActivePermissions(), 'payments:create');
    const movimiento = data.movimientosTesoreria.find((m) => m.id === id);
    if (!movimiento || movimiento.anulado) {
      throw new Error('Movimiento no disponible para conciliar');
    }

    const fecha = new Date().toISOString();
    const batch = writeBatch(db);
    batch.update(doc(db, 'movimientos_tesoreria', id), {
      conciliado: Boolean(conciliado),
      ...(conciliado
        ? { fechaConciliacion: fecha }
        : { fechaDesconciliacion: fecha, fechaConciliacion: null }),
    });
    auditInBatch(batch, {
      action: conciliado ? 'treasury.reconcile' : 'treasury.unreconcile',
      entity: 'movimientos_tesoreria',
      entityId: id,
      entityLabel: movimiento.numero || movimiento.concepto,
      amount: movimiento.monto || 0,
      metadata: { cuentaId: movimiento.cuentaId, tipo: movimiento.tipo },
    });
    await batch.commit();
  };

  const registrarImportacionBancaria = async ({ cuentaId, fileName, rows }) => {
    assertPermission(getActivePermissions(), 'payments:create');
    const cuenta = data.cuentasTesoreria.find((c) => c.id === cuentaId);
    if (!cuenta) {
      throw new Error('Cuenta de tesorería no encontrada');
    }

    const seleccionadas = rows.filter((row) => row.selected && row.suggestedMovimientoId);
    if (!seleccionadas.length) {
      throw new Error('No hay movimientos seleccionados para conciliar');
    }

    const fecha = new Date().toISOString();
    const batch = writeBatch(db);
    const importRef = doc(collection(db, 'importaciones_bancarias'));

    batch.set(importRef, {
      cuentaId,
      cuentaNombre: cuenta.nombre,
      fileName,
      totalFilas: rows.length,
      conciliadas: seleccionadas.length,
      rows: rows.map((row) => ({
        rowHash: row.rowHash,
        fechaBanco: row.fechaBanco,
        descripcionBanco: row.descripcionBanco,
        referenciaBanco: row.referenciaBanco,
        montoBanco: row.montoBanco,
        suggestedMovimientoId: row.suggestedMovimientoId || null,
        selected: Boolean(row.selected),
        score: row.score || 0,
      })),
      createdAt: fecha,
    });

    seleccionadas.forEach((row) => {
      const movimiento = data.movimientosTesoreria.find((mov) => mov.id === row.suggestedMovimientoId);
      if (!movimiento || movimiento.anulado || movimiento.conciliado) return;
      batch.update(doc(db, 'movimientos_tesoreria', movimiento.id), {
        conciliado: true,
        fechaConciliacion: fecha,
        conciliacionBanco: {
          importacionId: importRef.id,
          rowHash: row.rowHash,
          fechaBanco: row.fechaBanco,
          descripcionBanco: row.descripcionBanco,
          referenciaBanco: row.referenciaBanco,
          montoBanco: row.montoBanco,
          score: row.score || 0,
        },
      });
    });

    auditInBatch(batch, {
      action: 'bank_import.reconcile',
      entity: 'importaciones_bancarias',
      entityId: importRef.id,
      entityLabel: fileName,
      amount: seleccionadas.reduce((acc, row) => acc + (Number(row.monto) || 0), 0),
      metadata: { cuentaId, totalFilas: rows.length, conciliadas: seleccionadas.length },
    });

    await batch.commit();
    return { importacionId: importRef.id, conciliadas: seleccionadas.length };
  };

  const addMovimientoTesoreria = async (movimiento) => {
    assertPermission(getActivePermissions(), 'payments:create');
    const batch = writeBatch(db);
    const fecha = new Date().toISOString();
    const movTesoreriaId = aplicarMovimientoTesoreriaEnBatch(
      batch,
      {
        ...movimiento,
        referenciaTipo: movimiento.referenciaTipo || 'ajuste_manual',
      },
      fecha
    );
    auditInBatch(batch, {
      action: 'treasury.manual_movement',
      entity: 'movimientos_tesoreria',
      entityId: movTesoreriaId,
      entityLabel: movimiento.concepto,
      amount: Number(movimiento.monto) || 0,
      metadata: { cuentaId: movimiento.cuentaId, tipo: movimiento.tipo },
    });
    await batch.commit();
  };

  const registrarReciboCliente = async ({
    facturaId,
    cuentaTesoreriaId,
    monto,
    metodoPago = 'transferencia',
    observaciones = '',
    conciliado = false,
  }) => {
    const factura = data.facturas.find((f) => f.id === facturaId);
    if (!factura || (factura.saldoPendiente || 0) <= 0) {
      throw new Error('Factura no disponible para cobrar');
    }
    if (Number(monto) > (factura.saldoPendiente || 0)) {
      throw new Error('El recibo no puede superar el saldo de la factura');
    }

    return addPago({
      tipo: 'cliente',
      facturaId: factura.id,
      clienteId: factura.clienteId,
      monto: Number(monto),
      metodoPago,
      observaciones,
      cuentaTesoreriaId,
      conceptoTesoreria: `Recibo por ${factura.numero}`,
      referenciaTesoreriaTipo: 'recibo_cliente',
      conciliado,
    });
  };

  const registrarOrdenPagoProveedor = async ({
    comprobanteProveedorId,
    proveedorId,
    imputaciones = [],
    cuentaTesoreriaId,
    monto,
    metodoPago = 'transferencia',
    observaciones = '',
    conciliado = false,
  }) => {
    if (Array.isArray(imputaciones) && imputaciones.length > 0) {
      const imputacionesValidas = imputaciones
        .map((imp) => ({
          comprobanteProveedorId: imp.comprobanteProveedorId,
          monto: Number(imp.monto) || 0,
        }))
        .filter((imp) => imp.comprobanteProveedorId && imp.monto > 0);
      const total = imputacionesValidas.reduce((acc, imp) => acc + imp.monto, 0);
      if (total <= 0) {
        throw new Error('La orden de pago debe imputar al menos un comprobante');
      }
      const comprobantes = imputacionesValidas.map((imp) => {
        const comprobante = data.comprobantesProveedor.find((c) => c.id === imp.comprobanteProveedorId);
        if (!comprobante || (comprobante.saldoPendiente || 0) <= 0) {
          throw new Error('Comprobante de proveedor no disponible para pagar');
        }
        if (proveedorId && comprobante.proveedorId !== proveedorId) {
          throw new Error('Todas las imputaciones deben pertenecer al mismo proveedor');
        }
        if (imp.monto > (comprobante.saldoPendiente || 0)) {
          throw new Error(`La orden de pago supera el saldo de ${comprobante.numero}`);
        }
        return comprobante;
      });
      const proveedorPagoId = proveedorId || comprobantes[0]?.proveedorId;

      return addPago({
        tipo: 'proveedor',
        proveedorId: proveedorPagoId,
        monto: total,
        imputaciones: imputacionesValidas,
        metodoPago,
        observaciones,
        cuentaTesoreriaId,
        conceptoTesoreria: `Orden de pago múltiple (${imputacionesValidas.length} comprobantes)`,
        referenciaTesoreriaTipo: 'orden_pago_proveedor',
        conciliado,
      });
    }

    const comprobante = data.comprobantesProveedor.find((c) => c.id === comprobanteProveedorId);
    if (!comprobante || (comprobante.saldoPendiente || 0) <= 0) {
      throw new Error('Comprobante de proveedor no disponible para pagar');
    }
    if (Number(monto) > (comprobante.saldoPendiente || 0)) {
      throw new Error('La orden de pago no puede superar el saldo del comprobante');
    }

    return addPago({
      tipo: 'proveedor',
      proveedorId: comprobante.proveedorId,
      comprobanteProveedorId: comprobante.id,
      monto: Number(monto),
      metodoPago,
      observaciones,
      cuentaTesoreriaId,
      conceptoTesoreria: `Orden de pago ${comprobante.numero}`,
      referenciaTesoreriaTipo: 'orden_pago_proveedor',
      conciliado,
    });
  };

  // ================= MOVIMIENTOS =================
  const addMovimiento = async (movimiento) => {
    const newMovimiento = {
      ...movimiento,
      fecha: new Date().toISOString()
    };
    await addDoc(collection(db, 'movimientos'), newMovimiento);
  };

  // ================= ESTADÍSTICAS =================
  const getEstadisticas = () => {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    const ventasMes = data.ventas.filter(v => new Date(v.fecha) >= inicioMes);
    const totalVentasMes = ventasMes.reduce((acc, v) => acc + v.total, 0);
    
    const facturasPendientes = data.facturas.filter(f => f.estado !== 'pagada');
    const totalPorCobrar = facturasPendientes.reduce((acc, f) => acc + f.saldoPendiente, 0);
    
    const totalDeudaProveedores = data.proveedores.reduce((acc, p) => acc + p.saldoPendiente, 0);
    
    const productosStockBajo = data.productos.filter(p => p.stock <= p.stockMinimo);

    return {
      totalVentasMes,
      cantidadVentasMes: ventasMes.length,
      totalPorCobrar,
      totalDeudaProveedores,
      productosStockBajo: productosStockBajo.length,
      totalClientes: data.clientes.length,
      totalProductos: data.productos.length,
      totalProveedores: data.proveedores.length
    };
  };

  // ================= MIGRACIÓN =================
  const migrateToFirebase = async () => {
    const saved = localStorage.getItem('crowgest_data');
    if (!saved) return;
    
    const localData = JSON.parse(saved);
    const batch = writeBatch(db);

    // Migrar clientes
    localData.clientes?.forEach(c => {
      const ref = doc(db, 'clientes', c.id);
      batch.set(ref, c);
    });

    // Migrar productos
    localData.productos?.forEach(p => {
      const ref = doc(db, 'productos', p.id);
      batch.set(ref, p);
    });

    // Migrar proveedores
    localData.proveedores?.forEach(p => {
      const ref = doc(db, 'proveedores', p.id);
      batch.set(ref, p);
    });

    // Migrar ventas
    localData.ventas?.forEach(v => {
      const ref = doc(db, 'ventas', v.id);
      batch.set(ref, v);
    });

    // Migrar facturas
    localData.facturas?.forEach(f => {
      const ref = doc(db, 'facturas', f.id);
      batch.set(ref, f);
    });

    // Migrar pagos
    localData.pagos?.forEach(p => {
      const ref = doc(db, 'pagos', p.id);
      batch.set(ref, p);
    });

    // Migrar movimientos
    localData.movimientos?.forEach(m => {
      const ref = doc(db, 'movimientos', m.id);
      batch.set(ref, m);
    });

    await batch.commit();
    localStorage.removeItem('crowgest_data'); // Limpiar local para evitar doble migración
  };

  const value = {
    ...data,
    loading,
    registrarAuditoria,
    addCliente,
    updateCliente,
    deleteCliente,
    addProducto,
    updateProducto,
    deleteProducto,
    updateStock,
    ajustarStockManual,
    addProveedor,
    updateProveedor,
    deleteProveedor,
    addVendedor,
    updateVendedor,
    deleteVendedor,
    addCondicionVenta,
    updateCondicionVenta,
    deleteCondicionVenta,
    addTipoComprobante,
    updateTipoComprobante,
    deleteTipoComprobante,
    addBonificacion,
    updateBonificacion,
    deleteBonificacion,
    addVenta,
    addPresupuesto,
    anularPresupuesto,
    convertirPresupuestoAPedido,
    addPedido,
    autorizarPedido,
    cancelarPedido,
    addOrdenCompra,
    autorizarOrdenCompra,
    cancelarOrdenCompra,
    registrarRecepcionCompra,
    anularRemitoCompra,
    addComprobanteProveedor,
    updateComprobanteProveedor,
    anularComprobanteProveedor,
    remitosCompra: data.remitosCompra,
    emitirRemito,
    anularRemito,
    vincularFacturaARemito,
    desvincularFacturaDeRemito,
    addFactura,
    facturarPedido,
    updateFactura,
    emitirComprobanteFiscal,
    crearNotaCreditoFiscal,
    addPago,
    anularPago,
    addCuentaTesoreria,
    updateCuentaTesoreria,
    conciliarMovimientoTesoreria,
    registrarImportacionBancaria,
    addMovimientoTesoreria,
    registrarReciboCliente,
    registrarOrdenPagoProveedor,
    addMovimiento,
    getEstadisticas,
    migrateToFirebase
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};