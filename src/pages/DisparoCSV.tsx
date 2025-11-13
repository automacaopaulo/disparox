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
      
      // 🔧 Parser CSV que PRESERVA quebras de linha dentro de células entre aspas
      const parseCSV = (csvText: string, delimiter: string) => {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentCell = '';
        let insideQuotes = false;
        
        for (let i = 0; i < csvText.length; i++) {
          const char = csvText[i];
          const nextChar = csvText[i + 1];
          
          if (char === '"') {
            if (insideQuotes && nextChar === '"') {
              // Aspas duplas escapadas: ""
              currentCell += '"';
              i++; // Pular próxima aspa
            } else {
              // Toggle aspas
              insideQuotes = !insideQuotes;
            }
          } else if (char === delimiter && !insideQuotes) {
            // Fim da célula
            currentRow.push(currentCell.trim());
            currentCell = '';
          } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            // Fim da linha (fora de aspas)
            if (char === '\r' && nextChar === '\n') {
              i++; // Pular \n do \r\n
            }
            if (currentCell || currentRow.length > 0) {
              currentRow.push(currentCell.trim());
              if (currentRow.some(cell => cell !== '')) {
                rows.push(currentRow);
              }
              currentRow = [];
              currentCell = '';
            }
          } else {
            // Adicionar caractere à célula (incluindo \n dentro de aspas)
            currentCell += char;
          }
        }
        
        // Última célula e linha
        if (currentCell || currentRow.length > 0) {
          currentRow.push(currentCell.trim());
          if (currentRow.some(cell => cell !== '')) {
            rows.push(currentRow);
          }
        }
        
        return rows;
      };
      
      // Detectar delimitador
      const firstNewline = text.indexOf('\n');
      const firstLine = firstNewline > 0 ? text.substring(0, firstNewline) : text;
      const delimiter = firstLine.includes(';') ? ';' : ',';
      
      // Parsear CSV preservando quebras de linha
      const rows = parseCSV(text, delimiter);
      
      if (rows.length === 0) {
        toast({
          title: "❌ Erro ao ler CSV",
          description: "Arquivo CSV vazio ou inválido.",
          variant: "destructive",
        });
        return;
      }
      
      const headers = rows[0].map(h => h.trim());
      
      const data = rows.slice(1).map(values => {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        return row;
      });

      console.log('📋 CSV parsed com sucesso:', {
        headers,
        totalRows: data.length,
        firstRow: data[0],
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
            
            // 🐛 DEBUG: Log temporário para verificar quebras de linha
            if (value.includes('\n')) {
              console.log(`🔍 DEBUG ${varKey} contém quebras de linha:`, JSON.stringify(value));
            }
            
            // Se o parâmetro não pode ser vazio e está vazio, usar placeholder
            if (!value && !mapping.omitIfEmpty) {
              params[varKey] = "N/A";
            } else if (value) {
              params[varKey] = value; // PRESERVAR valor exatamente como está
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
    <div className="space-y-6 max-w-4xl">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {[
          { num: 1, label: "Upload CSV" },
          { num: 2, label: "Configuração" },
          { num: 3, label: "Executar" },
        ].map(({ num, label }, idx) => (
          <div key={num} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= num
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {num}
              </div>
              <span className={`text-sm ${step >= num ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {idx < 2 && (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload CSV */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload do Arquivo CSV</CardTitle>
            <CardDescription>Faça upload do arquivo com os contatos para disparo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Arquivo CSV</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="csv-file" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Clique para fazer upload</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato: CSV com coluna "numero"
                  </p>
                </label>
              </div>
            </div>

            {csvData.length > 0 && (
              <>
                <div className="bg-muted/50 p-4 rounded-lg space-y-3 border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Preview dos Dados</span>
                    <Badge>{csvData.length} linhas</Badge>
                  </div>
                  <div className="text-sm">
                    <strong>Colunas:</strong> <span className="font-mono">{headers.join(", ")}</span>
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

                {/* Validação */}
                {validationResults && (
                  <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                    <div className="font-semibold text-sm">Validação de Números</div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                        ✓ {validationResults.valid} válidos
                      </Badge>
                      {validationResults.invalid > 0 && (
                        <Badge variant="destructive">
                          ✗ {validationResults.invalid} inválidos
                        </Badge>
                      )}
                    </div>
                    
                    {validationResults.invalid > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                        <p className="font-medium mb-1">Números com problema:</p>
                        {validationResults.details
                          .filter(d => d.status === 'invalid')
                          .slice(0, 10)
                          .map((detail, idx) => (
                            <div key={idx} className="flex justify-between p-2 bg-background rounded">
                              <span>Linha {detail.row}: <span className="font-mono">{detail.phone}</span></span>
                              <span className="text-destructive">{detail.reason}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                <Button onClick={() => setStep(2)} className="w-full">
                  Continuar para Configuração
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
            <CardTitle>Configuração da Campanha</CardTitle>
            <CardDescription>Defina os parâmetros de envio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Nome da Campanha</Label>
              <Input
                id="campaign-name"
                placeholder="Ex: Black Friday 2025"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">Número WhatsApp *</Label>
              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger id="whatsapp-number">
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
              <Label>Templates * (múltiplos para fallback)</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {templates?.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-center gap-2 p-2 rounded ${
                      selectedTemplates.includes(template.id)
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
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
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{template.name}</span>
                          {selectedTemplates.includes(template.id) && (
                            <Badge variant="outline" className="text-xs">
                              #{selectedTemplates.indexOf(template.id) + 1}
                            </Badge>
                          )}
                          {template.mappings && Object.keys(template.mappings).length > 0 ? (
                            <Badge variant="outline" className="text-xs text-green-600">
                              ✓ Mapeado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-orange-600">
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
                      >
                        Mapear
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Selecione múltiplos templates. Se o 1º falhar, tentará o 2º automaticamente.
              </p>
              
              {/* Aviso de mapeamento */}
              {selectedTemplates.length > 0 && !allHaveMappings && (
                <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded text-xs">
                  <p className="font-medium text-orange-700 dark:text-orange-400">⚠️ Mapeamento necessário</p>
                  <p className="text-orange-600 dark:text-orange-500">
                    Configure o mapeamento dos templates antes de continuar.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Taxa de Envio (msg/segundo)</Label>
              <Input
                id="rate"
                type="number"
                min="1"
                max="80"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                ⚡ Recomendado: 40 msg/s • Máximo: 80 msg/s
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
            <CardTitle>Revisão Final</CardTitle>
            <CardDescription>Confirme os dados antes de iniciar o envio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3 border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nome da Campanha:</span>
                <span className="font-semibold">{campaignName || "Sem nome"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Templates:</span>
                <div className="text-right space-y-1">
                  {selectedTemplateObjs.map((t, idx) => (
                    <div key={t.id} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">#{idx + 1}</Badge>
                      <span className="text-xs font-mono">{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total de Envios:</span>
                <span className="text-xl font-bold text-primary">{csvData.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de Envio:</span>
                <span className="font-semibold">{rate} msg/s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tempo Estimado:</span>
                <span className="font-semibold">~{Math.ceil(csvData.length / rate)} segundos</span>
              </div>
            </div>

            {/* Preview da Mensagem */}
            {selectedTemplateObjs.length > 0 && csvData.length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold text-sm mb-3">Preview da Mensagem no WhatsApp</h4>
                <p className="text-xs text-muted-foreground mb-3">Exemplo com os dados da primeira linha do CSV</p>
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
              </div>
            )}

            {!allHaveMappings && (
              <div className="border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  Alguns templates não possuem mapeamento configurado. As variáveis podem não ser preenchidas corretamente.
                </p>
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
