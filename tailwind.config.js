/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Modo claro: fondos y cromado en azules muy suaves */
        'base-light': '#e8eef8',
        'sidebar-light': '#dae8f6',
        'edge-light': '#dae8f6',
        /** Texto y superficies con tinte azul (contraste sobre base-light) */
        pastel: {
          ink: '#0c2742',
          muted: '#3a5370',
          mist: '#eef3fb',
        },
        crow: {
          50: '#f0edeb',
          100: '#e5e5e7',
          200: '#d1d1d4',
          300: '#a1a1aa',
          400: '#71717a',
          500: '#52525b',
          600: '#3f3f46',
          700: '#27272a',
          800: '#18181b',
          900: '#0f0f12',
          950: '#09090b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
