import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, Receipt, Plus, ShieldCheck, History } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';
import NuevaFacturaModal from '../components/ventas/NuevaFacturaModal';
import FacturasHistorialPanel from '../components/ventas/FacturasHistorialPanel';
import ComprobantesFiscalPanel from '../components/ventas/ComprobantesFiscalPanel';
import { itemsPedidoALineas } from '../utils/comprobantesFiscales';

const TABS = [
  { id: 'pendientes', label: 'Pendientes', icon: Receipt },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'fiscal', label: 'Fiscal AFIP', icon: ShieldCheck },
];

export default function PedidosAFacturar() {
  const { pedidos, facturas, clientes, productos } = useData();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'pendientes';
  const [tab, setTab] = useState(tabFromUrl);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNuevaFactura, setShowNuevaFactura] = useState(false);
  const [modalInitialData, setModalInitialData] = useState(null);
  const [facturaPreseleccionada, setFacturaPreseleccionada] = useState(null);

  useEffect(() => {
    if (['pendientes', 'historial', 'fiscal'].includes(tabFromUrl)) {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setSearchParams(nextTab === 'pendientes' ? {} : { tab: nextTab });
  };

  const pedidosPendientes = useMemo(() => {
    const idsFacturados = new Set(facturas.filter((f) => f.pedidoId).map((f) => f.pedidoId));
    return pedidos
      .filter((p) => p.estado === 'authorized' && !idsFacturados.has(p.id))
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [pedidos, facturas]);

  const filtered = pedidosPendientes.filter((pedido) => {
    const cliente = clientes.find((c) => c.id === pedido.clienteId);
    return (
      pedido.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.presupuestoNumero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalImporte = filtered.reduce((acc, p) => acc + (p.total || 0), 0);

  const openNuevaFactura = (initialData = null) => {
    setModalInitialData(initialData);
    setShowNuevaFactura(true);
  };

  const handleFacturarPedido = (pedido) => {
    openNuevaFactura({
      pedidoId: pedido.id,
      clienteId: pedido.clienteId,
      remitoId: pedido.remitoId || '',
      observaciones: pedido.observaciones || '',
      lineas: itemsPedidoALineas(pedido.items, productos),
    });
  };

  const handleGoFiscal = (factura) => {
    setFacturaPreseleccionada(factura);
    changeTab('fiscal');
  };

  return (
    <Layout>
      <Header
        title="A Facturar"
        subtitle="Facturación de clientes — pendientes, historial y emisión fiscal"
      />

      {!can('orders:invoice') && tab === 'pendientes' && (
        <p className="mx-6 mt-4 rounded-xl border border-amber-200/60 bg-amber-50/80 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Tu rol no puede generar facturas.
        </p>
      )}

      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => changeTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    tab === t.id
                      ? 'bg-sky-600 text-white dark:bg-indigo-600'
                      : 'bg-pastel-mist text-pastel-ink hover:bg-white dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>
          {can('orders:invoice') && (
            <button
              type="button"
              onClick={() => openNuevaFactura()}
              className="btn-warning inline-flex shrink-0 items-center gap-2"
            >
              <Plus size={18} />
              Nueva Factura
            </button>
          )}
        </div>

        {tab === 'pendientes' && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="card p-4">
                <p className="text-sm text-pastel-muted dark:text-slate-400">Pedidos listos</p>
                <p className="text-2xl font-bold">{filtered.length}</p>
              </div>
              <div className="card p-4 sm:col-span-2">
                <p className="text-sm text-pastel-muted dark:text-slate-400">Importe total a facturar</p>
                <p className="text-2xl font-bold text-sky-700 dark:text-indigo-400">
                  ${totalImporte.toLocaleString('es-AR')}
                </p>
              </div>
            </div>

            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={20} />
              <input
                type="text"
                placeholder="Buscar por pedido, presupuesto o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="p-4 text-left">Pedido</th>
                      <th className="p-4 text-left">Presupuesto</th>
                      <th className="p-4 text-left">Cliente</th>
                      <th className="p-4 text-left">Fecha</th>
                      <th className="p-4 text-center">Ítems</th>
                      <th className="p-4 text-right">Total</th>
                      <th className="p-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((pedido, index) => {
                      const cliente = clientes.find((c) => c.id === pedido.clienteId);
                      return (
                        <motion.tr
                          key={pedido.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.03 }}
                          className="table-row"
                        >
                          <td className="p-4 font-mono text-sky-700 dark:text-indigo-400">{pedido.numero}</td>
                          <td className="p-4 font-mono text-sm text-pastel-muted">{pedido.presupuestoNumero || '-'}</td>
                          <td className="p-4">{cliente?.nombre || '-'}</td>
                          <td className="p-4 text-pastel-muted">{new Date(pedido.fecha).toLocaleDateString('es-AR')}</td>
                          <td className="p-4 text-center text-pastel-muted">{pedido.items?.length || 0}</td>
                          <td className="p-4 text-right font-semibold">${pedido.total.toLocaleString()}</td>
                          <td className="p-4 text-right">
                            {can('orders:invoice') ? (
                              <button
                                type="button"
                                onClick={() => handleFacturarPedido(pedido)}
                                className="btn-primary inline-flex items-center gap-2 py-2 text-sm"
                              >
                                <Receipt size={16} />
                                Facturar
                              </button>
                            ) : (
                              <span className="text-xs text-pastel-muted">Sin permiso</span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="py-12 text-center">
                  <FileText size={48} className="mx-auto mb-4 text-pastel-muted/40" />
                  <p className="text-pastel-muted">No hay pedidos autorizados pendientes</p>
                  <p className="mt-2 text-sm text-pastel-muted">
                    Autorizá pedidos en{' '}
                    <Link to="/pedidos" className="font-medium text-sky-700 dark:text-indigo-400">Pedidos</Link>
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'historial' && (
          <FacturasHistorialPanel onGoFiscal={handleGoFiscal} />
        )}

        {tab === 'fiscal' && (
          <ComprobantesFiscalPanel
            facturaPreseleccionada={facturaPreseleccionada}
            onPreseleccionConsumida={() => setFacturaPreseleccionada(null)}
          />
        )}
      </div>

      <NuevaFacturaModal
        isOpen={showNuevaFactura}
        onClose={() => {
          setShowNuevaFactura(false);
          setModalInitialData(null);
        }}
        initialData={modalInitialData}
        onSuccess={() => changeTab('historial')}
      />
    </Layout>
  );
}
