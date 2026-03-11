import { Link, useLocation } from "react-router-dom";
import { Home, Cake, Package, Users, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: Package, label: "Ingred.", path: "/ingredientes" },
  { icon: Cake, label: "Receitas", path: "/receitas" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: MoreHorizontal, label: "Mais", path: "/mais" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex items-center justify-around px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/mais" && ["/encomendas", "/catalogo", "/configuracoes", "/inteligencia", "/financeiro", "/compras", "/estoque"].includes(location.pathname));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn("bottom-nav-item flex-1 relative", isActive && "active")}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-0.5 w-5 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <item.icon className={cn("h-5 w-5 transition-transform", isActive && "text-primary scale-110")} />
              <span className={cn("text-[10px] mt-0.5 font-medium", isActive && "text-primary")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
