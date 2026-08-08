module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Design-convergence skill: brand emerald anchored at the binding #0B4F3A (brand-800).
        brand: {
          50: '#EAF4F0', 100: '#CDE6DC', 200: '#A9D3C2', 300: '#7CB9A2',
          600: '#12664A', 700: '#0D5A40', 800: '#0B4F3A', 900: '#093F2E', 950: '#052A1F',
        },
        // Danger anchored at the binding #B3261E — the only "stop and look" color.
        danger: { 100: '#F9DEDC', 700: '#B3261E', 800: '#8F1E18' },
        // Warning/pending anchored at the binding #B26B00 — never used for destructive actions.
        warning: { 100: '#FBEBD2', 700: '#B26B00', 800: '#8F5600' },
      },
    },
  },
  plugins: [],
};
