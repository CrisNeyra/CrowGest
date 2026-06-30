/** Demo solo en desarrollo local; nunca habilitar en Vercel/producción. */
export const isDemoAccessEnabled = () =>
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_ACCESS === 'true';

export const DEMO_ACCESS = {
  email: 'test@gmail.com',
  password: '1234ab',
  role: 'admin',
};

export const isDemoUser = (email) =>
  isDemoAccessEnabled() &&
  (email || '').trim().toLowerCase() === DEMO_ACCESS.email.toLowerCase();
