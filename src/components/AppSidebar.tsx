import { Home, Phone, Send, List, MessageSquare, Users, FileText, Layers, Settings, BarChart3, Calculator, Globe, UserX, Workflow, Tag, Target, Bot } from "lucide-react";
import { NavLink } from "@/components/NavLink";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
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
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarContent className="gap-0">
        {/* Logo Section */}
        <div className="flex h-16 items-center gap-3 border-b border-border/40 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <span className="text-lg font-bold text-primary-foreground">D</span>
          </div>
          {open && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">DisparoX</span>
              <span className="text-xs text-muted-foreground">WhatsApp API</span>
            </div>
          )}
        </div>

        {/* Menu Groups */}
        {menuGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label} className="px-3 py-4">
            {open && (
              <SidebarGroupLabel className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} className="group relative">
                      <NavLink 
                        to={item.url} 
                        end
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-accent/50 hover:text-sidebar-foreground data-[active]:bg-primary/10 data-[active]:text-primary data-[active]:shadow-sm"
                      >
                        {/* Active Indicator */}
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary opacity-0 transition-opacity group-data-[active]:opacity-100" />
                        
                        <item.icon className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110" />
                        {open && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
            {/* Separator between groups (except last) */}
            {groupIndex < menuGroups.length - 1 && open && (
              <div className="mt-4 h-px bg-border/40" />
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
