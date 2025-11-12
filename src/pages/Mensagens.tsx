import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Search, User, Phone } from "lucide-react";
import { format } from "date-fns";

export default function Mensagens() {
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Atualiza a cada 5 segundos para pegar novas mensagens
  });

  // Agrupar mensagens por conversa (por número)
  const conversations = messages?.reduce((acc: any, msg) => {
    const key = msg.msisdn;
    if (!acc[key]) {
      acc[key] = {
        msisdn: msg.msisdn,
        messages: [],
        lastMessage: msg.created_at,
        hasInbound: false,
      };
    }
    acc[key].messages.push(msg);
    if (msg.direction === 'inbound') {
      acc[key].hasInbound = true;
    }
    return acc;
  }, {});

  const conversationList = Object.values(conversations || {})
    .sort((a: any, b: any) => new Date(b.lastMessage).getTime() - new Date(a.lastMessage).getTime())
    .filter((conv: any) => {
      if (searchQuery && !conv.msisdn.includes(searchQuery)) return false;
      if (directionFilter === "inbound" && !conv.hasInbound) return false;
      if (directionFilter === "outbound" && conv.hasInbound) return false;
      return true;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
      case "received":
        return "bg-blue-500";
      case "read":
        return "bg-green-500";
      case "sent":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "delivered":
        return "Entregue";
      case "read":
        return "Lido";
      case "sent":
        return "Enviado";
      case "failed":
        return "Falhou";
      case "received":
        return "Recebido";
      case "pending":
        return "Pendente";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Mensagens</h2>
        <p className="text-muted-foreground mt-1">
          Histórico completo de mensagens enviadas e recebidas dos leads
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Mensagem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Conversas</SelectItem>
                <SelectItem value="inbound">📩 Conversas com Respostas (Leads)</SelectItem>
                <SelectItem value="outbound">📤 Apenas Enviadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Aviso sobre Webhook */}
      {conversationList.filter((c: any) => c.hasInbound).length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-blue-900">Configure o Webhook para Receber Mensagens!</p>
                <p className="text-sm text-blue-700">
                  Para ver as respostas dos leads aqui, você precisa configurar o webhook em{" "}
                  <a href="/configuracoes" className="underline font-medium">Configurações → Webhook</a>
                </p>
                <p className="text-xs text-blue-600">
                  O webhook permite que o sistema receba automaticamente todas as respostas enviadas pelos seus contatos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {!isLoading && conversationList.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhuma mensagem encontrada
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de Conversas */}
      <div className="grid gap-4">
        {conversationList.map((conversation: any) => {
          const lastMsg = conversation.messages[0];
          const inboundCount = conversation.messages.filter((m: any) => m.direction === 'inbound').length;
          
          return (
            <Card key={conversation.msisdn} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {conversation.hasInbound ? (
                        <User className="h-6 w-6 text-primary" />
                      ) : (
                        <Phone className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-mono">{conversation.msisdn}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {conversation.messages.length} mensagens
                        </Badge>
                        {inboundCount > 0 && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            📩 {inboundCount} respostas do lead
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(lastMsg.status)}>
                    {getStatusLabel(lastMsg.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Timeline de mensagens */}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {conversation.messages.slice(0, 10).map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.direction === 'inbound'
                          ? 'bg-blue-50 border-l-4 border-blue-500 ml-6'
                          : 'bg-gray-50 border-l-4 border-gray-300 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {msg.direction === 'inbound' ? (
                            <Badge variant="default" className="text-xs bg-blue-600">
                              📩 LEAD RESPONDEU
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              📤 Você enviou
                            </Badge>
                          )}
                          {msg.template_name && (
                            <Badge variant="secondary" className="text-xs">
                              {msg.template_name}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), "dd/MM HH:mm")}
                        </span>
                      </div>
                      
                      {msg.content && (
                        <div className="text-sm mt-2">
                          {typeof msg.content === 'object' ? (
                            msg.content.text?.body ? (
                              <p className="text-gray-700 font-medium">{msg.content.text.body}</p>
                            ) : (
                              <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                                {JSON.stringify(msg.content, null, 2)}
                              </pre>
                            )
                          ) : (
                            <p className="text-gray-700">{msg.content}</p>
                          )}
                        </div>
                      )}
                      
                      {msg.error_message && (
                        <div className="text-xs text-red-600 mt-2">
                          ❌ Erro: {msg.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {conversation.messages.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">
                    + {conversation.messages.length - 10} mensagens mais antigas
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
