import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Send, CheckCircle, XCircle, AlertCircle, TrendingUp, Clock, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLayoutTheme } from "@/contexts/LayoutThemeContext";

export default function Dashboard() {
  const { theme } = useLayoutTheme();
  
  const { data: stats, isLoading } = useQuery({
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

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const messagesToday = messagesRes.data?.filter(m => 
        new Date(m.created_at) >= today
      ).length || 0;

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        date.setHours(0, 0, 0, 0);
        return date;
      });

      const messagesPerDay = last7Days.map(date => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const count = messagesRes.data?.filter(m => {
          const msgDate = new Date(m.created_at);
          return msgDate >= date && msgDate < nextDay;
        }).length || 0;

        return {
          day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          mensagens: count,
        };
      });

      const statusDistribution = [
        { name: 'Enviados', value: totalSent, color: 'hsl(var(--primary))' },
        { name: 'Entregues', value: totalDelivered, color: 'hsl(var(--success))' },
        { name: 'Lidos', value: totalRead, color: '#8b5cf6' },
        { name: 'Falhas', value: totalFailed, color: 'hsl(var(--destructive))' },
      ].filter(item => item.value > 0);

      return {
        activeNumbers,
        messagesPerDay,
        statusDistribution,
        totalNumbers,
        lowQualityNumbers,
        campaignsActive,
        totalCampaigns,
        totalSent,
        totalFailed,
        totalDelivered,
        totalRead,
        deliveryRate,
        readRate,
        successRate,
        messagesDelivered,
        messagesFailed,
        totalMessages,
        activeTemplates,
        totalTemplates,
        messagesToday,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className={`text-2xl font-semibold tracking-tight mb-2 flex items-center gap-3 ${theme === "modern" ? "" : "text-xl"}`}>
          {theme === "modern" && (
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          )}
          Dashboard
        </h1>
        <p className={theme === "modern" ? "text-sm text-muted-foreground/80" : "text-sm text-muted-foreground"}>
          Visão geral e métricas em tempo real do seu sistema WhatsApp
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={theme === "modern" ? "group hover:shadow-xl transition-all duration-300 border-border/40" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Números Ativos
            </CardTitle>
            <div className={theme === "modern" ? "p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors" : ""}>
              <Phone className={`h-4 w-4 text-primary ${theme === "modern" ? "transition-transform group-hover:scale-105 duration-300" : ""}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${theme === "modern" ? "transition-transform group-hover:scale-105 duration-300" : ""}`}>
              {stats?.activeNumbers || 0}
            </div>
            {stats && stats.lowQualityNumbers > 0 && (
              <Badge variant="destructive" className={`mt-2 text-xs ${theme === "modern" ? "animate-pulse" : ""}`}>
                {stats.lowQualityNumbers} com qualidade baixa
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className={theme === "modern" ? "group hover:shadow-xl transition-all duration-300 border-border/40" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Templates Ativos
            </CardTitle>
            <div className={theme === "modern" ? "p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors" : ""}>
              <CheckCircle className={`h-4 w-4 text-primary ${theme === "modern" ? "transition-transform group-hover:scale-105 duration-300" : ""}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${theme === "modern" ? "transition-transform group-hover:scale-105 duration-300" : ""}`}>
              {stats?.activeTemplates || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {stats?.totalTemplates || 0}
            </p>
          </CardContent>
        </Card>

        <Card className={theme === "modern" ? "group hover:shadow-xl transition-all duration-300 border-border/40" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Campanhas Ativas
            </CardTitle>
            <div className={theme === "modern" ? "p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors" : ""}>
              <Send className={`h-4 w-4 text-primary ${theme === "modern" ? "transition-transform group-hover:scale-105 duration-300" : ""}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${theme === "modern" ? "transition-transform group-hover:scale-105 duration-300" : ""}`}>
              {stats?.campaignsActive || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {stats?.totalCampaigns || 0}
            </p>
          </CardContent>
        </Card>

        <Card className={theme === "modern" ? "group hover:shadow-xl transition-all duration-300 border-border/40" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mensagens Hoje
            </CardTitle>
            <div className={theme === "modern" ? "p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors" : ""}>
              <Clock className={`h-4 w-4 text-primary ${theme === "modern" ? "transition-transform group-hover:scale-105 duration-300" : ""}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${theme === "modern" ? "transition-transform group-hover:scale-105 duration-300" : ""}`}>
              {stats?.messagesToday || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {stats?.totalMessages || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={theme === "modern" ? "border-border/40" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Sucesso
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats?.successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Mensagens enviadas com sucesso
            </p>
          </CardContent>
        </Card>

        <Card className={theme === "modern" ? "border-border/40" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Entrega
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats?.deliveryRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Das mensagens enviadas
            </p>
          </CardContent>
        </Card>

        <Card className={theme === "modern" ? "border-border/40" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Leitura
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats?.readRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Das mensagens entregues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={theme === "modern" ? "border-border/40" : ""}>
          <CardHeader>
            <CardTitle className="text-base">Volume de Mensagens (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.messagesPerDay || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="mensagens" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={theme === "modern" ? "border-border/40" : ""}>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.statusDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(stats?.statusDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
