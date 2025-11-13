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
  }, [editingNumber, reset]);

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
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {editingNumber ? "Editar Número WhatsApp" : "Adicionar Número WhatsApp"}
          </DialogTitle>
          <DialogDescription>
            Configure as credenciais da Meta (Facebook) para este número WhatsApp Business.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome de Identificação *</Label>
            <Input
              id="name"
              placeholder="Ex: Atendimento Principal"
              {...register("name", { required: "Nome é obrigatório" })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number_id">Phone Number ID *</Label>
            <Input
              id="phone_number_id"
              placeholder="123456789012345"
              {...register("phone_number_id", { 
                required: "Phone Number ID é obrigatório" 
              })}
            />
            {errors.phone_number_id && (
              <p className="text-sm text-destructive">{errors.phone_number_id.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Encontre no WhatsApp Manager → Configurações da API
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waba_id">WABA ID *</Label>
            <Input
              id="waba_id"
              placeholder="123456789012345"
              {...register("waba_id", { required: "WABA ID é obrigatório" })}
            />
            {errors.waba_id && (
              <p className="text-sm text-destructive">{errors.waba_id.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              WhatsApp Business Account ID
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="access_token">Access Token (Meta) *</Label>
            <Textarea
              id="access_token"
              placeholder="EAAxxxxxxxxxxxxx..."
              className="font-mono text-xs"
              rows={3}
              {...register("access_token", { 
                required: "Access Token é obrigatório" 
              })}
            />
            {errors.access_token && (
              <p className="text-sm text-destructive">{errors.access_token.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Token de acesso permanente da Meta (System User Token)
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business_account_id">Business Account ID</Label>
              <Input
                id="business_account_id"
                placeholder="123456789012345"
                {...register("business_account_id")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Número de Telefone</Label>
              <Input
                id="phone_number"
                placeholder="+55 11 98765-4321"
                {...register("phone_number")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Nome de Exibição</Label>
            <Input
              id="display_name"
              placeholder="Nome que aparece no WhatsApp"
              {...register("display_name")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
