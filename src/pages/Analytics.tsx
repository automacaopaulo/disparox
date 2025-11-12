import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Award, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";
import { format, subDays } from "date-fns";

export default function Analytics() {
  const [period, setPeriod] = useState("30");

  const { data: analyticsData } = useQuery({
    queryKey: ["analytics", period],
    queryFn: async () => {
      const days = parseInt(period);
      const startDate = subDays(new Date(), days);

      // Buscar dados
      const [campaignsRes, messagesRes, numbersRes, templatesRes] = await Promise.all([
        supabase
          .from("campaigns")
          .select("*")
          .gte("created_at", startDate.toISOString()),
        supabase
          .from("messages")
          .select("*")
          .gte("created_at", startDate.toISOString()),
        supabase.from("whatsapp_numbers").select("*"),
        supabase.from("templates").select("*"),
      ]);

      // Mensagens por dia
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

      // Top templates
      const templateUsage: Record<string, number> = {};
      campaignsRes.data?.forEach(c => {
        const name = c.template_name || 'Desconhecido';
        templateUsage[name] = (templateUsage[name] || 0) + (c.sent || 0);
      });

      const topTemplates = Object.entries(templateUsage)
        .map(([name, count]) => ({ name, mensagens: count }))
        .sort((a, b) => b.mensagens - a.mensagens)
        .slice(0, 5);

      // Performance por número
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

      // Estatísticas gerais
      const totalCampaigns = campaignsRes.data?.length || 0;
      const totalSent = campaignsRes.data?.reduce((acc, c) => acc + (c.sent || 0), 0) || 0;
      const totalDelivered = campaignsRes.data?.reduce((acc, c) => acc + (c.delivered || 0), 0) || 0;
      const totalFailed = campaignsRes.data?.reduce((acc, c) => acc + (c.failed || 0), 0) || 0;
      const avgDeliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0';

      // Distribuição de horários (heatmap simplificado)
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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de performance e métricas
          </p>
        </div>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.stats.totalCampaigns || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.stats.totalSent || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analyticsData?.stats.totalFailed || 0} falhas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analyticsData?.stats.avgDeliveryRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analyticsData?.stats.totalDelivered || 0} entregues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {((analyticsData?.stats.totalSent || 0) * 0.05).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~R$ 0,05 por msg
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Linha - Mensagens por Dia */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Mensagens</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData?.messagesPerDay || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="enviados" stroke="#3b82f6" strokeWidth={2} name="Enviados" />
              <Line type="monotone" dataKey="entregues" stroke="#10b981" strokeWidth={2} name="Entregues" />
              <Line type="monotone" dataKey="falhas" stroke="#ef4444" strokeWidth={2} name="Falhas" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Templates Mais Usados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData?.topTemplates || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
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
        <Card>
          <CardHeader>
            <CardTitle>Performance por Número WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData?.numberPerformance?.map((num, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{num.nome}</div>
                    <div className="text-sm text-muted-foreground">
                      {num.enviados} mensagens enviadas
                    </div>
                  </div>
                  <Badge variant={num.taxa >= 90 ? "default" : num.taxa >= 70 ? "secondary" : "destructive"}>
                    {num.taxa}% entrega
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de Horários */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Envios por Horário</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analyticsData?.hourlyDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="mensagens" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            💡 Use este gráfico para identificar os melhores horários para enviar mensagens
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
