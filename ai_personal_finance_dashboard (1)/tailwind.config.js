const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", ...fontFamily.sans],
      },
      borderRadius: {
        DEFAULT: "8px",
        secondary: "4px",
        container: "12px",
      },
      boxShadow: {
        DEFAULT: "0 1px 4px rgba(0, 0, 0, 0.1)",
        hover: "0 2px 8px rgba(0, 0, 0, 0.12)",
      },
      colors: {
        primary: {
          DEFAULT: "#6A4C93",
          hover: "#5a3d80",
          light: "#f3eef8",
        },
        secondary: {
          DEFAULT: "#3E2C51",
          hover: "#2e1f3d",
        },
        accent: {
          DEFAULT: "#B497BD",
          hover: "#9e7daa",
          light: "#f9f5fb",
        },
        plum: {
          DEFAULT: "#3E2C51",
          50: "#f5f0f9",
          100: "#ede4f4",
          200: "#d9c8e8",
          300: "#c0a3d6",
          400: "#a47dc2",
          500: "#8a5cae",
          600: "#6A4C93",
          700: "#5a3d80",
          800: "#4a306b",
          900: "#3E2C51",
        },
        lavender: {
          DEFAULT: "#B497BD",
          50: "#faf7fb",
          100: "#f3eef8",
          200: "#e6d9ef",
          300: "#d4bee3",
          400: "#c0a3d6",
          500: "#B497BD",
          600: "#9e7daa",
          700: "#876496",
          800: "#6e4e7c",
          900: "#573d63",
        },
      },
      spacing: {
        "form-field": "16px",
        section: "32px",
      },
    },
  },
  variants: {
    extend: {
      boxShadow: ["hover", "active"],
    },
  },
};
