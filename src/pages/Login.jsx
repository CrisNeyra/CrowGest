import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'sonner';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Sesión iniciada correctamente');
      // Redirección manejada por AppRoutes
    } catch (err) {
      console.error(err);
      toast.error('Correo o contraseña incorrectos.');
      setError('Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDark ? 'bg-slate-950' : 'bg-base-light'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md p-8 rounded-3xl shadow-xl backdrop-blur-sm border ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-edge-light'
        }`}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-600 text-white mb-4 dark:bg-indigo-600">
            <LogIn size={32} />
          </div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>
            Bienvenido a CrowGest
          </h1>
          <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
          >
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-pastel-muted'}`}>
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-pastel-muted'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-colors ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' 
                    : 'bg-white border-edge-light text-pastel-ink placeholder:text-pastel-muted'
                }`}
                placeholder="admin@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-pastel-muted'}`}>
              Contraseña
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-pastel-muted'}`} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-colors ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' 
                    : 'bg-white border-edge-light text-pastel-ink placeholder:text-pastel-muted'
                }`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              isDark 
                ? 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50' 
                : 'bg-sky-600 hover:bg-sky-500 disabled:bg-sky-600/50'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}