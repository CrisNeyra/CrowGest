import { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const DataContext = createContext();

// Datos iniciales de ejemplo
const initialData = {
  clientes: [
    { id: uuidv4(), nombre: 'Juan Pérez', email: 'juan@email.com', telefono: '555-1234', direccion: 'Calle Principal 123', saldo: 0, createdAt: new Date().toISOString() },
    { id: uuidv4(), nombre: 'María García', email: 'maria@email.com', telefono: '555-5678', direccion: 'Av. Central 456', saldo: 1500, createdAt: new Date().toISOString() },
    { id: uuidv4(), nombre: 'Carlos López', email: 'carlos@email.com', telefono: '555-9012', direccion: 'Plaza Mayor 789', saldo: -500, createdAt: new Date().toISOString() },
  ],
  productos: [
    { id: uuidv4(), codigo: 'PROD001', nombre: 'Laptop HP', descripcion: 'Laptop HP 15.6"', precio: 45000, costo: 38000, stock: 15, stockMinimo: 5, categoria: 'Electrónica', createdAt: new Date().toISOString() },
    { id: uuidv4(), codigo: 'PROD002', nombre: 'Mouse Logitech', descripcion: 'Mouse inalámbrico', precio: 1500, costo: 1000, stock: 50, stockMinimo: 10, categoria: 'Accesorios', createdAt: new Date().toISOString() },
    { id: uuidv4(), codigo: 'PROD003', nombre: 'Teclado Mecánico', descripcion: 'Teclado mecánico RGB', precio: 3500, costo: 2500, stock: 30, stockMinimo: 8, categoria: 'Accesorios', createdAt: new Date().toISOString() },
    { id: uuidv4(), codigo: 'PROD004', nombre: 'Monitor Samsung', descripcion: 'Monitor 24" Full HD', precio: 12000, costo: 9500, stock: 8, stockMinimo: 3, categoria: 'Electrónica', createdAt: new Date().toISOString() },
  ],
  proveedores: [
    { id: uuidv4(), nombre: 'Tech Supplies SA', contacto: 'Pedro Martínez', email: 'pedro@techsupplies.com', telefono: '555-1111', direccion: 'Zona Industrial 100', saldoPendiente: 25000, createdAt: new Date().toISOString() },
    { id: uuidv4(), nombre: 'Distribuidora Norte', contacto: 'Ana Rodríguez', email: 'ana@distnorte.com', telefono: '555-2222', direccion: 'Av. Comercial 200', saldoPendiente: 15000, createdAt: new Date().toISOString() },
  ],
  ventas: [],
  facturas: [],
  pagos: [],
  movimientos: [],
};

export function DataProvider({ children }) {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('crowgest_data');
    return saved ? JSON.parse(saved) : initialData;
  });

  useEffect(() => {
    localStorage.setItem('crowgest_data', JSON.stringify(data));
  }, [data]);

  // CLIENTES
  const addCliente = (cliente) => {
    const newCliente = { ...cliente, id: uuidv4(), createdAt: new Date().toISOString(), saldo: 0 };
    setData(prev => ({ ...prev, clientes: [...prev.clientes, newCliente] }));
    return newCliente;
  };

  const updateCliente = (id, updates) => {
    setData(prev => ({
      ...prev,
      clientes: prev.clientes.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const deleteCliente = (id) => {
    setData(prev => ({ ...prev, clientes: prev.clientes.filter(c => c.id !== id) }));
  };

  // PRODUCTOS
  const addProducto = (producto) => {
    const newProducto = { ...producto, id: uuidv4(), createdAt: new Date().toISOString() };
    setData(prev => ({ ...prev, productos: [...prev.productos, newProducto] }));
    return newProducto;
  };

  const updateProducto = (id, updates) => {
    setData(prev => ({
      ...prev,
      productos: prev.productos.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const deleteProducto = (id) => {
    setData(prev => ({ ...prev, productos: prev.productos.filter(p => p.id !== id) }));
  };

  const updateStock = (productoId, cantidad, tipo) => {
    setData(prev => ({
      ...prev,
      productos: prev.productos.map(p => {
        if (p.id === productoId) {
          const newStock = tipo === 'entrada' ? p.stock + cantidad : p.stock - cantidad;
          return { ...p, stock: Math.max(0, newStock) };
        }
        return p;
      })
    }));
  };

  // PROVEEDORES
  const addProveedor = (proveedor) => {
    const newProveedor = { ...proveedor, id: uuidv4(), createdAt: new Date().toISOString(), saldoPendiente: 0 };
    setData(prev => ({ ...prev, proveedores: [...prev.proveedores, newProveedor] }));
    return newProveedor;
  };

  const updateProveedor = (id, updates) => {
    setData(prev => ({
      ...prev,
      proveedores: prev.proveedores.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const deleteProveedor = (id) => {
    setData(prev => ({ ...prev, proveedores: prev.proveedores.filter(p => p.id !== id) }));
  };

  // VENTAS
  const addVenta = (venta) => {
    const newVenta = {
      ...venta,
      id: uuidv4(),
      numero: `V-${String(data.ventas.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString(),
      estado: 'completada'
    };
    
    // Actualizar stock de productos
    venta.items.forEach(item => {
      updateStock(item.productoId, item.cantidad, 'salida');
    });
    
    // Agregar movimiento
    addMovimiento({
      tipo: 'venta',
      descripcion: `Venta ${newVenta.numero}`,
      monto: newVenta.total,
      referencia: newVenta.id
    });

    setData(prev => ({ ...prev, ventas: [...prev.ventas, newVenta] }));
    return newVenta;
  };

  // FACTURAS
  const addFactura = (factura) => {
    const newFactura = {
      ...factura,
      id: uuidv4(),
      numero: `F-${String(data.facturas.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString(),
      estado: 'pendiente',
      saldoPendiente: factura.total
    };
    
    setData(prev => ({ ...prev, facturas: [...prev.facturas, newFactura] }));
    return newFactura;
  };

  const updateFactura = (id, updates) => {
    setData(prev => ({
      ...prev,
      facturas: prev.facturas.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  // PAGOS
  const addPago = (pago) => {
    const newPago = {
      ...pago,
      id: uuidv4(),
      numero: `P-${String(data.pagos.length + 1).padStart(6, '0')}`,
      fecha: new Date().toISOString()
    };
    
    // Si es pago de factura, actualizar factura
    if (pago.facturaId) {
      const factura = data.facturas.find(f => f.id === pago.facturaId);
      if (factura) {
        const nuevoSaldo = factura.saldoPendiente - pago.monto;
        updateFactura(pago.facturaId, {
          saldoPendiente: nuevoSaldo,
          estado: nuevoSaldo <= 0 ? 'pagada' : 'parcial'
        });
      }
    }

    // Si es pago a proveedor
    if (pago.proveedorId) {
      const proveedor = data.proveedores.find(p => p.id === pago.proveedorId);
      if (proveedor) {
        updateProveedor(pago.proveedorId, {
          saldoPendiente: proveedor.saldoPendiente - pago.monto
        });
      }
    }

    addMovimiento({
      tipo: pago.tipo === 'cliente' ? 'cobro' : 'pago_proveedor',
      descripcion: `Pago ${newPago.numero}`,
      monto: pago.monto,
      referencia: newPago.id
    });

    setData(prev => ({ ...prev, pagos: [...prev.pagos, newPago] }));
    return newPago;
  };

  // MOVIMIENTOS
  const addMovimiento = (movimiento) => {
    const newMovimiento = {
      ...movimiento,
      id: uuidv4(),
      fecha: new Date().toISOString()
    };
    setData(prev => ({ ...prev, movimientos: [...prev.movimientos, newMovimiento] }));
  };

  // ESTADÍSTICAS
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

  const value = {
    ...data,
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
    getEstadisticas
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
