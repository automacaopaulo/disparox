import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Configuracoes from "./Configuracoes";
import MultiLanguage from "./MultiLanguage";
import { Settings, Globe } from "lucide-react";

export default function ConfiguracoesUnificado() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Configure o sistema, webhooks e multi-idioma
        </p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="idiomas" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Multi-idioma
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-6" forceMount>
          <div className="data-[state=inactive]:hidden">
            <Configuracoes />
          </div>
        </TabsContent>

        <TabsContent value="idiomas" className="mt-6" forceMount>
          <div className="data-[state=inactive]:hidden">
            <MultiLanguage />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
