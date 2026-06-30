export const DEMO_ACCESS = {
  email: 'test@gmail.com',
  password: '1234ab',
  role: 'admin',
};

export const isDemoUser = (email) =>
  (email || '').trim().toLowerCase() === DEMO_ACCESS.email.toLowerCase();
