import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { WhatsAppNumberDialog } from "@/components/WhatsAppNumberDialog";
import { QualityRatingBadge } from "@/components/QualityRatingBadge";

interface WhatsAppNumber {
  id: string;
  name: string;
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  business_account_id: string | null;
  phone_number: string | null;
  display_name: string | null;
  quality_rating: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export default function WhatsAppNumbers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<WhatsAppNumber | null>(null);
  const queryClient = useQueryClient();

  const { data: numbers, isLoading } = useQuery({
    queryKey: ["whatsapp-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_numbers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WhatsAppNumber[];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_numbers")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-numbers"] });
      toast({ title: "Status atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_numbers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-numbers"] });
      toast({ title: "Número excluído com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir número",
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const getQualityColor = (rating: string | null) => {
    switch (rating?.toUpperCase()) {
      case "GREEN": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "YELLOW": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "RED": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Números WhatsApp</h2>
        </div>
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Números WhatsApp</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie suas contas WhatsApp Business
          </p>
        </div>
        <Button onClick={() => {
          setEditingNumber(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Número
        </Button>
      </div>

      {!numbers || numbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center mb-4">
              Nenhum número WhatsApp cadastrado ainda.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Número
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {numbers.map((number) => (
            <Card key={number.id} className={!number.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{number.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {number.phone_number || number.phone_number_id}
                    </CardDescription>
                  </div>
                  <QualityRatingBadge 
                    rating={number.quality_rating} 
                    updatedAt={number.updated_at}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">WABA ID:</span>
                    <p className="font-mono text-xs break-all">{number.waba_id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone ID:</span>
                    <p className="font-mono text-xs break-all">{number.phone_number_id}</p>
                  </div>
                  {number.display_name && (
                    <div>
                      <span className="text-muted-foreground">Nome:</span>
                      <p className="text-xs">{number.display_name}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingNumber(number);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActiveMutation.mutate({
                      id: number.id,
                      is_active: !number.is_active
                    })}
                  >
                    {number.is_active ? (
                      <PowerOff className="h-3 w-3" />
                    ) : (
                      <Power className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Deseja realmente excluir este número?")) {
                        deleteMutation.mutate(number.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WhatsAppNumberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingNumber={editingNumber}
      />
    </div>
  );
}
