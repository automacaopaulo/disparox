import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Users, Search, UserCircle } from "lucide-react";
import { format } from "date-fns";

export default function Contatos() {
  const [search, setSearch] = useState("");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts", search],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`msisdn.ilike.%${search}%,name.ilike.%${search}%,cpf.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="section-header">
        <h1 className="section-title flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Users className="h-7 w-7 text-primary" />
          </div>
          Contatos
        </h1>
        <p className="section-description">
          Gerencie toda sua base de contatos WhatsApp
        </p>
      </div>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Contatos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 text-base"
            />
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

      {!isLoading && contacts && contacts.length === 0 && (
        <Card className="premium-card">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-muted/50 rounded-2xl">
                <Users className="h-16 w-16 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  {search ? "Nenhum contato encontrado" : "Nenhum contato cadastrado"}
                </h3>
                <p className="text-muted-foreground">
                  {search ? "Tente outro termo de busca" : "Os contatos são criados automaticamente ao receber mensagens"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contacts?.map((contact) => (
          <Card key={contact.id} className="premium-card hover:shadow-lg transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {contact.name || "Sem nome"}
                    </CardTitle>
                    <div className="font-mono text-sm text-muted-foreground mt-1">
                      {contact.msisdn}
                    </div>
                  </div>
                </div>
                {contact.opt_out && (
                  <Badge variant="destructive">Opt-out</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {contact.cpf && (
                <div className="text-sm p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">CPF:</span>{" "}
                  <span className="font-mono">{contact.cpf}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Cadastrado em {format(new Date(contact.created_at), "dd/MM/yyyy HH:mm")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
