import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
            <CardTitle>Webhook do WhatsApp</CardTitle>
            <CardDescription>
              Configure o webhook para receber mensagens dos leads e atualizações de status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Webhook URL */}
            <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-blue-900">🌐 URL do Webhook</Label>
                <Badge variant="default" className="bg-blue-600">1 webhook para todos os números</Badge>
              </div>
              <p className="text-sm text-blue-700 mb-2">
                Use esta URL única para TODOS os seus números WhatsApp no Meta Business Manager
              </p>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm bg-white"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(webhookUrl, 'webhook_url')}
                >
                  {copied === 'webhook_url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Token de Verificação */}
            <div className="space-y-2">
              <Label>🔑 Token de Verificação</Label>
              <div className="flex gap-2">
                <Input
                  value={configs?.webhook_verify_token || 'lovable_whatsapp_2025'}
                  readOnly
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(configs?.webhook_verify_token || 'lovable_whatsapp_2025', 'verify_token')}
                >
                  {copied === 'verify_token' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use este token ao configurar o webhook no Meta Business Manager
              </p>
            </div>

            {/* Instruções detalhadas */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-yellow-800">📋 Como Configurar (Passo a Passo):</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700">
                <li>
                  Acesse o <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Meta Business Manager</a>
                </li>
                <li>Vá em <strong>Configurações do App → WhatsApp → Configuração</strong></li>
                <li>Role até a seção <strong>Webhooks</strong> e clique em <strong>Editar</strong></li>
                <li>Cole a <strong>URL do Webhook</strong> acima (copie clicando no botão ☝️)</li>
                <li>Cole o <strong>Token de Verificação</strong> acima</li>
                <li>
                  Marque os seguintes campos de assinatura:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li><strong>messages</strong> - Para receber mensagens dos leads</li>
                    <li><strong>message_template_status_update</strong> - Para saber quando templates são pausados</li>
                  </ul>
                </li>
                <li>Clique em <strong>Verificar e Salvar</strong></li>
              </ol>
              
              <div className="bg-green-50 border border-green-200 p-3 rounded mt-3">
                <p className="text-sm font-semibold text-green-800">✅ O que o Webhook faz:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-700 mt-2">
                  <li>Recebe <strong>todas as mensagens</strong> que os leads enviam para você</li>
                  <li>Atualiza o <strong>status de entrega</strong> (enviado, entregue, lido)</li>
                  <li>Notifica quando um <strong>template é pausado</strong> pela Meta</li>
                  <li>Registra tudo na página <strong>Mensagens</strong> automaticamente</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 p-3 rounded mt-3">
                <p className="text-xs font-semibold text-red-800">⚠️ IMPORTANTE:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-red-700">
                  <li>Configure <strong>apenas 1 webhook</strong> por Business Manager</li>
                  <li>Não precisa configurar um webhook para cada número</li>
                  <li>O mesmo webhook receberá mensagens de TODOS os números</li>
                </ul>
              </div>
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
