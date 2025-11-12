import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Send, CheckCircle, XCircle, AlertCircle, TrendingUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [numbersRes, campaignsRes, messagesRes, templatesRes] = await Promise.all([
        supabase.from("whatsapp_numbers").select("id, is_active, quality_rating", { count: "exact" }),
        supabase.from("campaigns").select("id, status, sent, failed, delivered, read", { count: "exact" }),
        supabase.from("messages").select("id, status, created_at", { count: "exact" }),
        supabase.from("templates").select("id, is_active", { count: "exact" }),
      ]);

      const activeNumbers = numbersRes.data?.filter(n => n.is_active).length || 0;
      const totalNumbers = numbersRes.count || 0;
      const lowQualityNumbers = numbersRes.data?.filter(n => 
        n.quality_rating && ["YELLOW", "RED"].includes(n.quality_rating)
      ).length || 0;

      const campaignsActive = campaignsRes.data?.filter(c => c.status === "processing").length || 0;
      const totalCampaigns = campaignsRes.count || 0;
      
      const totalSent = campaignsRes.data?.reduce((acc, c) => acc + (c.sent || 0), 0) || 0;
      const totalFailed = campaignsRes.data?.reduce((acc, c) => acc + (c.failed || 0), 0) || 0;
      const totalDelivered = campaignsRes.data?.reduce((acc, c) => acc + (c.delivered || 0), 0) || 0;
      const totalRead = campaignsRes.data?.reduce((acc, c) => acc + (c.read || 0), 0) || 0;

      const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : "0";
      const readRate = totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : "0";
      const successRate = totalSent > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) : "0";

      const messagesDelivered = messagesRes.data?.filter(m => m.status === "delivered").length || 0;
      const messagesFailed = messagesRes.data?.filter(m => m.status === "failed").length || 0;
      const totalMessages = messagesRes.count || 0;

      const activeTemplates = templatesRes.data?.filter(t => t.is_active).length || 0;
      const totalTemplates = templatesRes.count || 0;

      // Mensagens hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const messagesToday = messagesRes.data?.filter(m => 
        new Date(m.created_at) >= today
      ).length || 0;

      return {
        activeNumbers,
        totalNumbers,
        lowQualityNumbers,
        campaignsActive,
        totalCampaigns,
        messagesDelivered,
        messagesFailed,
        totalMessages,
        activeTemplates,
        totalTemplates,
        messagesToday,
        totalSent,
        totalFailed,
        totalDelivered,
        totalRead,
        deliveryRate,
        readRate,
        successRate,
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

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Números Ativos</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeNumbers || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de {stats?.totalNumbers || 0} cadastrados
            </p>
            {stats?.lowQualityNumbers ? (
              <Badge variant="destructive" className="mt-2">
                {stats.lowQualityNumbers} com baixa qualidade
              </Badge>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates Ativos</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeTemplates || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de {stats?.totalTemplates || 0} templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Mensagens Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.messagesToday || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total geral: {stats?.totalMessages || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de entrega */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.successRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalSent || 0} enviados / {stats?.totalFailed || 0} falhas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.deliveryRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalDelivered || 0} entregues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Leitura</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats?.readRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalRead || 0} lidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas e próximos passos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {stats?.lowQualityNumbers ? "Alertas e Ações" : "Próximos Passos"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats?.lowQualityNumbers && stats.lowQualityNumbers > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm">
              <strong className="text-yellow-800">⚠️ Atenção:</strong>
              <span className="text-yellow-700">
                {" "}Você tem {stats.lowQualityNumbers} número(s) com quality rating baixo. 
                Verifique em "Números WhatsApp".
              </span>
            </div>
          )}

          {(!stats?.totalNumbers || stats.totalNumbers === 0) && (
            <p className="text-sm">
              📱 <strong>Configure seu primeiro número WhatsApp</strong> em "Números WhatsApp"
            </p>
          )}
          
          {stats?.totalNumbers && stats.totalNumbers > 0 && !stats?.totalTemplates && (
            <p className="text-sm">
              📄 <strong>Sincronize seus templates</strong> na página "Templates"
            </p>
          )}

          {stats?.activeTemplates && stats.activeTemplates > 0 && (
            <>
              <p className="text-sm">
                ✅ Sistema configurado! Use "Disparo 1:1" ou "Disparo CSV" para começar.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
