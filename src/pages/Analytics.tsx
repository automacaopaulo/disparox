import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Award, Calendar, DollarSign, BarChart3, Clock } from "lucide-react";
import { useState } from "react";
import { format, subDays } from "date-fns";
import { DashboardSkeleton } from "@/components/SkeletonLoader";

export default function Analytics() {
  const [period, setPeriod] = useState("30");

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["analytics", period],
    queryFn: async () => {
      const days = parseInt(period);
      const startDate = subDays(new Date(), days);

      const [campaignsRes, messagesRes, numbersRes] = await Promise.all([
        supabase
          .from("campaigns")
          .select("*")
          .gte("created_at", startDate.toISOString()),
        supabase
          .from("messages")
          .select("*")
          .gte("created_at", startDate.toISOString()),
        supabase.from("whatsapp_numbers").select("*"),
      ]);

      const messagesPerDay = Array.from({ length: days }, (_, i) => {
        const date = subDays(new Date(), days - 1 - i);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const dayMessages = messagesRes.data?.filter(m => {
          const msgDate = new Date(m.created_at);
          return msgDate >= dayStart && msgDate <= dayEnd;
        }) || [];

        return {
          dia: format(date, "dd/MM"),
          enviados: dayMessages.filter(m => m.status === 'sent').length,
          entregues: dayMessages.filter(m => m.status === 'delivered').length,
          falhas: dayMessages.filter(m => m.status === 'failed').length,
        };
      });

      const templateUsage: Record<string, number> = {};
      campaignsRes.data?.forEach(c => {
        const name = c.template_name || 'Desconhecido';
        templateUsage[name] = (templateUsage[name] || 0) + (c.sent || 0);
      });

      const topTemplates = Object.entries(templateUsage)
        .map(([name, count]) => ({ name, mensagens: count }))
        .sort((a, b) => b.mensagens - a.mensagens)
        .slice(0, 5);

      const numberPerformance = numbersRes.data?.map(num => {
        const numCampaigns = campaignsRes.data?.filter(c => c.whatsapp_number_id === num.id) || [];
        const totalSent = numCampaigns.reduce((acc, c) => acc + (c.sent || 0), 0);
        const totalDelivered = numCampaigns.reduce((acc, c) => acc + (c.delivered || 0), 0);
        const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0';

        return {
          nome: num.name,
          enviados: totalSent,
          taxa: parseFloat(deliveryRate),
        };
      }) || [];

      const totalCampaigns = campaignsRes.data?.length || 0;
      const totalSent = campaignsRes.data?.reduce((acc, c) => acc + (c.sent || 0), 0) || 0;
      const totalDelivered = campaignsRes.data?.reduce((acc, c) => acc + (c.delivered || 0), 0) || 0;
      const totalFailed = campaignsRes.data?.reduce((acc, c) => acc + (c.failed || 0), 0) || 0;
      const avgDeliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0';

      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
        const count = messagesRes.data?.filter(m => {
          const msgHour = new Date(m.created_at).getHours();
          return msgHour === hour;
        }).length || 0;
        
        return {
          hora: `${hour}h`,
          mensagens: count,
        };
      });

      return {
        messagesPerDay,
        topTemplates,
        numberPerformance,
        hourlyDistribution,
        stats: {
          totalCampaigns,
          totalSent,
          totalDelivered,
          totalFailed,
          avgDeliveryRate,
        },
      };
    },
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', '#f59e0b', 'hsl(var(--destructive))', '#8b5cf6'];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="section-header">
          <h1 className="section-title flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            Analytics
          </h1>
          <p className="section-description">
            Análise detalhada de performance e métricas avançadas
          </p>
        </div>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-52 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="premium-card hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campanhas</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-primary">{analyticsData?.stats.totalCampaigns || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Total no período
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mensagens</CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-success">{analyticsData?.stats.totalSent || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {analyticsData?.stats.totalFailed || 0} falhas
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Entrega</CardTitle>
            <div className="p-2 bg-warning/10 rounded-lg">
              <Award className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-warning">
              {analyticsData?.stats.avgDeliveryRate || 0}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {analyticsData?.stats.totalDelivered || 0} entregues
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo Estimado</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-purple-600">
              R$ {((analyticsData?.stats.totalSent || 0) * 0.05).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ~R$ 0,05 por mensagem
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução de Mensagens
          </CardTitle>
          <CardDescription>Volume diário de envios</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={analyticsData?.messagesPerDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="enviados" stroke="hsl(var(--primary))" strokeWidth={3} name="Enviados" />
              <Line type="monotone" dataKey="entregues" stroke="hsl(var(--success))" strokeWidth={3} name="Entregues" />
              <Line type="monotone" dataKey="falhas" stroke="hsl(var(--destructive))" strokeWidth={3} name="Falhas" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Templates */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-success" />
              Top 5 Templates Mais Usados
            </CardTitle>
            <CardDescription>Os templates mais populares no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analyticsData?.topTemplates || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                  }}
                />
                <Bar dataKey="mensagens" fill="hsl(var(--primary))">
                  {analyticsData?.topTemplates?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance por Número */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance por Número
            </CardTitle>
            <CardDescription>Taxa de entrega por WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData?.numberPerformance?.map((num, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:shadow-md transition-all">
                  <div className="flex-1">
                    <div className="font-semibold">{num.nome}</div>
                    <div className="text-sm text-muted-foreground">
                      {num.enviados} mensagens enviadas
                    </div>
                  </div>
                  <Badge className={
                    num.taxa >= 90 ? "bg-success" : 
                    num.taxa >= 70 ? "bg-warning" : 
                    "bg-destructive"
                  }>
                    {num.taxa}% entrega
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap de Horários */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Distribuição de Envios por Horário
          </CardTitle>
          <CardDescription>Identifique os melhores horários para engajamento</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analyticsData?.hourlyDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hora" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                }}
              />
              <Bar dataKey="mensagens" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>Dica:</strong> Horários de pico indicam quando seu público está mais ativo
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
