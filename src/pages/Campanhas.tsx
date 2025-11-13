import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Search, Filter, Download, TrendingUp, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { ReprocessFailuresDialog } from "@/components/ReprocessFailuresDialog";
import { useToast } from "@/hooks/use-toast";

export default function Campanhas() {
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [reprocessDialogOpen, setReprocessDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("campaigns-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaigns",
        },
        () => {
          supabase.from("campaigns").select("*").order("created_at", { ascending: false });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const { toast } = useToast();

  const filteredCampaigns = campaigns?.filter(campaign => {
    if (searchQuery && !campaign.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    if (statusFilter !== "all" && campaign.status !== statusFilter) {
      return false;
    }
    
    if (dateFilter !== "all") {
      const campaignDate = new Date(campaign.created_at);
      const now = new Date();
      
      if (dateFilter === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (campaignDate < today) return false;
      } else if (dateFilter === "7days") {
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
        if (campaignDate < sevenDaysAgo) return false;
      } else if (dateFilter === "30days") {
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        if (campaignDate < thirtyDaysAgo) return false;
      }
    }
    
    return true;
  });

  const exportToCSV = () => {
    if (!filteredCampaigns) return;
    
    const headers = ["Nome", "Status", "Data", "Total", "Enviados", "Entregues", "Lidos", "Falhas", "Taxa de Sucesso"];
    const rows = filteredCampaigns.map(c => [
      c.name,
      getStatusLabel(c.status),
      format(new Date(c.created_at), "dd/MM/yyyy HH:mm"),
      c.total_items,
      c.sent,
      c.delivered,
      c.read,
      c.failed,
      c.sent > 0 ? ((c.sent / (c.sent + c.failed)) * 100).toFixed(1) + '%' : '0%'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campanhas_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    
    toast({
      title: "✅ Exportado!",
      description: "Relatório de campanhas baixado.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "processing":
        return "bg-primary text-primary-foreground";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Concluída";
      case "processing":
        return "Processando";
      case "failed":
        return "Falhou";
      case "pending":
        return "Pendente";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header Premium */}
      <div className="section-header">
        <h1 className="section-title flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          Campanhas
        </h1>
        <p className="section-description">
          Acompanhe e analise todas as campanhas de disparo em massa
        </p>
      </div>

      {/* Filtros Premium */}
      <Card className="premium-card">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campanhas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo Período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportToCSV} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Carregando campanhas...</p>
          </div>
        </div>
      )}

      {!isLoading && filteredCampaigns && filteredCampaigns.length === 0 && campaigns && campaigns.length === 0 && (
        <Card className="premium-card">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-muted/50 rounded-2xl">
                <MessageSquare className="h-16 w-16 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Nenhuma campanha criada</h3>
                <p className="text-muted-foreground">
                  Use "Disparo CSV" para criar sua primeira campanha em massa
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && filteredCampaigns && filteredCampaigns.length === 0 && campaigns && campaigns.length > 0 && (
        <Card className="premium-card">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <Filter className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Nenhuma campanha encontrada</h3>
                <p className="text-muted-foreground">
                  Ajuste os filtros para ver mais resultados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {filteredCampaigns?.map((campaign) => {
          const progress =
            campaign.total_items > 0
              ? ((campaign.sent + campaign.failed) / campaign.total_items) * 100
              : 0;
          const successRate =
            campaign.sent > 0
              ? (campaign.sent / (campaign.sent + campaign.failed)) * 100
              : 0;

          return (
            <Card
              key={campaign.id}
              className="premium-card cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-200"
              onClick={() => setSelectedCampaign(campaign)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <CardTitle className="text-xl">{campaign.name}</CardTitle>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {campaign.template_name}
                      </Badge>
                    </div>
                  </div>
                  <Badge className={getStatusColor(campaign.status)}>
                    {getStatusLabel(campaign.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-muted/30 rounded-xl">
                    <div className="text-3xl font-bold">{campaign.total_items}</div>
                    <div className="text-xs text-muted-foreground mt-1">Total</div>
                  </div>
                  <div className="text-center p-4 bg-success/10 rounded-xl">
                    <div className="text-3xl font-bold text-success">
                      {campaign.sent}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Enviados</div>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-xl">
                    <div className="text-3xl font-bold text-primary">
                      {campaign.delivered}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Entregues</div>
                  </div>
                  <div className="text-center p-4 bg-destructive/10 rounded-xl">
                    <div className="text-3xl font-bold text-destructive">
                      {campaign.failed}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Falhas</div>
                  </div>
                </div>

                {campaign.status === "processing" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Progresso
                      </span>
                      <span className="text-primary">{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {campaign.status === "completed" && (
                  <div className="flex items-center justify-between p-4 bg-success/10 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">Campanha Concluída</span>
                    </div>
                    <span className="text-lg font-bold text-success">
                      {successRate.toFixed(1)}% sucesso
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {campaign.processing_rate || 40} msg/s
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {campaign.read || 0} lidas
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de detalhes */}
      {selectedCampaign && (
        <>
          <CampaignDetailsDialog
            campaign={selectedCampaign}
            open={!!selectedCampaign}
            onOpenChange={(open) => !open && setSelectedCampaign(null)}
            onReprocess={() => setReprocessDialogOpen(true)}
          />
          <ReprocessFailuresDialog
            campaign={selectedCampaign}
            open={reprocessDialogOpen}
            onOpenChange={setReprocessDialogOpen}
          />
        </>
      )}
    </div>
  );
}

function CampaignDetailsDialog({
  campaign,
  open,
  onOpenChange,
  onReprocess,
}: {
  campaign: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReprocess: () => void;
}) {
  const { data: items } = useQuery({
    queryKey: ["campaign-items", campaign.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_items")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const errorSummary = campaign.error_summary || {};
  const errorEntries = Object.entries(errorSummary);

  const errorChartData = errorEntries.map(([code, count]) => ({
    code: `Erro ${code}`,
    quantidade: Number(count),
  }));

  const COLORS = ['hsl(var(--destructive))', '#f97316', '#f59e0b', '#eab308', '#84cc16'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-5xl max-h-[85vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              {campaign.name}
            </span>
            {campaign.failed > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReprocess}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reprocessar Falhas
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Análise detalhada e histórico completo da campanha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estatísticas Premium */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-lg">📊 Estatísticas Gerais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-5 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <div className="text-2xl font-bold">{campaign.total_items}</div>
                <div className="text-xs text-muted-foreground mt-1">Total</div>
              </div>
              <div className="text-center p-4 bg-success/10 rounded-xl">
                <div className="text-2xl font-bold text-success">{campaign.sent}</div>
                <div className="text-xs text-muted-foreground mt-1">Enviados</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-xl">
                <div className="text-2xl font-bold text-primary">
                  {campaign.delivered}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Entregues</div>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-xl">
                <div className="text-2xl font-bold text-purple-600">{campaign.read}</div>
                <div className="text-xs text-muted-foreground mt-1">Lidos</div>
              </div>
              <div className="text-center p-4 bg-destructive/10 rounded-xl">
                <div className="text-2xl font-bold text-destructive">{campaign.failed}</div>
                <div className="text-xs text-muted-foreground mt-1">Falhas</div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Erros */}
          {errorEntries.length > 0 && (
            <Card className="premium-card border-warning/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  Análise de Erros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={errorChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="code" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                      }}
                    />
                    <Bar dataKey="quantidade" fill="hsl(var(--destructive))">
                      {errorChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {errorEntries.map(([code, count]) => (
                    <div
                      key={code}
                      className="flex justify-between items-center p-3 bg-muted/30 rounded-xl"
                    >
                      <span className="font-medium">Código de Erro {code}</span>
                      <Badge variant="destructive">{String(count)} ocorrências</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items da campanha */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-lg">📝 Últimas Mensagens Enviadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-mono text-sm font-medium">{item.msisdn}</div>
                      {item.error_message && (
                        <div className="text-xs text-destructive mt-1">
                          {item.error_message}
                        </div>
                      )}
                    </div>
                    <Badge
                      className={
                        item.status === "sent" || item.status === "delivered"
                          ? "bg-success"
                          : item.status === "failed"
                          ? "bg-destructive"
                          : "bg-muted"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
