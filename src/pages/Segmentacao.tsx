import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Filter, Target, Tag, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StatsSkeleton } from "@/components/SkeletonLoader";

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
          contact_count: 0,
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
        description: "Novo público salvo!",
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
      toast({ title: "✅ Público deletado" });
    },
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="section-header">
          <h1 className="section-title flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Target className="h-7 w-7 text-primary" />
            </div>
            Segmentação
          </h1>
          <p className="section-description">
            Crie públicos personalizados para campanhas direcionadas
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Novo Público
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="sm:max-w-lg"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Criar Público Segmentado
              </DialogTitle>
              <DialogDescription>
                Defina critérios para agrupar seus contatos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-base">Nome do Público</Label>
                <Input
                  placeholder="Ex: Clientes VIP, Leads Quentes..."
                  value={newAudienceName}
                  onChange={(e) => setNewAudienceName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Descrição</Label>
                <Textarea
                  placeholder="Descreva este público..."
                  value={newAudienceDescription}
                  onChange={(e) => setNewAudienceDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Tipo de Filtro</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-11">
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
                  <Label className="text-base">Selecionar Tags</Label>
                  <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-xl border">
                    {tags?.map((tag) => (
                      <Badge
                        key={tag.id}
                        style={{ backgroundColor: selectedTags.includes(tag.id) ? tag.color : '#e5e7eb' }}
                        className="cursor-pointer transition-all hover:scale-110"
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
                size="lg"
                className="w-full"
              >
                <Plus className="mr-2 h-5 w-5" />
                Criar Público
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="premium-card hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Contatos</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-primary">{contactCount || 0}</div>
            <p className="text-sm text-muted-foreground">
              Disponíveis para segmentação
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Públicos Criados</CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <Target className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-success">{audiences?.length || 0}</div>
            <p className="text-sm text-muted-foreground">
              Segmentações salvas
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tags Ativas</CardTitle>
            <div className="p-2 bg-warning/10 rounded-lg">
              <Tag className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-warning">{tags?.length || 0}</div>
            <p className="text-sm text-muted-foreground">
              Categorias disponíveis
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading && <StatsSkeleton />}

      {!isLoading && audiences?.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhum público criado"
          description="Crie seu primeiro público segmentado para campanhas direcionadas"
          actionLabel="Criar Primeiro Público"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {audiences?.map((audience) => (
            <Card key={audience.id} className="premium-card hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      {audience.name}
                    </CardTitle>
                    {audience.description && (
                      <CardDescription className="mt-2">
                        {audience.description}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAudienceMutation.mutate(audience.id)}
                    disabled={deleteAudienceMutation.isPending}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Filter className="h-3 w-3 mr-1" />
                    {typeof audience.filters === 'object' && audience.filters !== null && 'tags' in audience.filters 
                      ? 'Por Tags' 
                      : 'Todos'}
                  </Badge>
                  <Badge className="bg-primary">
                    <Users className="h-3 w-3 mr-1" />
                    ~{audience.contact_count} contatos
                  </Badge>
                </div>
                
                <Button variant="outline" size="sm" className="w-full">
                  Usar em Campanha
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
