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

const items = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Números WhatsApp", url: "/numeros", icon: Phone },
  { title: "Templates", url: "/templates", icon: Layers },
  { title: "Disparo 1:1", url: "/disparo-single", icon: Send },
  { title: "Disparo CSV", url: "/disparo-csv", icon: List },
  { title: "Campanhas", url: "/campanhas", icon: MessageSquare },
  { title: "Flow Builder", url: "/flows", icon: Workflow },
  { title: "Tags", url: "/tags", icon: Tag },
  { title: "Segmentação", url: "/segmentacao", icon: Target },
  { title: "Chatbot IA", url: "/chatbot", icon: Bot },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Calculadora", url: "/calculadora", icon: Calculator },
  { title: "Multi-idioma", url: "/multi-idioma", icon: Globe },
  { title: "Opt-Out", url: "/opt-out", icon: UserX },
  { title: "Contatos", url: "/contatos", icon: Users },
  { title: "Mensagens", url: "/mensagens", icon: FileText },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>DisparoX</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink to={item.url} end>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
