import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Play, Plus, Trash2, Workflow } from "lucide-react";

const nodeTypes = {
  start: { label: "🚀 Início", color: "#10B981" },
  sendMessage: { label: "📤 Enviar Mensagem", color: "#3B82F6" },
  delay: { label: "⏰ Aguardar", color: "#F59E0B" },
  condition: { label: "❓ Condição", color: "#8B5CF6" },
  end: { label: "🏁 Fim", color: "#EF4444" },
};

export default function FlowBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [flowName, setFlowName] = useState("Meu Flow");
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { data: flows } = useQuery({
    queryKey: ["flows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: whatsappNumbers } = useQuery({
    queryKey: ["whatsapp_numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_numbers")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const saveFlowMutation = useMutation({
    mutationFn: async () => {
      const flowData = {
        name: flowName,
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        whatsapp_number_id: whatsappNumbers?.[0]?.id,
        trigger_type: 'manual',
      };

      if (selectedFlow) {
        const { error } = await supabase
          .from("flows")
          .update(flowData)
          .eq("id", selectedFlow);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("flows")
          .insert(flowData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      toast({
        title: "✅ Flow salvo",
        description: "Seu flow foi salvo com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "❌ Erro ao salvar",
        description: "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  const addNode = (type: keyof typeof nodeTypes) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: nodeTypes[type].label,
        type,
      },
      style: {
        background: nodeTypes[type].color,
        color: 'white',
        border: '2px solid #fff',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '14px',
        fontWeight: 'bold',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const loadFlow = (flowId: string) => {
    const flow = flows?.find(f => f.id === flowId);
    if (!flow) return;
    
    setSelectedFlow(flowId);
    setFlowName(flow.name);
    setNodes(Array.isArray(flow.nodes) ? flow.nodes as unknown as Node[] : []);
    setEdges(Array.isArray(flow.edges) ? flow.edges as unknown as Edge[] : []);
  };

  return (
    <div className="space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Workflow className="h-8 w-8" />
            Flow Builder
          </h2>
          <p className="text-muted-foreground mt-1">
            Crie automações visuais com drag-and-drop
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={selectedFlow || undefined} onValueChange={loadFlow}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Carregar Flow" />
            </SelectTrigger>
            <SelectContent>
              {flows?.map((flow) => (
                <SelectItem key={flow.id} value={flow.id}>
                  {flow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => saveFlowMutation.mutate()} disabled={saveFlowMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Nodes Disponíveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input 
              placeholder="Nome do Flow" 
              value={flowName} 
              onChange={(e) => setFlowName(e.target.value)}
              className="mb-4"
            />
            
            {Object.entries(nodeTypes).map(([type, config]) => (
              <Button
                key={type}
                onClick={() => addNode(type as keyof typeof nodeTypes)}
                className="w-full justify-start"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                {config.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="col-span-3 h-[600px]">
          <CardContent className="p-0 h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <p className="font-semibold text-blue-900">💡 Como usar o Flow Builder:</p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Clique nos botões à esquerda para adicionar nodes</li>
              <li>Arraste os nodes para posicioná-los</li>
              <li>Conecte os nodes clicando e arrastando entre eles</li>
              <li>Configure cada node clicando nele</li>
              <li>Salve seu flow e ative-o</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}