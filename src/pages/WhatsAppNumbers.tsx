import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Power, PowerOff, Phone, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useDialog } from "@/contexts/DialogContext";
import { QualityRatingBadge } from "@/components/QualityRatingBadge";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/SkeletonLoader";

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
  const queryClient = useQueryClient();
  const { openWhatsAppNumberDialog } = useDialog();

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
      toast({ title: "✅ Status atualizado!" });
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
      toast({ title: "✅ Número excluído!" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Phone className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="section-title">Números WhatsApp</h1>
            </div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="section-header">
          <h1 className="section-title flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Phone className="h-7 w-7 text-primary" />
            </div>
            Números WhatsApp
          </h1>
          <p className="section-description">
            Gerencie suas contas WhatsApp Business API
          </p>
        </div>
        <Button size="lg" onClick={() => openWhatsAppNumberDialog()}>
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Número
        </Button>
      </div>

      {!numbers || numbers.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="Nenhum número WhatsApp cadastrado"
          description="Adicione seu primeiro número WhatsApp Business para começar a enviar mensagens"
          actionLabel="Adicionar Primeiro Número"
          onAction={() => openWhatsAppNumberDialog()}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {numbers.map((number) => (
            <Card key={number.id} className={`premium-card hover:shadow-xl transition-all ${!number.is_active ? "opacity-60" : ""}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      {number.name}
                    </CardTitle>
                    <CardDescription className="font-mono text-sm">
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
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">WABA ID:</span>
                    <p className="font-mono text-xs break-all mt-1">{number.waba_id}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">Phone ID:</span>
                    <p className="font-mono text-xs break-all mt-1">{number.phone_number_id}</p>
                  </div>
                  {number.display_name && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-xs text-muted-foreground">Nome de Exibição:</span>
                      <p className="text-xs mt-1 font-medium">{number.display_name}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openWhatsAppNumberDialog(number)}
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
                    className={number.is_active ? "hover:bg-destructive/10" : "hover:bg-success/10"}
                  >
                    {number.is_active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Deseja realmente excluir este número?")) {
                        deleteMutation.mutate(number.id);
                      }
                    }}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
