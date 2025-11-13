import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LayoutThemeProvider } from "./contexts/LayoutThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SimpleLayout } from "@/components/SimpleLayout";
import Index from "./pages/Index";
import WhatsAppNumbers from "./pages/WhatsAppNumbers";
import Templates from "./pages/Templates";
import DisparoSingle from "./pages/DisparoSingle";
import DisparoCSV from "./pages/DisparoCSV";
import Campanhas from "./pages/Campanhas";
import Analytics from "./pages/Analytics";
import CostCalculator from "./pages/CostCalculator";
import MultiLanguage from "./pages/MultiLanguage";
import OptOut from "./pages/OptOut";
import FlowBuilder from "./pages/FlowBuilder";
import Tags from "./pages/Tags";
import Segmentacao from "./pages/Segmentacao";
import ChatbotIA from "./pages/ChatbotIA";
import Contatos from "./pages/Contatos";
import Mensagens from "./pages/Mensagens";
import Configuracoes from "./pages/Configuracoes";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LayoutThemeProvider>
          <AuthProvider>
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
                      <Route path="/disparo-single" element={<DisparoSingle />} />
                      <Route path="/disparo-csv" element={<DisparoCSV />} />
                      <Route path="/campanhas" element={<Campanhas />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/calculadora" element={<CostCalculator />} />
                      <Route path="/multi-idioma" element={<MultiLanguage />} />
                      <Route path="/opt-out" element={<OptOut />} />
                      <Route path="/flows" element={<FlowBuilder />} />
                      <Route path="/tags" element={<Tags />} />
                      <Route path="/segmentacao" element={<Segmentacao />} />
                      <Route path="/chatbot" element={<ChatbotIA />} />
                      <Route path="/contatos" element={<Contatos />} />
                      <Route path="/mensagens" element={<Mensagens />} />
                      <Route path="/configuracoes" element={<Configuracoes />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </SimpleLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
          </AuthProvider>
        </LayoutThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
