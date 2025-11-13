import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { UserX, Search, RefreshCw, CheckCircle, Shield, TrendingDown } from "lucide-react";
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
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header Premium */}
      <div className="section-header">
        <h1 className="section-title flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-xl">
            <UserX className="h-7 w-7 text-destructive" />
          </div>
          Opt-Out (STOP)
        </h1>
        <p className="section-description">
          Gerencie contatos que solicitaram não receber mais mensagens
        </p>
      </div>

      {/* KPIs Premium */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="premium-card border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Opt-Out
            </CardTitle>
            <div className="p-2 bg-destructive/10 rounded-lg">
              <UserX className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-destructive">
              {optOutContacts?.length || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Contatos bloqueados
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card border-success/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sistema Automático
            </CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-success">
              Ativo
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Detecta STOP/PARAR automaticamente
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conformidade Meta
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-primary">
              100%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Regras WhatsApp seguidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca Premium */}
      <Card className="premium-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou nome do contato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Box Premium */}
      <Card className="premium-card border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <p className="font-semibold text-lg mb-1">🛡️ Sistema Automático de Opt-Out</p>
                <p className="text-muted-foreground">
                  Quando um lead responde com palavras de cancelamento, ele é automaticamente bloqueado de receber futuras mensagens, conforme as políticas da Meta.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2 mt-4">
                <div className="p-3 bg-background/80 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Palavras Detectadas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['STOP', 'PARAR', 'PARE', 'CANCELAR', 'CANCEL', 'UNSUBSCRIBE', 'DESCADASTRAR', 'REMOVER', 'SAIR'].map(word => (
                      <Badge key={word} variant="outline" className="text-xs">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-xs font-semibold text-success-foreground mb-1">✅ Benefícios</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Protege sua reputação</li>
                    <li>• Evita bloqueios da Meta</li>
                    <li>• Mantém qualidade alta</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Carregando contatos...</p>
          </div>
        </div>
      )}

      {!isLoading && filteredContacts?.length === 0 && (
        <Card className="premium-card">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-success/10 rounded-2xl">
                <CheckCircle className="h-16 w-16 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  {searchQuery ? "Nenhum contato encontrado" : "🎉 Nenhum opt-out registrado!"}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Tente outro termo de busca" : "Todos os seus leads estão ativos e engajados"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista Premium */}
      <div className="grid gap-4">
        {filteredContacts?.map((contact) => (
          <Card key={contact.id} className="premium-card hover:shadow-lg transition-all duration-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-destructive/10 rounded-xl">
                    <UserX className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-mono font-bold text-xl">{contact.msisdn}</p>
                      <Badge variant="destructive" className="font-semibold">
                        Opt-Out
                      </Badge>
                    </div>
                    
                    {contact.name && (
                      <p className="text-muted-foreground">{contact.name}</p>
                    )}

                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Motivo</p>
                        <p className="text-sm font-medium">
                          {contact.opt_out_reason || "Não especificado"}
                        </p>
                      </div>
                      
                      {contact.opt_out_date && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Data do Opt-Out</p>
                          <p className="text-sm font-medium">
                            {format(new Date(contact.opt_out_date), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => reactivateMutation.mutate(contact.msisdn)}
                  disabled={reactivateMutation.isPending}
                  className="hover:bg-success/10 hover:text-success hover:border-success"
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
