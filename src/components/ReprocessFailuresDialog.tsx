import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ReprocessFailuresDialogProps {
  campaign: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReprocessFailuresDialog({ campaign, open, onOpenChange }: ReprocessFailuresDialogProps) {
  const [selectedErrorCodes, setSelectedErrorCodes] = useState<string[]>([]);
  const [newTemplate, setNewTemplate] = useState<string>("");
  const queryClient = useQueryClient();

  // Buscar resumo de erros
  const { data: errorSummary } = useQuery({
    queryKey: ['campaign-errors', campaign?.id],
    queryFn: async () => {
      if (!campaign) return null;
      
      const { data, error } = await supabase
        .from('campaign_items')
        .select('error_code, error_message')
        .eq('campaign_id', campaign.id)
        .eq('status', 'failed');
      
      if (error) throw error;
      
      // Agrupar por código de erro
      const summary: Record<string, { count: number; message: string }> = {};
      data?.forEach(item => {
        const code = item.error_code || 'unknown';
        if (!summary[code]) {
          summary[code] = { count: 0, message: item.error_message || '' };
        }
        summary[code].count++;
      });
      
      return summary;
    },
    enabled: open && !!campaign,
  });

  // Buscar templates disponíveis
  const { data: templates } = useQuery({
    queryKey: ['templates-for-reprocess', campaign?.whatsapp_number_id],
    queryFn: async () => {
      if (!campaign) return [];
      
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('whatsapp_number_id', campaign.whatsapp_number_id)
        .eq('is_active', true)
        .eq('status', 'APPROVED');
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!campaign,
  });

  const reprocessMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('reprocess-campaign-failures', {
        body: {
          campaignId: campaign.id,
          errorCodes: selectedErrorCodes.length > 0 ? selectedErrorCodes : undefined,
          newTemplateName: newTemplate || undefined,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Reprocessamento iniciado",
        description: `${data.reprocessed} itens serão reprocessados`,
      });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-items'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reprocessar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const totalFailed = campaign?.failed || 0;
  const selectedCount = selectedErrorCodes.length > 0
    ? selectedErrorCodes.reduce((acc, code) => acc + (errorSummary?.[code]?.count || 0), 0)
    : totalFailed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reprocessar Falhas</DialogTitle>
          <DialogDescription>
            Campanha: {campaign?.name} - {totalFailed} itens falhados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumo de erros */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Erros Encontrados</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
              {errorSummary && Object.entries(errorSummary).map(([code, info]) => (
                <div key={code} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                  <Checkbox
                    id={`error-${code}`}
                    checked={selectedErrorCodes.includes(code)}
                    onCheckedChange={(checked) => {
                      setSelectedErrorCodes(prev =>
                        checked
                          ? [...prev, code]
                          : prev.filter(c => c !== code)
                      );
                    }}
                  />
                  <label htmlFor={`error-${code}`} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <Badge variant="destructive" className="mr-2">{code}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {info.message.substring(0, 60)}...
                        </span>
                      </div>
                      <Badge variant="outline">{info.count} itens</Badge>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedErrorCodes.length === 0
                ? "Nenhum código selecionado - todos os erros serão reprocessados"
                : `${selectedCount} itens serão reprocessados`}
            </p>
          </div>

          {/* Selecionar novo template */}
          <div>
            <Label htmlFor="new-template">Novo Template (Opcional)</Label>
            <Select value={newTemplate} onValueChange={setNewTemplate}>
              <SelectTrigger id="new-template">
                <SelectValue placeholder="Manter template original..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Manter template original</SelectItem>
                {templates?.map(t => (
                  <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Se não selecionar, usará o template original da campanha
            </p>
          </div>

          {/* Aviso */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Os itens selecionados terão seus status resetados para "pending" 
              e serão processados novamente. Verifique se os problemas que causaram as falhas foram resolvidos.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => reprocessMutation.mutate()}
            disabled={reprocessMutation.isPending}
          >
            {reprocessMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reprocessando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reprocessar {selectedCount} Itens
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
