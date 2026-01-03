import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'gradient-start': '#4f46e5', // Indigo
        'gradient-mid': '#10b981', // Emerald
        'gradient-end': '#64748b', // Slate
      },
    },
  },
  plugins: [],
}
export default config
