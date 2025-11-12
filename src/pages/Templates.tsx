import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, MessageSquare, CheckCircle, XCircle } from "lucide-react";
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
        .order("created_at", { ascending: false });
      
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
        title: "Templates atualizados!",
        description: `${data.count} templates foram sincronizados com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao buscar templates",
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
        title: "Status atualizado",
        description: "Template atualizado com sucesso.",
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

  const getVariablesCount = (structure: any) => {
    const bodyVars = structure?.body?.vars?.length || 0;
    const headerVars = structure?.header?.vars?.length || 0;
    const buttonVars = structure?.buttons?.reduce((acc: number, btn: any) => 
      acc + (btn.vars?.length || 0), 0) || 0;
    return bodyVars + headerVars + buttonVars;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">Templates WhatsApp</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie os templates aprovados pela Meta
          </p>
        </div>
        <Button
          onClick={() => fetchTemplatesMutation.mutate()}
          disabled={!selectedNumber || fetchTemplatesMutation.isPending}
        >
          {fetchTemplatesMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Buscar Templates
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecione o Número WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedNumber} onValueChange={setSelectedNumber}>
            <SelectTrigger>
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
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!selectedNumber && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Selecione um número WhatsApp para ver os templates
          </CardContent>
        </Card>
      )}

      {selectedNumber && !isLoading && templates && templates.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhum template encontrado. Clique em "Buscar Templates" para sincronizar.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => {
          const structure = template.structure as any;
          const varsCount = getVariablesCount(structure);
          const hasMappings = template.mappings && Object.keys(template.mappings).length > 0;

          return (
            <Card key={template.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{template.language}</Badge>
                      <Badge
                        variant={template.status === "APPROVED" ? "default" : "secondary"}
                      >
                        {template.status}
                      </Badge>
                      {varsCount > 0 && (
                        <Badge variant="secondary">{varsCount} variáveis</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview do template */}
                <div className="text-sm space-y-2">
                  {structure?.header?.format && (
                    <div className="font-medium text-muted-foreground">
                      Header: {structure.header.format}
                    </div>
                  )}
                  {structure?.body?.text && (
                    <div className="bg-muted p-2 rounded text-xs">
                      {structure.body.text.substring(0, 100)}
                      {structure.body.text.length > 100 && "..."}
                    </div>
                  )}
                  {structure?.buttons?.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {structure.buttons.length} botão(ões)
                    </div>
                  )}
                </div>

                {/* Status e ações */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: template.id, isActive: checked })
                      }
                      id={`active-${template.id}`}
                    />
                    <Label htmlFor={`active-${template.id}`} className="text-sm">
                      {template.is_active ? "Ativo" : "Inativo"}
                    </Label>
                  </div>

                  {varsCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMappingTemplate(template)}
                    >
                      {hasMappings ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Editar Mapeamento
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          Criar Mapeamento
                        </>
                      )}
                    </Button>
                  )}
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
