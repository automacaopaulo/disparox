import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DisparoSingle from "./DisparoSingle";
import DisparoCSV from "./DisparoCSV";
import { Send, List } from "lucide-react";

export default function Disparos() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Disparos</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Envie mensagens individuais ou em massa via CSV
        </p>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Disparo 1:1
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Disparo CSV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-6" forceMount>
          <div className="data-[state=inactive]:hidden">
            <DisparoSingle />
          </div>
        </TabsContent>

        <TabsContent value="csv" className="mt-6" forceMount>
          <div className="data-[state=inactive]:hidden">
            <DisparoCSV />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
