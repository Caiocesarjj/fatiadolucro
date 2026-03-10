import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileDown, List, Calendar } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type OrderStatus = "pending" | "in_production" | "ready" | "delivered" | "cancelled";

interface Order {
  id: string;
  client_id: string | null;
  delivery_date: string;
  status: OrderStatus;
  total_amount: number;
  description: string | null;
  notes: string | null;
  clients?: { name: string } | null;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendente",
  in_production: "Em Produção",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

interface ExportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
  currentMonth: Date;
}

const parseDeliveryDate = (dateStr: string) => {
  const datePart = dateStr.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const ExportPdfDialog = ({ open, onOpenChange, orders, currentMonth }: ExportPdfDialogProps) => {
  const [exportFormat, setExportFormat] = useState<"list" | "calendar">("list");
  const [exporting, setExporting] = useState(false);

  const exportList = () => {
    const doc = new jsPDF();
    const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR });

    doc.setFontSize(18);
    doc.text("Encomendas - " + monthLabel, 14, 20);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const monthOrders = orders.filter((o) => {
      const d = parseDeliveryDate(o.delivery_date);
      return d >= monthStart && d <= monthEnd;
    }).sort((a, b) => parseDeliveryDate(a.delivery_date).getTime() - parseDeliveryDate(b.delivery_date).getTime());

    const rows = monthOrders.map((o) => [
      format(parseDeliveryDate(o.delivery_date), "dd/MM/yyyy"),
      o.clients?.name || "Sem cliente",
      o.description || "-",
      STATUS_LABELS[o.status],
      formatCurrency(o.total_amount),
      o.notes || "-",
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["Data", "Cliente", "Descrição", "Status", "Valor", "Obs"]],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [76, 122, 68] },
    });

    doc.save(`encomendas-lista-${format(currentMonth, "yyyy-MM")}.pdf`);
  };

  const exportCalendar = () => {
    const doc = new jsPDF("landscape");
    const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR });

    doc.setFontSize(18);
    doc.text("Calendário de Encomendas - " + monthLabel, 14, 20);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const weeks: string[][] = [];
    let currentWeek = new Array(7).fill("");
    const startDay = getDay(monthStart);

    days.forEach((day, i) => {
      const dayIndex = (startDay + i) % 7;
      const dayOrders = orders.filter((o) => {
        const d = parseDeliveryDate(o.delivery_date);
        return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
      });

      let cell = format(day, "dd");
      if (dayOrders.length > 0) {
        cell += "\n" + dayOrders.map((o) => `• ${o.clients?.name || o.description || "Enc."} (${STATUS_LABELS[o.status]})`).join("\n");
      }
      currentWeek[dayIndex] = cell;

      if (dayIndex === 6 || i === days.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = new Array(7).fill("");
      }
    });

    autoTable(doc, {
      startY: 30,
      head: [["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]],
      body: weeks,
      styles: { fontSize: 7, cellPadding: 3, valign: "top", minCellHeight: 20 },
      headStyles: { fillColor: [76, 122, 68], halign: "center" },
      columnStyles: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, { cellWidth: 38, halign: "left" as const }])),
    });

    doc.save(`encomendas-calendario-${format(currentMonth, "yyyy-MM")}.pdf`);
  };

  const handleExport = () => {
    setExporting(true);
    try {
      if (exportFormat === "list") exportList();
      else exportCalendar();
    } finally {
      setExporting(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Exportar PDF
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Escolha o formato de exportação:</p>
          <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as "list" | "calendar")} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer" onClick={() => setExportFormat("list")}>
              <RadioGroupItem value="list" id="fmt-list" />
              <Label htmlFor="fmt-list" className="flex items-center gap-2 cursor-pointer flex-1">
                <List className="h-4 w-4 text-primary" />
                Lista
                <span className="text-xs text-muted-foreground ml-auto">Tabela detalhada</span>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer" onClick={() => setExportFormat("calendar")}>
              <RadioGroupItem value="calendar" id="fmt-cal" />
              <Label htmlFor="fmt-cal" className="flex items-center gap-2 cursor-pointer flex-1">
                <Calendar className="h-4 w-4 text-primary" />
                Calendário
                <span className="text-xs text-muted-foreground ml-auto">Visão mensal</span>
              </Label>
            </div>
          </RadioGroup>
          <Button onClick={handleExport} disabled={exporting} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
            <FileDown className="h-4 w-4 mr-2" />
            {exporting ? "Exportando..." : "Exportar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
