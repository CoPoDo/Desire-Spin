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
        // Cool-navy palette for the Originals chrome — reproduces the
        // look of the real Stake-style Originals (functional UI colour
        // values + layout, not any proprietary asset). Kept distinct
        // from the warmer generic `bg`/`accent` tokens used by the slots
        // and lobby, and applied through the shared OriginalPageLayout +
        // bet-control components so all 31 originals share it.
        stake: {
          bg: '#0f212e',         // page background
          panel: '#213743',      // bet-control panel
          card: '#1a2c38',       // game area / cards
          input: '#0f212e',      // input wells (darker than panel)
          border: '#2f4553',     // borders + dividers
          green: '#00e701',      // signature bet button
          'green-hi': '#1fff20', // bet button hover
          red: '#ed4163',        // loss / danger
          text: '#ffffff',
          muted: '#b1bad3',      // secondary text
          dim: '#557086',        // tertiary / placeholder
        },
      },
      fontFamily: {
        display: ['"Sora"', '"Inter"', 'system-ui', 'sans-serif'],
        serif: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
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
