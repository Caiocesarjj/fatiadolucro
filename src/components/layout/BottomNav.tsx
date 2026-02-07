import { Link, useLocation } from "react-router-dom";
import { Home, Cake, Wallet, ShoppingCart, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: Cake, label: "Receitas", path: "/receitas" },
  { icon: Wallet, label: "Financeiro", path: "/financeiro" },
  { icon: ShoppingCart, label: "Compras", path: "/compras" },
  { icon: MoreHorizontal, label: "Mais", path: "/mais" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/mais" && ["/clientes", "/encomendas", "/catalogo", "/configuracoes"].includes(location.pathname));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn("bottom-nav-item flex-1", isActive && "active")}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
