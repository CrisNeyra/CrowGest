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
    movimientos: []
  });
  const [loading, setLoading] = useState(true);

  // Cargar datos desde Firestore en tiempo real
  useEffect(() => {
    const collections = ['clientes', 'productos', 'proveedores', 'ventas', 'facturas', 'pagos', 'movimientos'];
    
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

  // ================= FACTURAS =================
  const addFactura = async (factura) => {
    const newFactura = {
      ...factura,
      numero: `F-${String(data.facturas.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString(),
      estado: 'pendiente',
      saldoPendiente: factura.total
    };
    await addDoc(collection(db, 'facturas'), newFactura);
  };

  const updateFactura = async (id, updates) => {
    await updateDoc(doc(db, 'facturas', id), updates);
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
    addFactura,
    updateFactura,
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