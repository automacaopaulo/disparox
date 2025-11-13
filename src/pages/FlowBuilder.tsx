import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactFlow, { Node, Edge, Controls, Background, useNodesState, useEdgesState, addEdge, Connection, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, MessageSquare, Clock, GitBranch, Send, Workflow, Trash2 } from "lucide-react";

const nodeTypes = [
  { type: 'trigger', label: 'Gatilho', icon: Send, color: 'bg-green-500' },
  { type: 'message', label: 'Enviar Mensagem', icon: MessageSquare, color: 'bg-blue-500' },
  { type: 'wait', label: 'Aguardar', icon: Clock, color: 'bg-yellow-500' },
  { type: 'condition', label: 'Condição', icon: GitBranch, color: 'bg-purple-500' },
];

function FlowBuilderContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const nodeIdCounter = useRef(1);
  
  const [flowName, setFlowName] = useState("Meu Flow");
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { data: flows } = useQuery({
    queryKey: ["flows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flows").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: `node-${nodeIdCounter.current++}`,
      type: 'default',
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 300 + 50 
      },
      data: { 
        label: `${label} ${nodeIdCounter.current - 1}`,
        type: type
      },
      style: {
        background: type === 'trigger' ? '#22c55e' :
                   type === 'message' ? '#3b82f6' :
                   type === 'wait' ? '#eab308' :
                   '#a855f7',
        color: 'white',
        border: '1px solid #999',
        padding: '10px',
        borderRadius: '8px',
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast({ title: `Nó "${label}" adicionado!` });
  };

  const loadFlow = (flowId: string) => {
    const flow = flows?.find(f => f.id === flowId);
    if (flow) {
      setSelectedFlow(flowId);
      setFlowName(flow.name);
      setNodes((flow.nodes as unknown as Node[]) || []);
      setEdges((flow.edges as unknown as Edge[]) || []);
      toast({ title: `Flow "${flow.name}" carregado!` });
    }
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setSelectedFlow(null);
    setFlowName("Novo Flow");
    toast({ title: "Canvas limpo!" });
  };

  const saveFlowMutation = useMutation({
    mutationFn: async () => {
      const flowData = {
        name: flowName,
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        trigger_type: 'manual',
      };

      if (selectedFlow) {
        const { error } = await supabase.from("flows").update(flowData).eq("id", selectedFlow);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("flows").insert(flowData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      toast({ title: "✅ Flow salvo!" });
    },
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="section-header">
        <h1 className="section-title flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Workflow className="h-7 w-7 text-primary" />
          </div>
          Flow Builder
        </h1>
        <p className="section-description">Crie automações visuais arrastando e conectando nós</p>
      </div>

      {/* Controles superiores */}
      <div className="flex gap-3 items-center flex-wrap">
        <Input 
          value={flowName} 
          onChange={(e) => setFlowName(e.target.value)} 
          placeholder="Nome do Flow"
          className="max-w-xs"
        />
        
        {flows && flows.length > 0 && (
          <Select value={selectedFlow || undefined} onValueChange={loadFlow}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Carregar flow existente" />
            </SelectTrigger>
            <SelectContent>
              {flows.map((flow) => (
                <SelectItem key={flow.id} value={flow.id}>
                  {flow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={clearCanvas}>
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar
          </Button>
          <Button onClick={() => saveFlowMutation.mutate()}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Flow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[250px_1fr] gap-4">
        {/* Sidebar com tipos de nós */}
        <Card className="premium-card h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Adicionar Nós</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nodeTypes.map((nodeType) => (
              <Button
                key={nodeType.type}
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => addNode(nodeType.type, nodeType.label)}
              >
                <div className={`p-1.5 rounded ${nodeType.color}`}>
                  <nodeType.icon className="h-4 w-4 text-white" />
                </div>
                {nodeType.label}
              </Button>
            ))}
            
            <div className="pt-4 border-t mt-4 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Como usar:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Clique nos botões para adicionar nós</li>
                <li>Arraste nós para posicioná-los</li>
                <li>Conecte nós arrastando das bordas</li>
                <li>Salve seu flow quando terminar</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Canvas principal */}
        <Card className="premium-card">
          <CardContent className="p-0">
            <div ref={reactFlowWrapper} style={{ height: '700px' }}>
              <ReactFlow 
                nodes={nodes} 
                edges={edges} 
                onNodesChange={onNodesChange} 
                onEdgesChange={onEdgesChange} 
                onConnect={onConnect}
                fitView
              >
                <Controls />
                <Background />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FlowBuilder() {
  return (
    <ReactFlowProvider>
      <FlowBuilderContent />
    </ReactFlowProvider>
  );
}
