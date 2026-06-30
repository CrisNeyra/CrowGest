import { useLocation } from 'react-router-dom';
import { ChevronRight, MapPin } from 'lucide-react';
import { findActiveModule } from '../../config/navigation';

export default function Breadcrumb({ title }) {
  const { pathname } = useLocation();
  const active = findActiveModule(pathname);

  const moduleLabel = active?.module.label || 'Inicio';
  const pageLabel = title || active?.item.label || '';

  return (
    <div className="cg-breadcrumb">
      <MapPin size={14} className="text-cg-primaryDark dark:text-indigo-300" />
      <span>Estás en:</span>
      <span className="font-semibold text-cg-ink dark:text-slate-200">{moduleLabel}</span>
      {pageLabel && (
        <>
          <ChevronRight size={14} className="opacity-60" />
          <span className="font-semibold text-cg-ink dark:text-slate-200">{pageLabel}</span>
        </>
      )}
    </div>
  );
}
