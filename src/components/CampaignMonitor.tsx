import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";

interface CampaignMonitorProps {
  campaignId: string;
}

export function CampaignMonitor({ campaignId }: CampaignMonitorProps) {
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    rate: 0,
    status: 'processing',
  });
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaign) {
        const { data: items } = await supabase
          .from('campaign_items')
          .select('status')
          .eq('campaign_id', campaignId);

        const sent = items?.filter(i => i.status === 'sent').length || 0;
        const failed = items?.filter(i => i.status === 'failed').length || 0;
        const pending = items?.filter(i => i.status === 'pending').length || 0;
        const elapsed = (Date.now() - startTime) / 1000;
        const currentRate = elapsed > 0 ? sent / elapsed : 0;

        setStats({
          total: campaign.total_items || 0,
          sent,
          failed,
          pending,
          rate: currentRate,
          status: campaign.status,
        });
        setElapsedTime(elapsed);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000); // Atualizar a cada 2s

    return () => clearInterval(interval);
  }, [campaignId, startTime]);

  const progress = stats.total > 0 ? ((stats.sent + stats.failed) / stats.total) * 100 : 0;
  const successRate = (stats.sent + stats.failed) > 0 ? (stats.sent / (stats.sent + stats.failed)) * 100 : 0;
  const estimatedTimeRemaining = stats.rate > 0 ? stats.pending / stats.rate : 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5 animate-pulse text-blue-600" />
              Monitoramento em Tempo Real
            </span>
            <Badge variant={stats.status === 'completed' ? 'default' : 'secondary'}>
              {stats.status === 'processing' ? 'Processando' : stats.status === 'completed' ? 'Concluído' : 'Pendente'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Barra de Progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progresso Geral</span>
              <span className="text-muted-foreground">
                {stats.sent + stats.failed} / {stats.total} ({progress.toFixed(1)}%)
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Grid de Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-green-200 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.sent}</p>
                    <p className="text-xs text-green-600 dark:text-green-500">Enviados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.failed}</p>
                    <p className="text-xs text-red-600 dark:text-red-500">Falhas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.pending}</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500">Pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {stats.rate.toFixed(1)}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-500">msg/s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métricas Detalhadas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Taxa de Sucesso</p>
              <p className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Tempo Decorrido</p>
              <p className="text-2xl font-bold text-blue-600">{formatTime(elapsedTime)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Tempo Estimado</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.pending > 0 ? formatTime(estimatedTimeRemaining) : '—'}
              </p>
            </div>
          </div>

          {/* Throughput Info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Performance Atual</p>
                <p className="text-blue-700 dark:text-blue-300">
                  • <strong>{(stats.rate * 60).toFixed(0)}</strong> mensagens por minuto
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  • <strong>{(stats.rate * 3600).toFixed(0)}</strong> mensagens por hora
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
