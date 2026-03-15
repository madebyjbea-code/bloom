/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          light: '#b5ceb5',
          DEFAULT: '#8aad8a',
          dark: '#5a7a5a',
        },
        earth: {
          light: '#e8d9c4',
          DEFAULT: '#c4a882',
        },
        cream: '#f7f3ed',
        'green-energy': '#4ecb71',
        gold: '#d4af6a',
      },
      fontFamily: {
        display: ['Instrument Serif', 'serif'],
        heading: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
      animation: {
        'breathe': 'breathe 4s ease-in-out infinite',
        'pulse-green': 'pulse-green 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease',
        'coin-pop': 'coinPop 0.4s ease',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        coinPop: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
