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
import { Copy, Check, Settings, Globe, Zap, Shield } from "lucide-react";

export default function Configuracoes() {
  const [copied, setCopied] = useState<string | null>(null);
  const queryClient = useQueryClient();

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
        title: "✅ Configuração atualizada",
        description: "As alterações foram salvas.",
      });
    },
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "📋 Copiado!",
      description: "Valor copiado para área de transferência.",
    });
  };

  const handleSave = (key: string, value: string) => {
    updateConfigMutation.mutate({ key, value });
  };

  const webhookUrl = `https://vdihusamibhboeuaavlu.supabase.co/functions/v1/whatsapp-webhook`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="section-header">
        <h1 className="section-title flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Settings className="h-7 w-7 text-primary" />
          </div>
          Configurações
        </h1>
        <p className="section-description">
          Configure integrações e parâmetros do sistema
        </p>
      </div>

      {/* Webhook */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Webhook do WhatsApp
          </CardTitle>
          <CardDescription>
            Configure o webhook para receber mensagens e atualizações de status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">🌐 URL do Webhook</Label>
              <Badge className="bg-primary">1 webhook para todos</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Use esta URL única para TODOS os números WhatsApp
            </p>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-sm bg-background"
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
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Limites */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Performance e Limites
          </CardTitle>
          <CardDescription>
            Configure taxas de envio e tentativas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Taxa Padrão (msgs/seg)</Label>
            <Input
              type="number"
              defaultValue={configs?.default_processing_rate || '40'}
              onChange={(e) => {
                const value = e.target.value;
                if (value) handleSave('default_processing_rate', value);
              }}
            />
          </div>

          <div>
            <Label>Máximo de Tentativas</Label>
            <Input
              type="number"
              defaultValue={configs?.max_retry_count || '3'}
              onChange={(e) => {
                const value = e.target.value;
                if (value) handleSave('max_retry_count', value);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
