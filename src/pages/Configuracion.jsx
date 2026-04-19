import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Database, Palette, Bell, Shield } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';

export default function Configuracion() {
  const [settings, setSettings] = useState({
    nombreEmpresa: 'Mi Empresa',
    moneda: 'ARS',
    iva: '21',
    notificacionesStock: true,
    notificacionesVencimiento: true,
    backupAutomatico: false
  });

  const handleSave = () => {
    localStorage.setItem('crowgest_settings', JSON.stringify(settings));
    alert('Configuración guardada correctamente');
  };

  const handleResetData = () => {
    if (confirm('¿Estás seguro de que deseas eliminar todos los datos? Esta acción no se puede deshacer.')) {
      localStorage.removeItem('crowgest_data');
      window.location.reload();
    }
  };

  return (
    <Layout>
      <Header title="Configuración" subtitle="Ajustes del sistema" />

      <div className="max-w-4xl p-6">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-edge-light bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-lg bg-sky-100 p-2 dark:bg-indigo-500/20">
                <Palette size={20} className="text-sky-700 dark:text-indigo-300" />
              </div>
              <h3 className="text-lg font-semibold text-pastel-ink dark:text-slate-100">General</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-pastel-muted dark:text-slate-300">Nombre de la Empresa</label>
                <input
                  type="text"
                  value={settings.nombreEmpresa}
                  onChange={(e) => setSettings({ ...settings, nombreEmpresa: e.target.value })}
                  className="w-full rounded-xl border border-edge-light bg-white/75 px-4 py-2.5 text-pastel-ink placeholder:text-pastel-muted focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-pastel-muted dark:text-slate-300">Moneda</label>
                <select
                  value={settings.moneda}
                  onChange={(e) => setSettings({ ...settings, moneda: e.target.value })}
                  className="w-full rounded-xl border border-edge-light bg-white/75 px-4 py-2.5 text-pastel-ink focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="MXN">MXN - Peso Mexicano</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-pastel-muted dark:text-slate-300">IVA (%)</label>
                <input
                  type="number"
                  value={settings.iva}
                  onChange={(e) => setSettings({ ...settings, iva: e.target.value })}
                  className="w-full rounded-xl border border-edge-light bg-white/75 px-4 py-2.5 text-pastel-ink placeholder:text-pastel-muted focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-edge-light bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-500/20">
                <Bell size={20} className="text-amber-600 dark:text-amber-300" />
              </div>
              <h3 className="text-lg font-semibold text-pastel-ink dark:text-slate-100">Notificaciones</h3>
            </div>

            <div className="space-y-4">
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-edge-light bg-white/70 p-4 transition-colors hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                <div>
                  <p className="font-medium text-pastel-ink dark:text-slate-100">Alertas de stock bajo</p>
                  <p className="text-sm text-pastel-muted dark:text-slate-400">Recibir notificaciones cuando un producto esté bajo en stock</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificacionesStock}
                  onChange={(e) => setSettings({ ...settings, notificacionesStock: e.target.checked })}
                  className="h-5 w-5 rounded border-edge-light text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-edge-light bg-white/70 p-4 transition-colors hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                <div>
                  <p className="font-medium text-pastel-ink dark:text-slate-100">Alertas de vencimiento</p>
                  <p className="text-sm text-pastel-muted dark:text-slate-400">Recibir notificaciones de facturas próximas a vencer</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificacionesVencimiento}
                  onChange={(e) => setSettings({ ...settings, notificacionesVencimiento: e.target.checked })}
                  className="h-5 w-5 rounded border-edge-light text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"
                />
              </label>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-edge-light bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-500/20">
                <Database size={20} className="text-emerald-600 dark:text-emerald-300" />
              </div>
              <h3 className="text-lg font-semibold text-pastel-ink dark:text-slate-100">Datos</h3>
            </div>

            <div className="space-y-4">
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-edge-light bg-white/70 p-4 transition-colors hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                <div>
                  <p className="font-medium text-pastel-ink dark:text-slate-100">Backup automático</p>
                  <p className="text-sm text-pastel-muted dark:text-slate-400">Los datos se guardan automáticamente en el navegador</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.backupAutomatico}
                  onChange={(e) => setSettings({ ...settings, backupAutomatico: e.target.checked })}
                  className="h-5 w-5 rounded border-edge-light text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"
                />
              </label>

              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Shield size={20} className="mt-0.5 text-red-500 dark:text-red-300" />
                  <div className="flex-1">
                    <p className="font-medium text-red-600 dark:text-red-300">Zona de peligro</p>
                    <p className="mb-3 text-sm text-pastel-muted dark:text-slate-300">Esta acción eliminará todos los datos del sistema</p>
                    <button
                      onClick={handleResetData}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
                    >
                      <RefreshCw size={16} />
                      Resetear todos los datos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-end"
          >
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 font-medium text-white transition hover:bg-sky-500 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              <Save size={20} />
              Guardar Configuración
            </button>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
