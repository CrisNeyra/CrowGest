import TopBar from './TopBar';
import ModuleNav from './ModuleNav';
import SubNav from './SubNav';
import Breadcrumb from './Breadcrumb';
import { useTheme } from '../../context/ThemeContext';

export default function Layout({ children, title }) {
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-base-light'} transition-colors`}>
      <div className="sticky top-0 z-40">
        <TopBar />
        <ModuleNav />
        <SubNav />
      </div>
      <Breadcrumb title={title} />
      <main className="min-h-[calc(100vh-12rem)]">{children}</main>
    </div>
  );
}
