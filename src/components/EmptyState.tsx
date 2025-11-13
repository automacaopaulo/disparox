import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card className="premium-card border-dashed">
      <CardContent className="pt-20 pb-20">
        <div className="flex flex-col items-center gap-6 text-center max-w-lg mx-auto animate-in fade-in-50 duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-2xl opacity-50 animate-pulse" />
            <div className="relative p-6 bg-gradient-to-br from-muted/60 to-muted/30 rounded-2xl border border-border/40 backdrop-blur-sm">
              <Icon className="h-16 w-16 text-muted-foreground/70" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
            <p className="text-base text-muted-foreground leading-relaxed">{description}</p>
          </div>
          {actionLabel && onAction && (
            <Button onClick={onAction} size="lg" className="mt-2 shadow-lg hover:shadow-xl transition-all duration-300">
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
