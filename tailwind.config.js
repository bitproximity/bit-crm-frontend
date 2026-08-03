/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#080712',       // fondo
          panel: '#100E1C',    // paneles/tarjetas
          border: '#211D34',   // bordes
          violet: '#8500FF',   // violeta
          magenta: '#E000FF',  // magenta
          ice: '#D9F6FF',      // azul hielo
          white: '#FBFAFF',    // blanco
          muted: '#8B87A3',    // texto secundario
        },
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],       // titulares
        manrope: ['Manrope', 'sans-serif'], // textos y datos
        mono: ['"Space Mono"', 'monospace'], // etiquetas técnicas
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #8500FF 0%, #E000FF 100%)',
      },
    },
  },
  plugins: [],
};
