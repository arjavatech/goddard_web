/* eslint-env node */
module.exports = {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        amazon: {
          orange: "#1a6fc4",
          teal: "#0F2D52",
        },
        brand: {
          navy:   "#0F2D52",
          blue:   "#1a6fc4",
          light:  "#EFF5FB",
          bg:     "#F7F9FC",
          border: "#E2E8F0",
        },
        admin: {
          bg: "#F7F9FC",
          card: "#FFFFFF",
          primary: "#0F2D52",
          secondary: "#1a6fc4",
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          border: "#E2E8F0",
          "text-primary": "#141c2e",
          "text-secondary": "#64748b",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s cubic-bezier(0.16,1,0.3,1)",
        "accordion-up":   "accordion-up 0.2s cubic-bezier(0.16,1,0.3,1)",
        "caret-blink":    "caret-blink 1.25s ease-out infinite",
        "fade-in":        "fade-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "scale-in":       "scale-in 0.25s cubic-bezier(0.16,1,0.3,1) forwards",
        "slide-up":       "slide-up 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
      },
      backdropBlur: {
        xs: '2px',
      },
      letterSpacing: {
        'wider-plus': '0.3px',
      },
    },
  },
}