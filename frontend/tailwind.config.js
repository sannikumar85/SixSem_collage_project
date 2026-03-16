/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "#0a0e17",
          800: "#0f1523",
          700: "#141c2e",
          600: "#1a2540",
          500: "#1e2d4d"
        }
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite"
      }
    }
  },
  plugins: []
};
