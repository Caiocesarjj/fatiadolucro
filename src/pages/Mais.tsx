import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { Users, ClipboardList, ShoppingBag, Settings, Headset, Brain, LogOut, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

const menuItems = [
  { icon: Brain, label: "Simuladores", description: "Simulador e metas", path: "/inteligencia" },
  { icon: Users, label: "Clientes", description: "Gerencie seus clientes", path: "/clientes" },
  { icon: ClipboardList, label: "Encomendas", description: "Controle de pedidos", path: "/encomendas" },
  { icon: ShoppingBag, label: "Catálogo", description: "Vitrine de produtos", path: "/catalogo" },
  { icon: Settings, label: "Ajustes", description: "Configurações do app", path: "/configuracoes" },
];

const SUPPORT_EMAIL = "contato.fatiadolucro@gmail.com";

const Mais = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();

  return (
    <AppLayout title="Mais">
      <div className="grid grid-cols-1 gap-3 pb-24">
        {menuItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <Card className="active:scale-[0.98] transition-transform">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{item.label}</h3>
                  <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* Admin link - only for admins */}
        {isAdmin && (
          <Link to="/admin">
            <Card className="active:scale-[0.98] transition-transform border-primary/20">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">Administração</h3>
                  <p className="text-sm text-muted-foreground truncate">Painel administrativo</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Fale Conosco */}
        <a href={`mailto:${SUPPORT_EMAIL}`}>
          <Card className="active:scale-[0.98] transition-transform border-primary/20">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Headset className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">Fale Conosco</h3>
                <p className="text-sm text-muted-foreground truncate">Dúvidas, problemas ou sugestões?</p>
                <p className="text-xs text-primary truncate mt-0.5">{SUPPORT_EMAIL}</p>
              </div>
            </CardContent>
          </Card>
        </a>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full h-auto py-4 justify-start gap-4 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          onClick={signOut}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
            <LogOut className="h-6 w-6" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold">Sair da Conta</h3>
            <p className="text-sm text-muted-foreground">Encerrar sua sessão</p>
          </div>
        </Button>
      </div>
    </AppLayout>
  );
};

export default Mais;
