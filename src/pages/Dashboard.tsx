import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Send, CheckCircle, XCircle, AlertCircle, TrendingUp, Clock, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Dashboard() {
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

      // Mensagens hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const messagesToday = messagesRes.data?.filter(m => 
        new Date(m.created_at) >= today
      ).length || 0;

      // Dados para gráficos - últimos 7 dias
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

      // Gráfico de pizza - distribuição de status
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="section-header">
        <h1 className="section-title flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          Dashboard
        </h1>
        <p className="section-description">
          Visão geral e métricas em tempo real do seu sistema WhatsApp
        </p>
      </div>

      {/* KPIs Principais - Gigantes */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="premium-card hover:shadow-xl transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Números Ativos
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Phone className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="stat-value text-primary">
              {stats?.activeNumbers || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              de {stats?.totalNumbers || 0} cadastrados
            </p>
            {stats?.lowQualityNumbers ? (
              <Badge variant="destructive" className="mt-2">
                {stats.lowQualityNumbers} com baixa qualidade
              </Badge>
            ) : null}
          </CardContent>
        </Card>

        <Card className="premium-card hover:shadow-xl transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Templates Ativos
            </CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <Send className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="stat-value text-success">
              {stats?.activeTemplates || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              de {stats?.totalTemplates || 0} templates
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card hover:shadow-xl transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Campanhas Ativas
            </CardTitle>
            <div className="p-2 bg-warning/10 rounded-lg">
              <Clock className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="stat-value text-warning">
              {stats?.campaignsActive || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              de {stats?.totalCampaigns || 0} campanhas
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card hover:shadow-xl transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mensagens Hoje
            </CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="stat-value text-purple-600">
              {stats?.messagesToday || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              Total: {stats?.totalMessages || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Taxas de Performance */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="premium-card border-success/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Sucesso
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="stat-value text-success">
              {stats?.successRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalSent || 0} enviados • {stats?.totalFailed || 0} falhas
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Entrega
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="stat-value text-primary">
              {stats?.deliveryRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalDelivered || 0} mensagens entregues
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Leitura
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="stat-value text-purple-600">
              {stats?.readRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalRead || 0} mensagens lidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Profissionais */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de Linha - Volume */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Volume de Mensagens
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Últimos 7 dias</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats?.messagesPerDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mensagens" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-success" />
              Distribuição de Status
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Performance geral</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats?.statusDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (${entry.value})`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats?.statusDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Premium */}
      <Card className={`premium-card ${stats?.lowQualityNumbers ? 'border-warning bg-warning/5' : 'border-primary/20 bg-primary/5'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className={`h-5 w-5 ${stats?.lowQualityNumbers ? 'text-warning' : 'text-primary'}`} />
            {stats?.lowQualityNumbers ? "⚠️ Atenção Imediata" : "✨ Próximos Passos"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats?.lowQualityNumbers && stats.lowQualityNumbers > 0 && (
            <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-warning-foreground">
                  Números com qualidade baixa detectados
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.lowQualityNumbers} número(s) precisam de atenção. Verifique na página "Números WhatsApp" para evitar bloqueios.
                </p>
              </div>
            </div>
          )}

          {(!stats?.totalNumbers || stats.totalNumbers === 0) && (
            <p className="text-sm flex items-center gap-2">
              <span className="text-2xl">📱</span>
              <span><strong>Configure seu primeiro número WhatsApp</strong> para começar a enviar mensagens</span>
            </p>
          )}
          
          {stats?.totalNumbers && stats.totalNumbers > 0 && !stats?.totalTemplates && (
            <p className="text-sm flex items-center gap-2">
              <span className="text-2xl">📄</span>
              <span><strong>Sincronize seus templates</strong> da Meta para habilitar os disparos</span>
            </p>
          )}

          {stats?.activeTemplates && stats.activeTemplates > 0 && (
            <p className="text-sm flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <span><strong>Sistema pronto!</strong> Use "Disparo CSV" ou "Disparo 1:1" para enviar campanhas</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
