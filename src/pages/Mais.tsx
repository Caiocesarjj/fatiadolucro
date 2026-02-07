import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { Users, ClipboardList, ShoppingBag, Calculator, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const menuItems = [
  { icon: Users, label: "Clientes", description: "Gerencie seus clientes", path: "/clientes" },
  { icon: ClipboardList, label: "Encomendas", description: "Controle de pedidos", path: "/encomendas" },
  { icon: ShoppingBag, label: "Catálogo", description: "Vitrine de produtos", path: "/catalogo" },
  { icon: Calculator, label: "Precificação", description: "Calcule seus preços", path: "/precificacao" },
  { icon: Settings, label: "Ajustes", description: "Configurações do app", path: "/configuracoes" },
];

const Mais = () => {
  return (
    <AppLayout title="Mais">
      <div className="grid grid-cols-1 gap-3">
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
      </div>
    </AppLayout>
  );
};

export default Mais;
