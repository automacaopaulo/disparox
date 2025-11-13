import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DisparoSingle from "./DisparoSingle";
import DisparoCSV from "./DisparoCSV";
import { Send, List } from "lucide-react";

export default function Disparos() {
  return (
    <div className="min-h-screen pb-12">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Disparos de Mensagens</h1>
        <p className="text-muted-foreground mt-2">
          Envie mensagens individuais ou em massa para seus contatos
        </p>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full max-w-[500px] grid-cols-2 h-12 bg-muted/50">
          <TabsTrigger 
            value="single" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Send className="h-4 w-4" />
            <span className="font-medium">Disparo 1:1</span>
          </TabsTrigger>
          <TabsTrigger 
            value="csv" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <List className="h-4 w-4" />
            <span className="font-medium">Disparo em Massa</span>
          </TabsTrigger>
        </TabsList>

        {/* Single Message Tab */}
        <TabsContent value="single" className="mt-8" forceMount>
          <div className="data-[state=inactive]:hidden">
            <DisparoSingle />
          </div>
        </TabsContent>

        {/* CSV Mass Message Tab */}
        <TabsContent value="csv" className="mt-8" forceMount>
          <div className="data-[state=inactive]:hidden">
            <DisparoCSV />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
