import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Ban, Settings, Loader2, Crown, Ticket, Plus, UserPlus } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { AffiliatesTab } from "@/components/admin/AffiliatesTab";

// ... keep existing code (UserProfile interface and AVAILABLE_MODULES)
interface UserProfile {
  id: string;
  user_id: string;
  store_name: string | null;
  is_active: boolean;
  allowed_modules: string[];
  plan_type: string;
  email?: string;
  recipes_count?: number;
  transactions_count?: number;
}

interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "vip_access";
  value: number;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

const AVAILABLE_MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "clientes", label: "Clientes" },
  { id: "encomendas", label: "Encomendas" },
  { id: "catalogo", label: "Catálogo" },
  { id: "calculadora", label: "Calculadora" },
  { id: "ingredientes", label: "Ingredientes" },
  { id: "compras", label: "Lista de Compras" },
  { id: "financeiro", label: "Financeiro" },
  { id: "configuracoes", label: "Configurações" },
];

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: "", type: "percentage" as "percentage" | "vip_access", value: "", is_active: true });

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchCoupons();
    }
  }, [isAdmin]);

  // ... keep existing code (fetchUsers, handleChangePlan, handleToggleActive, handleOpenModulesDialog, handleSaveModules, toggleModule)
  const fetchUsers = async () => {
    try {
      const [profilesRes, statsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.rpc("get_admin_user_stats"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      const statsData = (statsRes.data || []) as Array<{ user_id: string; recipes_count: number; transactions_count: number }>;
      const statsMap = new Map(statsData.map((s) => [s.user_id, s]));
      const usersWithStats = (profilesRes.data || []).map((profile) => ({
        ...profile,
        recipes_count: Number(statsMap.get(profile.user_id)?.recipes_count ?? 0),
        transactions_count: Number(statsMap.get(profile.user_id)?.transactions_count ?? 0),
      }));
      setUsers(usersWithStats);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCoupons((data as any[]) || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching coupons:", error);
    } finally {
      setCouponsLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    const code = newCoupon.code.trim().toUpperCase();
    if (!code || !newCoupon.value) {
      toast({ variant: "destructive", title: "Preencha código e valor." });
      return;
    }
    try {
      const { error } = await supabase.from("coupons").insert({
        code,
        type: newCoupon.type,
        value: parseFloat(newCoupon.value),
        is_active: newCoupon.is_active,
      } as any);
      if (error) throw error;
      toast({ title: "Cupom criado!" });
      setCouponDialogOpen(false);
      setNewCoupon({ code: "", type: "percentage", value: "", is_active: true });
      fetchCoupons();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active } as any)
        .eq("id", coupon.id);
      if (error) throw error;
      toast({ title: coupon.is_active ? "Cupom desativado" : "Cupom ativado" });
      fetchCoupons();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleChangePlan = async (user: UserProfile, newPlan: "free" | "pro") => {
    try {
      const { error } = await supabase.from("profiles").update({ plan_type: newPlan }).eq("id", user.id);
      if (error) throw error;
      toast({ title: `Plano alterado para ${newPlan === "pro" ? "PRO" : "Grátis"}` });
      fetchUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleToggleActive = async (user: UserProfile) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !user.is_active }).eq("id", user.id);
      if (error) throw error;
      toast({ title: user.is_active ? "Usuário bloqueado" : "Usuário desbloqueado" });
      fetchUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleOpenModulesDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedModules(user.allowed_modules || ["all"]);
    setModulesDialogOpen(true);
  };

  const handleSaveModules = async () => {
    if (!selectedUser) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ allowed_modules: selectedModules.length > 0 ? selectedModules : ["all"] })
        .eq("id", selectedUser.id);
      if (error) throw error;
      toast({ title: "Módulos atualizados!" });
      setModulesDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const toggleModule = (moduleId: string) => {
    if (moduleId === "all") {
      setSelectedModules(["all"]);
    } else {
      const newModules = selectedModules.filter((m) => m !== "all");
      if (newModules.includes(moduleId)) {
        setSelectedModules(newModules.filter((m) => m !== moduleId));
      } else {
        setSelectedModules([...newModules, moduleId]);
      }
    }
  };

  if (roleLoading || loading) {
    return (
      <AppLayout title="Administração">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout title="Administração">
      <Tabs defaultValue="usuarios" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="afiliados">Afiliados</TabsTrigger>
          <TabsTrigger value="cupons">Cupons</TabsTrigger>
        </TabsList>

        {/* ====== USUÁRIOS TAB ====== */}
        <TabsContent value="usuarios">
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                        <p className="text-2xl font-bold mt-1">{users.length}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-primary-light">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Usuários Ativos</p>
                        <p className="text-2xl font-bold text-success mt-1">{users.filter((u) => u.is_active).length}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-success-light">
                        <Shield className="h-5 w-5 text-success" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Usuários Bloqueados</p>
                        <p className="text-2xl font-bold text-destructive mt-1">{users.filter((u) => !u.is_active).length}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-destructive/10">
                        <Ban className="h-5 w-5 text-destructive" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Plan Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Plano Grátis</p>
                        <p className="text-2xl font-bold mt-1">{users.filter((u) => u.plan_type === "free" || !u.plan_type).length}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-primary/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Plano PRO</p>
                        <p className="text-2xl font-bold text-primary mt-1">{users.filter((u) => u.plan_type === "pro").length}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-primary-light">
                        <Crown className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Users Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Gerenciar Usuários
                  </CardTitle>
                  <CardDescription>Visualize e gerencie todos os usuários da plataforma</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Confeitaria</TableHead>
                          <TableHead>ID do Usuário</TableHead>
                          <TableHead className="text-center">Receitas</TableHead>
                          <TableHead className="text-center">Transações</TableHead>
                          <TableHead className="text-center">Plano</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.store_name || "Sem nome"}</TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">{user.user_id?.slice(0, 8) ?? "N/A"}...</TableCell>
                            <TableCell className="text-center">{user.recipes_count}</TableCell>
                            <TableCell className="text-center">{user.transactions_count}</TableCell>
                            <TableCell className="text-center">
                              <Select value={user.plan_type || "free"} onValueChange={(value: "free" | "pro") => handleChangePlan(user, value)}>
                                <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Grátis</SelectItem>
                                  <SelectItem value="pro">
                                    <div className="flex items-center gap-1"><Crown className="h-3 w-3 text-primary" />PRO</div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={user.is_active ? "default" : "destructive"}>{user.is_active ? "Ativo" : "Bloqueado"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => handleOpenModulesDialog(user)}>
                                  <Settings className="h-4 w-4 mr-1" />Módulos
                                </Button>
                                <Button variant={user.is_active ? "destructive" : "default"} size="sm" onClick={() => handleToggleActive(user)}>
                                  <Ban className="h-4 w-4 mr-1" />{user.is_active ? "Bloquear" : "Desbloquear"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* ====== AFILIADOS TAB ====== */}
        <TabsContent value="afiliados">
          <AffiliatesTab />
        </TabsContent>

        {/* ====== CUPONS TAB ====== */}
        <TabsContent value="cupons">
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Ticket className="h-5 w-5 text-primary" />
                        Gerenciar Cupons
                      </CardTitle>
                      <CardDescription>Crie e gerencie cupons de desconto</CardDescription>
                    </div>
                    <Button onClick={() => setCouponDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Cupom
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {couponsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : coupons.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Ticket className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>Nenhum cupom criado ainda.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-center">Valor</TableHead>
                            <TableHead className="text-center">Usos</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {coupons.map((coupon) => (
                            <TableRow key={coupon.id}>
                              <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {coupon.type === "percentage" ? "Porcentagem %" : "Acesso VIP"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {coupon.type === "percentage" ? `${coupon.value}%` : `${coupon.value} dias`}
                              </TableCell>
                              <TableCell className="text-center">{coupon.usage_count}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={coupon.is_active ? "default" : "secondary"}>
                                  {coupon.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Switch
                                  checked={coupon.is_active}
                                  onCheckedChange={() => handleToggleCoupon(coupon)}
                                />
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
        </TabsContent>
      </Tabs>

      {/* Modules Dialog */}
      <Dialog open={modulesDialogOpen} onOpenChange={setModulesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Módulos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione os módulos que este usuário pode acessar:</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="all" checked={selectedModules.includes("all")} onCheckedChange={() => toggleModule("all")} />
                <Label htmlFor="all" className="font-medium">Todos os Módulos</Label>
              </div>
              <div className="border-t pt-3 space-y-3">
                {AVAILABLE_MODULES.map((module) => (
                  <div key={module.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={module.id}
                      checked={selectedModules.includes("all") || selectedModules.includes(module.id)}
                      disabled={selectedModules.includes("all")}
                      onCheckedChange={() => toggleModule(module.id)}
                    />
                    <Label htmlFor={module.id}>{module.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setModulesDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSaveModules} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coupon Dialog */}
      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Cupom</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Código</Label>
              <Input
                id="coupon-code"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                placeholder="EX: PROMO50"
                className="font-mono uppercase"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-type">Tipo</Label>
              <Select value={newCoupon.type} onValueChange={(v: "percentage" | "vip_access") => setNewCoupon({ ...newCoupon, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem %</SelectItem>
                  <SelectItem value="vip_access">Acesso Total VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-value">
                Valor {newCoupon.type === "percentage" ? "(% de desconto)" : "(dias de acesso VIP)"}
              </Label>
              <Input
                id="coupon-value"
                type="number"
                value={newCoupon.value}
                onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })}
                placeholder={newCoupon.type === "percentage" ? "Ex: 100" : "Ex: 30"}
                className="input-currency"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="coupon-active">Ativo</Label>
              <Switch
                id="coupon-active"
                checked={newCoupon.is_active}
                onCheckedChange={(v) => setNewCoupon({ ...newCoupon, is_active: v })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setCouponDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleCreateCoupon} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Admin;
