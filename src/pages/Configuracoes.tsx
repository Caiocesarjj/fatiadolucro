import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  Store,
  Truck,
  Save,
  Plus,
  Trash2,
  User,
  Palette,
} from "lucide-react";
import { motion } from "framer-motion";

interface Profile {
  store_name: string | null;
  logo_url: string | null;
}

interface Platform {
  id: string;
  name: string;
  fee_percentage: number;
  is_active: boolean;
  color: string;
}

const Configuracoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile>({
    store_name: "",
    logo_url: "",
  });
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [newPlatform, setNewPlatform] = useState({ name: "", fee: "" });
  const [loading, setLoading] = useState(true);

  const [primaryColor, setPrimaryColor] = useState("#ea90c9");

  // Load primary color from localStorage on mount
  useEffect(() => {
    const savedColor = localStorage.getItem("doce-lucro-primary-color");
    if (savedColor) {
      setPrimaryColor(savedColor);
      applyPrimaryColor(savedColor);
    }
  }, []);

  const applyPrimaryColor = (color: string) => {
    // Convert hex to HSL
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    const hue = Math.round(h * 360);
    const saturation = Math.round(s * 100);
    const lightness = Math.round(l * 100);

    // Apply to CSS variables
    document.documentElement.style.setProperty("--primary", `${hue} ${saturation}% ${lightness}%`);
    document.documentElement.style.setProperty("--primary-hover", `${hue} ${saturation}% ${Math.max(lightness - 6, 0)}%`);
    document.documentElement.style.setProperty("--primary-light", `${hue} ${Math.max(saturation - 8, 0)}% 92%`);
    document.documentElement.style.setProperty("--primary-glow", `${hue} ${saturation}% ${Math.min(lightness + 6, 100)}%`);
    document.documentElement.style.setProperty("--ring", `${hue} ${saturation}% ${lightness}%`);
    document.documentElement.style.setProperty("--sidebar-primary", `${hue} ${saturation}% ${lightness}%`);
  };

  const handleSaveTheme = () => {
    localStorage.setItem("doce-lucro-primary-color", primaryColor);
    applyPrimaryColor(primaryColor);
    toast({ title: "Tema atualizado!" });
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [profileRes, platformsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
        supabase.from("platforms").select("*").order("name"),
      ]);

      if (profileRes.data) {
        setProfile({
          store_name: profileRes.data.store_name || "",
          logo_url: profileRes.data.logo_url || "",
        });
      }

      setPlatforms(platformsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          store_name: profile.store_name,
          logo_url: profile.logo_url,
        })
        .eq("user_id", user!.id);

      if (error) throw error;

      toast({ title: "Perfil atualizado!" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const handleUpdatePlatform = async (platform: Platform) => {
    try {
      const { error } = await supabase
        .from("platforms")
        .update({
          name: platform.name,
          fee_percentage: platform.fee_percentage,
          is_active: platform.is_active,
          color: platform.color,
        })
        .eq("id", platform.id);

      if (error) throw error;

      toast({ title: "Plataforma atualizada!" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const handleAddPlatform = async () => {
    if (!newPlatform.name || !newPlatform.fee) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha nome e taxa da plataforma.",
      });
      return;
    }

    try {
      const { error } = await supabase.from("platforms").insert({
        user_id: user!.id,
        name: newPlatform.name,
        fee_percentage: parseFloat(newPlatform.fee.replace(",", ".")),
      });

      if (error) throw error;

      toast({ title: "Plataforma adicionada!" });
      setNewPlatform({ name: "", fee: "" });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const handleDeletePlatform = async (id: string) => {
    if (!confirm("Deseja excluir esta plataforma?")) return;

    try {
      const { error } = await supabase.from("platforms").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Plataforma excluída!" });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  return (
    <AppLayout title="Configurações">
      <div className="max-w-2xl space-y-6">
        {/* Profile Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Perfil da Confeitaria
              </CardTitle>
              <CardDescription>
                Informações básicas do seu negócio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store_name">Nome da Confeitaria</Label>
                <Input
                  id="store_name"
                  value={profile.store_name || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, store_name: e.target.value })
                  }
                  placeholder="Ex: Doces da Maria"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" value={user?.email || ""} disabled />
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado
                </p>
              </div>

              <Button
                onClick={handleSaveProfile}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Perfil
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Platform Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Plataformas de Venda
              </CardTitle>
              <CardDescription>
                Configure as taxas de cada plataforma de delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Platforms */}
              <div className="space-y-3">
                {platforms.map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: platform.color || "#ea90c9" }}
                    >
                      {platform.name.toLowerCase().includes("balcão") ? (
                        <Store className="h-4 w-4 text-white" />
                      ) : (
                        <Truck className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <Input
                      value={platform.name}
                      onChange={(e) => {
                        const updated = platforms.map((p) =>
                          p.id === platform.id
                            ? { ...p, name: e.target.value }
                            : p
                        );
                        setPlatforms(updated);
                      }}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={platform.fee_percentage}
                        onChange={(e) => {
                          const updated = platforms.map((p) =>
                            p.id === platform.id
                              ? { ...p, fee_percentage: parseFloat(e.target.value) || 0 }
                              : p
                          );
                          setPlatforms(updated);
                        }}
                        className="w-20 input-currency"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`color-${platform.id}`} className="sr-only">
                        Cor
                      </Label>
                      <input
                        id={`color-${platform.id}`}
                        type="color"
                        value={platform.color || "#ea90c9"}
                        onChange={(e) => {
                          const updated = platforms.map((p) =>
                            p.id === platform.id
                              ? { ...p, color: e.target.value }
                              : p
                          );
                          setPlatforms(updated);
                        }}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdatePlatform(platform)}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePlatform(platform.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add New Platform */}
              <div className="border-t pt-4">
                <Label className="mb-2 block">Adicionar Nova Plataforma</Label>
                <div className="flex items-center gap-3">
                  <Input
                    value={newPlatform.name}
                    onChange={(e) =>
                      setNewPlatform({ ...newPlatform, name: e.target.value })
                    }
                    placeholder="Nome da plataforma"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      value={newPlatform.fee}
                      onChange={(e) =>
                        setNewPlatform({ ...newPlatform, fee: e.target.value })
                      }
                      placeholder="Taxa"
                      className="w-20 input-currency"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <Button
                    onClick={handleAddPlatform}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        {/* Theme Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Tema e Cores
              </CardTitle>
              <CardDescription>
                Personalize a cor principal do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="primary-color">Cor Principal</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        applyPrimaryColor(e.target.value);
                      }}
                      className="w-12 h-12 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                          applyPrimaryColor(e.target.value);
                        }
                      }}
                      placeholder="#ea90c9"
                      className="w-32 font-mono"
                    />
                    <div className="flex gap-2">
                      {["#ea90c9", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"].map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setPrimaryColor(color);
                            applyPrimaryColor(color);
                          }}
                          className="w-8 h-8 rounded-full border-2 border-transparent hover:border-foreground/20 transition-colors"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSaveTheme}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Tema
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-primary/30 bg-primary-light/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary-light">
                  <SettingsIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Dica</h3>
                  <p className="text-sm text-muted-foreground">
                    As plataformas de venda são usadas para calcular
                    automaticamente as taxas quando você registra uma venda no
                    módulo Financeiro. Configure corretamente as taxas de cada
                    plataforma para ter um controle preciso do seu lucro.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Configuracoes;
