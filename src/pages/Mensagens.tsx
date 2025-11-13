import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Search, User, Phone, Clock, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/SkeletonLoader";

export default function Mensagens() {
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [selectedNumber, setSelectedNumber] = useState("all");

  const { data: whatsappNumbers } = useQuery({
    queryKey: ["whatsapp_numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_numbers")
        .select("id, display_name, phone_number_id")
        .eq("is_active", true)
        .order("display_name");
      
      if (error) throw error;
      return data;
    },
  });

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
    refetchInterval: 5000,
  });

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
      
      if (selectedNumber !== "all") {
        const hasMessageFromNumber = conv.messages.some(
          (msg: any) => msg.whatsapp_number_id === selectedNumber
        );
        if (!hasMessageFromNumber) return false;
      }
      
      return true;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
      case "received":
        return "bg-primary text-primary-foreground";
      case "read":
        return "bg-success text-success-foreground";
      case "sent":
        return "bg-warning text-warning-foreground";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "delivered": return "Entregue";
      case "read": return "Lido";
      case "sent": return "Enviado";
      case "failed": return "Falhou";
      case "received": return "Recebido";
      case "pending": return "Pendente";
      default: return status;
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="section-header">
        <h1 className="section-title flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          Mensagens
        </h1>
        <p className="section-description">
          Histórico completo de mensagens e conversas com leads
        </p>
      </div>

      {/* Filtros Premium */}
      <Card className="premium-card">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12"
              />
            </div>
            
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📱 Todas as Conversas</SelectItem>
                <SelectItem value="inbound">📩 Com Respostas de Leads</SelectItem>
                <SelectItem value="outbound">📤 Apenas Enviadas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedNumber} onValueChange={setSelectedNumber}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📱 Todos os Números</SelectItem>
                {whatsappNumbers?.map((num) => (
                  <SelectItem key={num.id} value={num.id}>
                    {num.display_name || num.phone_number_id || 'Sem nome'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {conversationList.filter((c: any) => c.hasInbound).length === 0 && (
        <Card className="premium-card border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg">Configure o Webhook para Ver Respostas!</p>
                <p className="text-muted-foreground">
                  Para receber as mensagens dos leads em tempo real, configure o webhook em{" "}
                  <a href="/configuracoes" className="text-primary hover:underline font-medium">Configurações → Webhook</a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <TableSkeleton rows={6} />}

      {!isLoading && conversationList.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma mensagem encontrada"
          description="Quando você enviar mensagens, elas aparecerão aqui"
        />
      )}

      {/* Conversas Premium */}
      <div className="grid gap-6">
        {conversationList.map((conversation: any) => {
          const lastMsg = conversation.messages[0];
          const inboundCount = conversation.messages.filter((m: any) => m.direction === 'inbound').length;
          
          return (
            <Card key={conversation.msisdn} className="premium-card hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      conversation.hasInbound ? 'bg-success/10' : 'bg-muted/50'
                    }`}>
                      {conversation.hasInbound ? (
                        <User className="h-7 w-7 text-success" />
                      ) : (
                        <Phone className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-mono">{conversation.msisdn}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {conversation.messages.length} mensagens
                        </Badge>
                        {inboundCount > 0 && (
                          <Badge className="text-xs bg-success">
                            📩 {inboundCount} respostas
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
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {conversation.messages.slice(0, 10).map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl border-l-4 ${
                        msg.direction === 'inbound'
                          ? 'bg-success/5 border-success ml-6'
                          : 'bg-muted/30 border-border mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {msg.direction === 'inbound' ? (
                            <Badge className="text-xs bg-success">
                              📩 Lead Respondeu
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              📤 Você Enviou
                            </Badge>
                          )}
                          {msg.template_name && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              {msg.template_name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(msg.created_at), "dd/MM HH:mm")}
                        </div>
                      </div>
                      
                      {msg.content && (
                        <div className="text-sm mt-3">
                          {typeof msg.content === 'object' ? (
                            msg.content.text?.body ? (
                              <p className="leading-relaxed">{msg.content.text.body}</p>
                            ) : (
                              <pre className="text-xs bg-background p-3 rounded-lg overflow-x-auto font-mono">
                                {JSON.stringify(msg.content, null, 2)}
                              </pre>
                            )
                          ) : (
                            <p className="leading-relaxed">{msg.content}</p>
                          )}
                        </div>
                      )}
                      
                      {msg.error_message && (
                        <div className="text-xs text-destructive mt-3 p-2 bg-destructive/10 rounded">
                          ❌ {msg.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {conversation.messages.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
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
