import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0f1419',
          elev: '#15191f',
          card: '#1a1f29',
          hover: '#222837',
        },
        edge: '#2a3142',
        ink: {
          DEFAULT: '#e5e9f0',
          dim: '#9aa3b2',
          mute: '#6b7180',
        },
        accent: {
          DEFAULT: '#1fff7a',
          hot: '#ff3d8b',
          gold: '#ffd166',
          violet: '#a78bfa',
          cyan: '#22d3ee',
        },
        bonanza: {
          pink: '#ff5fa2',
          purple: '#7d3cff',
          cream: '#ffe8d6',
        },
        olympus: {
          navy: '#0a1530',
          gold: '#ffc62a',
          deep: '#070d20',
        },
      },
      fontFamily: {
        display: ['"Sora"', '"Inter"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(31, 255, 122, 0.35)',
        'glow-pink': '0 0 24px rgba(255, 95, 162, 0.45)',
        'glow-gold': '0 0 24px rgba(255, 198, 42, 0.45)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.45)',
      },
      keyframes: {
        pulse_glow: {
          '0%,100%': { boxShadow: '0 0 0 rgba(31,255,122,0.0)' },
          '50%': { boxShadow: '0 0 24px rgba(31,255,122,0.6)' },
        },
        rise: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        pulse_glow: 'pulse_glow 1.6s ease-in-out infinite',
        rise: 'rise 220ms ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
