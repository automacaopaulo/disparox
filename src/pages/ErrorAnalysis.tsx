import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, AlertCircle, CheckCircle2, XCircle, Info, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface ErrorDetail {
  code: string;
  count: number;
  percentage: number;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  solution: string;
  retryable: boolean;
}

const ERROR_CATALOG: Record<string, Omit<ErrorDetail, "code" | "count" | "percentage">> = {
  "1": { severity: "medium", description: "Rate limit temporário", solution: "Aguarde alguns minutos e tente novamente. O sistema já faz retry automático.", retryable: true },
  "2": { severity: "medium", description: "Rate limit temporário", solution: "Aguarde alguns minutos e tente novamente. O sistema já faz retry automático.", retryable: true },
  "4": { severity: "medium", description: "Rate limit de aplicativo", solution: "Aguarde alguns minutos. O sistema já faz retry automático.", retryable: true },
  "10": { severity: "medium", description: "Permissões insuficientes", solution: "Verifique as permissões do token de acesso.", retryable: true },
  "80007": { severity: "high", description: "Rate limit excedido", solution: "Reduza a taxa de envio ou aguarde alguns minutos.", retryable: true },
  "131000": { severity: "high", description: "Limite de mensagens excedido", solution: "Upgrade do tier da conta ou aguarde reset do limite.", retryable: true },
  "131005": { severity: "high", description: "Limite de negócios excedido", solution: "Upgrade do tier da conta de negócios.", retryable: true },
  "131008": { severity: "critical", description: "Parâmetro obrigatório ausente", solution: "Revise o CSV e certifique-se de que todos os parâmetros obrigatórios estão preenchidos.", retryable: false },
  "131009": { severity: "high", description: "Parâmetro inválido", solution: "Verifique o formato dos parâmetros no CSV.", retryable: true },
  "131016": { severity: "medium", description: "Serviço temporariamente indisponível", solution: "Aguarde alguns minutos e tente novamente.", retryable: true },
  "131021": { severity: "high", description: "Número de destino inválido", solution: "Verifique o formato dos números no CSV (deve ser +55 + DDD + número).", retryable: false },
  "131026": { severity: "medium", description: "Mensagem muito grande", solution: "Reduza o tamanho dos parâmetros da mensagem.", retryable: false },
  "131047": { severity: "high", description: "Rate limit de templates", solution: "Reduza a frequência de envio de templates.", retryable: true },
  "131048": { severity: "high", description: "Rate limit de templates por destinatário", solution: "Evite enviar muitos templates para o mesmo número.", retryable: true },
  "132000": { severity: "high", description: "Limite de envio de mensagens", solution: "Aguarde o reset do limite ou faça upgrade da conta.", retryable: true },
  "132001": { severity: "high", description: "Número de telefone bloqueado", solution: "O número foi bloqueado pelo WhatsApp. Contate o suporte.", retryable: false },
  "132005": { severity: "critical", description: "Spam detectado", solution: "Revise o conteúdo das mensagens e reduza a frequência de envio.", retryable: false },
  "132007": { severity: "high", description: "Limite de envio diário excedido", solution: "Aguarde 24h ou faça upgrade da conta.", retryable: true },
  "132015": { severity: "critical", description: "Template pausado", solution: "O template foi pausado pela Meta. Verifique a qualidade do template.", retryable: false },
  "132016": { severity: "critical", description: "Template desabilitado", solution: "O template foi desabilitado pela Meta. Crie um novo template.", retryable: false },
  "132068": { severity: "critical", description: "Taxa de spam excedida", solution: "Melhore a qualidade das mensagens e engajamento dos usuários.", retryable: true },
  "133004": { severity: "high", description: "Template não encontrado", solution: "Certifique-se de que o template existe e está aprovado.", retryable: false },
  "133005": { severity: "high", description: "Template rejeitado", solution: "O template foi rejeitado pela Meta. Revise e reenvie para aprovação.", retryable: false },
  "133006": { severity: "high", description: "Template em análise", solution: "Aguarde a aprovação do template pela Meta.", retryable: true },
  "133016": { severity: "critical", description: "Template pausado por qualidade", solution: "A qualidade do template está baixa. Melhore o conteúdo e engajamento.", retryable: false },
  "368": { severity: "medium", description: "Temporariamente indisponível", solution: "Erro temporário. O sistema já faz retry automático.", retryable: true },
  "470": { severity: "critical", description: "Conta ou template com restrições", solution: "Verifique restrições na conta ou template no Business Manager.", retryable: false },
  "OPT_OUT": { severity: "low", description: "Usuário optou por não receber mensagens", solution: "Remova este contato da lista de envios.", retryable: false },
  "MISSING_BUTTON_PARAM": { severity: "high", description: "Parâmetro de botão ausente no CSV", solution: "Adicione os parâmetros obrigatórios dos botões no CSV.", retryable: false },
};

export default function ErrorAnalysis() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetail[]>([]);
  const [totalFailed, setTotalFailed] = useState(0);

  useEffect(() => {
    loadErrorAnalysis();
  }, [campaignId]);

  const loadErrorAnalysis = async () => {
    try {
      setLoading(true);

      // Buscar campanha
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Buscar todos os itens com erro
      const { data: failedItems, error: itemsError } = await supabase
        .from("campaign_items")
        .select("error_code, error_message")
        .eq("campaign_id", campaignId)
        .eq("status", "failed");

      if (itemsError) throw itemsError;

      setTotalFailed(failedItems?.length || 0);

      // Agrupar por código de erro
      const errorMap = new Map<string, number>();
      failedItems?.forEach((item) => {
        const code = item.error_code || "unknown";
        errorMap.set(code, (errorMap.get(code) || 0) + 1);
      });

      // Criar array de detalhes
      const details: ErrorDetail[] = Array.from(errorMap.entries()).map(([code, count]) => {
        const catalog = ERROR_CATALOG[code] || {
          severity: "medium" as const,
          description: "Erro desconhecido",
          solution: "Verifique os logs para mais detalhes.",
          retryable: false,
        };
        return {
          code,
          count,
          percentage: (count / (failedItems?.length || 1)) * 100,
          ...catalog,
        };
      });

      // Ordenar por count (maior para menor)
      details.sort((a, b) => b.count - a.count);
      setErrorDetails(details);

    } catch (error: any) {
      console.error("Erro ao carregar análise:", error);
      toast.error("Erro ao carregar análise de erros");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="h-4 w-4" />;
      case "high": return <AlertCircle className="h-4 w-4" />;
      case "medium": return <Info className="h-4 w-4" />;
      case "low": return <CheckCircle2 className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Análise de Erros</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Carregando análise...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const successRate = campaign ? ((campaign.sent / (campaign.sent + campaign.failed)) * 100) : 0;
  const failureRate = 100 - successRate;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Análise Detalhada de Erros</h1>
          <p className="text-muted-foreground">
            Campanha: {campaign?.name}
          </p>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Envios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign?.total_items || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sucessos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div className="text-2xl font-bold">{campaign?.sent || 0}</div>
              <Badge variant="secondary">{successRate.toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <div className="text-2xl font-bold">{totalFailed}</div>
              <Badge variant="destructive">{failureRate.toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tipos de Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorDetails.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Taxa de Sucesso */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Taxa de Sucesso</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={successRate} className="h-3" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{successRate.toFixed(1)}% sucesso</span>
            <span>{failureRate.toFixed(1)}% falhas</span>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Erros Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Código de Erro</CardTitle>
          <CardDescription>
            Análise completa dos erros encontrados com soluções sugeridas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {errorDetails.map((error, index) => (
                <div key={error.code}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(error.severity)}
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">
                                Código {error.code}
                              </CardTitle>
                              <Badge variant={getSeverityColor(error.severity)}>
                                {error.severity.toUpperCase()}
                              </Badge>
                              {error.retryable && (
                                <Badge variant="outline">Retentável</Badge>
                              )}
                            </div>
                            <CardDescription className="mt-1">
                              {error.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{error.count}</div>
                          <div className="text-xs text-muted-foreground">
                            {error.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Solução:</strong> {error.solution}
                        </AlertDescription>
                      </Alert>
                      <div className="mt-3">
                        <Progress value={error.percentage} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                  {index < errorDetails.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recomendações Gerais */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recomendações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {errorDetails.some(e => e.severity === "critical") && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erros Críticos Detectados:</strong> Existem erros críticos que requerem ação imediata.
                  Revise os templates pausados e parâmetros obrigatórios.
                </AlertDescription>
              </Alert>
            )}
            {errorDetails.some(e => e.code.includes("131047") || e.code.includes("131048")) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Rate Limit Detectado:</strong> Considere reduzir a taxa de envio para evitar bloqueios.
                </AlertDescription>
              </Alert>
            )}
            {errorDetails.some(e => e.code === "MISSING_BUTTON_PARAM" || e.code === "131008") && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Parâmetros Ausentes:</strong> Revise o CSV e certifique-se de que todos os campos obrigatórios estão preenchidos.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
