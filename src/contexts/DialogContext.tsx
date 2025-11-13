import { createContext, useContext, useState, ReactNode } from "react";

interface DialogState {
  whatsappNumberDialog: {
    open: boolean;
    editingNumber: any | null;
  };
}

interface DialogContextType {
  dialogState: DialogState;
  openWhatsAppNumberDialog: (editingNumber?: any) => void;
  closeWhatsAppNumberDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<DialogState>({
    whatsappNumberDialog: {
      open: false,
      editingNumber: null,
    },
  });

  const openWhatsAppNumberDialog = (editingNumber?: any) => {
    setDialogState((prev) => ({
      ...prev,
      whatsappNumberDialog: {
        open: true,
        editingNumber: editingNumber || null,
      },
    }));
  };

  const closeWhatsAppNumberDialog = () => {
    setDialogState((prev) => ({
      ...prev,
      whatsappNumberDialog: {
        open: false,
        editingNumber: null,
      },
    }));
  };

  return (
    <DialogContext.Provider
      value={{
        dialogState,
        openWhatsAppNumberDialog,
        closeWhatsAppNumberDialog,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return context;
}
