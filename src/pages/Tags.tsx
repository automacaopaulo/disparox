import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, Trash2, Palette } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/SkeletonLoader";

export default function Tags() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: tags, isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select(`
          *,
          contact_tags(count)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tags")
        .insert({
          name: newTagName,
          color: newTagColor,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNewTagName("");
      setNewTagColor("#3B82F6");
      setIsDialogOpen(false);
      toast({
        title: "✅ Tag criada",
        description: "Nova tag adicionada!",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast({
        title: "✅ Tag deletada",
      });
    },
  });

  const predefinedColors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", 
    "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="section-header">
          <h1 className="section-title flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Tag className="h-7 w-7 text-primary" />
            </div>
            Tags
          </h1>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="section-header">
          <h1 className="section-title flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Tag className="h-7 w-7 text-primary" />
            </div>
            Tags
          </h1>
          <p className="section-description">
            Organize e categorize seus contatos com tags personalizadas
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Nova Tag
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="sm:max-w-md"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Criar Nova Tag
              </DialogTitle>
              <DialogDescription>
                Defina um nome e cor para sua tag
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="tagName" className="text-base">Nome da Tag</Label>
                <Input
                  id="tagName"
                  placeholder="Ex: VIP, Interessado, Cliente..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base">Escolha uma Cor</Label>
                <div className="grid grid-cols-8 gap-3">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 ${
                        newTagColor === color ? "border-foreground ring-2 ring-ring scale-110" : "border-border"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => createTagMutation.mutate()} 
                disabled={!newTagName || createTagMutation.isPending}
                size="lg"
                className="w-full"
              >
                <Plus className="mr-2 h-5 w-5" />
                Criar Tag
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="premium-card border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-lg">💡 Como usar Tags</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Crie tags para organizar contatos (VIP, Cliente, Lead Quente, etc)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Aplique tags diretamente na página de Contatos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Use tags para criar públicos segmentados</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Filtre campanhas por tags específicas</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isLoading && tags?.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Nenhuma tag criada"
          description="Crie sua primeira tag para começar a organizar seus contatos"
          actionLabel="Criar Primeira Tag"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          {tags?.map((tag) => (
            <Card key={tag.id} className="premium-card hover:shadow-xl hover:scale-105 transition-all">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: tag.color }}
                  >
                    <Tag className="h-8 w-8 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-lg">{tag.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tag.contact_tags?.[0]?.count || 0} contatos
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTagMutation.mutate(tag.id)}
                    disabled={deleteTagMutation.isPending}
                    className="w-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
