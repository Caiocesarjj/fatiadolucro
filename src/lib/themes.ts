export interface AppTheme {
  id: string;
  name: string;
  description: string;
  emoji: string;
  preview: {
    bg: string;
    accent: string;
    text: string;
  };
  variables: Record<string, string>;
}

export const APP_THEMES: AppTheme[] = [
  {
    id: "fatia-original",
    name: "Fatia Original",
    description: "Sua marca, limpa e moderna",
    emoji: "🍰",
    preview: { bg: "#FCFCFC", accent: "#10B981", text: "#1A1A2E" },
    variables: {
      "--background": "0 0% 99%",
      "--foreground": "240 10% 10%",
      "--card": "0 0% 100%",
      "--card-foreground": "240 10% 10%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "240 10% 10%",
      "--primary": "160 84% 39%",
      "--primary-foreground": "0 0% 100%",
      "--primary-hover": "160 84% 33%",
      "--primary-light": "160 60% 92%",
      "--primary-glow": "160 84% 45%",
      "--secondary": "240 5% 96%",
      "--secondary-foreground": "240 6% 20%",
      "--muted": "240 5% 96%",
      "--muted-foreground": "240 4% 46%",
      "--accent": "160 40% 95%",
      "--accent-foreground": "160 50% 25%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 100%",
      "--success": "158 64% 42%",
      "--success-foreground": "158 64% 98%",
      "--success-light": "158 60% 92%",
      "--warning": "38 92% 50%",
      "--warning-foreground": "38 92% 10%",
      "--border": "240 6% 90%",
      "--input": "240 6% 90%",
      "--ring": "160 84% 39%",
      "--sidebar-background": "160 20% 98%",
      "--sidebar-foreground": "240 6% 25%",
      "--sidebar-primary": "160 84% 39%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "160 30% 94%",
      "--sidebar-accent-foreground": "160 50% 25%",
      "--sidebar-border": "160 15% 92%",
      "--sidebar-ring": "160 84% 39%",
      "--shadow-hover": "0 10px 20px -5px hsl(160 84% 39% / 0.15)",
    },
  },
  {
    id: "midnight-pro",
    name: "Midnight Pro",
    description: "Ideal para quem trabalha até tarde",
    emoji: "🌙",
    preview: { bg: "#0F172A", accent: "#38BDF8", text: "#E2E8F0" },
    variables: {
      "--background": "222 47% 11%",
      "--foreground": "214 32% 91%",
      "--card": "222 47% 13%",
      "--card-foreground": "214 32% 91%",
      "--popover": "222 47% 13%",
      "--popover-foreground": "214 32% 91%",
      "--primary": "199 89% 48%",
      "--primary-foreground": "222 47% 8%",
      "--primary-hover": "199 89% 55%",
      "--primary-light": "199 40% 20%",
      "--primary-glow": "199 89% 58%",
      "--secondary": "217 33% 17%",
      "--secondary-foreground": "214 32% 91%",
      "--muted": "217 33% 17%",
      "--muted-foreground": "215 20% 55%",
      "--accent": "199 30% 18%",
      "--accent-foreground": "199 50% 80%",
      "--destructive": "0 62% 50%",
      "--destructive-foreground": "0 0% 100%",
      "--success": "158 64% 45%",
      "--success-foreground": "158 64% 98%",
      "--success-light": "158 30% 18%",
      "--warning": "38 92% 50%",
      "--warning-foreground": "38 92% 10%",
      "--border": "217 33% 20%",
      "--input": "217 33% 20%",
      "--ring": "199 89% 48%",
      "--sidebar-background": "222 47% 9%",
      "--sidebar-foreground": "215 20% 65%",
      "--sidebar-primary": "199 89% 48%",
      "--sidebar-primary-foreground": "222 47% 8%",
      "--sidebar-accent": "199 20% 15%",
      "--sidebar-accent-foreground": "199 40% 80%",
      "--sidebar-border": "217 33% 15%",
      "--sidebar-ring": "199 89% 48%",
      "--shadow-hover": "0 10px 20px -5px hsl(199 89% 48% / 0.2)",
    },
  },
  {
    id: "chocolate-ouro",
    name: "Chocolate & Ouro",
    description: "Sofisticado como suas receitas",
    emoji: "🍫",
    preview: { bg: "#2A1B18", accent: "#D97706", text: "#FDE68A" },
    variables: {
      "--background": "12 27% 13%",
      "--foreground": "48 96% 77%",
      "--card": "12 27% 15%",
      "--card-foreground": "48 96% 77%",
      "--popover": "12 27% 15%",
      "--popover-foreground": "48 96% 77%",
      "--primary": "38 92% 44%",
      "--primary-foreground": "12 27% 8%",
      "--primary-hover": "38 92% 50%",
      "--primary-light": "38 40% 22%",
      "--primary-glow": "38 92% 55%",
      "--secondary": "12 20% 18%",
      "--secondary-foreground": "48 80% 77%",
      "--muted": "12 20% 18%",
      "--muted-foreground": "30 20% 55%",
      "--accent": "38 25% 20%",
      "--accent-foreground": "38 60% 75%",
      "--destructive": "0 62% 50%",
      "--destructive-foreground": "0 0% 100%",
      "--success": "158 64% 42%",
      "--success-foreground": "158 64% 98%",
      "--success-light": "158 30% 18%",
      "--warning": "48 96% 50%",
      "--warning-foreground": "48 96% 10%",
      "--border": "12 20% 22%",
      "--input": "12 20% 22%",
      "--ring": "38 92% 44%",
      "--sidebar-background": "12 27% 10%",
      "--sidebar-foreground": "30 20% 65%",
      "--sidebar-primary": "38 92% 44%",
      "--sidebar-primary-foreground": "12 27% 8%",
      "--sidebar-accent": "38 20% 18%",
      "--sidebar-accent-foreground": "38 50% 75%",
      "--sidebar-border": "12 20% 18%",
      "--sidebar-ring": "38 92% 44%",
      "--shadow-hover": "0 10px 20px -5px hsl(38 92% 44% / 0.2)",
    },
  },
  {
    id: "menta-fresca",
    name: "Menta Fresca",
    description: "Clean e refrescante",
    emoji: "🌿",
    preview: { bg: "#F0FDF4", accent: "#16A34A", text: "#1A2E1A" },
    variables: {
      "--background": "138 76% 97%",
      "--foreground": "140 25% 14%",
      "--card": "138 76% 99%",
      "--card-foreground": "140 25% 14%",
      "--popover": "138 76% 99%",
      "--popover-foreground": "140 25% 14%",
      "--primary": "142 76% 36%",
      "--primary-foreground": "0 0% 100%",
      "--primary-hover": "142 76% 30%",
      "--primary-light": "142 50% 92%",
      "--primary-glow": "142 76% 42%",
      "--secondary": "138 30% 93%",
      "--secondary-foreground": "140 20% 20%",
      "--muted": "138 30% 93%",
      "--muted-foreground": "140 10% 45%",
      "--accent": "142 40% 92%",
      "--accent-foreground": "142 50% 25%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 100%",
      "--success": "142 76% 36%",
      "--success-foreground": "142 76% 98%",
      "--success-light": "142 60% 92%",
      "--warning": "38 92% 50%",
      "--warning-foreground": "38 92% 10%",
      "--border": "138 20% 88%",
      "--input": "138 20% 88%",
      "--ring": "142 76% 36%",
      "--sidebar-background": "138 50% 96%",
      "--sidebar-foreground": "140 15% 30%",
      "--sidebar-primary": "142 76% 36%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "142 30% 92%",
      "--sidebar-accent-foreground": "142 50% 25%",
      "--sidebar-border": "138 20% 90%",
      "--sidebar-ring": "142 76% 36%",
      "--shadow-hover": "0 10px 20px -5px hsl(142 76% 36% / 0.15)",
    },
  },
];

const THEME_STORAGE_KEY = "fatia-lucro-theme";

export function getStoredThemeId(): string {
  return localStorage.getItem(THEME_STORAGE_KEY) || "fatia-original";
}

export function applyTheme(themeId: string) {
  const theme = APP_THEMES.find((t) => t.id === themeId);
  if (!theme) return;

  const root = document.documentElement;
  Object.entries(theme.variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  localStorage.setItem(THEME_STORAGE_KEY, themeId);
  // Clear old custom color key to avoid conflicts
  localStorage.removeItem("fatia-lucro-primary-color");
}
