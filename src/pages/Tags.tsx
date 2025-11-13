import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, Trash2, Edit } from "lucide-react";

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
        description: "Nova tag adicionada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao criar tag",
        description: error.message,
        variant: "destructive",
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
        description: "Tag removida com sucesso!",
      });
    },
  });

  const predefinedColors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", 
    "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Tag className="h-8 w-8" />
            Tags
          </h2>
          <p className="text-muted-foreground mt-1">
            Organize seus contatos com tags personalizadas
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="tagName">Nome da Tag</Label>
                <Input
                  id="tagName"
                  placeholder="Ex: VIP, Interessado, Cliente..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newTagColor === color ? "border-black" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => createTagMutation.mutate()} 
                disabled={!newTagName || createTagMutation.isPending}
                className="w-full"
              >
                Criar Tag
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <p className="font-semibold text-blue-900">💡 Como usar Tags:</p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Crie tags para organizar seus contatos (VIP, Interessado, Cliente, etc)</li>
              <li>Aplique tags nos contatos individualmente na página de Contatos</li>
              <li>Use tags para criar públicos segmentados</li>
              <li>Filtre campanhas por tags específicas</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {tags?.map((tag) => (
          <Card key={tag.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: tag.color }}
                  >
                    <Tag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{tag.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tag.contact_tags?.[0]?.count || 0} contatos
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTagMutation.mutate(tag.id)}
                  disabled={deleteTagMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!isLoading && tags?.length === 0 && (
          <Card className="col-span-3">
            <CardContent className="pt-6 text-center">
              <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhuma tag criada ainda. Crie sua primeira tag!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}