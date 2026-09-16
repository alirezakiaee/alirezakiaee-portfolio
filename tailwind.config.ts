import type { Config } from 'tailwindcss';

// Design tokens ported 1:1 from the previous static site so the public
// frontend's look stays identical after the framework migration.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#09090B',
        primary: '#18181B',
        muted: '#3F3F46',
        accent: '#2563EB',
        paper: '#FAFAFA',
      },
      fontFamily: {
        display: ['var(--font-archivo)', 'sans-serif'],
        body: ['var(--font-space-grotesk)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
