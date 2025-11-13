import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Search, Send, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/SkeletonLoader";
import { useToast } from "@/hooks/use-toast";

export default function Mensagens() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [selectedNumber, setSelectedNumber] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const sendReplyMutation = useMutation({
    mutationFn: async ({ msisdn, text, whatsappNumberId }: { msisdn: string; text: string; whatsappNumberId: string }) => {
      const { data, error } = await supabase.functions.invoke("send-template-message", {
        body: {
          to: msisdn,
          type: "text",
          text: { body: text },
          whatsapp_number_id: whatsappNumberId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada",
        description: "Sua resposta foi enviada com sucesso",
      });
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Agrupar mensagens por data
  const groupMessagesByDate = (messages: any[]) => {
    const groups: Record<string, any[]> = {};
    
    messages.forEach(msg => {
      const date = format(new Date(msg.created_at), 'dd/MM/yyyy');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(msg);
    });
    
    return groups;
  };

  const conversations = messages?.reduce((acc: any, msg) => {
    const key = msg.msisdn;
    if (!acc[key]) {
      acc[key] = {
        msisdn: msg.msisdn,
        messages: [],
        lastMessage: msg.created_at,
        hasInbound: false,
        whatsappNumberId: msg.whatsapp_number_id,
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
      
      if (selectedNumber !== "all") {
        const hasMessageFromNumber = conv.messages.some(
          (msg: any) => msg.whatsapp_number_id === selectedNumber
        );
        if (!hasMessageFromNumber) return false;
      }
      
      return true;
    });

  const selectedConv = conversations?.[selectedConversation || ""];
  const sortedMessages = selectedConv?.messages.sort((a: any, b: any) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const messagesByDate = sortedMessages ? groupMessagesByDate(sortedMessages) : {};

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
      case "received":
        return "bg-primary/20 text-primary";
      case "read":
        return "bg-green-500/20 text-green-700";
      case "sent":
        return "bg-yellow-500/20 text-yellow-700";
      case "failed":
        return "bg-destructive/20 text-destructive";
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

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedConv) return;
    
    sendReplyMutation.mutate({
      msisdn: selectedConv.msisdn,
      text: replyText,
      whatsappNumberId: selectedConv.whatsappNumberId,
    });
  };

  if (selectedConversation && selectedConv) {
    return (
      <div className="space-y-4 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedConversation(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Conversa com {selectedConv.msisdn}</h1>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4">
              {Object.entries(messagesByDate).map(([date, msgs]) => (
                <div key={date} className="space-y-3">
                  {/* Separador de data */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-medium text-muted-foreground px-3 py-1 bg-muted rounded-full">
                      {date}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  
                  {/* Mensagens do dia */}
                  {(msgs as any[]).map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.direction === 'outbound'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-sm mb-1 whitespace-pre-wrap">
                          {msg.content?.text?.body || msg.content?.body || "Mensagem sem conteúdo"}
                        </div>
                        <div className="flex items-center gap-2 text-xs opacity-70 mt-2">
                          <span>{format(new Date(msg.created_at), "HH:mm")}</span>
                          {msg.status && (
                            <Badge variant="outline" className={getStatusColor(msg.status)}>
                              {getStatusLabel(msg.status)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Digite sua resposta..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
              <Button
                onClick={handleSendReply}
                disabled={!replyText.trim() || sendReplyMutation.isPending}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <MessageSquare className="h-7 w-7" />
          Mensagens
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedNumber} onValueChange={setSelectedNumber}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por número" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os números</SelectItem>
                {whatsappNumbers?.map((num) => (
                  <SelectItem key={num.id} value={num.id}>
                    {num.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <TableSkeleton />
          ) : conversationList.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Nenhuma conversa encontrada"
              description="Quando seus contatos enviarem mensagens, elas aparecerão aqui"
            />
          ) : (
            <div className="space-y-2">
              {conversationList.map((conv: any) => {
                const lastMsg = conv.messages[0];
                const inboundCount = conv.messages.filter((m: any) => m.direction === 'inbound').length;
                const outboundCount = conv.messages.filter((m: any) => m.direction === 'outbound').length;

                return (
                  <Card
                    key={conv.msisdn}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setSelectedConversation(conv.msisdn)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{conv.msisdn}</h3>
                            {lastMsg.status && (
                              <Badge variant="outline" className={getStatusColor(lastMsg.status)}>
                                {getStatusLabel(lastMsg.status)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {lastMsg.content?.text?.body || lastMsg.content?.body || "Mensagem sem conteúdo"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{format(new Date(lastMsg.created_at), "dd/MM/yyyy HH:mm")}</span>
                            <span>{inboundCount} recebidas</span>
                            <span>{outboundCount} enviadas</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
