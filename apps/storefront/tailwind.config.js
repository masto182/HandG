const path = require("path")

module.exports = {
  presets: [require("@medusajs/ui-preset")],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/modules/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      transitionProperty: {
        width: "width margin",
        height: "height",
        bg: "background-color",
        display: "display opacity",
        visibility: "visibility",
        padding: "padding-top padding-right padding-bottom padding-left",
      },
      colors: {
        hg: {
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          "surface-hover": "var(--color-surface-3)",
          "surface-low": "var(--color-surface-low)",
          "surface-dim": "var(--color-surface-dim)",
          border: "var(--color-border)",
          gold: "var(--color-primary)",
          "gold-hover": "var(--color-primary-hover)",
          "gold-muted": "var(--color-primary-pressed)",
          "on-primary": "var(--color-on-primary)",
          text: "var(--color-text)",
          "text-secondary": "var(--color-text-muted)",
          "text-muted": "var(--color-text-faint)",
        },
        hl: {
          primary: "var(--color-primary)",
          "primary-hover": "var(--color-primary-hover)",
          "primary-pressed": "var(--color-primary-pressed)",
          "primary-soft": "var(--color-primary-soft)",
          accent: "var(--color-accent)",
          "accent-soft": "var(--color-accent-soft)",
          surface2: "var(--color-surface-2)",
          surface3: "var(--color-surface-3)",
          "border-strong": "var(--color-border-strong)",
          price: "var(--color-price)",
          success: "var(--color-success)",
          warning: "var(--color-warning)",
          error: "var(--color-error)",
        },
        // Stitch design system tokens (Material Design 3 naming)
        "surface-container-lowest": "var(--color-surface-dim)",
        "surface-container": "var(--color-surface)",
        "surface-container-low": "var(--color-surface-low)",
        "surface-container-high": "var(--color-surface-2)",
        "surface-container-highest": "var(--color-surface-3)",
        "surface-elevated": "var(--color-surface-2)",
        "on-surface": "var(--color-text)",
        "on-surface-variant": "var(--color-text-muted)",
        "outline-variant": "var(--color-border)",
        outline: "var(--color-border-strong)",
        primary: "var(--color-primary)",
        "primary-container": "var(--color-primary-soft)",
        "on-primary": "var(--color-on-primary)",
        "on-primary-container": "var(--color-primary)",
        secondary: "var(--color-accent)",
        "secondary-container": "var(--color-accent-soft)",
        tertiary: "var(--color-error)",
        "tertiary-container": "var(--color-error)",
        error: "var(--color-error)",
        "error-container": "var(--color-error)",
        "price-dark": "var(--color-price)",
      },
      borderRadius: {
        none: "0px",
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        pill: "999px",
        full: "9999px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      maxWidth: {
        "8xl": "100rem",
      },
      screens: {
        "2xsmall": "320px",
        xsmall: "512px",
        small: "1024px",
        medium: "1280px",
        large: "1440px",
        xlarge: "1680px",
        "2xlarge": "1920px",
      },
      fontSize: {
        "3xl": "2rem",
        "h1": ["48px", { lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "700" }],
        "h2": ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "h3": ["24px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
        "price": ["20px", { lineHeight: "1", fontWeight: "700" }],
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Ubuntu",
          "sans-serif",
        ],
      },
      keyframes: {
        ring: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "fade-in-right": {
          "0%": {
            opacity: "0",
            transform: "translateX(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "fade-in-top": {
          "0%": {
            opacity: "0",
            transform: "translateY(-10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-out-top": {
          "0%": {
            height: "100%",
          },
          "99%": {
            height: "0",
          },
          "100%": {
            visibility: "hidden",
          },
        },
        "accordion-slide-up": {
          "0%": {
            height: "var(--radix-accordion-content-height)",
            opacity: "1",
          },
          "100%": {
            height: "0",
            opacity: "0",
          },
        },
        "accordion-slide-down": {
          "0%": {
            "min-height": "0",
            "max-height": "0",
            opacity: "0",
          },
          "100%": {
            "min-height": "var(--radix-accordion-content-height)",
            "max-height": "none",
            opacity: "1",
          },
        },
        enter: {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        leave: {
          "0%": { transform: "scale(1)", opacity: 1 },
          "100%": { transform: "scale(0.9)", opacity: 0 },
        },
        "slide-in": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        ring: "ring 2.2s cubic-bezier(0.5, 0, 0.5, 1) infinite",
        "fade-in-right":
          "fade-in-right 0.3s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-in-top": "fade-in-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-out-top":
          "fade-out-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "accordion-open":
          "accordion-slide-down 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        "accordion-close":
          "accordion-slide-up 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        enter: "enter 200ms ease-out",
        "slide-in": "slide-in 1.2s cubic-bezier(.41,.73,.51,1.02)",
        leave: "leave 150ms ease-in forwards",
      },
    },
  },
  plugins: [require("tailwindcss-radix")()],
}
