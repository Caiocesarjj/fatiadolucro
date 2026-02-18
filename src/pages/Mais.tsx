import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { ClipboardList, ShoppingBag, Settings, Headset, Brain, LogOut, Shield, ChevronRight, Wallet, ShoppingCart, Lock, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useFreemiumLimits } from "@/hooks/useFreemiumLimits";
import { UpgradeModal } from "@/components/UpgradeModal";
import { motion } from "framer-motion";
import { useState } from "react";

const menuItems = [
  { icon: Boxes, label: "Estoque", description: "Controle de estoque inteligente", path: "/estoque", color: "bg-blue-500/10 text-blue-600", module: "estoque" },
  { icon: Wallet, label: "Financeiro", description: "Controle financeiro completo", path: "/financeiro", color: "bg-emerald-500/10 text-emerald-600", module: "financeiro" },
  { icon: ShoppingCart, label: "Lista de Compras", description: "Lista de compras inteligente", path: "/compras", color: "bg-cyan-500/10 text-cyan-600", module: "" },
  { icon: ClipboardList, label: "Encomendas", description: "Controle de pedidos", path: "/encomendas", color: "bg-orange-500/10 text-orange-600", module: "" },
  { icon: Brain, label: "Simuladores", description: "Simulador e metas", path: "/inteligencia", color: "bg-purple-500/10 text-purple-600", module: "inteligencia" },
  { icon: ShoppingBag, label: "Catálogo", description: "Vitrine de produtos", path: "/catalogo", color: "bg-pink-500/10 text-pink-600", module: "catalogo" },
  { icon: Settings, label: "Ajustes", description: "Configurações do app", path: "/configuracoes", color: "bg-muted text-muted-foreground", module: "" },
];

const SUPPORT_EMAIL = "contato.fatiadolucro@gmail.com";

const Mais = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { isModuleLocked } = useFreemiumLimits();
  const [lockedModule, setLockedModule] = useState<string | null>(null);

  const handleNavClick = (e: React.MouseEvent, item: typeof menuItems[0]) => {
    if (item.module && isModuleLocked(item.module)) {
      e.preventDefault();
      setLockedModule(item.label);
    }
  };

  return (
    <AppLayout title="Mais">
      <div className="space-y-2 pb-24">
        <UpgradeModal
          open={!!lockedModule}
          onOpenChange={(open) => !open && setLockedModule(null)}
          type="module_locked"
          moduleName={lockedModule || ""}
        />

        {/* Menu Items */}
        <div className="bg-card rounded-2xl overflow-hidden border shadow-sm">
          {menuItems.map((item, index) => {
            const locked = item.module ? isModuleLocked(item.module) : false;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Link
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item)}
                  className="native-list-item border-b border-border/50 last:border-b-0"
                >
                  <div className={`native-list-item-icon ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-[15px] flex items-center gap-1.5">
                      {item.label}
                      {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    </h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Admin + Support section */}
        <div className="bg-card rounded-2xl overflow-hidden border shadow-sm">
          {isAdmin && (
            <Link to="/admin" className="native-list-item border-b border-border/50">
              <div className="native-list-item-icon bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground text-[15px]">Administração</h3>
                <p className="text-xs text-muted-foreground">Painel administrativo</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </Link>
          )}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="native-list-item">
            <div className="native-list-item-icon bg-success/10">
              <Headset className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground text-[15px]">Fale Conosco</h3>
              <p className="text-xs text-muted-foreground">{SUPPORT_EMAIL}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
          </a>
        </div>

        {/* Logout */}
        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full h-14 rounded-2xl justify-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-[15px] font-medium"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            Sair da Conta
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Mais;
