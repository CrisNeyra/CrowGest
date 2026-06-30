import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DataProvider, useData } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PermissionsProvider, usePermissions } from './context/PermissionsContext';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import ErrorBoundary from './components/ui/ErrorBoundary';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Productos = lazy(() => import('./pages/Productos'));
const StockKardex = lazy(() => import('./pages/StockKardex'));
const Maestros = lazy(() => import('./pages/Maestros'));
const Ventas = lazy(() => import('./pages/Ventas'));
const Presupuestos = lazy(() => import('./pages/Presupuestos'));
const Pedidos = lazy(() => import('./pages/Pedidos'));
const PedidosAFacturar = lazy(() => import('./pages/PedidosAFacturar'));
const Remitos = lazy(() => import('./pages/Remitos'));
const Proveedores = lazy(() => import('./pages/Proveedores'));
const Pagos = lazy(() => import('./pages/Pagos'));
const OrdenesCompra = lazy(() => import('./pages/OrdenesCompra'));
const RemitosCompra = lazy(() => import('./pages/RemitosCompra'));
const ComprobantesProveedor = lazy(() => import('./pages/ComprobantesProveedor'));
const CuentaCorriente = lazy(() => import('./pages/CuentaCorriente'));
const CuentaCorrienteProveedores = lazy(() => import('./pages/CuentaCorrienteProveedores'));
const Movimientos = lazy(() => import('./pages/Movimientos'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Tesoreria = lazy(() => import('./pages/Tesoreria'));
const Comisiones = lazy(() => import('./pages/Comisiones'));
const Auditoria = lazy(() => import('./pages/Auditoria'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Login = lazy(() => import('./pages/Login'));

const AppLoader = ({ message = 'Cargando módulo...' }) => (
  <div className="flex min-h-screen items-center justify-center bg-base-light dark:bg-slate-950">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-600 border-t-transparent dark:border-indigo-500 dark:border-t-transparent"></div>
      <p className="font-medium text-pastel-muted dark:text-slate-400">{message}</p>
    </div>
  </div>
);

// Componente para proteger las rutas privadas
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Componente para redirigir si ya está logueado
const PublicRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (currentUser) {
    return <Navigate to="/" />;
  }
  
  return children;
};

function AppRoutes() {
  const { loading } = useData();
  const { currentUser } = useAuth();

  // Solo mostramos el loader de datos si el usuario está logueado
  if (currentUser && loading) {
    return (
      <AppLoader message="Conectando con la base de datos..." />
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/clientes" element={<PrivateRoute><Clientes /></PrivateRoute>} />
      <Route path="/productos" element={<PrivateRoute><Productos /></PrivateRoute>} />
      <Route path="/stock-kardex" element={<PrivateRoute><StockKardex /></PrivateRoute>} />
      <Route path="/maestros" element={<PrivateRoute><Maestros /></PrivateRoute>} />
      <Route path="/ventas" element={<PrivateRoute><Ventas /></PrivateRoute>} />
      <Route path="/presupuestos" element={<PrivateRoute><Presupuestos /></PrivateRoute>} />
      <Route path="/pedidos" element={<PrivateRoute><Pedidos /></PrivateRoute>} />
      <Route path="/pedidos-a-facturar" element={<PrivateRoute><PedidosAFacturar /></PrivateRoute>} />
      <Route path="/remitos" element={<PrivateRoute><Remitos /></PrivateRoute>} />
      <Route path="/comprobantes" element={<Navigate to="/pedidos-a-facturar?tab=fiscal" replace />} />
      <Route path="/facturas" element={<Navigate to="/pedidos-a-facturar?tab=historial" replace />} />
      <Route path="/proveedores" element={<PrivateRoute><Proveedores /></PrivateRoute>} />
      <Route path="/ordenes-compra" element={<PrivateRoute><OrdenesCompra /></PrivateRoute>} />
      <Route path="/remitos-compra" element={<PrivateRoute><RemitosCompra /></PrivateRoute>} />
      <Route path="/comprobantes-proveedor" element={<PrivateRoute><ComprobantesProveedor /></PrivateRoute>} />
      <Route path="/pagos" element={<PrivateRoute><Pagos /></PrivateRoute>} />
      <Route path="/cuenta-corriente" element={<PrivateRoute><CuentaCorriente /></PrivateRoute>} />
      <Route path="/cuenta-corriente-proveedores" element={<PrivateRoute><CuentaCorrienteProveedores /></PrivateRoute>} />
      <Route path="/movimientos" element={<PrivateRoute><Movimientos /></PrivateRoute>} />
      <Route path="/reportes" element={<PrivateRoute><Reportes /></PrivateRoute>} />
      <Route path="/tesoreria" element={<PrivateRoute><Tesoreria /></PrivateRoute>} />
      <Route path="/comisiones" element={<PrivateRoute><Comisiones /></PrivateRoute>} />
      <Route path="/auditoria" element={<PrivateRoute><Auditoria /></PrivateRoute>} />
        <Route path="/configuracion" element={<PrivateRoute><Configuracion /></PrivateRoute>} />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function AppDataShell() {
  const { currentUser } = useAuth();
  const { loading: permissionsLoading } = usePermissions();

  if (currentUser && permissionsLoading) {
    return (
      <AppLoader message="Validando permisos..." />
    );
  }

  return (
    <DataProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <AppRoutes />
        </BrowserRouter>
      </ConfirmProvider>
    </DataProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PermissionsProvider>
          <AppDataShell />
        </PermissionsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;