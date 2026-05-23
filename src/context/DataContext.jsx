import { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

const DataContext = createContext();

export function DataProvider({ children }) {
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
  });
  const [loading, setLoading] = useState(true);

  // Cargar datos desde Firestore en tiempo real
  useEffect(() => {
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
    ];
    
    const unsubscribes = collections.map(collName => {
      return onSnapshot(collection(db, collName), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(prev => ({ ...prev, [collName]: items }));
      }, (error) => {
        console.error(`Error al escuchar la colección ${collName}:`, error);
      });
    });

    // Simulamos que la carga inicial terminó después de 1.5s
    // (En un escenario real, podríamos esperar a que todos los snapshots emitan su primer valor)
    const timer = setTimeout(() => setLoading(false), 1500);

    return () => {
      clearTimeout(timer);
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

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
    const validezDias = presupuesto.validezDias ?? 15;
    const fecha = new Date();
    const validezHasta = new Date(fecha);
    validezHasta.setDate(validezHasta.getDate() + validezDias);

    const newPresupuesto = {
      clienteId: presupuesto.clienteId,
      items: presupuesto.items,
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
      items: presupuesto.items,
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
    const newPedido = {
      clienteId: pedido.clienteId,
      presupuestoId: pedido.presupuestoId || null,
      presupuestoNumero: pedido.presupuestoNumero || null,
      items: pedido.items,
      total: pedido.total,
      observaciones: pedido.observaciones || '',
      numero: `PED-${String(data.pedidos.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString(),
      estado: 'pending',
    };
    await addDoc(collection(db, 'pedidos'), newPedido);
  };

  const autorizarPedido = async (id) => {
    const pedido = data.pedidos.find((p) => p.id === id);
    if (!pedido || pedido.estado !== 'pending') {
      throw new Error('Solo se pueden autorizar pedidos pendientes');
    }
    await updateDoc(doc(db, 'pedidos', id), {
      estado: 'authorized',
      fechaAutorizacion: new Date().toISOString(),
    });
  };

  const cancelarPedido = async (id) => {
    const pedido = data.pedidos.find((p) => p.id === id);
    if (!pedido || pedido.estado !== 'pending') {
      throw new Error('Solo se pueden cancelar pedidos pendientes');
    }
    await updateDoc(doc(db, 'pedidos', id), { estado: 'cancelled' });
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

    await batch.commit();
    return { remitoId: remitoRef.id, numero };
  };

  const anularRemito = async (remitoId) => {
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

  const facturarPedido = async (pedidoId) => {
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
      items: pedido.items,
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
    { tipoComprobante, letra, puntoVenta, cae, caeVencimiento, usarCaeSimulado = false }
  ) => {
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

    await batch.commit();
    return { cae: caeFinal, numeroFiscal, puntoVenta: pv, letra };
  };

  const crearNotaCreditoFiscal = async (facturaOrigenId, { motivo, usarCaeSimulado = true }) => {
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

    await batch.commit();
    return { notaCreditoId: ncRef.id, numero: numeroInterno };
  };

  // ================= PAGOS =================
  const addPago = async (pago) => {
    const batch = writeBatch(db);
    
    // 1. Crear pago
    const pagoRef = doc(collection(db, 'pagos'));
    const newPago = {
      ...pago,
      numero: `P-${String(data.pagos.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString()
    };
    batch.set(pagoRef, newPago);

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
        batch.update(proveedorRef, {
          saldoPendiente: proveedor.saldoPendiente - pago.monto
        });
      }
    }

    // 4. Crear movimiento
    const movRef = doc(collection(db, 'movimientos'));
    batch.set(movRef, {
      tipo: pago.tipo === 'cliente' ? 'cobro' : 'pago_proveedor',
      descripcion: `Pago ${newPago.numero}`,
      monto: pago.monto,
      referencia: pagoRef.id,
      fecha: new Date().toISOString()
    });

    await batch.commit();
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
    addCliente,
    updateCliente,
    deleteCliente,
    addProducto,
    updateProducto,
    deleteProducto,
    updateStock,
    addProveedor,
    updateProveedor,
    deleteProveedor,
    addVenta,
    addPresupuesto,
    anularPresupuesto,
    convertirPresupuestoAPedido,
    addPedido,
    autorizarPedido,
    cancelarPedido,
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