import { NavLink, useLocation } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsContext';
import { getVisibleModules, findActiveModule } from '../../config/navigation';

export default function SubNav() {
  const { pathname } = useLocation();
  const { can } = usePermissions();

  const modules = getVisibleModules(can);
  const active = findActiveModule(pathname);
  const currentModule =
    modules.find((m) => m.id === active?.module.id) || modules[0];

  if (!currentModule || currentModule.items.length <= 1) {
    return <div className="cg-subnav" />;
  }

  return (
    <nav className="cg-subnav">
      {currentModule.items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            `cg-subitem ${isActive ? 'cg-subitem-active' : ''}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
