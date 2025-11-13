import { NavLink } from "react-router-dom";
import { 
  Home, Phone, Send, List, MessageSquare, Users, FileText, Layers, 
  Settings, BarChart3, Calculator, Globe, UserX, Workflow, Tag, Target, Bot 
} from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Números WhatsApp", url: "/numeros", icon: Phone },
  { title: "Templates", url: "/templates", icon: Layers },
  { title: "Disparo 1:1", url: "/disparo-single", icon: Send },
  { title: "Disparo CSV", url: "/disparo-csv", icon: List },
  { title: "Campanhas", url: "/campanhas", icon: MessageSquare },
  { title: "Flow Builder", url: "/flows", icon: Workflow },
  { title: "Contatos", url: "/contatos", icon: Users },
  { title: "Tags", url: "/tags", icon: Tag },
  { title: "Segmentação", url: "/segmentacao", icon: Target },
  { title: "Opt-Out", url: "/opt-out", icon: UserX },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Mensagens", url: "/mensagens", icon: FileText },
  { title: "Calculadora", url: "/calculadora", icon: Calculator },
  { title: "Multi-idioma", url: "/multi-idioma", icon: Globe },
  { title: "Chatbot IA", url: "/chatbot", icon: Bot },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function SimpleSidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white h-screen overflow-y-auto flex-shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">DisparoX</h1>
      </div>

      {/* Menu */}
      <nav className="p-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 text-base font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
