/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        rubik: ["Rubik-Regular", "sans-serif"],
        "rubik-bold": ["Rubik-Bold", "sans-serif"],
        "rubik-semibold": ["Rubik-SemiBold", "sans-serif"],
        "rubik-medium": ["Rubik-Medium", "sans-serif"],
      },

      colors: {
        black: {
          900: "#000000",
          800: "#2C2C2C",
          700: "#4A4A4A",
          600: "#6B6B6B",
          500: "#8C8C8C",
          400: "#B0B0B0",
          300: "#D1D1D1",
          200: "#E5E5E5",
          100: "#F2F2F2",
        },
        white: {
          DEFAULT: "#FFFFFF",
          90: "rgba(255,255,255,0.9)",
          80: "rgba(255,255,255,0.8)",
          70: "rgba(255,255,255,0.7)",
          60: "rgba(255,255,255,0.6)",
          50: "rgba(255,255,255,0.5)",
        },
        purple: {
          600: "#2438FF",
          500: "#5C6CFA",
          400: "#AEB7FF",
          300: "#C9CFFF",
          200: "#DEE2FF",
        },
        blue: {
          600: "#0B6CFF",
          500: "#1DA1FF",
          400: "#63C4FF",
          300: "#8EE3FF",
          200: "#BFF0FF",
          100: "#D6F6FF",
        },
        pink: {
          600: "#E01E9C",
          500: "#FF4FA3",
          400: "#FF8AD8",
          300: "#E8B6F7",
          200: "#FFD1EB",
          100: "#F5E0FF",
        },
        red: {
          500: "#FF3B3B",
        },
        green: {
          500: "#20D620",
        },
      },
    },
  },
  plugins: [],
};
