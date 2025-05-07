/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#8B5CF6", // purple
          dark: "#6D28D9",
          light: "#A78BFA",
        },
        secondary: {
          DEFAULT: "#EC4899", // pink
          dark: "#BE185D",
          light: "#F472B6",
        },
        dark: {
          DEFAULT: "#121212",
          lighter: "#1E1E1E",
          light: "#2D2D2D",
        },
      },
      gradientColorStops: {
        "sport-gradient-start": "#8B5CF6",
        "sport-gradient-end": "#EC4899",
      },
      animation: {
        shake: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        shake: {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
