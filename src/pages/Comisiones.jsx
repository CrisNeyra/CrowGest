import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Download, FileText, Search, TrendingUp, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import PageShell from '../components/ui/PageShell';
import { useData } from '../context/DataContext';
import {
  calcularComisionesPorVendedor,
  COMISION_MODOS,
  formatCurrency,
  getDetalleComisiones,
} from '../utils/comisiones';

const loadExportTools = async () => {
  const [{ jsPDF }, autoTableModule, XLSX] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('xlsx'),
  ]);
  return { jsPDF, autoTable: autoTableModule.default || autoTableModule.autoTable, XLSX };
};

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-';
}

export default function Comisiones() {
  const { vendedores, facturas, pagos, movimientosTesoreria } = useData();
  const [modo, setModo] = useState('facturado');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState('');

  const rows = useMemo(
    () =>
      calcularComisionesPorVendedor({
        vendedores,
        facturas,
        pagos,
        movimientosTesoreria,
        desde: dateFrom,
        hasta: dateTo,
        modo,
      }).filter((row) => row.vendedor.toLowerCase().includes(searchTerm.toLowerCase())),
    [vendedores, facturas, pagos, movimientosTesoreria, dateFrom, dateTo, modo, searchTerm]
  );

  const vendedorActivoId = selectedVendedor || rows[0]?.vendedorId || '';
  const vendedorActivo = rows.find((row) => row.vendedorId === vendedorActivoId);

  const detalle = useMemo(
    () =>
      vendedorActivoId
        ? getDetalleComisiones({
            vendedorId: vendedorActivoId,
            facturas,
            pagos,
            movimientosTesoreria,
            desde: dateFrom,
            hasta: dateTo,
            modo,
          })
        : [],
    [vendedorActivoId, facturas, pagos, movimientosTesoreria, dateFrom, dateTo, modo]
  );

  const totalBase = rows.reduce((acc, row) => acc + row.baseCalculo, 0);
  const totalComision = rows.reduce((acc, row) => acc + row.comision, 0);
  const totalOperaciones = rows.reduce((acc, row) => acc + row.operaciones, 0);

  const exportExcel = async () => {
    const { XLSX } = await loadExportTools();
    const ws = XLSX.utils.json_to_sheet(
      rows.map((row) => ({
        Vendedor: row.vendedor,
        'Comisión %': row.comisionPorcentaje,
        Operaciones: row.operaciones,
        'Base facturada': row.baseFacturada,
        'Base cobrada': row.baseCobrada,
        'Base acreditada': row.baseAcreditada,
        'Base sin acreditar': row.baseSinAcreditar,
        'Base productos': row.baseProductos,
        'Base cálculo': row.baseCalculo,
        Comisión: row.comision,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comisiones');
    XLSX.writeFile(wb, 'comisiones_vendedores.xlsx');
    toast.success('Excel exportado');
  };

  const exportPDF = async () => {
    const { jsPDF, autoTable } = await loadExportTools();
    const doc = new jsPDF();
    doc.text('Comisiones por Vendedor', 14, 15);
    autoTable(doc, {
      head: [['Vendedor', '%', 'Operaciones', 'Base cálculo', 'Comisión']],
      body: rows.map((row) => [
        row.vendedor,
        `${row.comisionPorcentaje}%`,
        row.operaciones,
        formatCurrency(row.baseCalculo),
        formatCurrency(row.comision),
      ]),
      startY: 24,
    });
    doc.save('comisiones_vendedores.pdf');
    toast.success('PDF exportado');
  };

  return (
    <PageShell title="Comisiones">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            title="Base de cálculo"
            value={formatCurrency(totalBase)}
            icon={Wallet}
            tone="neutral"
          />
          <KpiCard
            title="Comisión total"
            value={formatCurrency(totalComision)}
            icon={Award}
            tone="positive"
          />
          <KpiCard
            title="Operaciones"
            value={totalOperaciones.toLocaleString('es-AR')}
            icon={TrendingUp}
            tone="neutral"
          />
        </div>

        <section className="card">
          <div className="mb-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-semibold text-pastel-ink dark:text-slate-100">
                Filtros
              </h2>
              <p className="text-sm text-pastel-muted dark:text-slate-400">
                Calculá comisiones por ventas facturadas o por cobranzas realizadas.
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={exportPDF} disabled={!rows.length} className="btn-secondary">
                <FileText size={18} className="text-red-500" /> PDF
              </button>
              <button type="button" onClick={exportExcel} disabled={!rows.length} className="btn-secondary">
                <Download size={18} className="text-emerald-500" /> Excel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted"
                size={18}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar vendedor..."
                className="input-field pl-10"
              />
            </div>
            <select value={modo} onChange={(e) => setModo(e.target.value)} className="select-field">
              {COMISION_MODOS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="card overflow-hidden p-0 xl:col-span-2">
            <div className="border-b border-edge-light p-4 dark:border-slate-800">
              <h3 className="font-semibold text-pastel-ink dark:text-slate-100">
                Resumen por vendedor
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="p-4 text-left">Vendedor</th>
                    <th className="p-4 text-right">%</th>
                    <th className="p-4 text-center">Operaciones</th>
                    <th className="p-4 text-right">Facturado</th>
                    <th className="p-4 text-right">Cobrado</th>
                    <th className="p-4 text-right">Acreditado</th>
                    <th className="p-4 text-right">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <motion.tr
                      key={row.vendedorId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => setSelectedVendedor(row.vendedorId)}
                      className={`table-row cursor-pointer ${
                        vendedorActivoId === row.vendedorId ? 'bg-sky-50/80 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      <td className="p-4 font-medium text-pastel-ink dark:text-slate-100">
                        {row.vendedor}
                      </td>
                      <td className="p-4 text-right text-pastel-muted">
                        {row.comisionPorcentaje}%
                      </td>
                      <td className="p-4 text-center text-pastel-muted">{row.operaciones}</td>
                      <td className="p-4 text-right">{formatCurrency(row.baseFacturada)}</td>
                      <td className="p-4 text-right">{formatCurrency(row.baseCobrada)}</td>
                      <td className="p-4 text-right">{formatCurrency(row.baseAcreditada)}</td>
                      <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.comision)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <div className="py-12 text-center text-pastel-muted">
                No hay comisiones para el período seleccionado
              </div>
            )}
          </div>

          <div className="card">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-sky-100 p-3 text-sky-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-pastel-ink dark:text-slate-100">
                  Detalle
                </h3>
                <p className="text-sm text-pastel-muted">
                  {vendedorActivo?.vendedor || 'Seleccioná un vendedor'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {detalle.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-edge-light bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm text-sky-700 dark:text-indigo-400">
                        {item.comprobante}
                      </p>
                      <p className="text-xs text-pastel-muted">
                        {item.tipo} · {formatDate(item.fecha)}
                      </p>
                    </div>
                    <p className="font-bold">{formatCurrency(item.base)}</p>
                  </div>
                  <p className="text-xs text-pastel-muted">
                    Comisión estimada:{' '}
                    {formatCurrency(item.base * ((vendedorActivo?.comisionPorcentaje || 0) / 100))}
                  </p>
                </div>
              ))}
              {!detalle.length && (
                <p className="py-8 text-center text-pastel-muted">
                  Sin detalle para mostrar
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function KpiCard({ title, value, icon: Icon, tone }) {
  const color =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-pastel-ink dark:text-slate-100';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-pastel-muted dark:text-slate-400">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className="rounded-xl bg-sky-100 p-3 text-sky-700 dark:bg-indigo-500/20 dark:text-indigo-300">
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}
