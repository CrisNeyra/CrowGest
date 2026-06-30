import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import {
  FORMAS_PAGO,
  SUCURSALES_DEFAULT,
  TIPOS_COMPROBANTE,
  calcularTotalesFactura,
  itemsPedidoALineas,
  lineaVacia,
} from '../../utils/comprobantesFiscales';

const IIBB_PCT_DEFAULT = 3;

function buildInitialState(initialData) {
  const data = initialData ?? {};
  return {
    tipoComprobante: data.tipoComprobante || 'FB',
    clienteId: data.clienteId || '',
    sucursal: data.sucursal || 'Central',
    formaPago: data.formaPago || 'cuenta_corriente',
    transporte: data.transporte || '',
    pedidoId: data.pedidoId || '',
    remitoId: data.remitoId || '',
    condicionVentaId: data.condicionVentaId || '',
    observaciones: data.observaciones || '',
    descuentoGlobalPct: data.descuentoGlobalPct || 0,
    iibbPct: data.iibbPct ?? IIBB_PCT_DEFAULT,
    lineas: data.lineas?.length ? data.lineas : [lineaVacia()],
  };
}

export default function NuevaFacturaModal({ isOpen, onClose, initialData, onSuccess }) {
  const {
    clientes,
    productos,
    pedidos,
    remitos,
    tiposComprobante,
    condicionesVenta,
    crearFacturaDesdeFormulario,
  } = useData();

  const [form, setForm] = useState(buildInitialState());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(initialData));
    }
  }, [isOpen, initialData]);

  const tiposDisponibles = useMemo(() => {
    const desdeMaestro = (tiposComprobante || [])
      .filter((t) => t.activo !== false && String(t.codigo || '').startsWith('F'))
      .map((t) => ({ value: t.codigo, label: t.nombre, letra: t.letra }));
    return desdeMaestro.length ? desdeMaestro : TIPOS_COMPROBANTE.filter((t) => t.value.startsWith('F'));
  }, [tiposComprobante]);

  const tipoSel = tiposDisponibles.find((t) => t.value === form.tipoComprobante);

  const pedidosDisponibles = useMemo(
    () => pedidos.filter((p) => p.estado === 'authorized'),
    [pedidos]
  );

  const remitosCliente = useMemo(() => {
    if (!form.clienteId) return remitos.filter((r) => !r.anulado);
    return remitos.filter((r) => r.clienteId === form.clienteId && !r.anulado);
  }, [remitos, form.clienteId]);

  const totales = useMemo(
    () =>
      calcularTotalesFactura(form.lineas, {
        iibbPct: form.iibbPct,
        descuentoGlobalPct: form.descuentoGlobalPct,
      }),
    [form.lineas, form.iibbPct, form.descuentoGlobalPct]
  );

  const updateLinea = (index, field, value) => {
    setForm((prev) => {
      const lineas = [...prev.lineas];
      lineas[index] = { ...lineas[index], [field]: value };
      return { ...prev, lineas };
    });
  };

  const seleccionarProducto = (index, productoId) => {
    const prod = productos.find((p) => p.id === productoId);
    if (!prod) return;
    setForm((prev) => {
      const lineas = [...prev.lineas];
      lineas[index] = {
        ...lineas[index],
        productoId: prod.id,
        codigo: prod.codigo || prod.id.slice(0, 8),
        descripcion: prod.nombre,
        netoUnitario: prod.precioNeto ?? prod.precio ?? 0,
        alicuotaIva: prod.alicuotaIva ?? 21,
      };
      return { ...prev, lineas };
    });
  };

  const handlePedidoChange = (pedidoId) => {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido) {
      setForm((prev) => ({ ...prev, pedidoId: '', lineas: [lineaVacia()] }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      pedidoId,
      clienteId: pedido.clienteId,
      remitoId: pedido.remitoId || prev.remitoId,
      observaciones: pedido.observaciones || '',
      lineas: itemsPedidoALineas(pedido.items, productos),
    }));
  };

  const handleRemitoChange = (remitoId) => {
    const remito = remitos.find((r) => r.id === remitoId);
    setForm((prev) => ({
      ...prev,
      remitoId,
      clienteId: remito?.clienteId || prev.clienteId,
      pedidoId: remito?.pedidoId || prev.pedidoId,
      lineas: remito?.items?.length
        ? itemsPedidoALineas(remito.items, productos)
        : prev.lineas,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clienteId) {
      toast.error('Seleccioná un cliente');
      return;
    }
    if (!totales.lineas.some((l) => l.cantidad > 0 && l.netoUnitario > 0)) {
      toast.error('Agregá al menos un ítem con importe');
      return;
    }

    const condicion = (condicionesVenta || []).find((c) => c.id === form.condicionVentaId);
    setSaving(true);
    try {
      const result = await crearFacturaDesdeFormulario({
        ...form,
        lineas: totales.lineas,
        netoGravado: totales.netoGravado,
        iva105: totales.iva105,
        iva21: totales.iva21,
        iibb: totales.iibb,
        descuentoGlobal: totales.descuentoGlobal,
        total: totales.total,
        letra: tipoSel?.letra || 'B',
        tipoComprobanteNombre: tipoSel?.label || form.tipoComprobante,
        condicionVentaNombre: condicion?.nombre,
        condicionVentaDiasPago: condicion?.diasPago ?? 0,
      });
      toast.success(`Factura ${result.numero} creada correctamente`);
      onSuccess?.(result);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo crear la factura');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          className="modal-content max-h-[92vh] max-w-5xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-pastel-ink dark:text-slate-100">Nueva Factura</h2>
              <p className="text-sm text-pastel-muted dark:text-slate-400">
                Comprobante comercial — emisión fiscal en pestaña AFIP
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-pastel-mist dark:hover:bg-slate-800">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="label">Tipo de factura</label>
                <select
                  value={form.tipoComprobante}
                  onChange={(e) => setForm((p) => ({ ...p, tipoComprobante: e.target.value }))}
                  className="select-field"
                >
                  {tiposDisponibles.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Cliente</label>
                <select
                  value={form.clienteId}
                  onChange={(e) => setForm((p) => ({ ...p, clienteId: e.target.value }))}
                  className="select-field"
                  required
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Sucursal</label>
                <select
                  value={form.sucursal}
                  onChange={(e) => setForm((p) => ({ ...p, sucursal: e.target.value }))}
                  className="select-field"
                >
                  {SUCURSALES_DEFAULT.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Forma de pago</label>
                <select
                  value={form.formaPago}
                  onChange={(e) => setForm((p) => ({ ...p, formaPago: e.target.value }))}
                  className="select-field"
                >
                  {FORMAS_PAGO.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Transporte</label>
                <input
                  value={form.transporte}
                  onChange={(e) => setForm((p) => ({ ...p, transporte: e.target.value }))}
                  className="input-field"
                  placeholder="Ej: OCA, Andreani, retira cliente"
                />
              </div>
              <div>
                <label className="label">Condición de venta</label>
                <select
                  value={form.condicionVentaId || ''}
                  onChange={(e) => setForm((p) => ({ ...p, condicionVentaId: e.target.value }))}
                  className="select-field"
                >
                  <option value="">Sin condición</option>
                  {(condicionesVenta || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Pedido</label>
                <select
                  value={form.pedidoId}
                  onChange={(e) => handlePedidoChange(e.target.value)}
                  className="select-field"
                >
                  <option value="">Sin pedido vinculado</option>
                  {pedidosDisponibles.map((p) => (
                    <option key={p.id} value={p.id}>{p.numero} — ${p.total?.toLocaleString('es-AR')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Remito</label>
                <select
                  value={form.remitoId}
                  onChange={(e) => handleRemitoChange(e.target.value)}
                  className="select-field"
                >
                  <option value="">Sin remito vinculado</option>
                  {remitosCliente.map((r) => (
                    <option key={r.id} value={r.id}>{r.numero}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-edge-light dark:border-slate-700">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="p-2 text-left">Código</th>
                    <th className="p-2 text-left">Descripción</th>
                    <th className="p-2 text-right">Cant.</th>
                    <th className="p-2 text-right">Neto unit.</th>
                    <th className="p-2 text-right">IVA %</th>
                    <th className="p-2 text-right">Desc. %</th>
                    <th className="p-2 text-right">Total línea</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {form.lineas.map((linea, index) => {
                    const calc = totales.lineas[index];
                    return (
                      <tr key={index} className="border-t border-edge-light dark:border-slate-800">
                        <td className="p-2">
                          <select
                            value={linea.productoId}
                            onChange={(e) => seleccionarProducto(index, e.target.value)}
                            className="select-field py-1.5 text-xs"
                          >
                            <option value="">Manual</option>
                            {productos.map((p) => (
                              <option key={p.id} value={p.id}>{p.codigo || p.nombre?.slice(0, 12)}</option>
                            ))}
                          </select>
                          <input
                            value={linea.codigo}
                            onChange={(e) => updateLinea(index, 'codigo', e.target.value)}
                            className="input-field mt-1 py-1 text-xs"
                            placeholder="Código"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={linea.descripcion}
                            onChange={(e) => updateLinea(index, 'descripcion', e.target.value)}
                            className="input-field py-1.5"
                            placeholder="Descripción"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={linea.cantidad}
                            onChange={(e) => updateLinea(index, 'cantidad', e.target.value)}
                            className="input-field py-1.5 text-right"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linea.netoUnitario}
                            onChange={(e) => updateLinea(index, 'netoUnitario', e.target.value)}
                            className="input-field py-1.5 text-right"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={linea.alicuotaIva}
                            onChange={(e) => updateLinea(index, 'alicuotaIva', Number(e.target.value))}
                            className="select-field py-1.5"
                          >
                            <option value={21}>21%</option>
                            <option value={10.5}>10,5%</option>
                            <option value={0}>0%</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={linea.descuentoPct}
                            onChange={(e) => updateLinea(index, 'descuentoPct', e.target.value)}
                            className="input-field py-1.5 text-right"
                          />
                        </td>
                        <td className="p-2 text-right font-medium">
                          ${(calc?.totalLinea || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                lineas: p.lineas.filter((_, i) => i !== index),
                              }))
                            }
                            className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            disabled={form.lineas.length <= 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, lineas: [...p.lineas, lineaVacia()] }))}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> Agregar línea
            </button>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="label">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
              <div className="rounded-xl bg-pastel-mist/70 p-4 dark:bg-slate-800/80">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Neto gravado</span>
                    <span>${totales.netoGravado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA 10,5%</span>
                    <span>${totales.iva105.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA 21%</span>
                    <span>${totales.iva21.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Ingresos brutos ({form.iibbPct}%)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.iibbPct}
                      onChange={(e) => setForm((p) => ({ ...p, iibbPct: e.target.value }))}
                      className="input-field w-20 py-1 text-right text-xs"
                    />
                  </div>
                  <div className="flex justify-between text-amber-700 dark:text-amber-400">
                    <span>IIBB calculado</span>
                    <span>${totales.iibb.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Descuento global (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.descuentoGlobalPct}
                      onChange={(e) => setForm((p) => ({ ...p, descuentoGlobalPct: e.target.value }))}
                      className="input-field w-20 py-1 text-right text-xs"
                    />
                  </div>
                  <div className="flex justify-between border-t border-edge-light pt-2 text-base font-bold dark:border-slate-700">
                    <span>Total</span>
                    <span className="text-sky-700 dark:text-indigo-400">
                      ${totales.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : 'Confirmar factura'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
