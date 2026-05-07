import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
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
        heading: ['"Red Hat Display"', 'system-ui', 'sans-serif'],
        sans: ['"Red Hat Display"', 'system-ui', 'sans-serif'],
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        gold: {
          DEFAULT: "hsl(340 100% 45%)",
          light: "hsl(340 60% 85%)",
        },
        navy: {
          DEFAULT: "hsl(198 28% 26%)",
          light: "hsl(198 20% 38%)",
        },
        success: {
          DEFAULT: "hsl(152 36% 53%)",
          foreground: "hsl(0 0% 100%)",
        },
        warning: {
          DEFAULT: "hsl(40 88% 47%)",
          foreground: "hsl(198 22% 18%)",
        },
        info: {
          DEFAULT: "hsl(220 40% 59%)",
          foreground: "hsl(0 0% 100%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
       },
       animation: {
         "accordion-down": "accordion-down 0.2s ease-out",
         "accordion-up": "accordion-up 0.2s ease-out",
         "chat-pulse": "chat-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
       },
       keyframes: {
         "accordion-down": {
           from: { height: "0" },
           to: { height: "var(--radix-accordion-content-height)" },
         },
         "accordion-up": {
           from: { height: "var(--radix-accordion-content-height)" },
           to: { height: "0" },
         },
         "chat-pulse": {
           "0%, 100%": { transform: "scale(1)", opacity: "1" },
           "50%": { transform: "scale(1.1)", opacity: "0.8" },
         },
       },
     },
   },
   plugins: [require("tailwindcss-animate")], // eslint-disable-line @typescript-eslint/no-require-imports
} satisfies Config;
