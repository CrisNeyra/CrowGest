import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'sonner';
import { auth } from '../firebase';
import BrandLogo from '../components/layout/BrandLogo';

const LOGIN_VIDEO_SRC = '/videos/login-background.mp4';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoVisible, setVideoVisible] = useState(true);

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
              : 'bg-slate-950'
          }`}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl border border-slate-800/80 bg-slate-900/95 p-8 shadow-xl shadow-slate-950/50 backdrop-blur-md"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandLogo size="lg" className="mx-auto mb-5" />
            <h1 className="text-2xl font-bold text-slate-100">Bienvenido a Gest Crow</h1>
            <p className="mt-1 text-sm font-medium tracking-wide text-slate-400">Management System</p>
            <p className="mt-3 text-sm text-slate-500">Ingresá tus credenciales</p>
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
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-slate-100 transition-colors placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="admin@empresa.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-slate-100 transition-colors placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white transition-all duration-200 hover:bg-indigo-500 disabled:bg-indigo-600/50"
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
