import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bot, Sparkles, Save } from "lucide-react";

export default function ChatbotIA() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: whatsappNumbers } = useQuery({
    queryKey: ["whatsapp_numbers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_numbers").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: config } = useQuery({
    queryKey: ["chatbot_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chatbot_config").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    is_enabled: config?.is_enabled || false,
    system_prompt: config?.system_prompt || "Você é um assistente útil.",
    model: config?.model || "google/gemini-2.5-flash",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (config) {
        const { error } = await supabase.from("chatbot_config").update(formData).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chatbot_config").insert({ ...formData, whatsapp_number_id: whatsappNumbers?.[0]?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot_config"] });
      toast({ title: "✅ Configurado!" });
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="section-header">
        <h1 className="section-title flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Bot className="h-7 w-7 text-primary" />
          </div>
          Chatbot IA
        </h1>
        <p className="section-description">Configure respostas automáticas inteligentes</p>
      </div>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <Label className="text-base">Ativar Chatbot</Label>
            <Switch checked={formData.is_enabled} onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })} />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Prompt do Sistema</Label>
            <Textarea value={formData.system_prompt} onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })} rows={4} />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Modelo IA</Label>
            <Select value={formData.model} onValueChange={(model) => setFormData({ ...formData, model })}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => saveMutation.mutate()} size="lg" className="w-full"><Save className="mr-2 h-5 w-5" />Salvar</Button>
        </CardContent>
      </Card>
    </div>
  );
}
