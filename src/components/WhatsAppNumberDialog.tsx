import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface WhatsAppNumber {
  id: string;
  name: string;
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  business_account_id: string | null;
  phone_number: string | null;
  display_name: string | null;
}

interface FormData {
  name: string;
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  business_account_id: string;
  phone_number: string;
  display_name: string;
}

interface WhatsAppNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingNumber: WhatsAppNumber | null;
}

export function WhatsAppNumberDialog({
  open,
  onOpenChange,
  editingNumber,
}: WhatsAppNumberDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    const savedData = localStorage.getItem("whatsapp-number-form-draft");
    
    if (editingNumber) {
      reset({
        name: editingNumber.name,
        phone_number_id: editingNumber.phone_number_id,
        waba_id: editingNumber.waba_id,
        access_token: editingNumber.access_token,
        business_account_id: editingNumber.business_account_id || "",
        phone_number: editingNumber.phone_number || "",
        display_name: editingNumber.display_name || "",
      });
    } else if (savedData && open) {
      // Restaurar dados salvos se houver
      const parsed = JSON.parse(savedData);
      reset(parsed);
    } else {
      reset({
        name: "",
        phone_number_id: "",
        waba_id: "",
        access_token: "",
        business_account_id: "",
        phone_number: "",
        display_name: "",
      });
    }
  }, [editingNumber, reset, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name.trim(),
        phone_number_id: data.phone_number_id.trim(),
        waba_id: data.waba_id.trim(),
        access_token: data.access_token.trim(),
        business_account_id: data.business_account_id.trim() || null,
        phone_number: data.phone_number.trim() || null,
        display_name: data.display_name.trim() || null,
      };

      if (editingNumber) {
        const { error } = await supabase
          .from("whatsapp_numbers")
          .update(payload)
          .eq("id", editingNumber.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_numbers")
          .insert(payload);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-numbers"] });
      toast({
        title: editingNumber ? "Número atualizado!" : "Número adicionado!",
        description: "As configurações foram salvas com sucesso.",
      });
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // Limpar dados salvos ao submeter com sucesso
    localStorage.removeItem("whatsapp-number-form-draft");
    saveMutation.mutate(data);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    // Salvar no localStorage a cada mudança
    const currentValues = {
      name: document.querySelector<HTMLInputElement>('[name="name"]')?.value || "",
      phone_number_id: document.querySelector<HTMLInputElement>('[name="phone_number_id"]')?.value || "",
      waba_id: document.querySelector<HTMLInputElement>('[name="waba_id"]')?.value || "",
      access_token: document.querySelector<HTMLTextAreaElement>('[name="access_token"]')?.value || "",
      business_account_id: document.querySelector<HTMLInputElement>('[name="business_account_id"]')?.value || "",
      phone_number: document.querySelector<HTMLInputElement>('[name="phone_number"]')?.value || "",
      display_name: document.querySelector<HTMLInputElement>('[name="display_name"]')?.value || "",
    };
    localStorage.setItem("whatsapp-number-form-draft", JSON.stringify(currentValues));
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Só fecha se clicar no botão Cancelar ou Salvar com sucesso
      if (!newOpen && !saveMutation.isPending) {
        onOpenChange(newOpen);
      }
    }}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          // Impede fechar ao clicar fora
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Impede fechar com ESC
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {editingNumber ? "✏️ Editar Número WhatsApp" : "➕ Adicionar Número WhatsApp"}
          </DialogTitle>
          <DialogDescription className="text-base">
            Configure as credenciais da Meta (Facebook Business Manager) para conectar este número WhatsApp Business.
            Todos os campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-base font-semibold flex items-center gap-2">
              📝 Nome de Identificação *
            </Label>
            <Input
              id="name"
              placeholder="Ex: Atendimento Principal, Vendas, Suporte..."
              {...register("name", { required: "Nome é obrigatório" })}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="h-12 text-base"
            />
            {errors.name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                ❌ {errors.name.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              💡 Este é apenas um apelido interno para você identificar o número
            </p>
          </div>

          <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <Label htmlFor="phone_number_id" className="text-base font-semibold flex items-center gap-2">
              🔢 Phone Number ID *
            </Label>
            <Input
              id="phone_number_id"
              placeholder="123456789012345"
              {...register("phone_number_id", { 
                required: "Phone Number ID é obrigatório" 
              })}
              onChange={(e) => handleInputChange("phone_number_id", e.target.value)}
              className="h-12 text-base font-mono"
            />
            {errors.phone_number_id && (
              <p className="text-sm text-destructive flex items-center gap-1">
                ❌ {errors.phone_number_id.message}
              </p>
            )}
            <div className="bg-background/80 p-3 rounded-lg space-y-2">
              <p className="text-xs font-semibold text-primary">📍 Onde encontrar:</p>
              <ol className="text-xs text-muted-foreground space-y-1 ml-4 list-decimal">
                <li>Acesse <strong>business.facebook.com</strong></li>
                <li>Entre no <strong>WhatsApp Manager</strong></li>
                <li>Vá em <strong>Configurações da API</strong></li>
                <li>Copie o <strong>Phone Number ID</strong></li>
              </ol>
            </div>
          </div>

          <div className="space-y-3 p-4 bg-success/5 rounded-xl border border-success/20">
            <Label htmlFor="waba_id" className="text-base font-semibold flex items-center gap-2">
              🏢 WABA ID *
            </Label>
            <Input
              id="waba_id"
              placeholder="123456789012345"
              {...register("waba_id", { required: "WABA ID é obrigatório" })}
              onChange={(e) => handleInputChange("waba_id", e.target.value)}
              className="h-12 text-base font-mono"
            />
            {errors.waba_id && (
              <p className="text-sm text-destructive flex items-center gap-1">
                ❌ {errors.waba_id.message}
              </p>
            )}
            <div className="bg-background/80 p-3 rounded-lg">
              <p className="text-xs font-semibold text-success mb-1">ℹ️ O que é WABA ID?</p>
              <p className="text-xs text-muted-foreground">
                WhatsApp Business Account ID - Identificador único da sua conta Business no WhatsApp Manager
              </p>
            </div>
          </div>

          <div className="space-y-3 p-4 bg-warning/5 rounded-xl border border-warning/20">
            <Label htmlFor="access_token" className="text-base font-semibold flex items-center gap-2">
              🔐 Access Token (Meta) *
            </Label>
            <Textarea
              id="access_token"
              placeholder="EAAxxxxxxxxxxxxx..."
              className="font-mono text-xs h-24"
              rows={4}
              {...register("access_token", { 
                required: "Access Token é obrigatório" 
              })}
              onChange={(e) => handleInputChange("access_token", e.target.value)}
            />
            {errors.access_token && (
              <p className="text-sm text-destructive flex items-center gap-1">
                ❌ {errors.access_token.message}
              </p>
            )}
            <div className="bg-background/80 p-3 rounded-lg space-y-2">
              <p className="text-xs font-semibold text-warning">🔑 Token Permanente:</p>
              <p className="text-xs text-muted-foreground">
                Use um <strong>System User Token</strong> permanente (não expira). Evite tokens de usuário comum que expiram em 60 dias.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                📍 Crie em: Business Manager → Usuários do Sistema → Gerar Token
              </p>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl border border-border/40 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">📋 Campos Opcionais (para referência)</p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business_account_id" className="text-sm flex items-center gap-1">
                  🏪 Business Account ID
                </Label>
                <Input
                  id="business_account_id"
                  placeholder="123456789012345"
                  {...register("business_account_id")}
                  onChange={(e) => handleInputChange("business_account_id", e.target.value)}
                  className="h-11 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">ID da conta comercial (opcional)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-sm flex items-center gap-1">
                  📱 Número de Telefone
                </Label>
                <Input
                  id="phone_number"
                  placeholder="+55 11 98765-4321"
                  {...register("phone_number")}
                  onChange={(e) => handleInputChange("phone_number", e.target.value)}
                  className="h-11 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Número completo com DDI</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name" className="text-sm flex items-center gap-1">
                👤 Nome de Exibição
              </Label>
              <Input
                id="display_name"
                placeholder="Nome que aparece no WhatsApp"
                {...register("display_name")}
                onChange={(e) => handleInputChange("display_name", e.target.value)}
                className="h-11 text-sm"
              />
              <p className="text-xs text-muted-foreground">Nome visível para seus clientes no WhatsApp</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (confirm("Deseja realmente cancelar? Os dados não salvos serão perdidos.")) {
                  localStorage.removeItem("whatsapp-number-form-draft");
                  onOpenChange(false);
                }
              }}
              className="flex items-center gap-2"
            >
              ❌ Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 shadow-lg"
            >
              {saveMutation.isPending ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Salvando...
                </>
              ) : (
                <>
                  ✅ Salvar Configuração
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
