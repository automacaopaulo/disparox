import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Search, Filter, Download } from "lucide-react";
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

  // Realtime para atualizações
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
          // Revalidar queries quando houver mudanças
          supabase.from("campaigns").select("*").order("created_at", { ascending: false });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const { toast } = useToast();

  // Filtrar campanhas
  const filteredCampaigns = campaigns?.filter(campaign => {
    // Filtro de busca
    if (searchQuery && !campaign.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filtro de status
    if (statusFilter !== "all" && campaign.status !== statusFilter) {
      return false;
    }
    
    // Filtro de data
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

  // Exportar para CSV
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
      title: "Exportado!",
      description: "Relatório de campanhas baixado.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "processing":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Campanhas</h2>
        <p className="text-muted-foreground mt-1">
          Acompanhe suas campanhas de disparo em massa
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
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
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {!isLoading && filteredCampaigns && filteredCampaigns.length === 0 && campaigns && campaigns.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhuma campanha criada ainda. Use "Disparo CSV" para criar sua primeira campanha.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && filteredCampaigns && filteredCampaigns.length === 0 && campaigns && campaigns.length > 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhuma campanha encontrada com os filtros aplicados.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
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
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedCampaign(campaign)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm")}
                    </div>
                  </div>
                  <Badge className={getStatusColor(campaign.status)}>
                    {getStatusLabel(campaign.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{campaign.total_items}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {campaign.sent}
                    </div>
                    <div className="text-xs text-muted-foreground">Enviados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {campaign.delivered}
                    </div>
                    <div className="text-xs text-muted-foreground">Entregues</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {campaign.failed}
                    </div>
                    <div className="text-xs text-muted-foreground">Falhas</div>
                  </div>
                </div>

                {campaign.status === "processing" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                {campaign.status === "completed" && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>
                      Taxa de sucesso: {successRate.toFixed(1)}%
                    </span>
                  </div>
                )}

                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{campaign.template_name}</Badge>
                  <Badge variant="outline">{campaign.processing_rate || 40} msg/s</Badge>
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

  // Preparar dados para o gráfico de erros
  const errorChartData = errorEntries.map(([code, count]) => ({
    code: `Erro ${code}`,
    quantidade: Number(count),
  }));

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{campaign.name}</span>
            {campaign.failed > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReprocess}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reprocessar Falhas
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Detalhes completos da campanha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{campaign.total_items}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{campaign.sent}</div>
                <div className="text-xs text-muted-foreground">Enviados</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {campaign.delivered}
                </div>
                <div className="text-xs text-muted-foreground">Entregues</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{campaign.read}</div>
                <div className="text-xs text-muted-foreground">Lidos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{campaign.failed}</div>
                <div className="text-xs text-muted-foreground">Falhas</div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Erros */}
          {errorEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Análise de Erros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={errorChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="code" />
                    <YAxis />
                    <Tooltip />
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
                      className="flex justify-between items-center p-2 bg-muted rounded"
                    >
                      <span className="text-sm font-medium">Código {code}</span>
                      <Badge variant="destructive">{String(count)} ocorrências</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items da campanha */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimas Mensagens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-2 border-b last:border-0"
                  >
                    <div className="flex-1">
                      <div className="font-mono text-sm">{item.msisdn}</div>
                      {item.error_message && (
                        <div className="text-xs text-red-600 mt-1">
                          {item.error_message}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={
                        item.status === "sent" || item.status === "delivered"
                          ? "default"
                          : item.status === "failed"
                          ? "destructive"
                          : "secondary"
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
