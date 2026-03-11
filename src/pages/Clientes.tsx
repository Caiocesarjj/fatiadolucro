import { useState, useEffect } from "react";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Search, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useFreemiumLimits } from "@/hooks/useFreemiumLimits";
import { UpgradeModal } from "@/components/UpgradeModal";

interface Client {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

const Clientes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { canCreate, getLimit, getCount } = useFreemiumLimits();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    if (user) fetchClients();
  }, [user]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Preencha o nome do cliente.",
      });
      return;
    }

    try {
      const clientData = {
        user_id: user!.id,
        name: form.name,
        phone: form.phone || null,
        address: form.address || null,
        notes: form.notes || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("clients")
          .update(clientData)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Cliente atualizado!" });
      } else {
        const { error } = await supabase.from("clients").insert(clientData);

        if (error) throw error;
        toast({ title: "Cliente adicionado!" });
      }

      resetForm();
      fetchClients();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: mapErrorToUserMessage(error),
      });
    }
  };

  const handleEdit = (client: Client) => {
    setForm({
      name: client.name,
      phone: client.phone || "",
      address: client.address || "",
      notes: client.notes || "",
    });
    setEditingId(client.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este cliente?")) return;

    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Cliente excluído!" });
      fetchClients();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: mapErrorToUserMessage(error),
      });
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      address: "",
      notes: "",
    });
    setEditingId(null);
    setDialogOpen(false);
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, "");
    // Add Brazil country code if not present
    if (cleaned.length === 11) {
      return `55${cleaned}`;
    }
    return cleaned;
  };

  const openWhatsApp = (phone: string) => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm)
  );

  return (
    <AppLayout title="Clientes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  if (!editingId && !canCreate("clients")) {
                    setShowUpgrade(true);
                    return;
                  }
                  resetForm();
                }}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90dvh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Cliente" : "Novo Cliente"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Maria Silva"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Ex: (11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Ex: Rua das Flores, 123"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Ex: Preferência por entregas à tarde"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
                  >
                    {editingId ? "Salvar" : "Adicionar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Lista de Clientes
                <span className="text-muted-foreground font-normal text-sm">
                  ({filteredClients.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredClients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cliente cadastrado</p>
                  <p className="text-sm">
                    Clique em "Novo Cliente" para começar
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Endereço</TableHead>
                        <TableHead>Observações</TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id} className="table-row-hover">
                          <TableCell className="font-medium">
                            {client.name}
                          </TableCell>
                          <TableCell>
                            {client.phone ? (
                              <div className="flex items-center gap-2">
                                <span>{client.phone}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-success hover:text-success/80 hover:bg-success/10"
                                  onClick={() => openWhatsApp(client.phone!)}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {client.address || "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {client.notes || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(client)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(client.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        type="module_locked"
        moduleName={`Clientes (${getCount("clients")}/${getLimit("clients")})`}
      />
    </AppLayout>
  );
};

export default Clientes;
