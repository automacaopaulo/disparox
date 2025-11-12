import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Search, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";

export default function Mensagens() {
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", search, direction, status],
    queryFn: async () => {
      let query = supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`msisdn.ilike.%${search}%,template_name.ilike.%${search}%`);
      }

      if (direction !== "all") {
        query = query.eq("direction", direction);
      }

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-500";
      case "sent":
        return "bg-blue-500";
      case "read":
        return "bg-purple-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Mensagens</h2>
        <p className="text-muted-foreground mt-1">
          Histórico completo de mensagens enviadas e recebidas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Input
                placeholder="Buscar por número ou template..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger>
                  <SelectValue placeholder="Direção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="outbound">Enviadas</SelectItem>
                  <SelectItem value="inbound">Recebidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sent">Enviadas</SelectItem>
                  <SelectItem value="delivered">Entregues</SelectItem>
                  <SelectItem value="read">Lidas</SelectItem>
                  <SelectItem value="failed">Falhas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {!isLoading && messages && messages.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhuma mensagem encontrada com os filtros selecionados.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {messages?.map((message) => (
          <Card key={message.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div
                  className={`mt-1 p-2 rounded-full ${
                    message.direction === "outbound"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  {message.direction === "outbound" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-sm font-medium">
                        {message.msisdn}
                      </div>
                      {message.template_name && (
                        <div className="text-sm text-muted-foreground">
                          Template: {message.template_name}
                        </div>
                      )}
                    </div>
                    <Badge className={getStatusColor(message.status || "pending")}>
                      {message.status || "pending"}
                    </Badge>
                  </div>

                  {message.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-600">
                      <strong>Erro:</strong> {message.error_message}
                      {message.error_code && ` (Código: ${message.error_code})`}
                    </div>
                  )}

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(message.created_at), "dd/MM/yyyy HH:mm:ss")}
                    </span>
                    {message.message_id && (
                      <span className="font-mono">ID: {message.message_id}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
