/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: {
          50: '#fff1f0',
          100: '#ffe0dd',
          200: '#ffc7c2',
          300: '#ffa099',
          400: '#ff6b6b',
          500: '#ff4757',
          600: '#e63946',
          700: '#c62d42',
          800: '#a4243b',
          900: '#872237',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#4ecdc4',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        warm: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#ffe66d',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      zIndex: {
        'modal-overlay': '99998',
        'modal-content': '99999',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Hiragino Sans',
          'Hiragino Kaku Gothic ProN',
          'Noto Sans JP',
          'sans-serif',
        ],
      },
      // スクロールバーのスタイリング
      scrollbar: {
        thin: '8px',
        'thumb-gray-300': '#d1d5db',
        'track-gray-100': '#f3f4f6',
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
    // カスタムスクロールバープラグイン
    function ({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': '#d1d5db #f3f4f6',
        },
        '.scrollbar-thumb-gray-300': {
          '&::-webkit-scrollbar-thumb': {
            'background-color': '#d1d5db',
            'border-radius': '4px',
          },
        },
        '.scrollbar-track-gray-100': {
          '&::-webkit-scrollbar-track': {
            'background-color': '#f3f4f6',
            'border-radius': '4px',
          },
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
