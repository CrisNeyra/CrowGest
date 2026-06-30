import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgePercent,
  CheckCircle,
  Edit,
  FileText,
  Plus,
  Search,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import PageShell from '../components/ui/PageShell';
import { useData } from '../context/DataContext';
import { useConfirm } from '../components/ui/ConfirmDialog';
import {
  BONIFICACION_APLICA_A,
  BONIFICACION_TIPOS,
  formatBonificacion,
  formatPorcentaje,
  LETRAS_COMPROBANTE,
  MAESTROS,
  normalizeMaestroForm,
} from '../utils/maestros';

const iconByTab = {
  vendedores: UserRound,
  condiciones: WalletCards,
  tipos: FileText,
  bonificaciones: BadgePercent,
};

export default function Maestros() {
  const data = useData();
  const confirm = useConfirm();
  const [tab, setTab] = useState('vendedores');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(MAESTROS.vendedores.emptyForm);

  const config = MAESTROS[tab];
  const Icon = iconByTab[tab];
  const items = data[config.dataKey] || [];

  const actions = {
    vendedores: {
      add: data.addVendedor,
      update: data.updateVendedor,
      delete: data.deleteVendedor,
    },
    condiciones: {
      add: data.addCondicionVenta,
      update: data.updateCondicionVenta,
      delete: data.deleteCondicionVenta,
    },
    tipos: {
      add: data.addTipoComprobante,
      update: data.updateTipoComprobante,
      delete: data.deleteTipoComprobante,
    },
    bonificaciones: {
      add: data.addBonificacion,
      update: data.updateBonificacion,
      delete: data.deleteBonificacion,
    },
  };

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return items.filter((item) =>
      config.searchFields.some((field) =>
        String(item[field] || '').toLowerCase().includes(term)
      )
    );
  }, [items, config.searchFields, searchTerm]);

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setSearchTerm('');
    setEditingItem(null);
    setFormData(MAESTROS[nextTab].emptyForm);
    setShowModal(false);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData(config.emptyForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...config.emptyForm, ...item });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = normalizeMaestroForm(tab, formData);

    try {
      if (editingItem) {
        await actions[tab].update(editingItem.id, payload);
        toast.success(`${config.singular} actualizado`);
      } else {
        await actions[tab].add(payload);
        toast.success(`${config.singular} creado`);
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData(config.emptyForm);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo guardar');
    }
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: `Eliminar ${config.singular.toLowerCase()}`,
      message: `¿Seguro que querés eliminar ${config.singular.toLowerCase()}?`,
      danger: true,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await actions[tab].delete(item.id);
      toast.success('Registro eliminado');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo eliminar');
    }
  };

  const toggleActivo = async (item) => {
    try {
      await actions[tab].update(item.id, { activo: item.activo === false });
      toast.success(item.activo === false ? 'Registro activado' : 'Registro desactivado');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo actualizar');
    }
  };

  const cargarDefaults = async () => {
    if (!config.defaults?.length) return;
    try {
      for (const item of config.defaults) {
        await actions[tab].add(item);
      }
      toast.success('Defaults cargados');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudieron cargar los defaults');
    }
  };

  return (
    <PageShell title="Vendedores">
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(MAESTROS).map(([key, maestro]) => {
            const TabIcon = iconByTab[key];
            const total = (data[maestro.dataKey] || []).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => changeTab(key)}
                className={`rounded-2xl border p-4 text-left transition ${
                  tab === key
                    ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-100'
                    : 'border-edge-light bg-white/70 text-pastel-ink hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                    <TabIcon size={20} />
                  </span>
                  <span className="font-semibold">{maestro.label}</span>
                </div>
                <p className="text-xs text-pastel-muted dark:text-slate-400">
                  {total} registro{total === 1 ? '' : 's'}
                </p>
              </button>
            );
          })}
        </section>

        <section className="card">
          <div className="mb-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-100 p-3 text-sky-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                <Icon size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-pastel-ink dark:text-slate-100">
                  {config.label}
                </h2>
                <p className="text-sm text-pastel-muted dark:text-slate-400">
                  Alta, edición, activación y baja de {config.label.toLowerCase()}.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {items.length === 0 && config.defaults?.length > 0 && (
                <button type="button" onClick={cargarDefaults} className="btn-secondary">
                  <CheckCircle size={18} />
                  Cargar defaults
                </button>
              )}
              <button type="button" onClick={openCreate} className="btn-primary">
                <Plus size={18} />
                Nuevo
              </button>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500"
              size={20}
            />
            <input
              type="text"
              placeholder={`Buscar ${config.label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`card-hover ${item.activo === false ? 'opacity-70' : ''}`}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <MaestroCardHeader tab={tab} item={item} />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-lg p-2 text-pastel-muted transition-colors hover:bg-pastel-mist hover:text-pastel-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="rounded-lg p-2 text-pastel-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <MaestroDetails tab={tab} item={item} />

              <div className="mt-4 border-t border-edge-light pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => toggleActivo(item)}
                  className={item.activo === false ? 'badge-danger' : 'badge-success'}
                >
                  {item.activo === false ? 'Inactivo' : 'Activo'}
                </button>
              </div>
            </motion.div>
          ))}
        </section>

        {filteredItems.length === 0 && (
          <div className="card py-12 text-center">
            <Icon size={48} className="mx-auto mb-4 text-pastel-muted/40 dark:text-slate-700" />
            <p className="text-pastel-muted dark:text-slate-500">No hay registros para mostrar</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-h-[90vh] max-w-xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-pastel-ink dark:text-slate-100">
                  {editingItem ? `Editar ${config.singular}` : `Nuevo ${config.singular}`}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-2 text-pastel-muted transition-colors hover:bg-pastel-mist hover:text-pastel-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <MaestroForm tab={tab} formData={formData} setFormData={setFormData} />
                <label className="flex items-center gap-2 text-sm text-pastel-muted dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={formData.activo !== false}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  />
                  Activo
                </label>
                <button type="submit" className="btn-primary w-full">
                  {editingItem ? 'Guardar cambios' : 'Crear registro'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function MaestroCardHeader({ tab, item }) {
  if (tab === 'vendedores') {
    return (
      <div>
        <h3 className="font-semibold text-pastel-ink dark:text-slate-100">{item.nombre}</h3>
        <p className="text-xs text-pastel-muted">{item.email || 'Sin email'}</p>
      </div>
    );
  }

  if (tab === 'tipos') {
    return (
      <div>
        <h3 className="font-semibold text-pastel-ink dark:text-slate-100">
          {item.codigo} - {item.nombre}
        </h3>
        <p className="text-xs text-pastel-muted">Letra {item.letra} · AFIP {item.afipCodigo || '-'}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-pastel-ink dark:text-slate-100">{item.nombre}</h3>
      <p className="text-xs text-pastel-muted">
        {tab === 'condiciones' ? `${item.diasPago || 0} días` : formatBonificacion(item)}
      </p>
    </div>
  );
}

function MaestroDetails({ tab, item }) {
  if (tab === 'vendedores') {
    return (
      <div className="space-y-2 text-sm text-pastel-muted dark:text-slate-400">
        <p>Teléfono: {item.telefono || '-'}</p>
        <p>Comisión: {formatPorcentaje(item.comisionPorcentaje)}</p>
      </div>
    );
  }

  if (tab === 'condiciones') {
    return (
      <div className="space-y-2 text-sm text-pastel-muted dark:text-slate-400">
        <p>Plazo de pago: {item.diasPago || 0} días</p>
        <p>Descuento: {formatPorcentaje(item.descuentoPorcentaje)}</p>
        <p>Recargo: {formatPorcentaje(item.recargoPorcentaje)}</p>
      </div>
    );
  }

  if (tab === 'tipos') {
    return (
      <div className="space-y-2 text-sm text-pastel-muted dark:text-slate-400">
        <p>Mueve stock: {item.mueveStock ? 'Sí' : 'No'}</p>
        <p>Mueve cta. cte.: {item.mueveCtaCte ? 'Sí' : 'No'}</p>
      </div>
    );
  }

  const aplica =
    BONIFICACION_APLICA_A.find((opt) => opt.value === item.aplicaA)?.label || item.aplicaA;
  const tipo = BONIFICACION_TIPOS.find((opt) => opt.value === item.tipo)?.label || item.tipo;

  return (
    <div className="space-y-2 text-sm text-pastel-muted dark:text-slate-400">
      <p>Tipo: {tipo}</p>
      <p>Valor: {formatBonificacion(item)}</p>
      <p>Aplica a: {aplica}</p>
    </div>
  );
}

function MaestroForm({ tab, formData, setFormData }) {
  if (tab === 'vendedores') {
    return (
      <>
        <TextField label="Nombre" value={formData.nombre} onChange={(value) => setFormData({ ...formData, nombre: value })} required />
        <TextField label="Email" type="email" value={formData.email} onChange={(value) => setFormData({ ...formData, email: value })} />
        <TextField label="Teléfono" value={formData.telefono} onChange={(value) => setFormData({ ...formData, telefono: value })} />
        <TextField label="Comisión %" type="number" value={formData.comisionPorcentaje} onChange={(value) => setFormData({ ...formData, comisionPorcentaje: value })} min="0" step="0.01" />
      </>
    );
  }

  if (tab === 'condiciones') {
    return (
      <>
        <TextField label="Nombre" value={formData.nombre} onChange={(value) => setFormData({ ...formData, nombre: value })} required />
        <TextField label="Días de pago" type="number" value={formData.diasPago} onChange={(value) => setFormData({ ...formData, diasPago: value })} min="0" />
        <TextField label="Descuento %" type="number" value={formData.descuentoPorcentaje} onChange={(value) => setFormData({ ...formData, descuentoPorcentaje: value })} min="0" step="0.01" />
        <TextField label="Recargo %" type="number" value={formData.recargoPorcentaje} onChange={(value) => setFormData({ ...formData, recargoPorcentaje: value })} min="0" step="0.01" />
      </>
    );
  }

  if (tab === 'tipos') {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Código" value={formData.codigo} onChange={(value) => setFormData({ ...formData, codigo: value })} required />
          <div>
            <label className="label">Letra</label>
            <select
              value={formData.letra}
              onChange={(e) => setFormData({ ...formData, letra: e.target.value })}
              className="select-field"
            >
              {LETRAS_COMPROBANTE.map((letra) => (
                <option key={letra} value={letra}>
                  {letra}
                </option>
              ))}
            </select>
          </div>
        </div>
        <TextField label="Nombre" value={formData.nombre} onChange={(value) => setFormData({ ...formData, nombre: value })} required />
        <TextField label="Código AFIP" value={formData.afipCodigo} onChange={(value) => setFormData({ ...formData, afipCodigo: value })} />
        <label className="flex items-center gap-2 text-sm text-pastel-muted dark:text-slate-400">
          <input
            type="checkbox"
            checked={Boolean(formData.mueveStock)}
            onChange={(e) => setFormData({ ...formData, mueveStock: e.target.checked })}
          />
          Mueve stock
        </label>
        <label className="flex items-center gap-2 text-sm text-pastel-muted dark:text-slate-400">
          <input
            type="checkbox"
            checked={Boolean(formData.mueveCtaCte)}
            onChange={(e) => setFormData({ ...formData, mueveCtaCte: e.target.checked })}
          />
          Mueve cuenta corriente
        </label>
      </>
    );
  }

  return (
    <>
      <TextField label="Nombre" value={formData.nombre} onChange={(value) => setFormData({ ...formData, nombre: value })} required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Tipo</label>
          <select
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            className="select-field"
          >
            {BONIFICACION_TIPOS.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
        </div>
        <TextField label="Valor" type="number" value={formData.valor} onChange={(value) => setFormData({ ...formData, valor: value })} min="0" step="0.01" />
      </div>
      <div>
        <label className="label">Aplica a</label>
        <select
          value={formData.aplicaA}
          onChange={(e) => setFormData({ ...formData, aplicaA: e.target.value })}
          className="select-field"
        >
          {BONIFICACION_APLICA_A.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function TextField({ label, value, onChange, type = 'text', ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
        {...props}
      />
    </div>
  );
}
