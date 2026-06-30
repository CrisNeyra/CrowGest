import { useNavigate, useLocation } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsContext';
import { getVisibleModules, findActiveModule } from '../../config/navigation';

export default function ModuleNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { can } = usePermissions();

  const modules = getVisibleModules(can);
  const active = findActiveModule(pathname);
  const activeModuleId = active?.module.id;

  return (
    <nav className="cg-modulebar">
      {modules.map((mod) => {
        const Icon = mod.icon;
        const isActive = mod.id === activeModuleId;
        return (
          <button
            key={mod.id}
            type="button"
            onClick={() => navigate(mod.items[0].path)}
            className={`cg-module ${isActive ? 'cg-module-active' : ''}`}
          >
            <Icon size={20} className="shrink-0" />
            <span className="whitespace-nowrap">{mod.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
