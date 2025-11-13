import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DialogProvider } from "./contexts/DialogContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SimpleLayout } from "@/components/SimpleLayout";
import { GlobalDialogs } from "@/components/GlobalDialogs";
import Index from "./pages/Index";
import WhatsAppNumbers from "./pages/WhatsAppNumbers";
import Templates from "./pages/Templates";
import Disparos from "./pages/Disparos";
import Campanhas from "./pages/Campanhas";
import Automacao from "./pages/Automacao";
import ContatosUnificado from "./pages/ContatosUnificado";
import Mensagens from "./pages/Mensagens";
import OptOut from "./pages/OptOut";
import Analytics from "./pages/Analytics";
import ConfiguracoesUnificado from "./pages/ConfiguracoesUnificado";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DialogProvider>
            <GlobalDialogs />
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <SimpleLayout>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/numeros" element={<WhatsAppNumbers />} />
                      <Route path="/templates" element={<Templates />} />
                      <Route path="/disparos" element={<Disparos />} />
                      <Route path="/campanhas" element={<Campanhas />} />
                      <Route path="/automacao" element={<Automacao />} />
              <Route path="/contatos" element={<ContatosUnificado />} />
              <Route path="/mensagens" element={<Mensagens />} />
              <Route path="/opt-out" element={<OptOut />} />
              <Route path="/analytics" element={<Analytics />} />
                      <Route path="/configuracoes" element={<ConfiguracoesUnificado />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </SimpleLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
          </DialogProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
