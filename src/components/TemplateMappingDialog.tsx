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
  const allVariables: { type: string; index: number; label: string }[] = [];

  // Coletar todas as variáveis
  structure.body?.vars?.forEach((n: number) => {
    allVariables.push({ type: "body", index: n, label: `Body {{${n}}}` });
  });

  structure.header?.vars?.forEach((n: number) => {
    allVariables.push({ type: "header", index: n, label: `Header {{${n}}}` });
  });

  structure.buttons?.forEach((btn: any) => {
    btn.vars?.forEach((n: number) => {
      allVariables.push({
        type: `button_${btn.index}`,
        index: n,
        label: `Button ${btn.index} {{${n}}}`,
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

  const updateMapping = (varKey: string, field: string, value: string) => {
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

          {allVariables.map((variable) => {
            const varKey = `${variable.type}_${variable.index}`;
            const mapping = mappings[varKey] || { type: "column", value: "" };

            return (
              <div key={varKey} className="space-y-2 border-b pb-4">
                <Label className="font-medium">{variable.label}</Label>
                
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
                          ? "Ex: nome, telefone, empresa..."
                          : "Digite o valor fixo..."
                      }
                      value={mapping.value || ""}
                      onChange={(e) => updateMapping(varKey, "value", e.target.value)}
                    />
                  </div>
                </div>

                {mapping.type === "column" && (
                  <p className="text-xs text-muted-foreground">
                    💡 O nome deve corresponder exatamente ao cabeçalho da coluna no CSV
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
