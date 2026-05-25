import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, Receipt, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';

export default function PedidosAFacturar() {
  const { pedidos, facturas, clientes, facturarPedido } = useData();
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

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

  const handleFacturar = async (pedido) => {
    if (!confirm(`¿Generar factura para el pedido ${pedido.numero}?`)) return;
    setProcessingId(pedido.id);
    try {
      const result = await facturarPedido(pedido.id);
      toast.success(`Factura ${result.numero} generada correctamente`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo facturar el pedido');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Layout>
      <Header
        title="Pedidos a Facturar"
        subtitle="Pedidos autorizados pendientes de comprobante"
      />

      {!can('orders:invoice') && (
        <p className="mx-6 mt-4 rounded-xl border border-amber-200/60 bg-amber-50/80 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Tu rol no puede generar facturas desde pedidos.
        </p>
      )}

      <div className="p-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-sm text-pastel-muted dark:text-slate-400">Pedidos listos</p>
            <p className="text-2xl font-bold text-pastel-ink dark:text-slate-100">{filtered.length}</p>
          </div>
          <div className="card p-4 sm:col-span-2">
            <p className="text-sm text-pastel-muted dark:text-slate-400">Importe total a facturar</p>
            <p className="text-2xl font-bold text-sky-700 dark:text-indigo-400">
              ${totalImporte.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Buscar por pedido, presupuesto o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <Link to="/facturas" className="btn-secondary shrink-0">
            <ExternalLink size={18} />
            Ver facturas
          </Link>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="p-4 text-left">Pedido</th>
                  <th className="p-4 text-left">Presupuesto</th>
                  <th className="p-4 text-left">Cliente</th>
                  <th className="p-4 text-left">Fecha pedido</th>
                  <th className="p-4 text-left">Autorizado</th>
                  <th className="p-4 text-center">Ítems</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pedido, index) => {
                  const cliente = clientes.find((c) => c.id === pedido.clienteId);
                  const isProcessing = processingId === pedido.id;
                  return (
                    <motion.tr
                      key={pedido.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <span className="font-mono text-sky-700 dark:text-indigo-400">{pedido.numero}</span>
                      </td>
                      <td className="p-4 font-mono text-sm text-pastel-muted dark:text-slate-400">
                        {pedido.presupuestoNumero || '-'}
                      </td>
                      <td className="p-4 text-pastel-ink dark:text-slate-100">{cliente?.nombre || '-'}</td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {new Date(pedido.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {pedido.fechaAutorizacion
                          ? new Date(pedido.fechaAutorizacion).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="p-4 text-center text-pastel-muted dark:text-slate-400">
                        {pedido.items?.length || 0}
                      </td>
                      <td className="p-4 text-right font-semibold text-pastel-ink dark:text-slate-100">
                        ${pedido.total.toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        {can('orders:invoice') ? (
                          <button
                            type="button"
                            onClick={() => handleFacturar(pedido)}
                            disabled={isProcessing}
                            className="btn-primary inline-flex items-center gap-2 py-2 text-sm"
                          >
                            {isProcessing ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                              <Receipt size={16} />
                            )}
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
              <FileText size={48} className="mx-auto mb-4 text-pastel-muted/40 dark:text-slate-700" />
              <p className="text-pastel-muted dark:text-slate-500">
                No hay pedidos autorizados pendientes de facturar
              </p>
              <p className="mt-2 text-sm text-pastel-muted dark:text-slate-500">
                Autorizá pedidos en{' '}
                <Link to="/pedidos" className="font-medium text-sky-700 dark:text-indigo-400">
                  Pedidos
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
