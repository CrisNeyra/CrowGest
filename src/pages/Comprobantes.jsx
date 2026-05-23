import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShieldCheck, FileWarning, X, Stamp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';
import {
  isApiEnabled,
  crearComprobanteBorrador,
  emitirComprobanteFiscal as emitirComprobanteApi,
} from '../api/comprobantesApi';
import {
  TIPOS_COMPROBANTE,
  PUNTOS_VENTA_DEFAULT,
  calcularIva21,
  etiquetaComprobante,
} from '../utils/comprobantesFiscales';

export default function Comprobantes() {
  const { facturas, clientes, emitirComprobanteFiscal, crearNotaCreditoFiscal } = useData();
  const [tab, setTab] = useState('pendientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmitModal, setShowEmitModal] = useState(false);
  const [showNcModal, setShowNcModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [tipoComprobante, setTipoComprobante] = useState('FB');
  const [puntoVenta, setPuntoVenta] = useState(String(PUNTOS_VENTA_DEFAULT));
  const [cae, setCae] = useState('');
  const [caeVencimiento, setCaeVencimiento] = useState('');
  const [usarSimulado, setUsarSimulado] = useState(true);
  const [motivoNc, setMotivoNc] = useState('');
  const [saving, setSaving] = useState(false);

  const tipoSel = TIPOS_COMPROBANTE.find((t) => t.value === tipoComprobante);
  const letra = tipoSel?.letra || 'B';

  const pendientes = useMemo(
    () =>
      facturas.filter(
        (f) =>
          !f.cae &&
          !f.esNotaCredito &&
          f.estado !== 'pagada' &&
          (f.saldoPendiente || 0) > 0
      ),
    [facturas]
  );

  const emitidos = useMemo(
    () =>
      facturas
        .filter((f) => f.cae && f.estadoFiscal === 'emitido' && !f.esNotaCredito)
        .sort((a, b) => new Date(b.fechaEmisionFiscal || b.fecha) - new Date(a.fechaEmisionFiscal || a.fecha)),
    [facturas]
  );

  const notasCredito = useMemo(
    () => facturas.filter((f) => f.esNotaCredito).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    [facturas]
  );

  const listaActiva =
    tab === 'pendientes' ? pendientes : tab === 'emitidos' ? emitidos : notasCredito;

  const filtered = listaActiva.filter((f) => {
    const cliente = clientes.find((c) => c.id === f.clienteId);
    const label = etiquetaComprobante(f);
    return (
      f.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const openEmitir = (factura) => {
    setSelectedFactura(factura);
    setTipoComprobante('FB');
    setPuntoVenta(String(PUNTOS_VENTA_DEFAULT));
    setCae('');
    setCaeVencimiento('');
    setUsarSimulado(true);
    setShowEmitModal(true);
  };

  const openNc = (factura) => {
    setSelectedFactura(factura);
    setMotivoNc('');
    setShowNcModal(true);
  };

  const sincronizarConApi = async (factura) => {
    if (!isApiEnabled()) return;
    const payloadItems = factura.items.map((item) => ({
      producto_id: item.productoId,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      subtotal: item.subtotal,
      nombre: item.nombre,
    }));
    const borrador = await crearComprobanteBorrador({
      cliente_id: factura.clienteId,
      pedido_id: factura.pedidoId || null,
      pedido_numero: factura.pedidoNumero || null,
      items: payloadItems,
      observaciones: factura.observaciones || '',
    });
    await emitirComprobanteApi(borrador.id, {
      tipo_comprobante: tipoComprobante,
      letra,
      punto_venta: Number(puntoVenta),
      cae: usarSimulado ? undefined : cae,
      cae_vencimiento: caeVencimiento ? new Date(caeVencimiento).toISOString() : undefined,
      usar_cae_simulado: usarSimulado,
    });
  };

  const handleEmitir = async () => {
    if (!selectedFactura) return;
    setSaving(true);
    try {
      if (isApiEnabled()) {
        await sincronizarConApi(selectedFactura);
      }
      const result = await emitirComprobanteFiscal(selectedFactura.id, {
        tipoComprobante,
        letra,
        puntoVenta: Number(puntoVenta),
        cae: usarSimulado ? undefined : cae,
        caeVencimiento: caeVencimiento || undefined,
        usarCaeSimulado: usarSimulado,
      });
      toast.success(
        `Comprobante ${result.letra} ${String(result.puntoVenta).padStart(4, '0')}-${result.numeroFiscal} — CAE ${result.cae}${
          isApiEnabled() ? ' (registrado en API)' : ''
        }`
      );
      setShowEmitModal(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo emitir el comprobante');
    } finally {
      setSaving(false);
    }
  };

  const handleNc = async () => {
    if (!selectedFactura || !motivoNc.trim()) return;
    setSaving(true);
    try {
      const result = await crearNotaCreditoFiscal(selectedFactura.id, {
        motivo: motivoNc.trim(),
        usarCaeSimulado: true,
      });
      toast.success(`Nota de crédito ${result.numero} generada`);
      setShowNcModal(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo crear la NC');
    } finally {
      setSaving(false);
    }
  };

  const ivaPreview = selectedFactura ? calcularIva21(selectedFactura.total) : null;

  return (
    <Layout>
      <Header
        title="Comprobantes AFIP"
        subtitle="Emisión fiscal con CAE — integración ARCA pendiente (modo simulado disponible)"
      />

      <div className="p-6">
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-800 dark:bg-sky-900/20">
          <p className="text-sm text-sky-900 dark:text-sky-200">
            Los comprobantes con CAE quedan <strong>bloqueados</strong>. Para corregir errores usá{' '}
            <strong>Nota de Crédito</strong>, no edición directa. La cuenta corriente del cliente se
            impacta al emitir el comprobante fiscal.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { id: 'pendientes', label: `Pendientes (${pendientes.length})` },
            { id: 'emitidos', label: `Emitidos (${emitidos.length})` },
            { id: 'nc', label: `Notas de crédito (${notasCredito.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-sky-600 text-white dark:bg-indigo-600'
                  : 'bg-pastel-mist text-pastel-ink hover:bg-white dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={20} />
          <input
            type="text"
            placeholder="Buscar comprobantes..."
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
                  <th className="p-4 text-left">Interno</th>
                  <th className="p-4 text-left">Fiscal</th>
                  <th className="p-4 text-left">Cliente</th>
                  <th className="p-4 text-left">Remito</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((factura, index) => {
                  const cliente = clientes.find((c) => c.id === factura.clienteId);
                  return (
                    <motion.tr
                      key={factura.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="table-row"
                    >
                      <td className="p-4 font-mono text-sm">{factura.numero}</td>
                      <td className="p-4 font-mono text-amber-700 dark:text-amber-400">
                        {factura.cae ? etiquetaComprobante(factura) : '—'}
                      </td>
                      <td className="p-4">{cliente?.nombre || '-'}</td>
                      <td className="p-4 text-sm text-pastel-muted">
                        {factura.remitoNumero || '-'}
                      </td>
                      <td className="p-4 text-right font-semibold">
                        ${factura.total.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {factura.esNotaCredito ? (
                          <span className="badge-info">NC</span>
                        ) : factura.cae ? (
                          <span className="badge-success">CAE OK</span>
                        ) : (
                          <span className="badge-warning">Sin CAE</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {tab === 'pendientes' && (
                          <button
                            type="button"
                            onClick={() => openEmitir(factura)}
                            className="btn-primary inline-flex items-center gap-2 py-2 text-sm"
                          >
                            <Stamp size={16} />
                            Emitir CAE
                          </button>
                        )}
                        {tab === 'emitidos' && factura.estadoFiscal !== 'anulado' && (
                          <button
                            type="button"
                            onClick={() => openNc(factura)}
                            className="btn-secondary inline-flex items-center gap-2 py-2 text-sm text-red-600"
                          >
                            <FileWarning size={16} />
                            Nota de crédito
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-pastel-muted">
              {tab === 'pendientes' ? (
                <>
                  No hay facturas pendientes de emisión fiscal.{' '}
                  <Link to="/pedidos-a-facturar" className="text-sky-700 dark:text-indigo-400">
                    Facturar pedidos
                  </Link>
                </>
              ) : (
                'Sin registros en esta pestaña'
              )}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showEmitModal && selectedFactura && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowEmitModal(false)}
          >
            <motion.div
              className="modal-content max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <ShieldCheck className="text-sky-600" />
                  Emitir comprobante fiscal
                </h2>
                <button type="button" onClick={() => setShowEmitModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <p className="mb-4 text-sm text-pastel-muted">
                Factura interna <strong>{selectedFactura.numero}</strong> — $
                {selectedFactura.total.toLocaleString()}
                {selectedFactura.remitoNumero && (
                  <> — Remito {selectedFactura.remitoNumero}</>
                )}
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Tipo</label>
                    <select
                      value={tipoComprobante}
                      onChange={(e) => setTipoComprobante(e.target.value)}
                      className="select-field"
                    >
                      {TIPOS_COMPROBANTE.filter((t) => t.value.startsWith('F')).map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Punto de venta</label>
                    <input
                      type="number"
                      min={1}
                      value={puntoVenta}
                      onChange={(e) => setPuntoVenta(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                {ivaPreview && (
                  <div className="rounded-xl bg-pastel-mist/60 p-3 text-sm dark:bg-slate-800">
                    <p>Neto: ${ivaPreview.neto.toFixed(2)}</p>
                    <p>IVA 21%: ${ivaPreview.iva.toFixed(2)}</p>
                    <p className="font-semibold">Total: ${selectedFactura.total.toLocaleString()}</p>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={usarSimulado}
                    onChange={(e) => setUsarSimulado(e.target.checked)}
                  />
                  CAE simulado (desarrollo — sin WSAA/ARCA)
                </label>
                {!usarSimulado && (
                  <>
                    <div>
                      <label className="label">CAE (14 dígitos)</label>
                      <input
                        value={cae}
                        onChange={(e) => setCae(e.target.value)}
                        className="input-field font-mono"
                        placeholder="00000000000000"
                      />
                    </div>
                    <div>
                      <label className="label">Vencimiento CAE</label>
                      <input
                        type="date"
                        value={caeVencimiento}
                        onChange={(e) => setCaeVencimiento(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleEmitir}
                  disabled={saving}
                  className="btn-primary w-full"
                >
                  {saving ? 'Emitiendo...' : 'Confirmar emisión'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showNcModal && selectedFactura && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowNcModal(false)}
          >
            <motion.div
              className="modal-content max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Nota de crédito</h2>
                <button type="button" onClick={() => setShowNcModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <p className="mb-4 text-sm text-pastel-muted">
                Anula fiscalmente {etiquetaComprobante(selectedFactura)} y revierte la deuda en
                cuenta corriente si correspondía.
              </p>
              <div>
                <label className="label">Motivo</label>
                <textarea
                  value={motivoNc}
                  onChange={(e) => setMotivoNc(e.target.value)}
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
              <button
                type="button"
                onClick={handleNc}
                disabled={!motivoNc.trim() || saving}
                className="btn-primary mt-4 w-full bg-red-600 hover:bg-red-500"
              >
                {saving ? 'Generando NC...' : 'Emitir nota de crédito'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
