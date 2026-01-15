import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';

const chartData = [
  { name: 'Ene', ventas: 4000, gastos: 2400 },
  { name: 'Feb', ventas: 3000, gastos: 1398 },
  { name: 'Mar', ventas: 2000, gastos: 9800 },
  { name: 'Abr', ventas: 2780, gastos: 3908 },
  { name: 'May', ventas: 1890, gastos: 4800 },
  { name: 'Jun', ventas: 2390, gastos: 3800 },
  { name: 'Jul', ventas: 3490, gastos: 4300 },
];

const productosVendidos = [
  { name: 'Laptop HP', cantidad: 45 },
  { name: 'Mouse Logitech', cantidad: 120 },
  { name: 'Teclado Mecánico', cantidad: 78 },
  { name: 'Monitor Samsung', cantidad: 32 },
  { name: 'Auriculares', cantidad: 95 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function Dashboard() {
  const { getEstadisticas, ventas, clientes, productos, facturas } = useData();
  const stats = getEstadisticas();

  const statsCards = [
    {
      title: 'Ventas del Mes',
      value: `$${stats.totalVentasMes.toLocaleString()}`,
      change: '+12.5%',
      changeType: 'positive',
      icon: ShoppingCart,
      color: 'from-emerald-500 to-emerald-600',
      glow: 'shadow-emerald-500/20'
    },
    {
      title: 'Por Cobrar',
      value: `$${stats.totalPorCobrar.toLocaleString()}`,
      change: '-5.2%',
      changeType: 'negative',
      icon: DollarSign,
      color: 'from-amber-500 to-amber-600',
      glow: 'shadow-amber-500/20'
    },
    {
      title: 'Clientes',
      value: stats.totalClientes,
      change: '+3',
      changeType: 'positive',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      glow: 'shadow-blue-500/20'
    },
    {
      title: 'Productos',
      value: stats.totalProductos,
      change: stats.productosStockBajo > 0 ? `${stats.productosStockBajo} bajo stock` : 'OK',
      changeType: stats.productosStockBajo > 0 ? 'warning' : 'positive',
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      glow: 'shadow-purple-500/20'
    },
  ];

  const recentVentas = ventas.slice(-5).reverse();
  const pendingFacturas = facturas.filter(f => f.estado !== 'pagada').slice(0, 5);

  return (
    <Layout moduleClass="module-dashboard">
      <Header title="Dashboard" subtitle="Resumen general del negocio" />
      
      <motion.div 
        className="p-6 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.03, 
                y: -5,
                transition: { type: "spring", stiffness: 400 }
              }}
              className={`card-hover relative overflow-hidden group shadow-lg ${stat.glow}`}
            >
              {/* Animated background gradient */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
              />
              
              {/* Shimmer effect */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  className="absolute -inset-full bg-gradient-to-r from-transparent via-white/5 to-transparent"
                  animate={{
                    x: ['0%', '200%']
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "linear"
                  }}
                />
              </div>

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-zinc-500 text-sm">{stat.title}</p>
                  <motion.p 
                    className="text-2xl font-bold text-white mt-1"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                  >
                    {stat.value}
                  </motion.p>
                  <div className={`flex items-center gap-1 mt-2 text-sm ${
                    stat.changeType === 'positive' ? 'text-emerald-400' :
                    stat.changeType === 'negative' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {stat.changeType === 'positive' ? <ArrowUpRight size={16} /> :
                     stat.changeType === 'negative' ? <ArrowDownRight size={16} /> :
                     <AlertTriangle size={16} />}
                    <span>{stat.change}</span>
                  </div>
                </div>
                <motion.div 
                  className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <stat.icon size={24} className="text-white" />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 card"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Ventas vs Gastos</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Area type="monotone" dataKey="ventas" stroke="#10b981" fillOpacity={1} fill="url(#colorVentas)" />
                  <Area type="monotone" dataKey="gastos" stroke="#ef4444" fillOpacity={1} fill="url(#colorGastos)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Top Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Productos Más Vendidos</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productosVendidos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis type="number" stroke="#71717a" />
                  <YAxis dataKey="name" type="category" stroke="#71717a" width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="cantidad" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Ventas Recientes</h3>
              <a href="/ventas" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                Ver todas
              </a>
            </div>
            {recentVentas.length > 0 ? (
              <div className="space-y-3">
                {recentVentas.map((venta) => {
                  const cliente = clientes.find(c => c.id === venta.clienteId);
                  return (
                    <div key={venta.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{venta.numero}</p>
                        <p className="text-sm text-zinc-500">{cliente?.nombre || 'Cliente'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">${venta.total.toLocaleString()}</p>
                        <p className="text-sm text-zinc-500">
                          {new Date(venta.fecha).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-zinc-500 text-center py-8">No hay ventas registradas</p>
            )}
          </motion.div>

          {/* Pending Invoices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Facturas Pendientes</h3>
              <a href="/facturas" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                Ver todas
              </a>
            </div>
            {pendingFacturas.length > 0 ? (
              <div className="space-y-3">
                {pendingFacturas.map((factura) => {
                  const cliente = clientes.find(c => c.id === factura.clienteId);
                  return (
                    <div key={factura.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{factura.numero}</p>
                        <p className="text-sm text-zinc-500">{cliente?.nombre || 'Cliente'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-400 font-medium">${factura.saldoPendiente.toLocaleString()}</p>
                        <span className={`badge ${
                          factura.estado === 'pendiente' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {factura.estado}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-zinc-500 text-center py-8">No hay facturas pendientes</p>
            )}
          </motion.div>
        </div>

        {/* Alerts */}
        {stats.productosStockBajo > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-amber-500/20">
              <AlertTriangle size={24} className="text-amber-400" />
            </div>
            <div>
              <h4 className="text-amber-400 font-semibold">Alerta de Stock Bajo</h4>
              <p className="text-zinc-400 text-sm">
                Hay {stats.productosStockBajo} producto(s) con stock por debajo del mínimo.
                <a href="/productos" className="text-amber-400 ml-1 hover:underline">Ver productos</a>
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </Layout>
  );
}
