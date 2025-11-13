import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactFlow, { Node, Edge, Controls, Background, useNodesState, useEdgesState, addEdge, Connection, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Play, Workflow } from "lucide-react";

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
      const { data, error } = await supabase.from("flows").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

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
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="section-header">
        <h1 className="section-title flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Workflow className="h-7 w-7 text-primary" />
          </div>
          Flow Builder
        </h1>
        <p className="section-description">Crie automações visuais</p>
      </div>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Canvas de Automação</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: '600px' }}>
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}>
              <Controls />
              <Background />
            </ReactFlow>
          </div>
          <div className="flex gap-3 mt-4">
            <Input value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="Nome do Flow" />
            <Button onClick={() => saveFlowMutation.mutate()} size="lg"><Save className="mr-2 h-5 w-5" />Salvar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
