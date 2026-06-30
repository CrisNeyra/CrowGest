import { after, before, beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const projectId = 'demo-crowgest';
const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');

const roles = {
  admin: 'admin-user',
  supervisor: 'supervisor-user',
  vendedor: 'vendedor-user',
  compras: 'compras-user',
  tesoreria: 'tesoreria-user',
};

let testEnv;

function dbFor(uid) {
  return testEnv.authenticatedContext(uid, { email: `${uid}@crowgest.test` }).firestore();
}

function publicDb() {
  return testEnv.unauthenticatedContext().firestore();
}

async function seedRoles() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await Promise.all(
      Object.entries(roles).map(([rol, uid]) =>
        setDoc(doc(db, 'usuarios', uid), {
          email: `${uid}@crowgest.test`,
          nombre: uid,
          rol,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ),
    );
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedRoles();
});

after(async () => {
  await testEnv.cleanup();
});

describe('Firestore rules - perfiles de usuario', () => {
  test('bloquea lectura de negocio sin autenticacion o sin perfil', async () => {
    await assertFails(getDoc(doc(publicDb(), 'clientes', 'cliente-1')));
    await assertFails(getDoc(doc(dbFor('sin-perfil'), 'clientes', 'cliente-1')));
  });

  test('permite crear perfil propio solo como vendedor', async () => {
    const db = dbFor('nuevo-user');

    await assertSucceeds(
      setDoc(doc(db, 'usuarios', 'nuevo-user'), {
        email: 'nuevo-user@crowgest.test',
        nombre: 'Nuevo',
        rol: 'vendedor',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );

    await assertFails(
      setDoc(doc(dbFor('otro-user'), 'usuarios', 'otro-user'), {
        email: 'otro-user@crowgest.test',
        nombre: 'Otro',
        rol: 'admin',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );
  });

  test('solo admin lista usuarios y cambia roles', async () => {
    await assertFails(getDocs(collection(dbFor(roles.vendedor), 'usuarios')));
    await assertSucceeds(getDocs(collection(dbFor(roles.admin), 'usuarios')));

    await assertFails(updateDoc(doc(dbFor(roles.vendedor), 'usuarios', roles.vendedor), { rol: 'admin' }));
    await assertSucceeds(updateDoc(doc(dbFor(roles.vendedor), 'usuarios', roles.vendedor), { nombre: 'Vendedor 1' }));
    await assertSucceeds(updateDoc(doc(dbFor(roles.admin), 'usuarios', roles.vendedor), { rol: 'supervisor' }));
  });
});

describe('Firestore rules - roles operativos', () => {
  test('admin puede escribir colecciones criticas', async () => {
    const db = dbFor(roles.admin);

    await assertSucceeds(setDoc(doc(db, 'clientes', 'cliente-1'), { nombre: 'Cliente' }));
    await assertSucceeds(setDoc(doc(db, 'productos', 'producto-1'), { nombre: 'Producto' }));
    await assertSucceeds(setDoc(doc(db, 'pedidos', 'pedido-1'), { estado: 'authorized' }));
    await assertSucceeds(setDoc(doc(db, 'remitos_compra', 'remito-compra-1'), { total: 1000 }));
    await assertSucceeds(setDoc(doc(db, 'facturas', 'factura-1'), { total: 1000 }));
    await assertSucceeds(setDoc(doc(db, 'pagos', 'pago-1'), { total: 1000 }));
    await assertSucceeds(setDoc(doc(db, 'importaciones_bancarias', 'imp-1'), { totalFilas: 1 }));
    await assertSucceeds(
      setDoc(doc(db, 'audit_log', 'audit-1'), {
        action: 'test',
        entity: 'facturas',
        userId: roles.admin,
        createdAt: new Date(),
      })
    );
    await assertFails(deleteDoc(doc(db, 'audit_log', 'audit-1')));
    await assertSucceeds(deleteDoc(doc(db, 'pagos', 'pago-1')));
  });

  test('vendedor crea ventas basicas pero no operaciones criticas', async () => {
    const db = dbFor(roles.vendedor);

    await assertSucceeds(setDoc(doc(db, 'clientes', 'cliente-vendedor'), { nombre: 'Cliente' }));
    await assertSucceeds(setDoc(doc(db, 'presupuestos', 'presupuesto-1'), { total: 1000 }));
    await assertSucceeds(setDoc(doc(db, 'pedidos', 'pedido-1'), { estado: 'pending' }));

    await assertFails(setDoc(doc(db, 'facturas', 'factura-vendedor'), { total: 1000 }));
    await assertFails(setDoc(doc(db, 'pagos', 'pago-vendedor'), { total: 1000 }));
    await assertFails(setDoc(doc(db, 'remitos', 'remito-vendedor'), { pedidoId: 'pedido-1' }));
    await assertFails(setDoc(doc(db, 'remitos_compra', 'remito-compra-vendedor'), { total: 1000 }));
    await assertFails(setDoc(doc(db, 'importaciones_bancarias', 'imp-vendedor'), { totalFilas: 1 }));
    await assertSucceeds(
      setDoc(doc(db, 'audit_log', 'audit-vendedor'), {
        action: 'orders.create',
        entity: 'pedidos',
        userId: roles.vendedor,
        createdAt: new Date(),
      })
    );
    await assertFails(updateDoc(doc(db, 'audit_log', 'audit-vendedor'), { action: 'tamper' }));
    await assertFails(setDoc(doc(db, 'productos', 'producto-vendedor'), { stock: 10 }));
  });

  test('compras puede operar compras y stock, no tesoreria ni ventas criticas', async () => {
    const db = dbFor(roles.compras);

    await assertSucceeds(setDoc(doc(db, 'productos', 'producto-compras'), { stock: 10 }));
    await assertSucceeds(setDoc(doc(db, 'proveedores', 'proveedor-compras'), { nombre: 'Proveedor' }));
    await assertSucceeds(setDoc(doc(db, 'ordenes_compra', 'oc-1'), { estado: 'authorized' }));
    await assertSucceeds(setDoc(doc(db, 'remitos_compra', 'rc-1'), { total: 2000 }));
    await assertSucceeds(setDoc(doc(db, 'comprobantes_proveedor', 'cp-1'), { total: 2000 }));

    await assertFails(setDoc(doc(db, 'pagos', 'pago-compras'), { total: 2000 }));
    await assertFails(setDoc(doc(db, 'facturas', 'factura-compras'), { total: 2000 }));
    await assertFails(setDoc(doc(db, 'pedidos', 'pedido-compras'), { estado: 'pending' }));
  });

  test('tesoreria registra cobros y comprobantes, no autoriza pedidos ni stock', async () => {
    const db = dbFor(roles.tesoreria);

    await assertSucceeds(setDoc(doc(db, 'facturas', 'factura-tesoreria'), { total: 1000 }));
    await assertSucceeds(setDoc(doc(db, 'pagos', 'pago-tesoreria'), { total: 1000 }));
    await assertSucceeds(setDoc(doc(db, 'cuentas_tesoreria', 'cuenta-1'), { nombre: 'Caja' }));
    await assertSucceeds(setDoc(doc(db, 'movimientos_tesoreria', 'mov-1'), { total: 1000 }));
    await assertSucceeds(setDoc(doc(db, 'importaciones_bancarias', 'imp-tesoreria'), { totalFilas: 1 }));

    await assertFails(setDoc(doc(db, 'pedidos', 'pedido-tesoreria'), { estado: 'authorized' }));
    await assertFails(setDoc(doc(db, 'productos', 'producto-tesoreria'), { stock: 10 }));
    await assertFails(setDoc(doc(db, 'ordenes_compra', 'oc-tesoreria'), { estado: 'authorized' }));
    await assertFails(setDoc(doc(db, 'remitos_compra', 'rc-tesoreria'), { total: 1000 }));
  });

  test('factura con CAE es inmutable en campos fiscales', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'facturas', 'factura-cae'), {
        total: 1000,
        cae: '12345678901234',
        numeroFiscal: '00000001',
        letra: 'B',
        puntoVenta: 1,
        saldoPendiente: 1000,
        estado: 'pendiente',
      });
    });

    const db = dbFor(roles.tesoreria);

    // Cambiar el total de una factura con CAE debe fallar.
    await assertFails(
      updateDoc(doc(db, 'facturas', 'factura-cae'), { total: 5000 })
    );

    // Cobrar (saldoPendiente + estado) sí está permitido.
    await assertSucceeds(
      updateDoc(doc(db, 'facturas', 'factura-cae'), {
        saldoPendiente: 0,
        estado: 'pagada',
      })
    );
  });

  test('no se puede crear audit con userId ajeno', async () => {
    const db = dbFor(roles.vendedor);
    await assertFails(
      setDoc(doc(db, 'audit_log', 'audit-falso'), {
        action: 'orders.create',
        entity: 'pedidos',
        userId: roles.admin,
        createdAt: new Date(),
      })
    );
  });

  test('lectura general requiere perfil valido', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'facturas', 'factura-lectura'), { total: 1000 });
    });

    await assertSucceeds(getDoc(doc(dbFor(roles.vendedor), 'facturas', 'factura-lectura')));
    await assertSucceeds(getDoc(doc(dbFor(roles.compras), 'facturas', 'factura-lectura')));
    await assertFails(getDoc(doc(dbFor('usuario-sin-perfil'), 'facturas', 'factura-lectura')));
  });
});
