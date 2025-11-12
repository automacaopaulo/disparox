import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import WhatsAppNumbers from "./pages/WhatsAppNumbers";
import Templates from "./pages/Templates";
import DisparoSingle from "./pages/DisparoSingle";
import DisparoCSV from "./pages/DisparoCSV";
import Campanhas from "./pages/Campanhas";
import Contatos from "./pages/Contatos";
import Mensagens from "./pages/Mensagens";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/numeros" element={<WhatsAppNumbers />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/disparo-single" element={<DisparoSingle />} />
            <Route path="/disparo-csv" element={<DisparoCSV />} />
            <Route path="/campanhas" element={<Campanhas />} />
            <Route path="/contatos" element={<Contatos />} />
            <Route path="/mensagens" element={<Mensagens />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
