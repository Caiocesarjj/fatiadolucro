import { toast as sonnerToast } from "sonner";

/**
 * Shows an undo toast for 5 seconds before executing the actual delete.
 * If the user clicks "Desfazer", the deletion is cancelled.
 */
export function undoableDelete({
  itemLabel,
  onDelete,
  onUndo,
}: {
  itemLabel: string;
  onDelete: () => Promise<void>;
  onUndo?: () => void;
}) {
  let cancelled = false;

  const toastId = sonnerToast(`${itemLabel} será excluído(a)`, {
    description: "Clique em Desfazer para cancelar.",
    duration: 5000,
    action: {
      label: "Desfazer",
      onClick: () => {
        cancelled = true;
        onUndo?.();
        sonnerToast.dismiss(toastId);
      },
    },
    onDismiss: async () => {
      if (!cancelled) {
        try {
          await onDelete();
        } catch (error: any) {
          sonnerToast.error("Erro ao excluir", {
            description: error?.message || "Tente novamente.",
          });
        }
      }
    },
    onAutoClose: async () => {
      if (!cancelled) {
        try {
          await onDelete();
        } catch (error: any) {
          sonnerToast.error("Erro ao excluir", {
            description: error?.message || "Tente novamente.",
          });
        }
      }
    },
  });
}
