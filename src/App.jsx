import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Productos from './pages/Productos';
import Ventas from './pages/Ventas';
import Facturas from './pages/Facturas';
import Proveedores from './pages/Proveedores';
import Pagos from './pages/Pagos';
import Movimientos from './pages/Movimientos';
import Configuracion from './pages/Configuracion';
import Login from './pages/Login';

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
      <div className="flex min-h-screen items-center justify-center bg-base-light dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-600 border-t-transparent dark:border-indigo-500 dark:border-t-transparent"></div>
          <p className="text-pastel-muted dark:text-slate-400 font-medium">Conectando con la base de datos...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/clientes" element={<PrivateRoute><Clientes /></PrivateRoute>} />
      <Route path="/productos" element={<PrivateRoute><Productos /></PrivateRoute>} />
      <Route path="/ventas" element={<PrivateRoute><Ventas /></PrivateRoute>} />
      <Route path="/facturas" element={<PrivateRoute><Facturas /></PrivateRoute>} />
      <Route path="/proveedores" element={<PrivateRoute><Proveedores /></PrivateRoute>} />
      <Route path="/pagos" element={<PrivateRoute><Pagos /></PrivateRoute>} />
      <Route path="/movimientos" element={<PrivateRoute><Movimientos /></PrivateRoute>} />
      <Route path="/configuracion" element={<PrivateRoute><Configuracion /></PrivateRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;