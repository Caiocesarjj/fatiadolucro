import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  /** Optional action element shown in the app bar (right side) */
  headerAction?: ReactNode;
}

export function AppLayout({ children, title, headerAction }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop sidebar - hidden on mobile */}
        {!isMobile && <AppSidebar />}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Native App Bar */}
          <header className="app-bar border-b border-border/50">
            <div className="app-bar-inner">
              {!isMobile && <SidebarTrigger />}
              {title && (
                <h1 className="app-bar-title flex-1">{title}</h1>
              )}
              {headerAction && (
                <div className="ml-auto flex items-center gap-2">
                  {headerAction}
                </div>
              )}
            </div>
          </header>
          {/* Content area with safe padding for bottom nav */}
          <div className={`flex-1 px-4 py-4 md:px-6 md:py-6 animate-fade-in overflow-x-hidden ${isMobile ? 'pb-24' : ''}`}>
            {children}
          </div>
        </main>
      </div>
      {/* Mobile bottom navigation */}
      {isMobile && <BottomNav />}
    </SidebarProvider>
  );
}
