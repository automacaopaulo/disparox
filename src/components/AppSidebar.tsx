import { Home, Phone, Send, List, MessageSquare, Users, FileText, Layers, Settings, BarChart3, Calculator, Globe, UserX, Workflow, Tag, Target, Bot } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuGroups = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", url: "/", icon: Home },
    ]
  },
  {
    label: "Configuração",
    items: [
      { title: "Números WhatsApp", url: "/numeros", icon: Phone },
      { title: "Templates", url: "/templates", icon: Layers },
    ]
  },
  {
    label: "Disparos",
    items: [
      { title: "Disparo 1:1", url: "/disparo-single", icon: Send },
      { title: "Disparo CSV", url: "/disparo-csv", icon: List },
      { title: "Campanhas", url: "/campanhas", icon: MessageSquare },
      { title: "Flow Builder", url: "/flows", icon: Workflow },
    ]
  },
  {
    label: "Gestão de Contatos",
    items: [
      { title: "Contatos", url: "/contatos", icon: Users },
      { title: "Tags", url: "/tags", icon: Tag },
      { title: "Segmentação", url: "/segmentacao", icon: Target },
      { title: "Opt-Out", url: "/opt-out", icon: UserX },
    ]
  },
  {
    label: "Análise & Ferramentas",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Mensagens", url: "/mensagens", icon: FileText },
      { title: "Calculadora", url: "/calculadora", icon: Calculator },
      { title: "Multi-idioma", url: "/multi-idioma", icon: Globe },
      { title: "Chatbot IA", url: "/chatbot", icon: Bot },
    ]
  },
  {
    label: "Sistema",
    items: [
      { title: "Configurações", url: "/configuracoes", icon: Settings },
    ]
  },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="none" className="border-r border-border/40 bg-sidebar-background backdrop-blur-xl">
      <SidebarContent className="gap-0">
        {/* Logo Section */}
        <div className="flex h-16 items-center px-6 border-b border-border/40 bg-gradient-to-r from-sidebar-background to-sidebar-background/80">
          <Logo showText={true} />
        </div>

        {/* Menu Groups */}
        {menuGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label} className="px-3 py-4">
            <SidebarGroupLabel className="px-3 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground/70 uppercase mb-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-1 border-l-2 border-transparent"
                      activeClassName="bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-primary shadow-sm [&>svg]:text-primary [&>span]:text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0 transition-all duration-200 group-hover:scale-110" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
            {groupIndex < menuGroups.length - 1 && (
              <div className="mt-4 h-px bg-border/40" />
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
