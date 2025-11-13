import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DisparoSingle from "./DisparoSingle";
import DisparoCSV from "./DisparoCSV";
import { Send, List } from "lucide-react";

export default function Disparos() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Disparos de Mensagens</h1>
        <p className="text-muted-foreground">
          Envie mensagens individuais ou em massa para seus contatos
        </p>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span>Disparo 1:1</span>
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span>Disparo em Massa</span>
          </TabsTrigger>
        </TabsList>

        {/* Single Message Tab */}
        <TabsContent value="single" className="mt-6">
          <DisparoSingle />
        </TabsContent>

        {/* CSV Mass Message Tab */}
        <TabsContent value="csv" className="mt-6">
          <DisparoCSV />
        </TabsContent>
      </Tabs>
    </div>
  );
}
