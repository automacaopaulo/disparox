import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Filter, Target, Tag } from "lucide-react";

export default function Segmentacao() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newAudienceName, setNewAudienceName] = useState("");
  const [newAudienceDescription, setNewAudienceDescription] = useState("");
  const [filterType, setFilterType] = useState("tags");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: audiences, isLoading } = useQuery({
    queryKey: ["audiences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audiences")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: contactCount } = useQuery({
    queryKey: ["contacts-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const createAudienceMutation = useMutation({
    mutationFn: async () => {
      const filters: any = {};
      
      if (filterType === "tags") {
        filters.tags = selectedTags;
      } else if (filterType === "opt_in") {
        filters.opt_out = false;
      } else if (filterType === "all") {
        filters.all = true;
      }

      const { error } = await supabase
        .from("audiences")
        .insert({
          name: newAudienceName,
          description: newAudienceDescription,
          filters,
          contact_count: 0, // TODO: calcular dinamicamente
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audiences"] });
      setNewAudienceName("");
      setNewAudienceDescription("");
      setSelectedTags([]);
      setIsDialogOpen(false);
      toast({
        title: "✅ Público criado",
        description: "Novo público salvo com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "❌ Erro ao criar público",
        description: "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const deleteAudienceMutation = useMutation({
    mutationFn: async (audienceId: string) => {
      const { error } = await supabase
        .from("audiences")
        .delete()
        .eq("id", audienceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audiences"] });
      toast({
        title: "✅ Público deletado",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8" />
            Segmentação
          </h2>
          <p className="text-muted-foreground mt-1">
            Crie públicos personalizados para campanhas direcionadas
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Público
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Público Segmentado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome do Público</Label>
                <Input
                  placeholder="Ex: Clientes VIP, Leads Quentes..."
                  value={newAudienceName}
                  onChange={(e) => setNewAudienceName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva este público..."
                  value={newAudienceDescription}
                  onChange={(e) => setNewAudienceDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Filtro</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📊 Todos os Contatos</SelectItem>
                    <SelectItem value="tags">🏷️ Por Tags</SelectItem>
                    <SelectItem value="opt_in">✅ Apenas Opt-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filterType === "tags" && (
                <div className="space-y-2">
                  <Label>Selecionar Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags?.map((tag) => (
                      <Badge
                        key={tag.id}
                        style={{ backgroundColor: selectedTags.includes(tag.id) ? tag.color : '#e5e7eb' }}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTags(prev =>
                            prev.includes(tag.id)
                              ? prev.filter(id => id !== tag.id)
                              : [...prev, tag.id]
                          );
                        }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={() => createAudienceMutation.mutate()} 
                disabled={!newAudienceName || createAudienceMutation.isPending}
                className="w-full"
              >
                Criar Público
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contatos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contactCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Disponíveis para segmentação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Públicos Criados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audiences?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Segmentações salvas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tags Ativas</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tags?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Categorias disponíveis
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {audiences?.map((audience) => (
          <Card key={audience.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {audience.name}
                  </CardTitle>
                  {audience.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {audience.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAudienceMutation.mutate(audience.id)}
                  disabled={deleteAudienceMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Filter className="h-3 w-3 mr-1" />
                    {typeof audience.filters === 'object' && audience.filters !== null && 'tags' in audience.filters 
                      ? 'Por Tags' 
                      : 'Todos'}
                  </Badge>
                  <Badge>
                    ~{audience.contact_count} contatos
                  </Badge>
                </div>
                
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Usar em Campanha
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!isLoading && audiences?.length === 0 && (
          <Card className="col-span-2">
            <CardContent className="pt-6 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum público criado ainda. Crie seu primeiro público segmentado!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}