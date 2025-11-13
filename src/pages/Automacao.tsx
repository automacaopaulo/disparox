import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FlowBuilder from "./FlowBuilder";
import ChatbotIA from "./ChatbotIA";
import { Workflow, Bot } from "lucide-react";

export default function Automacao() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Automação</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Configure fluxos automáticos e respostas inteligentes com IA
        </p>
      </div>

      <Tabs defaultValue="flows" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="flows" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Flow Builder
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Chatbot IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flows" className="mt-6">
          <FlowBuilder />
        </TabsContent>

        <TabsContent value="chatbot" className="mt-6">
          <ChatbotIA />
        </TabsContent>
      </Tabs>
    </div>
  );
}
