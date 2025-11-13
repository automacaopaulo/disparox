import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Bot, Sparkles, Clock, MessageSquare, Zap } from "lucide-react";

export default function ChatbotIA() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: whatsappNumbers } = useQuery({
    queryKey: ["whatsapp_numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_numbers")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ["chatbot_config", whatsappNumbers?.[0]?.id],
    queryFn: async () => {
      if (!whatsappNumbers?.[0]?.id) return null;
      
      const { data, error } = await supabase
        .from("chatbot_config")
        .select("*")
        .eq("whatsapp_number_id", whatsappNumbers[0].id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!whatsappNumbers?.[0]?.id,
  });

  const [formData, setFormData] = useState({
    is_enabled: config?.is_enabled || false,
    system_prompt: config?.system_prompt || "Você é um assistente útil e prestativo que responde mensagens de WhatsApp.",
    model: config?.model || "google/gemini-2.5-flash",
    auto_reply_delay_seconds: config?.auto_reply_delay_seconds || 5,
    max_tokens: config?.max_tokens || 500,
    temperature: config?.temperature || 0.7,
    business_hours_only: config?.business_hours_only || false,
    business_hours_start: config?.business_hours_start || "09:00",
    business_hours_end: config?.business_hours_end || "18:00",
    out_of_hours_message: config?.out_of_hours_message || "Obrigado pela mensagem! Nosso horário de atendimento é das 9h às 18h.",
  });

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      if (!whatsappNumbers?.[0]?.id) throw new Error("Nenhum número WhatsApp cadastrado");

      const configData = {
        whatsapp_number_id: whatsappNumbers[0].id,
        ...formData,
      };

      if (config) {
        const { error } = await supabase
          .from("chatbot_config")
          .update(configData)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("chatbot_config")
          .insert(configData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot_config"] });
      toast({
        title: "✅ Configuração salva",
        description: "Chatbot configurado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "❌ Erro ao salvar",
        description: "Tente novamente",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Chatbot com IA
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure respostas automáticas inteligentes com IA
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Label>Chatbot Ativo</Label>
          <Switch
            checked={formData.is_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
          />
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${formData.is_enabled ? 'text-green-600' : 'text-gray-400'}`}>
              {formData.is_enabled ? 'Ativo' : 'Inativo'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modelo IA</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">Gemini 2.5</div>
            <p className="text-xs text-muted-foreground">Flash</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delay Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formData.auto_reply_delay_seconds}s</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Ativas hoje</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">⚙️ Configuração</TabsTrigger>
          <TabsTrigger value="prompt">🤖 Personalidade</TabsTrigger>
          <TabsTrigger value="hours">🕐 Horários</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Modelo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Modelo de IA</Label>
                <Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-2.5-flash">🚀 Gemini 2.5 Flash (Recomendado)</SelectItem>
                    <SelectItem value="google/gemini-2.5-pro">⭐ Gemini 2.5 Pro (Mais inteligente)</SelectItem>
                    <SelectItem value="google/gemini-2.5-flash-lite">⚡ Gemini 2.5 Lite (Mais rápido)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delay antes de responder (segundos)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.auto_reply_delay_seconds}
                    onChange={(e) => setFormData({ ...formData, auto_reply_delay_seconds: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    min="100"
                    max="2000"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalidade da IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>System Prompt (Instruções para a IA)</Label>
                <Textarea
                  placeholder="Você é um assistente útil..."
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Seja específico sobre como a IA deve se comportar, que informações ela tem acesso, e como deve responder.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Horário de Atendimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Ativar apenas em horário comercial</Label>
                <Switch
                  checked={formData.business_hours_only}
                  onCheckedChange={(checked) => setFormData({ ...formData, business_hours_only: checked })}
                />
              </div>

              {formData.business_hours_only && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Horário Início</Label>
                      <Input
                        type="time"
                        value={formData.business_hours_start}
                        onChange={(e) => setFormData({ ...formData, business_hours_start: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Horário Fim</Label>
                      <Input
                        type="time"
                        value={formData.business_hours_end}
                        onChange={(e) => setFormData({ ...formData, business_hours_end: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem Fora do Horário</Label>
                    <Textarea
                      placeholder="Mensagem automática quando fora do horário..."
                      value={formData.out_of_hours_message}
                      onChange={(e) => setFormData({ ...formData, out_of_hours_message: e.target.value })}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button 
          onClick={() => saveConfigMutation.mutate()} 
          disabled={saveConfigMutation.isPending}
          size="lg"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Salvar Configuração
        </Button>
      </div>

      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <p className="font-semibold text-green-900">🤖 Como funciona o Chatbot com IA:</p>
            <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
              <li>Quando um lead responde, a IA analisa a mensagem e gera uma resposta personalizada</li>
              <li>Usa Lovable AI (Gemini 2.5) - sem necessidade de API key externa</li>
              <li>Mantém contexto da conversa automaticamente</li>
              <li>Respeita horários comerciais (opcional)</li>
              <li>Totalmente personalizável via System Prompt</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}