import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { calcularTotalesFactura } from './comprobantesFiscales';

const CLIENTES_DEMO = [
  {
    nombre: 'Taller San Martín — Gol y Classic',
    email: 'taller.sanmartin@demo.ar',
    telefono: '011-4567-8901',
    cuit: '30-71234567-1',
    direccion: 'Av. San Martín 1250, Morón, BA',
    vehiculos: ['VW Gol 2015', 'Chevrolet Classic'],
    proximoVencimiento: true,
  },
  {
    nombre: 'Repuestos del Sur — Sandero',
    email: 'repuestos.sur@demo.ar',
    telefono: '011-4321-5566',
    cuit: '30-71234567-2',
    direccion: 'Calle 14 N° 890, La Plata, BA',
    vehiculos: ['Renault Sandero'],
    proximoVencimiento: true,
  },
  {
    nombre: 'AutoPartes Norte SRL',
    email: 'autopartes.norte@demo.ar',
    telefono: '011-4789-2233',
    cuit: '30-71234567-3',
    direccion: 'Av. del Libertador 4520, CABA',
    vehiculos: ['VW Gol 2015', 'Renault Sandero'],
  },
  {
    nombre: 'Mecánica Rápida Palermo',
    email: 'mecanica.palermo@demo.ar',
    telefono: '011-4890-1122',
    cuit: '30-71234567-4',
    direccion: 'Thames 980, Palermo, CABA',
    vehiculos: ['Chevrolet Classic', 'Renault Sandero'],
  },
  {
    nombre: 'Distribuidora Patagonia Repuestos',
    email: 'patagonia.repuestos@demo.ar',
    telefono: '0299-445-6677',
    cuit: '30-71234567-5',
    direccion: 'Roca 340, Neuquén',
    vehiculos: ['VW Gol 2015', 'Chevrolet Classic', 'Renault Sandero'],
  },
];

const PRODUCTOS_DEMO = [
  { codigo: 'FIL-ACE-GOL', nombre: 'Filtro aceite VW Gol 2015 1.6', categoria: 'Filtros', precio: 8500, alicuotaIva: 21, stock: 45, vehiculo: 'VW Gol 2015' },
  { codigo: 'PAST-FRE-GOL', nombre: 'Pastillas freno delanteras Gol Trend', categoria: 'Frenos', precio: 28500, alicuotaIva: 21, stock: 20, vehiculo: 'VW Gol 2015' },
  { codigo: 'KIT-DIST-GOL', nombre: 'Kit distribución Gol 1.6 8v', categoria: 'Motor', precio: 95000, alicuotaIva: 21, stock: 8, vehiculo: 'VW Gol 2015' },
  { codigo: 'AMORT-CLAS', nombre: 'Amortiguador trasero Chevrolet Classic', categoria: 'Suspensión', precio: 42000, alicuotaIva: 21, stock: 16, vehiculo: 'Chevrolet Classic' },
  { codigo: 'BUJE-CLAS', nombre: 'Buje barra estabilizadora Classic', categoria: 'Suspensión', precio: 6500, alicuotaIva: 10.5, stock: 60, vehiculo: 'Chevrolet Classic' },
  { codigo: 'CORREA-CLAS', nombre: 'Correa auxiliar Classic 1.4', categoria: 'Motor', precio: 12000, alicuotaIva: 21, stock: 30, vehiculo: 'Chevrolet Classic' },
  { codigo: 'FIL-AIRE-SAN', nombre: 'Filtro aire Renault Sandero 1.6', categoria: 'Filtros', precio: 7800, alicuotaIva: 21, stock: 35, vehiculo: 'Renault Sandero' },
  { codigo: 'DISCO-FRE-SAN', nombre: 'Disco freno Sandero delantero', categoria: 'Frenos', precio: 35000, alicuotaIva: 21, stock: 14, vehiculo: 'Renault Sandero' },
  { codigo: 'LAMP-H7-SAN', nombre: 'Lámpara H7 Sandero / Logan', categoria: 'Iluminación', precio: 4500, alicuotaIva: 10.5, stock: 80, vehiculo: 'Renault Sandero' },
  { codigo: 'RADIAD-GOL', nombre: 'Radiador Gol 2015 con aire', categoria: 'Refrigeración', precio: 68000, alicuotaIva: 21, stock: 6, vehiculo: 'VW Gol 2015' },
  { codigo: 'EMBRAG-CLAS', nombre: 'Kit embrague Chevrolet Classic', categoria: 'Transmisión', precio: 125000, alicuotaIva: 21, stock: 4, vehiculo: 'Chevrolet Classic' },
  { codigo: 'BOMBA-AGUA-SAN', nombre: 'Bomba de agua Sandero 1.6', categoria: 'Motor', precio: 32000, alicuotaIva: 21, stock: 10, vehiculo: 'Renault Sandero' },
];

function diasAtras(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

function productosParaCliente(cliente, productosIds) {
  const vehiculos = cliente.vehiculos || [];
  return PRODUCTOS_DEMO.filter((p) => vehiculos.includes(p.vehiculo)).slice(0, 3).map((p, i) => {
    const prod = productosIds.find((x) => x.codigo === p.codigo);
    const cantidad = i === 0 ? 2 : 1;
    const precioConIva = p.precio * (1 + p.alicuotaIva / 100);
    return {
      productoId: prod?.id,
      nombre: p.nombre,
      codigo: p.codigo,
      cantidad,
      precioUnitario: Math.round(precioConIva),
      subtotal: Math.round(precioConIva * cantidad),
    };
  });
}

export async function demoRepuestosYaCargado() {
  const q = query(collection(db, 'clientes'), where('demoRepuestos', '==', true));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function cargarDemoRepuestos() {
  if (await demoRepuestosYaCargado()) {
    throw new Error('Los datos demo de repuestos ya fueron cargados anteriormente');
  }

  const batch1 = writeBatch(db);
  const clienteRefs = [];
  const productoRefs = [];

  CLIENTES_DEMO.forEach((c) => {
    const ref = doc(collection(db, 'clientes'));
    clienteRefs.push({ ref, data: c });
    batch1.set(ref, {
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      cuit: c.cuit,
      direccion: c.direccion,
      saldo: 0,
      demoRepuestos: true,
      createdAt: new Date().toISOString(),
    });
  });

  PRODUCTOS_DEMO.forEach((p) => {
    const ref = doc(collection(db, 'productos'));
    productoRefs.push({ ref, codigo: p.codigo, data: p });
    batch1.set(ref, {
      ...p,
      precioNeto: p.precio,
      stockMinimo: 5,
      demoRepuestos: true,
      createdAt: new Date().toISOString(),
    });
  });

  await batch1.commit();

  const productosIds = productoRefs.map(({ ref, codigo }) => ({ id: ref.id, codigo }));

  for (let i = 0; i < clienteRefs.length; i += 1) {
    const { ref: clienteRef, data: cliente } = clienteRefs[i];
    const items = productosParaCliente(cliente, productosIds);
    if (!items.length) continue;

    const total = items.reduce((acc, it) => acc + it.subtotal, 0);
    const batch = writeBatch(db);

    const presRef = doc(collection(db, 'presupuestos'));
    const pedRef = doc(collection(db, 'pedidos'));
    const remRef = doc(collection(db, 'remitos'));
    const facRef = doc(collection(db, 'facturas'));

    const presNum = `PRE-DEMO-${String(i + 1).padStart(3, '0')}`;
    const pedNum = `PED-DEMO-${String(i + 1).padStart(3, '0')}`;
    const remNum = `REM-DEMO-${String(i + 1).padStart(3, '0')}`;
    const facNum = `F-DEMO-${String(i + 1).padStart(3, '0')}`;

    const fechaPedido = diasAtras(cliente.proximoVencimiento ? 26 + i : 5 + i);
    const condicionDias = cliente.proximoVencimiento ? 30 : 0;

    batch.set(presRef, {
      clienteId: clienteRef.id,
      items,
      total,
      subtotalBruto: total,
      numero: presNum,
      fecha: fechaPedido,
      validezDias: 15,
      validezHasta: new Date().toISOString(),
      estado: 'convertido',
      pedidoId: pedRef.id,
      demoRepuestos: true,
    });

    batch.set(pedRef, {
      clienteId: clienteRef.id,
      presupuestoId: presRef.id,
      presupuestoNumero: presNum,
      items,
      total,
      subtotalBruto: total,
      numero: pedNum,
      fecha: fechaPedido,
      estado: 'invoiced',
      fechaAutorizacion: fechaPedido,
      remitoId: remRef.id,
      remitoNumero: remNum,
      facturaId: facRef.id,
      facturaNumero: facNum,
      condicionVentaDiasPago: condicionDias,
      condicionVentaNombre: condicionDias ? 'Cuenta corriente 30 días' : 'Contado',
      demoRepuestos: true,
    });

    batch.set(remRef, {
      clienteId: clienteRef.id,
      pedidoId: pedRef.id,
      pedidoNumero: pedNum,
      items,
      total,
      numero: remNum,
      fecha: fechaPedido,
      estado: 'emitido',
      facturaIds: [facRef.id],
      demoRepuestos: true,
    });

    const lineas = items.map((it) => {
      const prod = PRODUCTOS_DEMO.find((p) => p.codigo === it.codigo);
      return {
        productoId: it.productoId,
        codigo: it.codigo,
        descripcion: it.nombre,
        cantidad: it.cantidad,
        netoUnitario: prod?.precio || 0,
        alicuotaIva: prod?.alicuotaIva || 21,
        descuentoPct: 0,
      };
    });
    const totales = calcularTotalesFactura(lineas, { iibbPct: 3 });

    batch.set(facRef, {
      clienteId: clienteRef.id,
      pedidoId: pedRef.id,
      pedidoNumero: pedNum,
      presupuestoId: presRef.id,
      presupuestoNumero: presNum,
      remitoId: remRef.id,
      remitoNumero: remNum,
      items: totales.lineas.map((l) => ({
        productoId: l.productoId,
        nombre: l.descripcion,
        cantidad: l.cantidad,
        precioUnitario: l.netoUnitario,
        subtotal: l.neto,
      })),
      lineasDetalle: totales.lineas,
      tipoComprobante: 'FB',
      letra: 'B',
      sucursal: 'Central',
      formaPago: condicionDias ? 'cuenta_corriente' : 'contado',
      transporte: 'Retira cliente',
      netoGravado: totales.netoGravado,
      iva105: totales.iva105,
      iva21: totales.iva21,
      iibb: totales.iibb,
      iibbPct: 3,
      total: totales.total,
      numero: facNum,
      fecha: fechaPedido,
      estado: 'pendiente',
      saldoPendiente: totales.total,
      condicionVentaDiasPago: condicionDias,
      condicionVentaNombre: condicionDias ? 'Cuenta corriente 30 días' : 'Contado',
      demoRepuestos: true,
    });

    await batch.commit();
  }

  return { clientes: CLIENTES_DEMO.length, productos: PRODUCTOS_DEMO.length };
}
