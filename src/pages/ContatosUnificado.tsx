import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Contatos from "./Contatos";
import Tags from "./Tags";
import Segmentacao from "./Segmentacao";
import { Users, Tag, Target } from "lucide-react";

export default function ContatosUnificado() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestão de Contatos</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Gerencie seus contatos, tags e segmentações em um só lugar
        </p>
      </div>

      <Tabs defaultValue="contatos" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="contatos" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contatos
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="segmentacao" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Segmentação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contatos" className="mt-6" forceMount>
          <div className="data-[state=inactive]:hidden">
            <Contatos />
          </div>
        </TabsContent>

        <TabsContent value="tags" className="mt-6" forceMount>
          <div className="data-[state=inactive]:hidden">
            <Tags />
          </div>
        </TabsContent>

        <TabsContent value="segmentacao" className="mt-6" forceMount>
          <div className="data-[state=inactive]:hidden">
            <Segmentacao />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
