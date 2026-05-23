import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'sonner';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';

const LOGIN_VIDEO_SRC = '/videos/login-background.mp4';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoVisible, setVideoVisible] = useState(true);
  const { isDark } = useTheme();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Sesión iniciada correctamente');
    } catch (err) {
      console.error(err);
      toast.error('Correo o contraseña incorrectos.');
      setError('Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        {videoVisible && (
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-70"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setVideoVisible(false)}
          >
            <source src={LOGIN_VIDEO_SRC} type="video/mp4" />
          </video>
        )}
        <div
          className={`absolute inset-0 ${
            videoVisible
              ? 'bg-gradient-to-br from-sky-900/55 via-indigo-950/45 to-slate-950/60'
              : isDark
                ? 'bg-slate-950'
                : 'bg-gradient-to-br from-sky-100 via-sky-50 to-indigo-100'
          }`}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-md rounded-3xl border p-8 shadow-xl backdrop-blur-md ${
            isDark ? 'border-slate-800/80 bg-slate-900/90' : 'border-white/40 bg-white/90'
          }`}
        >
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-600 text-white dark:bg-indigo-600">
              <LogIn size={32} />
            </div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>
              Bienvenido a CrowGest
            </h1>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4"
            >
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-pastel-muted'}`}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-pastel-muted'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full rounded-xl border py-3 pl-10 pr-4 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500'
                      : 'border-edge-light bg-white text-pastel-ink placeholder:text-pastel-muted'
                  }`}
                  placeholder="admin@empresa.com"
                />
              </div>
            </div>

            <div>
              <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-pastel-muted'}`}>
                Contraseña
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-pastel-muted'}`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full rounded-xl border py-3 pl-10 pr-4 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500'
                      : 'border-edge-light bg-white text-pastel-ink placeholder:text-pastel-muted'
                  }`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-white transition-all duration-200 ${
                isDark
                  ? 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50'
                  : 'bg-sky-600 hover:bg-sky-500 disabled:bg-sky-600/50'
              }`}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
