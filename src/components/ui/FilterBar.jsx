import { Plus } from 'lucide-react';

/**
 * Panel de filtros estilo Cloud Gestion: botón "Nuevo" vertical a la izquierda
 * y grupos de filtros a la derecha.
 *
 * Uso:
 *   <FilterBar onNew={...} newLabel="Nuevo">
 *     <FilterBar.Group label="Buscar por"> ...inputs... </FilterBar.Group>
 *   </FilterBar>
 */
export default function FilterBar({ onNew, newLabel = 'Nuevo', newDisabled = false, children }) {
  return (
    <div className="cg-filterpanel">
      {onNew && (
        <button type="button" onClick={onNew} disabled={newDisabled} className="cg-newbtn">
          <Plus size={20} />
          <span>{newLabel}</span>
        </button>
      )}
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {children}
      </div>
    </div>
  );
}

function Group({ label, children, className = '' }) {
  return (
    <div className={`cg-filtergroup ${className}`}>
      {label && <span className="cg-filterlabel">{label}</span>}
      {children}
    </div>
  );
}

FilterBar.Group = Group;
