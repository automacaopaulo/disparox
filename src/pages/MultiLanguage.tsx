import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Globe, Languages, Plus, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DDI_TO_LANGUAGE = {
  "55": { code: "pt_BR", name: "Português (BR)", flag: "🇧🇷" },
  "351": { code: "pt_PT", name: "Português (PT)", flag: "🇵🇹" },
  "1": { code: "en_US", name: "English (US)", flag: "🇺🇸" },
  "44": { code: "en_GB", name: "English (UK)", flag: "🇬🇧" },
  "34": { code: "es_ES", name: "Español (ES)", flag: "🇪🇸" },
  "52": { code: "es_MX", name: "Español (MX)", flag: "🇲🇽" },
  "54": { code: "es_AR", name: "Español (AR)", flag: "🇦🇷" },
  "33": { code: "fr_FR", name: "Français", flag: "🇫🇷" },
  "49": { code: "de_DE", name: "Deutsch", flag: "🇩🇪" },
  "39": { code: "it_IT", name: "Italiano", flag: "🇮🇹" },
  "86": { code: "zh_CN", name: "中文", flag: "🇨🇳" },
  "91": { code: "hi_IN", name: "हिन्दी", flag: "🇮🇳" },
  "81": { code: "ja_JP", name: "日本語", flag: "🇯🇵" },
};

interface TemplateMapping {
  id: string;
  ddi: string;
  template_id: string;
  template_name: string;
  language: string;
  is_active: boolean;
}

export default function MultiLanguage() {
  const { toast } = useToast();
  const [newMappingDDI, setNewMappingDDI] = useState("");
  const [newMappingTemplate, setNewMappingTemplate] = useState("");
  const [testPhone, setTestPhone] = useState("");

  const { data: templates } = useQuery({
    queryKey: ["all-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*, whatsapp_numbers(name)")
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
  });

  const [mappings, setMappings] = useState<TemplateMapping[]>([
    {
      id: "1",
      ddi: "55",
      template_id: "t1",
      template_name: "boas_vindas_pt",
      language: "pt_BR",
      is_active: true,
    },
    {
      id: "2",
      ddi: "1",
      template_id: "t2",
      template_name: "welcome_en",
      language: "en_US",
      is_active: true,
    },
  ]);

  const addMapping = () => {
    if (!newMappingDDI || !newMappingTemplate) {
      toast({
        title: "❌ Erro",
        description: "Selecione o DDI e o template",
        variant: "destructive",
      });
      return;
    }

    const template = templates?.find(t => t.id === newMappingTemplate);
    if (!template) return;

    const langInfo = DDI_TO_LANGUAGE[newMappingDDI as keyof typeof DDI_TO_LANGUAGE];

    const newMapping: TemplateMapping = {
      id: Date.now().toString(),
      ddi: newMappingDDI,
      template_id: template.id,
      template_name: template.name,
      language: langInfo.code,
      is_active: true,
    };

    setMappings([...mappings, newMapping]);
    setNewMappingDDI("");
    setNewMappingTemplate("");

    toast({
      title: "✅ Mapeamento criado!",
      description: `${template.name} → DDI +${newMappingDDI}`,
    });
  };

  const removeMapping = (id: string) => {
    setMappings(mappings.filter(m => m.id !== id));
    toast({
      title: "🗑️ Mapeamento removido",
      description: "O vínculo foi deletado",
    });
  };

  const detectLanguageByDDI = (phone: string) => {
    const ddi = phone.replace(/\D/g, "").substring(0, 3);
    
    let langInfo = DDI_TO_LANGUAGE[ddi as keyof typeof DDI_TO_LANGUAGE];
    
    if (!langInfo) {
      const ddi2 = ddi.substring(0, 2);
      langInfo = DDI_TO_LANGUAGE[ddi2 as keyof typeof DDI_TO_LANGUAGE];
    }
    
    if (!langInfo) {
      const ddi1 = ddi.substring(0, 1);
      langInfo = DDI_TO_LANGUAGE[ddi1 as keyof typeof DDI_TO_LANGUAGE];
    }

    return langInfo || { code: "pt_BR", name: "Português (BR)", flag: "🇧🇷" };
  };

  const handleTest = () => {
    const detected = detectLanguageByDDI(testPhone);
    const ddi = testPhone.replace(/\D/g, "").substring(1, 3);
    const mapping = mappings.find(m => m.ddi === ddi);
    
    if (mapping) {
      toast({
        title: `${detected.flag} Idioma Detectado: ${detected.name}`,
        description: `Template: ${mapping.template_name}`,
      });
    } else {
      toast({
        title: `${detected.flag} Idioma Detectado: ${detected.name}`,
        description: "Nenhum template configurado para este país",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Premium */}
      <div className="section-header">
        <h1 className="section-title flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          Multi-idioma Automático
        </h1>
        <p className="section-description">
          Configure templates diferentes para cada país baseado no DDI
        </p>
      </div>

      {/* Como Funciona - Premium */}
      <Card className="premium-card border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Como Funciona a Detecção Automática
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Configure os mapeamentos DDI → Template</p>
                <p className="text-sm text-muted-foreground">Defina qual template usar para cada código de país</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Sistema detecta o país pelo número</p>
                <p className="text-sm text-muted-foreground">O DDI é extraído automaticamente do número WhatsApp</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Mensagem enviada no idioma correto</p>
                <p className="text-sm text-muted-foreground">Cada lead recebe a comunicação no seu idioma nativo</p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-success/10 rounded-xl border border-success/20">
              <p className="font-semibold text-success-foreground">
                ✨ Exemplo: Brasileiro recebe em PT-BR, Americano em EN-US automaticamente!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adicionar Mapeamento - Premium */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-success" />
            Novo Mapeamento DDI → Template
          </CardTitle>
          <CardDescription>
            Vincule um template específico a cada código de país (DDI)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-base">País (DDI)</Label>
              <Select value={newMappingDDI} onValueChange={setNewMappingDDI}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o país..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DDI_TO_LANGUAGE).map(([ddi, info]) => (
                    <SelectItem key={ddi} value={ddi}>
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{info.flag}</span>
                        <span>+{ddi} - {info.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base">Template</Label>
              <Select value={newMappingTemplate} onValueChange={setNewMappingTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={addMapping} size="lg" className="w-full bg-success hover:bg-success/90">
                <Plus className="mr-2 h-5 w-5" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Mapeamentos - Premium */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            Mapeamentos Configurados ({mappings.length})
          </CardTitle>
          <CardDescription>
            Templates que serão usados automaticamente por país
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-muted/50 rounded-2xl">
                  <Languages className="h-16 w-16 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Nenhum mapeamento configurado</h3>
                  <p className="text-muted-foreground">
                    Adicione seu primeiro mapeamento acima
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {mappings.map((mapping) => {
                const langInfo = DDI_TO_LANGUAGE[mapping.ddi as keyof typeof DDI_TO_LANGUAGE];
                return (
                  <div
                    key={mapping.id}
                    className="flex items-center justify-between p-5 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{langInfo.flag}</div>
                      <div>
                        <div className="font-semibold text-lg">
                          DDI +{mapping.ddi} - {langInfo.name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>Template:</span>
                          <span className="font-mono font-medium text-primary">{mapping.template_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={mapping.is_active ? "bg-success" : "bg-muted"}>
                        {mapping.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMapping(mapping.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testador Premium */}
      <Card className="premium-card border-purple-500/20 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Testador de Detecção
          </CardTitle>
          <CardDescription>
            Teste a detecção automática de idioma por número
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base">Número de Teste</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="+5511999999999"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="text-base font-mono"
                />
                <Button 
                  onClick={handleTest}
                  disabled={!testPhone}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Testar
                </Button>
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-xl border">
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <span>💡</span>
                <span><strong>Dica:</strong> Cole números de diferentes países (+5511..., +1305..., +34...) para ver a detecção automática em ação</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
