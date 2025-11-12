import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface TemplateMappingDialogProps {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateMappingDialog({
  template,
  open,
  onOpenChange,
}: TemplateMappingDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mappings, setMappings] = useState<any>(template.mappings || {});

  const structure = template.structure;
  const allVariables: { type: string; index: number; label: string; varType: string }[] = [];

  // Coletar todas as variáveis do body
  structure.body?.vars?.forEach((v: any) => {
    const varIndex = typeof v === 'number' ? v : v.index;
    const varType = typeof v === 'object' ? v.type : 'text';
    allVariables.push({ 
      type: "body", 
      index: varIndex, 
      label: `Body {{${varIndex}}}`,
      varType 
    });
  });

  // Coletar todas as variáveis do header
  structure.header?.vars?.forEach((v: any) => {
    const varIndex = typeof v === 'number' ? v : v.index;
    const varType = typeof v === 'object' ? v.type : 'text';
    allVariables.push({ 
      type: "header", 
      index: varIndex, 
      label: `Header {{${varIndex}}}`,
      varType 
    });
  });

  // Coletar todas as variáveis dos botões
  structure.buttons?.forEach((btn: any) => {
    btn.vars?.forEach((v: any) => {
      const varIndex = typeof v === 'number' ? v : v.index;
      const varType = typeof v === 'object' ? v.type : 'text';
      allVariables.push({
        type: `button_${btn.index}`,
        index: varIndex,
        label: `Button ${btn.index} {{${varIndex}}}`,
        varType
      });
    });
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("templates")
        .update({ mappings })
        .eq("id", template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Mapeamento salvo!",
        description: "As configurações foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMapping = (varKey: string, field: string, value: string | boolean) => {
    setMappings((prev: any) => ({
      ...prev,
      [varKey]: {
        ...prev[varKey],
        [field]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mapeamento de Variáveis</DialogTitle>
          <DialogDescription>
            Configure como cada variável do template será preenchida a partir do CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge>{template.name}</Badge>
              <Badge variant="outline">{allVariables.length} variáveis</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Para cada variável, escolha se será preenchida com uma coluna do CSV ou um valor fixo.
            </p>
          </div>

          {/* Header Media URL (se o header for imagem/vídeo/doc) */}
          {structure.header?.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(structure.header.format) && (
            <div className="space-y-2 border-b pb-4 bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="font-medium">Header Media URL</Label>
                <Badge variant="secondary" className="text-xs">
                  {structure.header.format === 'IMAGE' && '🖼️ Imagem'}
                  {structure.header.format === 'VIDEO' && '🎥 Vídeo'}
                  {structure.header.format === 'DOCUMENT' && '📄 Documento'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select
                    value={mappings.header_media?.type || "column"}
                    onValueChange={(value) => updateMapping("header_media", "type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="column">Coluna do CSV</SelectItem>
                      <SelectItem value="fixed">URL Fixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {mappings.header_media?.type === "column" ? "Nome da Coluna" : "URL"}
                  </Label>
                  <Input
                    placeholder={
                      mappings.header_media?.type === "column"
                        ? "Ex: imagem_url, foto, link..."
                        : "https://exemplo.com/imagem.jpg"
                    }
                    value={mappings.header_media?.value || ""}
                    onChange={(e) => updateMapping("header_media", "value", e.target.value)}
                  />
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                🔗 A URL deve apontar para um arquivo acessível publicamente
              </p>
            </div>
          )}

          {allVariables.map((variable) => {
            const varKey = `${variable.type}_${variable.index}`;
            const mapping = mappings[varKey] || { type: "column", value: "" };
            const isButtonVar = variable.type.startsWith('button_');

            return (
              <div key={varKey} className="space-y-2 border-b pb-4">
                <div className="flex items-center gap-2">
                  <Label className="font-medium">{variable.label}</Label>
                  <Badge variant="secondary" className="text-xs">
                    {variable.varType === 'currency' && '💰 Moeda'}
                    {variable.varType === 'date_time' && '📅 Data/Hora'}
                    {variable.varType === 'text' && '📝 Texto'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <Select
                      value={mapping.type}
                      onValueChange={(value) => updateMapping(varKey, "type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="column">Coluna do CSV</SelectItem>
                        <SelectItem value="fixed">Valor Fixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {mapping.type === "column" ? "Nome da Coluna" : "Valor"}
                    </Label>
                    <Input
                      placeholder={
                        mapping.type === "column"
                          ? variable.varType === 'currency' 
                            ? "Ex: valor, preco, total..."
                            : variable.varType === 'date_time'
                            ? "Ex: data, prazo, vencimento..."
                            : "Ex: nome, telefone, empresa..."
                          : variable.varType === 'currency'
                          ? "Ex: R$ 100,00"
                          : variable.varType === 'date_time'
                          ? "Ex: 01/01/2024"
                          : "Digite o valor fixo..."
                      }
                      value={mapping.value || ""}
                      onChange={(e) => updateMapping(varKey, "value", e.target.value)}
                    />
                  </div>
                </div>

                {/* omitIfEmpty para variáveis de botão */}
                {isButtonVar && (
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id={`omit-${varKey}`}
                      checked={mapping.omitIfEmpty || false}
                      onCheckedChange={(checked) => updateMapping(varKey, "omitIfEmpty", checked)}
                    />
                    <Label htmlFor={`omit-${varKey}`} className="text-xs cursor-pointer">
                      Omitir botão se variável estiver vazia (evita links quebrados)
                    </Label>
                  </div>
                )}

                {mapping.type === "column" && (
                  <p className="text-xs text-muted-foreground">
                    💡 O nome deve corresponder exatamente ao cabeçalho da coluna no CSV
                  </p>
                )}
                
                {variable.varType === 'currency' && (
                  <p className="text-xs text-muted-foreground">
                    💰 Para moeda, use formato: R$ 100,00 ou apenas números
                  </p>
                )}
                
                {variable.varType === 'date_time' && (
                  <p className="text-xs text-muted-foreground">
                    📅 Para data, use formato: DD/MM/YYYY ou qualquer formato de data
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Mapeamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
