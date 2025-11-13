import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle, Phone, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DisparoSingle() {
  const { toast } = useToast();
  const [selectedNumber, setSelectedNumber] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [parameters, setParameters] = useState<Record<string, string>>({});

  const { data: whatsappNumbers } = useQuery({
    queryKey: ["whatsapp-numbers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_numbers")
        .select("*")
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["templates-active", selectedNumber],
    queryFn: async () => {
      if (!selectedNumber) return [];
      
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("whatsapp_number_id", selectedNumber)
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedNumber,
  });

  const selectedTemplateData = templates?.find((t) => t.id === selectedTemplate);
  const structure = selectedTemplateData?.structure as any;

  const allVariables: { key: string; label: string }[] = [];
  if (structure) {
    structure.body?.vars?.forEach((n: number) => {
      allVariables.push({ key: `body_${n}`, label: `Body {{${n}}}` });
    });
    structure.header?.vars?.forEach((n: number) => {
      allVariables.push({ key: `header_${n}`, label: `Header {{${n}}}` });
    });
    structure.buttons?.forEach((btn: any) => {
      btn.vars?.forEach((n: number) => {
        allVariables.push({ key: `button_${btn.index}_${n}`, label: `Button ${btn.index} {{${n}}}` });
      });
    });
  }

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNumber || !selectedTemplate || !phoneNumber) {
        throw new Error("Preencha todos os campos");
      }

      const response = await supabase.functions.invoke("send-template-message", {
        body: {
          whatsappNumberId: selectedNumber,
          to: phoneNumber,
          templateName: selectedTemplateData?.name,
          parameters,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "✅ Mensagem enviada!",
        description: "Enviado com sucesso.",
      });
      setPhoneNumber("");
      setParameters({});
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="section-header">
        <h1 className="section-title flex items-center gap-3">
          <div className="p-2 bg-success/10 rounded-xl">
            <Zap className="h-7 w-7 text-success" />
          </div>
          Disparo 1:1
        </h1>
        <p className="section-description">
          Envie mensagens individuais usando templates aprovados
        </p>
      </div>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Configuração do Envio</CardTitle>
          <CardDescription>Preencha os dados para enviar a mensagem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number" className="text-base">Número WhatsApp *</Label>
            <Select value={selectedNumber} onValueChange={setSelectedNumber}>
              <SelectTrigger id="whatsapp-number" className="h-12">
                <SelectValue placeholder="Selecione o número..." />
              </SelectTrigger>
              <SelectContent>
                {whatsappNumbers?.map((number) => (
                  <SelectItem key={number.id} value={number.id}>
                    {number.name} - {number.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template" className="text-base">Template *</Label>
            <Select
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
              disabled={!selectedNumber}
            >
              <SelectTrigger id="template" className="h-12">
                <SelectValue placeholder="Selecione o template..." />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} <Badge variant="outline" className="ml-2">{template.language}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-base">Número de Destino *</Label>
            <Input
              id="phone"
              placeholder="5511999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={!selectedTemplate}
              className="h-12 font-mono"
            />
          </div>

          {allVariables.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Variáveis do Template</h3>
              {allVariables.map((variable) => (
                <div key={variable.key} className="space-y-2">
                  <Label htmlFor={variable.key}>{variable.label}</Label>
                  <Input
                    id={variable.key}
                    placeholder={`Digite o valor`}
                    value={parameters[variable.key] || ""}
                    onChange={(e) =>
                      setParameters((prev) => ({ ...prev, [variable.key]: e.target.value }))
                    }
                    className="h-11"
                  />
                </div>
              ))}
            </div>
          )}

          {selectedTemplateData && (
            <div className="bg-muted/50 p-4 rounded-xl border">
              <h4 className="font-medium mb-2">📱 Preview</h4>
              <div className="bg-background p-4 rounded-lg">
                {structure?.body?.text || "Template sem corpo"}
              </div>
            </div>
          )}

          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!selectedNumber || !selectedTemplate || !phoneNumber || sendMutation.isPending}
            className="w-full bg-success hover:bg-success/90"
            size="lg"
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Enviar Mensagem
              </>
            )}
          </Button>

          {sendMutation.isSuccess && (
            <div className="flex items-center gap-2 p-4 text-success bg-success/10 rounded-xl border border-success/20">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Mensagem enviada com sucesso!</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
