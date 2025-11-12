import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface QualityRatingBadgeProps {
  rating: string | null;
  updatedAt?: string;
}

export function QualityRatingBadge({ rating, updatedAt }: QualityRatingBadgeProps) {
  const getVariant = (rating: string | null) => {
    switch (rating?.toUpperCase()) {
      case 'GREEN':
        return 'default';
      case 'YELLOW':
        return 'secondary';
      case 'RED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getLabel = (rating: string | null) => {
    switch (rating?.toUpperCase()) {
      case 'GREEN':
        return '🟢 Qualidade Alta';
      case 'YELLOW':
        return '🟡 Qualidade Média';
      case 'RED':
        return '🔴 Qualidade Baixa';
      default:
        return '⚪ Desconhecido';
    }
  };

  const getDescription = (rating: string | null) => {
    switch (rating?.toUpperCase()) {
      case 'GREEN':
        return 'Excelente histórico de mensagens. Taxa máxima de envio disponível.';
      case 'YELLOW':
        return 'Qualidade moderada. Pode haver limitações na taxa de envio.';
      case 'RED':
        return 'Qualidade baixa. Restrições severas aplicadas. Revise suas práticas.';
      default:
        return 'Status de qualidade não disponível.';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getVariant(rating)} className="cursor-help">
            {getLabel(rating)}
            <Info className="h-3 w-3 ml-1" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold mb-1">Quality Rating</p>
          <p className="text-sm">{getDescription(rating)}</p>
          {updatedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              Última atualização: {new Date(updatedAt).toLocaleString('pt-BR')}
            </p>
          )}
          <a
            href="https://developers.facebook.com/docs/whatsapp/messaging-limits"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline mt-2 block"
          >
            Saiba mais sobre Quality Rating →
          </a>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
