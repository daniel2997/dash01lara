import type { Config } from 'tailwindcss'

// Identidade Mete Marcha — os valores espelham os tokens de app/globals.css (§1 do guia).
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#021010',
        deep: '#050b09',
        // `deep-bottom` e não `bottom`: `bg-bottom` já é utilitário de background-position.
        'deep-bottom': '#030706',
        surface: '#081f1a',
        accent: {
          DEFAULT: '#53a668',
          bright: '#86e0a3',
        },
        teal: {
          deep: '#075743',
          mid: '#3ea98a',
          dark: '#2f6f5c',
        },
        ink: {
          DEFAULT: '#f5fff8',
          70: 'rgba(245,255,248,0.7)',
          60: 'rgba(245,255,248,0.6)',
          45: 'rgba(245,255,248,0.45)',
          40: 'rgba(245,255,248,0.4)',
        },
        coral: {
          DEFAULT: '#e79a86',
          soft: 'rgba(231,154,134,0.7)',
        },
        gold: {
          DEFAULT: '#c9a24b',
          soft: 'rgba(201,162,75,0.75)',
        },
      },
      // §1.4 — escada de bordas. Uso: `border border-card`, `border-b border-head`, …
      borderColor: {
        card: 'rgba(83,166,104,0.14)',
        head: 'rgba(83,166,104,0.18)',
        strong: 'rgba(83,166,104,0.4)',
        row: 'rgba(83,166,104,0.06)',
        inner: 'rgba(83,166,104,0.1)',
        chrome: 'rgba(83,166,104,0.12)',
      },
      fontFamily: {
        sans: ['var(--font-saira)', 'system-ui', 'sans-serif'],
        marker: ['var(--font-marker)', 'cursive'],
      },
      backgroundImage: {
        'surface-raised': 'linear-gradient(160deg, #0c2b22, #081f1a)',
      },
    },
  },
  plugins: [],
}
export default config
