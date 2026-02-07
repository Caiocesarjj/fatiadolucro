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
}

export function AppLayout({ children, title }: AppLayoutProps) {
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
          <header className="sticky top-0 z-10 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-full items-center gap-4 px-6">
              {!isMobile && <SidebarTrigger />}
              {title && (
                <h1 className="text-xl font-semibold text-foreground">
                  {title}
                </h1>
              )}
            </div>
          </header>
          <div className={`flex-1 p-4 md:p-6 animate-fade-in overflow-x-hidden ${isMobile ? 'pb-28' : ''}`}>
            {children}
          </div>
        </main>
      </div>
      {/* Mobile bottom navigation */}
      {isMobile && <BottomNav />}
    </SidebarProvider>
  );
}
