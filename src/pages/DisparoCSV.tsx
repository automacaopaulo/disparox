import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Send, FileText, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function DisparoCSV() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedNumber, setSelectedNumber] = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [rate, setRate] = useState(40);
  const [campaignName, setCampaignName] = useState("");

  const { data: whatsappNumbers } = useQuery({
    queryKey: ["whatsapp-numbers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_numbers")
        .select("*")
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["templates-active", selectedNumber],
    queryFn: async () => {
      if (!selectedNumber) return [];
      
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("whatsapp_number_id", selectedNumber)
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedNumber,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const headers = lines[0].split(",").map(h => h.trim());
      
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(",");
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || "";
          });
          return row;
        });

      setHeaders(headers);
      setCsvData(data);
      toast({
        title: "CSV carregado!",
        description: `${data.length} linhas encontradas.`,
      });
    };
    
    reader.readAsText(file);
  };

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNumber || selectedTemplates.length === 0 || csvData.length === 0) {
        throw new Error("Dados incompletos");
      }

      const selectedTemplateObjs = templates?.filter(t => selectedTemplates.includes(t.id)) || [];
      if (selectedTemplateObjs.length === 0) throw new Error("Templates não encontrados");

      // Upload CSV para Storage
      let csvUrl = null;
      if (csvFile) {
        const fileName = `${Date.now()}_${csvFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('campaign-csvs')
          .upload(fileName, csvFile);

        if (uploadError) {
          console.warn("Erro ao fazer upload do CSV:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('campaign-csvs')
            .getPublicUrl(fileName);
          csvUrl = urlData.publicUrl;
        }
      }

      // Criar campanha com múltiplos templates
      const templateNames = selectedTemplateObjs.map(t => t.name);
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name: campaignName || `Campanha ${new Date().toLocaleString()}`,
          whatsapp_number_id: selectedNumber,
          template_name: templateNames[0], // Template principal
          language: selectedTemplateObjs[0].language,
          total_items: csvData.length,
          status: "pending",
          processing_rate: rate,
          csv_file_url: csvUrl,
        } as any)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Criar items
      const items = csvData.map(row => {
        const params: any = {};
        const mappings = selectedTemplateObjs[0].mappings || {};

        // Aplicar mapeamentos
        Object.keys(mappings).forEach(varKey => {
          const mapping = mappings[varKey];
          if (mapping.type === "column" && mapping.value) {
            params[varKey] = row[mapping.value] || "";
          } else if (mapping.type === "fixed") {
            params[varKey] = mapping.value || "";
          }
        });

        return {
          campaign_id: campaign.id,
          msisdn: row.numero || row.telefone || row.phone || "",
          params,
          status: "pending",
        };
      });

      const { error: itemsError } = await supabase
        .from("campaign_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // Iniciar processamento
      const { error: processError } = await supabase.functions.invoke("process-campaign", {
        body: { campaignId: campaign.id },
      });

      if (processError) throw processError;

      return campaign;
    },
    onSuccess: (campaign) => {
      toast({
        title: "Campanha iniciada!",
        description: `Campanha ${campaign.name} está sendo processada.`,
      });
      // Resetar form
      setStep(1);
      setCsvFile(null);
      setCsvData([]);
      setHeaders([]);
      setSelectedNumber("");
      setSelectedTemplates([]);
      setCampaignName("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedTemplateObjs = templates?.filter(t => selectedTemplates.includes(t.id)) || [];
  const allHaveMappings = selectedTemplateObjs.every(t => 
    t.mappings && Object.keys(t.mappings).length > 0
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold">Disparo em Massa (CSV)</h2>
        <p className="text-muted-foreground mt-1">
          Envie mensagens em lote a partir de um arquivo CSV
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
            <span className={step >= s ? "font-medium" : "text-muted-foreground"}>
              {s === 1 && "Upload CSV"}
              {s === 2 && "Configuração"}
              {s === 3 && "Executar"}
            </span>
            {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload CSV */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 1: Upload do CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Arquivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
              />
              <p className="text-sm text-muted-foreground">
                O CSV deve conter uma coluna "numero" com os telefones (55DDDNÚMERO)
              </p>
            </div>

            {csvData.length > 0 && (
              <>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Preview dos Dados</span>
                    <Badge>{csvData.length} linhas</Badge>
                  </div>
                  <div className="text-sm">
                    <strong>Colunas encontradas:</strong> {headers.join(", ")}
                  </div>
                  <div className="mt-2 max-h-40 overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          {headers.slice(0, 5).map(h => (
                            <th key={h} className="text-left p-1">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-b">
                            {headers.slice(0, 5).map(h => (
                              <td key={h} className="p-1">{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Button onClick={() => setStep(2)} className="w-full">
                  Próximo: Configuração
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configuração */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 2: Configuração da Campanha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Nome da Campanha</Label>
              <Input
                id="campaign-name"
                placeholder="Ex: Campanha Black Friday 2025"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">Número WhatsApp *</Label>
              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger id="whatsapp-number">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {whatsappNumbers?.map((number) => (
                    <SelectItem key={number.id} value={number.id}>
                      {number.name} - {number.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="templates">Templates * (múltiplos para fallback)</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                {templates?.map((template) => (
                  <div key={template.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`template-${template.id}`}
                      checked={selectedTemplates.includes(template.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTemplates([...selectedTemplates, template.id]);
                        } else {
                          setSelectedTemplates(selectedTemplates.filter(id => id !== template.id));
                        }
                      }}
                      disabled={!selectedNumber}
                      className="cursor-pointer"
                    />
                    <label htmlFor={`template-${template.id}`} className="text-sm cursor-pointer flex-1">
                      {template.name}
                      {selectedTemplates.includes(template.id) && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          #{selectedTemplates.indexOf(template.id) + 1}
                        </Badge>
                      )}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Selecione múltiplos templates. Se o 1º falhar (pausado), tentará o 2º automaticamente.
              </p>
              {selectedTemplates.length > 0 && !allHaveMappings && (
                <p className="text-sm text-yellow-600">
                  ⚠️ Alguns templates não têm mapeamento configurado. Configure em Templates.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Taxa de Envio (mensagens/segundo)</Label>
              <Input
                id="rate"
                type="number"
                min="1"
                max="80"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: 40 msg/s (seguro). Máximo: 80 msg/s.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Voltar
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!selectedNumber || selectedTemplates.length === 0}
                className="flex-1"
              >
                Próximo: Revisar
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Executar */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 3: Revisão e Execução</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Nome:</span>
                <span>{campaignName || "Sem nome"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Templates:</span>
                <div className="text-right">
                  {selectedTemplateObjs.map((t, idx) => (
                    <div key={t.id}>
                      {idx + 1}. {t.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total de envios:</span>
                <span>{csvData.length} mensagens</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Taxa:</span>
                <span>{rate} msg/s</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Tempo estimado:</span>
                <span>{Math.ceil(csvData.length / rate)} segundos</span>
              </div>
            </div>

            {!allHaveMappings && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                ⚠️ Alguns templates não possuem mapeamento. As variáveis podem não ser preenchidas.
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => createCampaignMutation.mutate()}
                disabled={createCampaignMutation.isPending}
                className="flex-1"
                size="lg"
              >
                {createCampaignMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Iniciar Campanha
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
