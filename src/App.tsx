import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Ingredientes from "./pages/Ingredientes";
import Calculadora from "./pages/Calculadora";
import Financeiro from "./pages/Financeiro";
import Configuracoes from "./pages/Configuracoes";
import Clientes from "./pages/Clientes";
import Encomendas from "./pages/Encomendas";
import Compras from "./pages/Compras";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Catalogo from "./pages/Catalogo";
import Planos from "./pages/Planos";
import Precificacao from "./pages/Precificacao";
import Mais from "./pages/Mais";
import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  // Load theme color on mount
  useEffect(() => {
    const savedColor = localStorage.getItem("fatia-lucro-primary-color");
    if (savedColor) {
      const hex = savedColor.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b - r) / d + 2) / 6;
            break;
          case b:
            h = ((r - g) / d + 4) / 6;
            break;
        }
      }

      const hue = Math.round(h * 360);
      const saturation = Math.round(s * 100);
      const lightness = Math.round(l * 100);

      document.documentElement.style.setProperty("--primary", `${hue} ${saturation}% ${lightness}%`);
      document.documentElement.style.setProperty("--primary-hover", `${hue} ${saturation}% ${Math.max(lightness - 6, 0)}%`);
      document.documentElement.style.setProperty("--primary-light", `${hue} ${Math.max(saturation - 8, 0)}% 92%`);
      document.documentElement.style.setProperty("--primary-glow", `${hue} ${saturation}% ${Math.min(lightness + 6, 100)}%`);
      document.documentElement.style.setProperty("--ring", `${hue} ${saturation}% ${lightness}%`);
      document.documentElement.style.setProperty("--sidebar-primary", `${hue} ${saturation}% ${lightness}%`);
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ingredientes" element={<Ingredientes />} />
            <Route path="/calculadora" element={<Calculadora />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/encomendas" element={<Encomendas />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/precificacao" element={<Precificacao />} />
            <Route path="/mais" element={<Mais />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
