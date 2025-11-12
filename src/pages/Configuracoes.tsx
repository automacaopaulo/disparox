import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Copy, Check, Settings } from "lucide-react";

export default function Configuracoes() {
  const [copied, setCopied] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Buscar configurações
  const { data: configs, isLoading } = useQuery({
    queryKey: ['app-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('*');
      
      if (error) throw error;
      
      const configMap: Record<string, string> = {};
      data?.forEach(c => {
        configMap[c.key] = c.value;
      });
      
      return configMap;
    },
  });

  // Mutation para atualizar config
  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('app_config')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-config'] });
      toast({
        title: "Configuração atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Copiado!",
      description: "Valor copiado para a área de transferência.",
    });
  };

  const handleSave = (key: string, value: string) => {
    updateConfigMutation.mutate({ key, value });
  };

  const webhookUrl = `${window.location.origin.replace('http:', 'https:')}/webhook`;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Configurações</h1>
        </div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Configurações</h1>
      </div>

      <div className="space-y-6">
        {/* Webhook */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook</CardTitle>
            <CardDescription>
              Configure o webhook para receber eventos do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL do Webhook</Label>
              <div className="flex gap-2 mt-1">
                <Input value={webhookUrl} readOnly />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(webhookUrl, 'webhook_url')}
                >
                  {copied === 'webhook_url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label>Token de Verificação</Label>
              <div className="flex gap-2 mt-1">
                <Input value={configs?.webhook_verify_token || ''} readOnly />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(configs?.webhook_verify_token || '', 'verify_token')}
                >
                  {copied === 'verify_token' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Use este token ao configurar o webhook no Meta Business
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Limites */}
        <Card>
          <CardHeader>
            <CardTitle>Limites e Performance</CardTitle>
            <CardDescription>
              Configure as taxas de envio e tentativas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Taxa de Processamento Padrão (msgs/seg)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  defaultValue={configs?.default_processing_rate || '40'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) handleSave('default_processing_rate', value);
                  }}
                />
              </div>
            </div>

            <div>
              <Label>Máximo de Tentativas de Reenvio</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  defaultValue={configs?.max_retry_count || '3'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) handleSave('max_retry_count', value);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Segurança */}
        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>
              Encurtadores de URL bloqueados (separados por vírgula)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Domínios Bloqueados</Label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md min-h-[100px]"
                defaultValue={
                  configs?.blocked_url_shorteners
                    ? JSON.parse(configs.blocked_url_shorteners).join(', ')
                    : ''
                }
                onBlur={(e) => {
                  const domains = e.target.value.split(',').map(d => d.trim()).filter(Boolean);
                  handleSave('blocked_url_shorteners', JSON.stringify(domains));
                }}
              />
              <p className="text-sm text-muted-foreground mt-1">
                URLs desses domínios serão bloqueadas automaticamente
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
