import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Loader2, Upload, Send, FileText, ChevronRight, CheckCircle2, AlertCircle, Zap, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TemplateMappingDialog } from "@/components/TemplateMappingDialog";

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
  const [mappingDialogTemplate, setMappingDialogTemplate] = useState<any>(null);
  const [validationResults, setValidationResults] = useState<{
    valid: number;
    invalid: number;
    details: Array<{ row: number; phone: string; status: 'valid' | 'invalid'; reason?: string }>;
  } | null>(null);

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

  const validateMSISDN = (phone: string): { valid: boolean; formatted: string; reason?: string } => {
    if (!phone) return { valid: false, formatted: '', reason: 'Vazio' };
    
    let cleaned = phone.replace(/[\s\(\)\-]/g, '');
    
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('55')) {
        cleaned = '+' + cleaned;
      } else if (cleaned.length >= 10) {
        cleaned = '+55' + cleaned;
      } else {
        return { valid: false, formatted: cleaned, reason: 'Formato inválido' };
      }
    }
    
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(cleaned)) {
      return { valid: false, formatted: cleaned, reason: 'Não é E.164' };
    }
    
    return { valid: true, formatted: cleaned };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());
      
      // Detectar delimitador (vírgula ou ponto-e-vírgula)
      const firstLine = lines[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';
      
      const headers = firstLine.split(delimiter).map(h => h.trim());
      
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(delimiter);
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || "";
          });
          return row;
        });

      setHeaders(headers);
      setCsvData(data);

      const phoneColumn = headers.find(h => 
        ['numero', 'telefone', 'phone', 'celular', 'whatsapp'].includes(h.toLowerCase())
      );

      if (phoneColumn) {
        const results = data.map((row, idx) => {
          const phone = row[phoneColumn];
          const validation = validateMSISDN(phone);
          return {
            row: idx + 1,
            phone,
            status: validation.valid ? 'valid' as const : 'invalid' as const,
            reason: validation.reason,
          };
        });

        const valid = results.filter(r => r.status === 'valid').length;
        const invalid = results.filter(r => r.status === 'invalid').length;

        setValidationResults({ valid, invalid, details: results });

        toast({
          title: "✅ CSV carregado com sucesso!",
          description: `${data.length} linhas: ${valid} válidos, ${invalid} inválidos.`,
        });
      } else {
        toast({
          title: "📄 CSV carregado!",
          description: `${data.length} linhas encontradas.`,
        });
      }
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

      const templateNames = selectedTemplateObjs.map(t => t.name);
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name: campaignName || `Campanha ${new Date().toLocaleString()}`,
          whatsapp_number_id: selectedNumber,
          template_name: templateNames[0],
          language: selectedTemplateObjs[0].language,
          total_items: csvData.length,
          status: "pending",
          processing_rate: rate,
          csv_file_url: csvUrl,
        } as any)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Detectar coluna de telefone
      const phoneColumn = headers.find(h => 
        ['numero', 'telefone', 'phone', 'celular', 'whatsapp', 'msisdn'].some(
          term => h.toLowerCase().includes(term.toLowerCase())
        )
      );

      const items = csvData.map(row => {
        const params: any = {};
        const mappings = selectedTemplateObjs[0].mappings || {};

        Object.keys(mappings).forEach(varKey => {
          const mapping = mappings[varKey];
          if (mapping.type === "column" && mapping.value) {
            const value = row[mapping.value] || "";
            // Se o parâmetro não pode ser vazio e está vazio, usar placeholder
            if (!value && !mapping.omitIfEmpty) {
              params[varKey] = "N/A";
            } else if (value) {
              params[varKey] = value;
            } else {
              params[varKey] = "";
            }
          } else if (mapping.type === "fixed") {
            params[varKey] = mapping.value || "";
          }
        });

        // Pegar o número da coluna detectada e formatar
        const rawPhone = phoneColumn ? row[phoneColumn] : 
          (row.numero || row.telefone || row.phone || row.celular || row.whatsapp || "");
        
        const { formatted } = validateMSISDN(rawPhone);

        return {
          campaign_id: campaign.id,
          msisdn: formatted, // Usar número formatado
          params,
          status: "pending",
        };
      }).filter(item => item.msisdn); // Filtrar itens sem número válido

      // Atualizar total_items com o número real de itens válidos
      if (items.length !== csvData.length) {
        await supabase
          .from("campaigns")
          .update({ total_items: items.length })
          .eq("id", campaign.id);
      }

      const { error: itemsError } = await supabase
        .from("campaign_items")
        .insert(items);

      if (itemsError) throw itemsError;

      const { error: processError } = await supabase.functions.invoke("process-campaign", {
        body: { campaignId: campaign.id },
      });

      if (processError) throw processError;

      return campaign;
    },
    onSuccess: (campaign) => {
      toast({
        title: "🚀 Campanha iniciada!",
        description: `${campaign.name} está sendo processada.`,
      });
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
        title: "❌ Erro ao criar campanha",
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
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Stepper Premium */}
      <Card className="border-2 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            {[
              { num: 1, label: "Upload CSV", icon: Upload },
              { num: 2, label: "Configuração", icon: Settings },
              { num: 3, label: "Executar", icon: Send },
            ].map(({ num, label, icon: Icon }, idx) => (
              <div key={num} className="flex items-center gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      step >= num
                        ? "bg-primary text-primary-foreground shadow-lg scale-110"
                        : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {step > num ? <CheckCircle2 className="h-5 w-5" /> : num}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${step >= num ? "text-foreground" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                    <div className="flex items-center gap-1">
                      <Icon className={`h-4 w-4 ${step >= num ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                  </div>
                </div>
                {idx < 2 && (
                  <ChevronRight className={`h-5 w-5 mx-2 ${step > num ? "text-primary" : "text-muted-foreground"}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Upload CSV */}
      {step === 1 && (
        <Card className="border-2 shadow-md">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Upload do Arquivo CSV</CardTitle>
                <CardDescription className="mt-1">Faça upload do arquivo com os contatos para disparo</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="csv-file" className="text-base">Arquivo CSV</Label>
              <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="csv-file" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">Clique para fazer upload ou arraste aqui</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato: CSV com coluna "numero" (55DDDNÚMERO)
                  </p>
                </label>
              </div>
            </div>

            {csvData.length > 0 && (
              <>
                <div className="bg-muted/50 p-6 rounded-xl space-y-4 border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">Preview dos Dados</span>
                    <Badge className="bg-primary">{csvData.length} linhas</Badge>
                  </div>
                  <div className="text-sm">
                    <strong>Colunas:</strong> <span className="font-mono text-primary">{headers.join(", ")}</span>
                  </div>
                  <div className="mt-4 max-h-48 overflow-auto rounded-lg border bg-background">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          {headers.slice(0, 5).map(h => (
                            <th key={h} className="text-left p-3 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t hover:bg-muted/30">
                            {headers.slice(0, 5).map(h => (
                              <td key={h} className="p-3">{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Validação Premium */}
                {validationResults && (
                  <Card className={`border-2 ${
                    validationResults.invalid > 0 ? 'border-warning/50 bg-warning/5' : 'border-success/50 bg-success/5'
                  }`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {validationResults.invalid > 0 ? (
                          <AlertCircle className="h-5 w-5 text-warning" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        )}
                        Validação de Números
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-3">
                        <Badge className="bg-success text-success-foreground">
                          ✓ {validationResults.valid} válidos
                        </Badge>
                        {validationResults.invalid > 0 && (
                          <Badge variant="destructive">
                            ✗ {validationResults.invalid} inválidos
                          </Badge>
                        )}
                      </div>
                      
                      {validationResults.invalid > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-2 p-4 bg-background rounded-lg border">
                          <p className="text-sm font-medium mb-2">Números com problema:</p>
                          {validationResults.details
                            .filter(d => d.status === 'invalid')
                            .slice(0, 10)
                            .map((detail, idx) => (
                              <div key={idx} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                                <span>Linha {detail.row}: <span className="font-mono">{detail.phone}</span></span>
                                <span className="text-destructive font-medium">{detail.reason}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Button onClick={() => setStep(2)} size="lg" className="w-full">
                  Continuar para Configuração
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configuração */}
      {step === 2 && (
        <Card className="border-2 shadow-md">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Configuração da Campanha</CardTitle>
                <CardDescription className="mt-1">Defina os parâmetros de envio</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="campaign-name" className="text-base">Nome da Campanha</Label>
              <Input
                id="campaign-name"
                placeholder="Ex: Black Friday 2025 - Ofertas"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-number" className="text-base">Número WhatsApp *</Label>
              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger id="whatsapp-number" className="text-base">
                  <SelectValue placeholder="Selecione o número..." />
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
              <Label className="text-base">Templates * (múltiplos para fallback)</Label>
              <div className="border-2 rounded-xl p-4 space-y-2 max-h-60 overflow-y-auto bg-muted/30">
                {templates?.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      selectedTemplates.includes(template.id)
                        ? "bg-primary/10 border-2 border-primary"
                        : "hover:bg-background border-2 border-transparent"
                    }`}
                  >
                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(template.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTemplates([...selectedTemplates, template.id]);
                          } else {
                            setSelectedTemplates(selectedTemplates.filter(id => id !== template.id));
                          }
                        }}
                        disabled={!selectedNumber}
                        className="w-5 h-5 rounded border-2 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.name}</span>
                          {selectedTemplates.includes(template.id) && (
                            <Badge className="bg-primary text-xs">
                              #{selectedTemplates.indexOf(template.id) + 1}
                            </Badge>
                          )}
                          {template.mappings && Object.keys(template.mappings).length > 0 ? (
                            <Badge variant="outline" className="text-xs border-success text-success">
                              ✓ Mapeado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-warning text-warning">
                              ! Sem mapeamento
                            </Badge>
                          )}
                        </div>
                      </div>
                    </label>
                    {selectedTemplates.includes(template.id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMappingDialogTemplate(template)}
                        className="shrink-0"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Mapear
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-2 mt-2">
                <span>💡</span>
                <span>Selecione múltiplos templates. Se o 1º falhar (pausado), tentará o 2º automaticamente.</span>
              </p>
              
              {/* Aviso de mapeamento */}
              {selectedTemplates.length > 0 && !allHaveMappings && (
                <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div className="text-xs text-warning-foreground">
                    <p className="font-medium mb-1">⚠️ Mapeamento necessário</p>
                    <p>
                      Alguns templates selecionados ainda não têm mapeamento configurado. 
                      Clique em <strong>"Mapear"</strong> ao lado de cada template para configurar como as variáveis serão preenchidas.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate" className="text-base">Taxa de Envio (msg/segundo)</Label>
              <Input
                id="rate"
                type="number"
                min="1"
                max="80"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                ⚡ Recomendado: 40 msg/s (seguro) • Máximo: 80 msg/s
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1" size="lg">
                Voltar
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!selectedNumber || selectedTemplates.length === 0}
                className="flex-1"
                size="lg"
              >
                Próximo: Revisar
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Executar */}
      {step === 3 && (
        <Card className="border-2 shadow-md">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Send className="h-6 w-6 text-success" />
              </div>
              <div>
                <CardTitle className="text-xl">Revisão Final</CardTitle>
                <CardDescription className="mt-1">Confirme os dados antes de iniciar o envio</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-6 rounded-xl space-y-4 border-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-muted-foreground">Nome da Campanha:</span>
                <span className="font-semibold">{campaignName || "Sem nome"}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-medium text-muted-foreground">Templates:</span>
                <div className="text-right space-y-1">
                  {selectedTemplateObjs.map((t, idx) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <Badge variant="outline">#{idx + 1}</Badge>
                      <span className="font-mono text-sm">{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-muted-foreground">Total de Envios:</span>
                <span className="text-2xl font-bold text-primary">{csvData.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-muted-foreground">Taxa de Envio:</span>
                <span className="font-semibold">{rate} msg/s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-muted-foreground">Tempo Estimado:</span>
                <span className="font-semibold text-success">~{Math.ceil(csvData.length / rate)} segundos</span>
              </div>
            </div>

            {/* Preview da Mensagem */}
            {selectedTemplateObjs.length > 0 && csvData.length > 0 && (
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    📱 Preview da Mensagem no WhatsApp
                  </CardTitle>
                  <CardDescription>Exemplo com os dados da primeira linha do CSV</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-lg max-w-sm mx-auto">
                    {/* Bubble de mensagem do WhatsApp */}
                    <div className="bg-[#DCF8C6] dark:bg-[#005C4B] rounded-lg p-3 space-y-2">
                      {(() => {
                        const template = selectedTemplateObjs[0];
                        const firstRow = csvData[0];
                        const mappings = template.mappings as any || {};
                        const structure = template.structure as any;
                        
                        // Substituir variáveis no texto
                        let bodyText = structure.body?.text || "";
                        if (structure.body?.vars) {
                          structure.body.vars.forEach((v: any) => {
                            const paramKey = `body_${v.index}`;
                            const mapping = mappings[paramKey];
                            let value = "N/A";
                            
                            if (mapping?.type === "column" && mapping.value) {
                              value = firstRow[mapping.value] || "N/A";
                            } else if (mapping?.type === "fixed") {
                              value = mapping.value || "N/A";
                            }
                            
                            bodyText = bodyText.replace(`{{${v.index}}}`, value);
                          });
                        }
                        
                        return (
                          <>
                            <p className="text-sm text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap">
                              {bodyText}
                            </p>
                            
                            {/* Botões */}
                            {structure.buttons?.map((btn: any, idx: number) => {
                              if (btn.type === "URL") {
                                let btnUrl = btn.urlPattern || btn.url || "";
                                
                                if (btn.hasVars && btn.vars) {
                                  btn.vars.forEach((v: any) => {
                                    const paramKey = `button_${idx}_${v.index}`;
                                    const mapping = mappings[paramKey];
                                    let value = "";
                                    
                                    if (mapping?.type === "column" && mapping.value) {
                                      value = firstRow[mapping.value] || "";
                                    } else if (mapping?.type === "fixed") {
                                      value = mapping.value || "";
                                    }
                                    
                                    btnUrl = btnUrl.replace(`{{${v.index}}}`, value);
                                  });
                                }
                                
                                return (
                                  <div key={idx} className="mt-2 pt-2 border-t border-zinc-400/30">
                                    <button className="w-full text-center text-sm text-blue-600 dark:text-blue-400 font-medium py-1">
                                      🔗 {btn.text}
                                    </button>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center truncate">
                                      {btnUrl}
                                    </p>
                                  </div>
                                );
                              }
                              
                              if (btn.type === "QUICK_REPLY") {
                                return (
                                  <div key={idx} className="mt-2 pt-2 border-t border-zinc-400/30">
                                    <button className="w-full text-center text-sm text-blue-600 dark:text-blue-400 font-medium py-1">
                                      💬 {btn.text}
                                    </button>
                                  </div>
                                );
                              }
                              
                              return null;
                            })}
                          </>
                        );
                      })()}
                      
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 text-right mt-2">
                        12:00
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!allHaveMappings && (
              <Card className="border-warning bg-warning/5">
                <CardContent className="pt-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                  <p className="text-sm text-warning-foreground">
                    Alguns templates não possuem mapeamento configurado. As variáveis podem não ser preenchidas corretamente.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1" size="lg">
                Voltar
              </Button>
              <Button
                onClick={() => createCampaignMutation.mutate()}
                disabled={createCampaignMutation.isPending}
                className="flex-1 bg-success hover:bg-success/90"
                size="lg"
              >
                {createCampaignMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Iniciando Campanha...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    🚀 Iniciar Campanha Agora
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Mapeamento */}
      {mappingDialogTemplate && (
        <TemplateMappingDialog
          template={mappingDialogTemplate}
          open={!!mappingDialogTemplate}
          onOpenChange={(open) => !open && setMappingDialogTemplate(null)}
          csvHeaders={headers}
        />
      )}
    </div>
  );
}
