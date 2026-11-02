/** Byawastha tokens. Palette: Coolors "Dark Sunset" 335C67 FFF3B0 E09F3E 9E2A2B 540B0E (see docs/DESIGN.md). */
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'), 'bg-2': v('bg-2'), surface: v('surface'), 'surface-2': v('surface-2'), ink: v('ink'), 'ink-2': v('ink-2'), muted: v('muted'), line: v('line'),
        primary: v('primary'), 'on-primary': v('on-primary'), brand: v('brand'), 'on-brand': v('on-brand'), danger: v('danger'), ok: v('ok'), warn: v('warn'),
        slateteal: '#335C67', vanilla: '#FFF3B0', saffron: '#E09F3E', auburn: '#9E2A2B', oxblood: '#540B0E',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', '"Plus Jakarta Sans Variable"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { ctl: '7px', panel: '12px', sheet: '18px' },
      transitionTimingFunction: { glide: 'cubic-bezier(.22,.9,.24,1)' },
      boxShadow: { lift: '0 1px 0 rgb(var(--line)), 0 14px 32px -24px rgb(var(--shadow) / .55)', pop: '0 24px 60px -28px rgb(var(--shadow) / .7)' },
    },
  },
  plugins: [],
};
