import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { Users, ClipboardList, ShoppingBag, Settings, Headset, Brain, LogOut, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { motion } from "framer-motion";

const menuItems = [
  { icon: Brain, label: "Simuladores", description: "Simulador e metas", path: "/inteligencia", color: "bg-purple-500/10 text-purple-600" },
  { icon: Users, label: "Clientes", description: "Gerencie seus clientes", path: "/clientes", color: "bg-blue-500/10 text-blue-600" },
  { icon: ClipboardList, label: "Encomendas", description: "Controle de pedidos", path: "/encomendas", color: "bg-orange-500/10 text-orange-600" },
  { icon: ShoppingBag, label: "Catálogo", description: "Vitrine de produtos", path: "/catalogo", color: "bg-pink-500/10 text-pink-600" },
  { icon: Settings, label: "Ajustes", description: "Configurações do app", path: "/configuracoes", color: "bg-muted text-muted-foreground" },
];

const SUPPORT_EMAIL = "contato.fatiadolucro@gmail.com";

const Mais = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();

  return (
    <AppLayout title="Mais">
      <div className="space-y-2 pb-24">
        {/* Menu Items — native list style */}
        <div className="bg-card rounded-2xl overflow-hidden border shadow-sm">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link
                to={item.path}
                className="native-list-item border-b border-border/50 last:border-b-0"
              >
                <div className={`native-list-item-icon ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-[15px]">{item.label}</h3>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </Link>
            </motion.div>
          ))}
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
            <div className="native-list-item-icon bg-green-500/10">
              <Headset className="h-5 w-5 text-green-600" />
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
