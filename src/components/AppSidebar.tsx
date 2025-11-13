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
    <Sidebar collapsible="none" className="border-r border-border/40 bg-background text-foreground">
      <SidebarContent className="gap-0">
        {/* Logo Section */}
        <div className="flex h-16 items-center px-6 border-b border-border/40">
          <Logo showText={true} />
        </div>

        {/* Menu Groups */}
        {menuGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label} className="px-3 py-4">
            <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase text-muted-foreground/70 mb-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className="group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      activeClassName="bg-primary text-primary-foreground [&>svg]:text-primary-foreground [&>span]:text-primary-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0 transition-colors" />
                      <span className="truncate text-foreground">{item.title}</span>
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
