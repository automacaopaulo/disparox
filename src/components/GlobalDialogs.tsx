import { useDialog } from "@/contexts/DialogContext";
import { WhatsAppNumberDialog } from "./WhatsAppNumberDialog";

export function GlobalDialogs() {
  const { dialogState, closeWhatsAppNumberDialog } = useDialog();

  return (
    <>
      <WhatsAppNumberDialog
        open={dialogState.whatsappNumberDialog.open}
        onOpenChange={closeWhatsAppNumberDialog}
        editingNumber={dialogState.whatsappNumberDialog.editingNumber}
      />
    </>
  );
}
