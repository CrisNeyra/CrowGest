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
    <Layout moduleClass="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <Header title="Configuración" subtitle="Ajustes del sistema" />

      <div className="p-6 max-w-4xl">
        <div className="space-y-6">
          {/* General Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <Palette size={20} className="text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">General</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Nombre de la Empresa</label>
                <input
                  type="text"
                  value={settings.nombreEmpresa}
                  onChange={(e) => setSettings({ ...settings, nombreEmpresa: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Moneda</label>
                <select
                  value={settings.moneda}
                  onChange={(e) => setSettings({ ...settings, moneda: e.target.value })}
                  className="select-field"
                >
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="MXN">MXN - Peso Mexicano</option>
                </select>
              </div>
              <div>
                <label className="label">IVA (%)</label>
                <input
                  type="number"
                  value={settings.iva}
                  onChange={(e) => setSettings({ ...settings, iva: e.target.value })}
                  className="input-field"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Bell size={20} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Notificaciones</h3>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
                <div>
                  <p className="text-white font-medium">Alertas de stock bajo</p>
                  <p className="text-zinc-500 text-sm">Recibir notificaciones cuando un producto esté bajo en stock</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificacionesStock}
                  onChange={(e) => setSettings({ ...settings, notificacionesStock: e.target.checked })}
                  className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-indigo-500 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
                <div>
                  <p className="text-white font-medium">Alertas de vencimiento</p>
                  <p className="text-zinc-500 text-sm">Recibir notificaciones de facturas próximas a vencer</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificacionesVencimiento}
                  onChange={(e) => setSettings({ ...settings, notificacionesVencimiento: e.target.checked })}
                  className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-indigo-500 focus:ring-indigo-500"
                />
              </label>
            </div>
          </motion.div>

          {/* Data Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Database size={20} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Datos</h3>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
                <div>
                  <p className="text-white font-medium">Backup automático</p>
                  <p className="text-zinc-500 text-sm">Los datos se guardan automáticamente en el navegador</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.backupAutomatico}
                  onChange={(e) => setSettings({ ...settings, backupAutomatico: e.target.checked })}
                  className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-indigo-500 focus:ring-indigo-500"
                />
              </label>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 font-medium">Zona de peligro</p>
                    <p className="text-zinc-500 text-sm mb-3">Esta acción eliminará todos los datos del sistema</p>
                    <button
                      onClick={handleResetData}
                      className="btn-danger text-sm"
                    >
                      <RefreshCw size={16} />
                      Resetear todos los datos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-end"
          >
            <button onClick={handleSave} className="btn-primary">
              <Save size={20} />
              Guardar Configuración
            </button>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
