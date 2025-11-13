import { NavLink } from "react-router-dom";
import { 
  Home, Phone, Layers, Send, MessageSquare, Workflow, 
  Users, UserX, BarChart3, Settings
} from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Números WhatsApp", url: "/numeros", icon: Phone },
  { title: "Templates", url: "/templates", icon: Layers },
  { title: "Disparos", url: "/disparos", icon: Send },
  { title: "Campanhas", url: "/campanhas", icon: MessageSquare },
  { title: "Automação", url: "/automacao", icon: Workflow },
  { title: "Contatos", url: "/contatos", icon: Users },
  { title: "Opt-Out", url: "/opt-out", icon: UserX },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
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
