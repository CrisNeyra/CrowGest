import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Tabla densa estilo Cloud Gestion con encabezado celeste, filas zebra y paginación.
 *
 * columns: [{ key, header, render?(row, index), align?: 'left'|'center'|'right', className? }]
 * rows: array de datos (cada uno debe tener `id` o se usa el índice).
 * pageSizeOptions: opciones de "Mostrar N por página".
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (row, i) => row.id ?? i,
  emptyMessage = 'No hay registros',
  initialPageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  const alignClass = (align) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="cg-table-wrap">
      <div className="overflow-x-auto">
        <table className="cg-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`${alignClass(col.align)} ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => (
              <tr key={rowKey(row, index)}>
                {columns.map((col) => (
                  <td key={col.key} className={`${alignClass(col.align)} ${col.className || ''}`}>
                    {col.render ? col.render(row, index) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {total === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-cg-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="cg-pagination">
        <div className="flex items-center gap-2">
          <span>Mostrar</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-md border border-cg-panelBorder bg-white px-2 py-1 text-sm text-cg-ink focus:border-cg-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span>por página</span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            {from}-{to} de {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="cg-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="cg-page-btn cg-page-btn-active">{currentPage}</span>
            <button
              type="button"
              className="cg-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Página siguiente"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
