import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShieldCheck, FileWarning, X, Stamp } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  isApiEnabled,
  crearComprobanteBorrador,
  emitirComprobanteFiscal as emitirComprobanteApi,
} from '../../api/comprobantesApi';
import {
  TIPOS_COMPROBANTE,
  PUNTOS_VENTA_DEFAULT,
  calcularIva21,
  etiquetaComprobante,
} from '../../utils/comprobantesFiscales';

export default function ComprobantesFiscalPanel({ facturaPreseleccionada, onPreseleccionConsumida }) {
  const { facturas, clientes, tiposComprobante, emitirComprobanteFiscal, crearNotaCreditoFiscal } = useData();
  const { can } = usePermissions();
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

  const tiposComprobanteDisponibles = useMemo(() => {
    const desdeMaestro = (tiposComprobante || [])
      .filter((t) => t.activo !== false)
      .map((t) => ({
        value: t.codigo,
        label: t.nombre,
        letra: t.letra,
        afipCodigo: t.afipCodigo || null,
        mueveCtaCte: Boolean(t.mueveCtaCte),
      }));
    return desdeMaestro.length ? desdeMaestro : TIPOS_COMPROBANTE;
  }, [tiposComprobante]);

  const tipoSel = tiposComprobanteDisponibles.find((t) => t.value === tipoComprobante);
  const letra = tipoSel?.letra || 'B';

  const pendientes = useMemo(
    () => facturas.filter((f) => !f.cae && !f.esNotaCredito && f.estado !== 'pagada' && (f.saldoPendiente || 0) > 0),
    [facturas]
  );
  const emitidos = useMemo(
    () => facturas.filter((f) => f.cae && f.estadoFiscal === 'emitido' && !f.esNotaCredito)
      .sort((a, b) => new Date(b.fechaEmisionFiscal || b.fecha) - new Date(a.fechaEmisionFiscal || a.fecha)),
    [facturas]
  );
  const notasCredito = useMemo(
    () => facturas.filter((f) => f.esNotaCredito).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    [facturas]
  );

  const listaActiva = tab === 'pendientes' ? pendientes : tab === 'emitidos' ? emitidos : notasCredito;
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
    const primerFactura = tiposComprobanteDisponibles.find((t) => t.value?.startsWith('F')) || tiposComprobanteDisponibles[0] || TIPOS_COMPROBANTE[0];
    setTipoComprobante(primerFactura.value);
    setPuntoVenta(String(PUNTOS_VENTA_DEFAULT));
    setCae('');
    setCaeVencimiento('');
    setUsarSimulado(true);
    setShowEmitModal(true);
  };

  useEffect(() => {
    if (facturaPreseleccionada && !facturaPreseleccionada.cae) {
      setTab('pendientes');
      openEmitir(facturaPreseleccionada);
      onPreseleccionConsumida?.();
    }
  }, [facturaPreseleccionada]);

  const handleEmitir = async () => {
    if (!selectedFactura) return;
    setSaving(true);
    try {
      // Datos de emisión: por defecto los del formulario (modo local/simulado).
      let caeFinal = usarSimulado ? undefined : cae;
      let caeVencimientoFinal = caeVencimiento || undefined;
      let usarSimuladoFinal = usarSimulado;
      let origen = usarSimulado ? 'simulado local' : 'CAE manual';

      // Si el backend está disponible, emitimos contra ARCA (WSFE) y usamos
      // el CAE real devuelto para persistirlo en Firestore.
      if (isApiEnabled()) {
        const payloadItems = selectedFactura.items.map((item) => ({
          producto_id: item.productoId,
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario,
          subtotal: item.subtotal,
          nombre: item.nombre,
        }));
        const borrador = await crearComprobanteBorrador({
          cliente_id: selectedFactura.clienteId,
          pedido_id: selectedFactura.pedidoId || null,
          items: payloadItems,
        });
        const emitido = await emitirComprobanteApi(borrador.id, {
          tipo_comprobante: tipoComprobante,
          letra,
          punto_venta: Number(puntoVenta),
          usar_cae_simulado: usarSimulado,
        });
        if (emitido?.cae) {
          caeFinal = emitido.cae;
          caeVencimientoFinal = emitido.cae_vencimiento || caeVencimientoFinal;
          usarSimuladoFinal = false;
          origen = emitido.modo === 'simulated' ? 'backend simulado' : `ARCA (${emitido.modo})`;
        }
      }

      const result = await emitirComprobanteFiscal(selectedFactura.id, {
        tipoComprobante,
        letra,
        tipoComprobanteNombre: tipoSel?.label || tipoComprobante,
        afipCodigo: tipoSel?.afipCodigo || null,
        puntoVenta: Number(puntoVenta),
        cae: caeFinal,
        caeVencimiento: caeVencimientoFinal,
        usarCaeSimulado: usarSimuladoFinal,
      });
      toast.success(`Comprobante emitido — CAE ${result.cae} (${origen})`);
      setShowEmitModal(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo emitir');
    } finally {
      setSaving(false);
    }
  };

  const handleNc = async () => {
    if (!selectedFactura || !motivoNc.trim()) return;
    setSaving(true);
    try {
      const result = await crearNotaCreditoFiscal(selectedFactura.id, { motivo: motivoNc.trim(), usarCaeSimulado: true });
      toast.success(`NC ${result.numero} generada`);
      setShowNcModal(false);
    } catch (error) {
      toast.error(error.message || 'Error al crear NC');
    } finally {
      setSaving(false);
    }
  };

  const ivaPreview = selectedFactura ? calcularIva21(selectedFactura.total) : null;

  return (
    <>
      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-800 dark:bg-sky-900/20">
        <p className="text-sm text-sky-900 dark:text-sky-200">
          Los comprobantes con CAE quedan bloqueados. Para corregir errores usá Nota de Crédito.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: 'pendientes', label: `Pendientes (${pendientes.length})` },
          { id: 'emitidos', label: `Emitidos (${emitidos.length})` },
          { id: 'nc', label: `NC (${notasCredito.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === t.id ? 'bg-sky-600 text-white dark:bg-indigo-600' : 'bg-pastel-mist dark:bg-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={20} />
        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="p-4 text-left">Interno</th>
              <th className="p-4 text-left">Fiscal</th>
              <th className="p-4 text-left">Cliente</th>
              <th className="p-4 text-right">Total</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((factura, index) => {
              const cliente = clientes.find((c) => c.id === factura.clienteId);
              return (
                <motion.tr key={factura.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.02 }} className="table-row">
                  <td className="p-4 font-mono text-sm">{factura.numero}</td>
                  <td className="p-4 font-mono text-amber-700">{factura.cae ? etiquetaComprobante(factura) : '—'}</td>
                  <td className="p-4">{cliente?.nombre || '-'}</td>
                  <td className="p-4 text-right font-semibold">${factura.total.toLocaleString()}</td>
                  <td className="p-4 text-right">
                    {tab === 'pendientes' && can('invoices:fiscal') && (
                      <button type="button" onClick={() => openEmitir(factura)} className="btn-primary inline-flex items-center gap-2 py-2 text-sm">
                        <Stamp size={16} /> Emitir CAE
                      </button>
                    )}
                    {tab === 'emitidos' && can('invoices:fiscal') && (
                      <button type="button" onClick={() => { setSelectedFactura(factura); setMotivoNc(''); setShowNcModal(true); }} className="btn-secondary inline-flex items-center gap-2 py-2 text-sm text-red-600">
                        <FileWarning size={16} /> NC
                      </button>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-12 text-center text-pastel-muted">Sin registros</p>}
      </div>

      <AnimatePresence>
        {showEmitModal && selectedFactura && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowEmitModal(false)}>
            <motion.div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="text-sky-600" /> Emitir CAE</h2>
                <button type="button" onClick={() => setShowEmitModal(false)}><X size={20} /></button>
              </div>
              <p className="mb-4 text-sm">Factura {selectedFactura.numero} — ${selectedFactura.total.toLocaleString()}</p>
              <div className="grid grid-cols-2 gap-4">
                <select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value)} className="select-field">
                  {tiposComprobanteDisponibles.filter((t) => t.value?.startsWith('F')).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input type="number" min={1} value={puntoVenta} onChange={(e) => setPuntoVenta(e.target.value)} className="input-field" placeholder="Punto venta" />
              </div>
              {ivaPreview && (
                <div className="mt-4 rounded-xl bg-pastel-mist/60 p-3 text-sm dark:bg-slate-800">
                  <p>Neto: ${ivaPreview.neto.toFixed(2)} | IVA 21%: ${ivaPreview.iva.toFixed(2)}</p>
                </div>
              )}
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={usarSimulado} onChange={(e) => setUsarSimulado(e.target.checked)} />
                CAE simulado (desarrollo)
              </label>
              <button type="button" onClick={handleEmitir} disabled={saving} className="btn-primary mt-4 w-full">
                {saving ? 'Emitiendo...' : 'Confirmar emisión'}
              </button>
            </motion.div>
          </motion.div>
        )}
        {showNcModal && selectedFactura && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowNcModal(false)}>
            <motion.div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-4 text-xl font-bold">Nota de crédito</h2>
              <textarea value={motivoNc} onChange={(e) => setMotivoNc(e.target.value)} rows={3} className="input-field resize-none" placeholder="Motivo" />
              <button type="button" onClick={handleNc} disabled={!motivoNc.trim() || saving} className="btn-primary mt-4 w-full bg-red-600">
                {saving ? 'Generando...' : 'Emitir NC'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
