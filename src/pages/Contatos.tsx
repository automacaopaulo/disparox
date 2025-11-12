import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Users, Search } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Contatos</h2>
        <p className="text-muted-foreground mt-1">
          Gerencie sua base de contatos WhatsApp
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Contatos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por número, nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {!isLoading && contacts && contacts.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search
                ? "Nenhum contato encontrado com esse critério de busca."
                : "Nenhum contato cadastrado ainda. Os contatos são criados automaticamente ao receber mensagens."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contacts?.map((contact) => (
          <Card key={contact.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">
                    {contact.name || "Sem nome"}
                  </CardTitle>
                  <div className="font-mono text-sm text-muted-foreground mt-1">
                    {contact.msisdn}
                  </div>
                </div>
                {contact.opt_out && (
                  <Badge variant="destructive">Opt-out</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {contact.cpf && (
                <div className="text-sm">
                  <span className="text-muted-foreground">CPF:</span>{" "}
                  {contact.cpf}
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
