import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, TrendingUp } from "lucide-react";

// Custos por DDI (valores aproximados em R$)
const DDI_COSTS = {
  "55": { country: "Brasil", cost: 0.05, currency: "R$", flag: "🇧🇷" },
  "1": { country: "EUA/Canadá", cost: 0.08, currency: "R$", flag: "🇺🇸" },
  "351": { country: "Portugal", cost: 0.12, currency: "R$", flag: "🇵🇹" },
  "34": { country: "Espanha", cost: 0.12, currency: "R$", flag: "🇪🇸" },
  "54": { country: "Argentina", cost: 0.07, currency: "R$", flag: "🇦🇷" },
  "52": { country: "México", cost: 0.09, currency: "R$", flag: "🇲🇽" },
  "44": { country: "Reino Unido", cost: 0.13, currency: "R$", flag: "🇬🇧" },
  "49": { country: "Alemanha", cost: 0.14, currency: "R$", flag: "🇩🇪" },
  "33": { country: "França", cost: 0.13, currency: "R$", flag: "🇫🇷" },
  "39": { country: "Itália", cost: 0.12, currency: "R$", flag: "🇮🇹" },
  "86": { country: "China", cost: 0.11, currency: "R$", flag: "🇨🇳" },
  "91": { country: "Índia", cost: 0.06, currency: "R$", flag: "🇮🇳" },
  "81": { country: "Japão", cost: 0.15, currency: "R$", flag: "🇯🇵" },
  "61": { country: "Austrália", cost: 0.14, currency: "R$", flag: "🇦🇺" },
};

export default function CostCalculator() {
  const [quantity, setQuantity] = useState<number>(1000);
  const [selectedDDI, setSelectedDDI] = useState<string>("55");
  const [campaignType, setCampaignType] = useState<string>("marketing");

  const ddiInfo = DDI_COSTS[selectedDDI as keyof typeof DDI_COSTS];
  
  // Multiplicadores por tipo de campanha
  const typeMultiplier = campaignType === "service" ? 0.8 : 1.0; // Mensagens de serviço são mais baratas
  
  const costPerMessage = ddiInfo.cost * typeMultiplier;
  const totalCost = quantity * costPerMessage;
  const estimatedDelivery = quantity * 0.95; // 95% taxa média de entrega
  const estimatedReads = estimatedDelivery * 0.70; // 70% taxa média de leitura
  const costPerRead = totalCost / estimatedReads;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold">Calculadora de Custos</h2>
        <p className="text-muted-foreground mt-1">
          Estime os custos de suas campanhas internacionais
        </p>
      </div>

      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Configure sua Campanha
          </CardTitle>
          <CardDescription>
            Insira os detalhes para calcular o custo estimado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade de Mensagens</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ddi">País de Destino (DDI)</Label>
              <Select value={selectedDDI} onValueChange={setSelectedDDI}>
                <SelectTrigger id="ddi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DDI_COSTS).map(([ddi, info]) => (
                    <SelectItem key={ddi} value={ddi}>
                      {info.flag} {info.country} (+{ddi}) - {info.currency}{info.cost.toFixed(3)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Mensagem</Label>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing (padrão)</SelectItem>
                  <SelectItem value="service">Serviço (20% desconto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Custo Total
              </span>
              <Badge variant="default" className="text-lg">
                {ddiInfo.currency} {totalCost.toFixed(2)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custo por mensagem:</span>
              <span className="font-medium">{ddiInfo.currency} {costPerMessage.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total de mensagens:</span>
              <span className="font-medium">{quantity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tipo de campanha:</span>
              <span className="font-medium">
                {campaignType === "service" ? "Serviço (-20%)" : "Marketing"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Estimativas de Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entregas estimadas (95%):</span>
              <span className="font-medium text-green-600">{Math.round(estimatedDelivery).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Leituras estimadas (70%):</span>
              <span className="font-medium text-blue-600">{Math.round(estimatedReads).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custo por leitura:</span>
              <span className="font-medium">{ddiInfo.currency} {costPerRead.toFixed(4)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Preços */}
      <Card>
        <CardHeader>
          <CardTitle>Tabela de Preços por País</CardTitle>
          <CardDescription>
            Custos aproximados por mensagem em cada região
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {Object.entries(DDI_COSTS)
              .sort((a, b) => a[1].cost - b[1].cost)
              .map(([ddi, info]) => (
                <div
                  key={ddi}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    selectedDDI === ddi ? "bg-primary/10 border-primary" : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info.flag}</span>
                    <div>
                      <div className="font-medium">{info.country}</div>
                      <div className="text-xs text-muted-foreground">DDI +{ddi}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{info.currency} {info.cost.toFixed(3)}</div>
                    <div className="text-xs text-muted-foreground">por mensagem</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Avisos */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-yellow-800">⚠️ Observações Importantes:</p>
            <ul className="list-disc list-inside space-y-1 text-yellow-700">
              <li>Custos são estimativas e podem variar conforme a operadora</li>
              <li>Mensagens de serviço (notificações, OTP) têm desconto de 20%</li>
              <li>Templates precisam estar aprovados para cada país de destino</li>
              <li>Alguns países têm restrições de horário para envios comerciais</li>
              <li>Taxa de entrega e leitura são médias aproximadas</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
