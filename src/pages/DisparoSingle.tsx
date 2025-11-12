import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle } from "lucide-react";
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
        throw new Error("Preencha todos os campos obrigatórios");
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
        title: "Mensagem enviada!",
        description: "A mensagem foi enviada com sucesso.",
      });
      // Limpar formulário
      setPhoneNumber("");
      setParameters({});
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold">Disparo 1:1</h2>
        <p className="text-muted-foreground mt-1">
          Envie mensagens individuais usando templates aprovados
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração do Envio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Número WhatsApp */}
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

          {/* Template */}
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
                    <div className="flex items-center gap-2">
                      {template.name}
                      <Badge variant="outline" className="ml-2">
                        {template.language}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedNumber && templates?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum template ativo encontrado. Ative templates na página de Templates.
              </p>
            )}
          </div>

          {/* Número de destino */}
          <div className="space-y-2">
            <Label htmlFor="phone">Número de Destino *</Label>
            <Input
              id="phone"
              placeholder="5511999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={!selectedTemplate}
            />
            <p className="text-xs text-muted-foreground">
              Formato: DDI + DDD + Número (ex: 5511999999999)
            </p>
          </div>

          {/* Variáveis do template */}
          {allVariables.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Variáveis do Template</h3>
                <Badge>{allVariables.length} campos</Badge>
              </div>
              
              {allVariables.map((variable) => (
                <div key={variable.key} className="space-y-2">
                  <Label htmlFor={variable.key}>{variable.label}</Label>
                  <Input
                    id={variable.key}
                    placeholder={`Digite o valor para ${variable.label}`}
                    value={parameters[variable.key] || ""}
                    onChange={(e) =>
                      setParameters((prev) => ({ ...prev, [variable.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {selectedTemplateData && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Preview da Mensagem</h4>
              <div className="bg-background p-3 rounded text-sm">
                {structure?.body?.text || "Template sem corpo definido"}
              </div>
              {structure?.buttons?.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {structure.buttons.length} botão(ões) incluído(s)
                </div>
              )}
            </div>
          )}

          {/* Botão enviar */}
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={
              !selectedNumber ||
              !selectedTemplate ||
              !phoneNumber ||
              sendMutation.isPending
            }
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
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded">
              <CheckCircle className="h-4 w-4" />
              Mensagem enviada com sucesso!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
