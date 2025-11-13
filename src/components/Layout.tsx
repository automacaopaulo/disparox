import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { LogOut, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLayoutTheme } from "@/contexts/LayoutThemeContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useLayoutTheme();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-6 shadow-sm">
            <div className="flex items-center gap-3 flex-1">
              <Logo showText={true} />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleTheme}
                    className="hover:bg-accent transition-colors"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    {theme === "modern" ? "Moderno" : "Clássico"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Alternar entre layout Clássico e Moderno</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="hover:bg-destructive/10 hover:text-destructive transition-colors">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </header>
          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            <div className={`mx-auto max-w-[1600px] ${theme === "modern" ? "animate-in fade-in-50 slide-in-from-bottom-4 duration-500" : ""}`}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
