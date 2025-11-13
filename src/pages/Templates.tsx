import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, MessageSquare, CheckCircle, XCircle, FileText } from "lucide-react";
import { TemplateMappingDialog } from "@/components/TemplateMappingDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/SkeletonLoader";

export default function Templates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const [mappingTemplate, setMappingTemplate] = useState<any>(null);

  const { data: whatsappNumbers } = useQuery({
    queryKey: ["whatsapp-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_numbers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false});
      
      if (error) throw error;
      return data;
    },
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates", selectedNumber],
    queryFn: async () => {
      if (!selectedNumber) return [];
      
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("whatsapp_number_id", selectedNumber)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedNumber,
  });

  const fetchTemplatesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNumber) throw new Error("Selecione um número WhatsApp");
      
      const response = await supabase.functions.invoke("fetch-templates", {
        body: { whatsappNumberId: selectedNumber },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Templates sincronizados!",
        description: `${data.count} templates atualizados com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao buscar templates",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("templates")
        .update({ is_active: isActive })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({
        title: "✅ Status atualizado",
      });
    },
  });

  const getVariablesCount = (structure: any) => {
    const bodyVars = structure?.body?.vars?.length || 0;
    const headerVars = structure?.header?.vars?.length || 0;
    const buttonVars = structure?.buttons?.reduce((acc: number, btn: any) => 
      acc + (btn.vars?.length || 0), 0) || 0;
    return bodyVars + headerVars + buttonVars;
  };

  const getLanguageLabel = (lang: string) => {
    const languages: Record<string, string> = {
      'pt_BR': '🇧🇷 Português',
      'en_US': '🇺🇸 Inglês',
      'es_ES': '🇪🇸 Espanhol',
      'en': '🇺🇸 Inglês',
      'pt': '🇧🇷 Português',
      'es': '🇪🇸 Espanhol',
    };
    return languages[lang] || lang;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start">
        <div className="section-header">
          <h1 className="section-title flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            Templates WhatsApp
          </h1>
          <p className="section-description">
            Gerencie os templates aprovados pela Meta
          </p>
        </div>
        <Button
          onClick={() => fetchTemplatesMutation.mutate()}
          disabled={!selectedNumber || fetchTemplatesMutation.isPending}
          size="lg"
        >
          {fetchTemplatesMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-5 w-5" />
              Buscar Templates
            </>
          )}
        </Button>
      </div>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Selecione o Número WhatsApp</CardTitle>
          <CardDescription>Escolha o número para visualizar seus templates</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedNumber} onValueChange={setSelectedNumber}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Escolha um número..." />
            </SelectTrigger>
            <SelectContent>
              {whatsappNumbers?.map((number) => (
                <SelectItem key={number.id} value={number.id}>
                  {number.name} - {number.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading && selectedNumber && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!selectedNumber && (
        <EmptyState
          icon={MessageSquare}
          title="Selecione um número WhatsApp"
          description="Escolha um número acima para visualizar seus templates"
        />
      )}

      {selectedNumber && !isLoading && templates && templates.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Nenhum template encontrado"
          description="Clique em 'Buscar Templates' para sincronizar com a Meta"
          actionLabel="Buscar Templates Agora"
          onAction={() => fetchTemplatesMutation.mutate()}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => {
          const structure = template.structure as any;
          const varsCount = getVariablesCount(structure);
          const hasMappings = template.mappings && Object.keys(template.mappings).length > 0;

          return (
            <Card key={template.id} className="premium-card hover:shadow-xl transition-all relative">
              {(template as any).auto_paused && (
                <div className="absolute top-4 right-4">
                  <Badge variant="destructive" className="font-semibold">
                    ⏸️ Auto-pausado
                  </Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge variant="outline">{getLanguageLabel(template.language)}</Badge>
                      <Badge
                        className={template.status === "APPROVED" ? "bg-success" : "bg-muted"}
                      >
                        {template.status}
                      </Badge>
                      {varsCount > 0 && (
                        <Badge variant="secondary">{varsCount} variáveis</Badge>
                      )}
                      {structure?.body?.vars?.some((v: any) => v.type === 'currency') && (
                        <Badge variant="outline">💰</Badge>
                      )}
                      {structure?.body?.vars?.some((v: any) => v.type === 'date_time') && (
                        <Badge variant="outline">📅</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-xl space-y-2 text-sm">
                  {structure?.header?.format && (
                    <div className="font-medium text-muted-foreground">
                      📎 Header: {structure.header.format}
                    </div>
                  )}
                  {structure?.body?.text && (
                    <div className="bg-background p-3 rounded-lg text-xs leading-relaxed">
                      {structure.body.text.substring(0, 150)}
                      {structure.body.text.length > 150 && "..."}
                    </div>
                  )}
                  {structure?.buttons?.length > 0 && (
                    <div className="text-xs text-muted-foreground pt-2">
                      🔘 {structure.buttons.length} botão(ões)
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.is_active && !(template as any).auto_paused}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: template.id, isActive: checked })
                      }
                      id={`active-${template.id}`}
                      disabled={(template as any).auto_paused}
                    />
                    <Label htmlFor={`active-${template.id}`} className="text-sm font-medium">
                      {template.is_active && !(template as any).auto_paused ? "Ativo" : "Inativo"}
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    {(template as any).auto_paused && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await supabase
                            .from('templates')
                            .update({ 
                              auto_paused: false, 
                              paused_at: null, 
                              pause_reason: null 
                            } as any)
                            .eq('id', template.id);
                          queryClient.invalidateQueries({ queryKey: ['templates'] });
                          toast({ title: "✅ Template reativado" });
                        }}
                      >
                        Reativar
                      </Button>
                    )}
                    {varsCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMappingTemplate(template)}
                      >
                        {hasMappings ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Editar
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1 h-3 w-3" />
                            Mapear
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {mappingTemplate && (
        <TemplateMappingDialog
          template={mappingTemplate}
          open={!!mappingTemplate}
          onOpenChange={(open) => !open && setMappingTemplate(null)}
        />
      )}
    </div>
  );
}
