import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Send, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [numbersRes, campaignsRes, messagesRes] = await Promise.all([
        supabase.from("whatsapp_numbers").select("id, is_active", { count: "exact" }),
        supabase.from("campaigns").select("id, status", { count: "exact" }),
        supabase.from("messages").select("id, status", { count: "exact" }),
      ]);

      const activeNumbers = numbersRes.data?.filter(n => n.is_active).length || 0;
      const totalNumbers = numbersRes.count || 0;

      const campaignsActive = campaignsRes.data?.filter(c => c.status === "processing").length || 0;
      const totalCampaigns = campaignsRes.count || 0;

      const messagesDelivered = messagesRes.data?.filter(m => m.status === "delivered").length || 0;
      const messagesFailed = messagesRes.data?.filter(m => m.status === "failed").length || 0;
      const totalMessages = messagesRes.count || 0;

      return {
        activeNumbers,
        totalNumbers,
        campaignsActive,
        totalCampaigns,
        messagesDelivered,
        messagesFailed,
        totalMessages,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Visão geral do sistema de disparos WhatsApp
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Números Ativos</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeNumbers || 0} / {stats?.totalNumbers || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Números WhatsApp cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.campaignsActive || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de {stats?.totalCampaigns || 0} campanhas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Entregues</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.messagesDelivered || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de {stats?.totalMessages || 0} mensagens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Falhas</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.messagesFailed || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalMessages ? 
                ((stats.messagesFailed / stats.totalMessages) * 100).toFixed(1) : 0}% 
              do total
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Próximos Passos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(!stats?.totalNumbers || stats.totalNumbers === 0) && (
            <p className="text-sm">
              📱 <strong>Configure seu primeiro número WhatsApp</strong> em "Números WhatsApp"
            </p>
          )}
          {stats?.totalNumbers && stats.totalNumbers > 0 && (
            <>
              <p className="text-sm">
                ✅ Números configurados! Agora você pode fazer disparos.
              </p>
              <p className="text-sm">
                📤 Use "Disparo 1:1" para envios individuais ou "Disparo CSV" para campanhas em massa.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
