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
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Enviar Mensagem Individual</CardTitle>
          <CardDescription>Preencha os dados abaixo para enviar uma mensagem via template</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number">Número WhatsApp *</Label>
            <Select value={selectedNumber} onValueChange={setSelectedNumber}>
              <SelectTrigger id="whatsapp-number">
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
            <Label htmlFor="template">Template *</Label>
            <Select
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
              disabled={!selectedNumber}
            >
              <SelectTrigger id="template">
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
            <Label htmlFor="phone">Número de Destino *</Label>
            <Input
              id="phone"
              placeholder="5511999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={!selectedTemplate}
              className="font-mono"
            />
          </div>

          {allVariables.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <h3 className="font-semibold text-sm">Variáveis do Template</h3>
              {allVariables.map((variable) => (
                <div key={variable.key} className="space-y-2">
                  <Label htmlFor={variable.key} className="text-sm">{variable.label}</Label>
                  <Input
                    id={variable.key}
                    placeholder="Digite o valor"
                    value={parameters[variable.key] || ""}
                    onChange={(e) =>
                      setParameters((prev) => ({ ...prev, [variable.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {selectedTemplateData && (
            <div className="bg-muted/50 p-4 rounded-lg border">
              <h4 className="font-semibold text-sm mb-2">Preview da Mensagem</h4>
              <div className="bg-background p-3 rounded border">
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {structure?.body?.text || "Template sem corpo"}
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!selectedNumber || !selectedTemplate || !phoneNumber || sendMutation.isPending}
            className="w-full"
            size="lg"
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Mensagem
              </>
            )}
          </Button>

          {sendMutation.isSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-900">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Mensagem enviada com sucesso!</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
