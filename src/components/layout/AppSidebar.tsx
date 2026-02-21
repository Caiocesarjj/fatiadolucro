import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Calculator,
  Wallet,
  Settings,
  LogOut,
  ChevronLeft,
  Users,
  ClipboardList,
  ShoppingCart,
  Shield,
  ShoppingBag,
  Brain,
  Boxes,
} from "lucide-react";
import logo from "@/assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, hasModuleAccess } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Sidebar order: Início > Clientes > Encomendas > Catálogo > Calculadora > Ingredientes > Compras > Financeiro > Configurações
const allMenuItems = [
  { title: "Início", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { title: "Clientes", url: "/clientes", icon: Users, module: "clientes" },
  { title: "Encomendas", url: "/encomendas", icon: ClipboardList, module: "encomendas" },
  { title: "Catálogo", url: "/catalogo", icon: ShoppingBag, module: "catalogo" },
  { title: "Receitas", url: "/receitas", icon: Calculator, module: "calculadora" },
  { title: "Ingredientes", url: "/ingredientes", icon: Package, module: "ingredientes" },
  { title: "Estoque", url: "/estoque", icon: Boxes, module: "estoque" },
  { title: "Lista de Compras", url: "/compras", icon: ShoppingCart, module: "compras" },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, module: "financeiro" },
  { title: "Simuladores", url: "/inteligencia", icon: Brain, module: "inteligencia" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, module: "configuracoes" },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin, allowedModules } = useUserRole();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  // Filter menu items based on allowed modules
  const menuItems = allMenuItems.filter((item) =>
    hasModuleAccess(allowedModules, item.module)
  );

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border bg-sidebar"
      >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className={cn(
          "flex items-center gap-3 transition-all duration-200",
          collapsed && "justify-center"
        )}>
          <img src={logo} alt="Fatia do Lucro" className="w-12 h-12 rounded-xl shrink-0 object-cover" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">Fatia do Lucro</h1>
              <p className="text-xs text-muted-foreground truncate">Gestão de Confeitaria</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title} className="relative">
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-all duration-200",
                        isActive(item.url)
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "hover:bg-sidebar-accent/50"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 shrink-0",
                        isActive(item.url) ? "text-sidebar-primary" : ""
                      )} />
                      <span className={cn(collapsed && "sr-only")}>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex flex-col gap-2">
          {isAdmin && (
            <SidebarMenuButton
              asChild
              isActive={isActive("/admin")}
              tooltip="Administração"
            >
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-all duration-200",
                  isActive("/admin")
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "hover:bg-sidebar-accent/50"
                )}
              >
                <Shield className={cn(
                  "h-5 w-5 shrink-0",
                  isActive("/admin") ? "text-sidebar-primary" : ""
                )} />
                <span className={cn(collapsed && "sr-only")}>Administração</span>
              </Link>
            </SidebarMenuButton>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className={cn(
              "h-4 w-4 transition-transform duration-200",
              collapsed && "rotate-180"
            )} />
            {!collapsed && <span>Recolher</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
      </Sidebar>
    </>
  );
}
