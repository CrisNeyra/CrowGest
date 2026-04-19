import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Productos from './pages/Productos';
import Ventas from './pages/Ventas';
import Facturas from './pages/Facturas';
import Proveedores from './pages/Proveedores';
import Pagos from './pages/Pagos';
import Movimientos from './pages/Movimientos';
import Configuracion from './pages/Configuracion';

function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/facturas" element={<Facturas />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/pagos" element={<Pagos />} />
            <Route path="/movimientos" element={<Movimientos />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </ThemeProvider>
  );
}

export default App;
