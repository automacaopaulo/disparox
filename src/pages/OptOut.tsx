import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { UserX, Search, RefreshCw, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function OptOut() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: optOutContacts, isLoading } = useQuery({
    queryKey: ["opt-out-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("opt_out", true)
        .order("opt_out_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (msisdn: string) => {
      const { error } = await supabase
        .from("contacts")
        .update({
          opt_out: false,
          opt_out_reason: null,
          opt_out_date: null,
        })
        .eq("msisdn", msisdn);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opt-out-contacts"] });
      toast({
        title: "✅ Contato reativado",
        description: "O contato pode receber mensagens novamente",
      });
    },
    onError: () => {
      toast({
        title: "❌ Erro ao reativar",
        description: "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const filteredContacts = optOutContacts?.filter((contact) =>
    contact.msisdn.includes(searchQuery) ||
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Opt-Out (STOP)</h2>
        <p className="text-muted-foreground mt-1">
          Contatos que solicitaram não receber mensagens
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Opt-Out</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{optOutContacts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Contatos bloqueados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistema Automático</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Ativo</div>
            <p className="text-xs text-muted-foreground">
              Detecta STOP/PARAR automaticamente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conformidade</CardTitle>
            <Badge className="bg-green-600">100%</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">WhatsApp</div>
            <p className="text-xs text-muted-foreground">
              Regras da Meta seguidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Aviso informativo */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <UserX className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-900">Sistema Automático de Opt-Out</p>
              <p className="text-sm text-blue-700">
                Quando um lead responde com palavras como "STOP", "PARAR", "CANCELAR", etc., 
                ele é automaticamente bloqueado de receber futuras mensagens.
              </p>
              <p className="text-xs text-blue-600">
                Palavras detectadas: STOP, PARAR, PARE, CANCELAR, CANCEL, UNSUBSCRIBE, 
                DESCADASTRAR, REMOVER, SAIR, BASTA, CHEGA, e variações.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {!isLoading && filteredContacts?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <UserX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? "Nenhum contato encontrado" : "Nenhum contato fez opt-out ainda 🎉"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de contatos */}
      <div className="grid gap-4">
        {filteredContacts?.map((contact) => (
          <Card key={contact.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-semibold text-lg">{contact.msisdn}</p>
                    <Badge variant="destructive">Opt-Out</Badge>
                  </div>
                  
                  {contact.name && (
                    <p className="text-sm text-muted-foreground">{contact.name}</p>
                  )}

                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Motivo:</span>{" "}
                      <span className="text-muted-foreground">
                        {contact.opt_out_reason || "Não especificado"}
                      </span>
                    </p>
                    
                    {contact.opt_out_date && (
                      <p className="text-xs text-muted-foreground">
                        Data: {format(new Date(contact.opt_out_date), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reactivateMutation.mutate(contact.msisdn)}
                  disabled={reactivateMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reativar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}