import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Globe, Languages, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mapeamento de DDI para idioma
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
  const queryClient = useQueryClient();
  const [newMappingDDI, setNewMappingDDI] = useState("");
  const [newMappingTemplate, setNewMappingTemplate] = useState("");

  // Buscar templates disponíveis
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

  // Buscar mapeamentos existentes (simulado - você pode criar uma tabela no Supabase)
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
        title: "Erro",
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
      title: "Mapeamento criado!",
      description: `Template ${template.name} vinculado ao DDI +${newMappingDDI}`,
    });
  };

  const removeMapping = (id: string) => {
    setMappings(mappings.filter(m => m.id !== id));
    toast({
      title: "Mapeamento removido",
      description: "O vínculo foi deletado com sucesso",
    });
  };

  // Detectar idioma pelo DDI
  const detectLanguageByDDI = (phone: string) => {
    const ddi = phone.replace(/\D/g, "").substring(0, 3);
    
    // Tentar match com DDIs de 3 dígitos
    let langInfo = DDI_TO_LANGUAGE[ddi as keyof typeof DDI_TO_LANGUAGE];
    
    // Se não encontrar, tentar com 2 dígitos
    if (!langInfo) {
      const ddi2 = ddi.substring(0, 2);
      langInfo = DDI_TO_LANGUAGE[ddi2 as keyof typeof DDI_TO_LANGUAGE];
    }
    
    // Se não encontrar, tentar com 1 dígito
    if (!langInfo) {
      const ddi1 = ddi.substring(0, 1);
      langInfo = DDI_TO_LANGUAGE[ddi1 as keyof typeof DDI_TO_LANGUAGE];
    }

    return langInfo || { code: "pt_BR", name: "Português (BR)", flag: "🇧🇷" };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Multi-idioma por País</h2>
        <p className="text-muted-foreground mt-1">
          Configure templates diferentes para cada país automaticamente
        </p>
      </div>

      {/* Como funciona */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Globe className="h-5 w-5" />
            Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <p>
            1. Configure qual template usar para cada DDI/país
          </p>
          <p>
            2. No disparo CSV, o sistema detecta automaticamente o país pelo número
          </p>
          <p>
            3. A mensagem é enviada no idioma correto para cada destinatário
          </p>
          <p className="font-semibold mt-3">
            Exemplo: Brasileiro recebe em PT-BR, americano em EN-US automaticamente!
          </p>
        </CardContent>
      </Card>

      {/* Adicionar novo mapeamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Mapeamento DDI → Template
          </CardTitle>
          <CardDescription>
            Vincule um template específico para cada país
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>País (DDI)</Label>
              <Select value={newMappingDDI} onValueChange={setNewMappingDDI}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o país..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DDI_TO_LANGUAGE).map(([ddi, info]) => (
                    <SelectItem key={ddi} value={ddi}>
                      {info.flag} +{ddi} - {info.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
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
              <Button onClick={addMapping} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de mapeamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Mapeamentos Configurados
          </CardTitle>
          <CardDescription>
            Templates que serão usados automaticamente por país
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mappings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum mapeamento configurado ainda
              </div>
            ) : (
              mappings.map((mapping) => {
                const langInfo = DDI_TO_LANGUAGE[mapping.ddi as keyof typeof DDI_TO_LANGUAGE];
                return (
                  <div
                    key={mapping.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{langInfo.flag}</span>
                      <div>
                        <div className="font-medium">
                          DDI +{mapping.ddi} - {langInfo.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Template: <span className="font-mono">{mapping.template_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={mapping.is_active ? "default" : "secondary"}>
                        {mapping.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMapping(mapping.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Testador */}
      <Card>
        <CardHeader>
          <CardTitle>Testador de Detecção</CardTitle>
          <CardDescription>
            Digite um número para ver qual idioma seria detectado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número de Teste</Label>
              <Input
                placeholder="+5511999999999"
                onChange={(e) => {
                  const detected = detectLanguageByDDI(e.target.value);
                  const ddi = e.target.value.replace(/\D/g, "").substring(1, 3);
                  const mapping = mappings.find(m => m.ddi === ddi);
                  
                  if (mapping) {
                    toast({
                      title: `${detected.flag} Detectado: ${detected.name}`,
                      description: `Template: ${mapping.template_name}`,
                    });
                  }
                }}
              />
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Dica:</strong> Cole números de diferentes países para testar a detecção automática
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
