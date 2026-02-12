import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Cookie, Mail, Lock, Eye, EyeOff, ArrowLeft, User, Phone } from "lucide-react";
import { z } from "zod";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Digite um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 dígitos").optional().or(z.literal("")),
  email: z.string().email("Digite um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type FormErrors = {
  fullName?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setMode("reset");
          return;
        }
        if (session) {
          navigate("/dashboard");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = (): boolean => {
    const fieldErrors: FormErrors = {};

    if (mode === "forgot") {
      if (!email || !z.string().email().safeParse(email).success) {
        fieldErrors.email = "Digite um e-mail válido";
      }
      setErrors(fieldErrors);
      return Object.keys(fieldErrors).length === 0;
    }

    if (mode === "reset") {
      if (password.length < 6) fieldErrors.password = "A senha deve ter pelo menos 6 caracteres";
      if (password !== confirmPassword) fieldErrors.confirmPassword = "As senhas não coincidem.";
      setErrors(fieldErrors);
      return Object.keys(fieldErrors).length === 0;
    }

    if (mode === "signup") {
      const result = signupSchema.safeParse({ fullName, phone, email, password, confirmPassword });
      if (!result.success) {
        result.error.errors.forEach((err) => {
          const field = err.path[0] as keyof FormErrors;
          if (field) fieldErrors[field] = err.message;
        });
      }
      setErrors(fieldErrors);
      return Object.keys(fieldErrors).length === 0;
    }

    // login
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        if (field) fieldErrors[field] = err.message;
      });
    }
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({ variant: "destructive", title: "Erro ao entrar", description: "E-mail ou senha incorretos." });
          } else if (error.message.includes("Email not confirmed")) {
            toast({ variant: "destructive", title: "E-mail não confirmado", description: "Verifique seu e-mail para confirmar a conta." });
          } else {
            toast({ variant: "destructive", title: "Erro ao entrar", description: "Ocorreu um erro. Tente novamente." });
          }
        }
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) {
          if (error.message.includes("already registered")) {
            toast({ variant: "destructive", title: "E-mail já cadastrado", description: "Tente fazer login ou use outro e-mail." });
          } else {
            toast({ variant: "destructive", title: "Erro ao criar conta", description: "Ocorreu um erro. Tente novamente." });
          }
        } else if (data.user) {
          toast({ title: "Conta criada com sucesso!", description: "Verifique seu e-mail para confirmar a conta." });
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) {
          toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro. Tente novamente." });
        } else {
          toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada para redefinir sua senha." });
        }
      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          toast({ variant: "destructive", title: "Erro", description: "Não foi possível redefinir a senha. Tente novamente." });
        } else {
          toast({ title: "Senha redefinida!", description: "Sua senha foi alterada com sucesso." });
          navigate("/dashboard");
        }
      }
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro inesperado. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "login": return "Entrar";
      case "signup": return "Criar conta";
      case "forgot": return "Esqueci minha senha";
      case "reset": return "Redefinir senha";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "login": return "Entre com seu e-mail e senha";
      case "signup": return "Crie sua conta para começar";
      case "forgot": return "Informe seu e-mail para receber o link de redefinição";
      case "reset": return "Digite sua nova senha";
    }
  };

  const switchMode = (newMode: typeof mode) => {
    setMode(newMode);
    setErrors({});
    if (newMode !== "signup") {
      setFullName("");
      setPhone("");
    }
    if (newMode === "login") {
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary-light/30 to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4"
          >
            <Cookie className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground">Fatia do Lucro</h1>
          <p className="text-muted-foreground mt-2">Gestão inteligente para confeitarias</p>
        </div>

        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            {(mode === "forgot" || mode === "reset") && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-2 w-fit"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </button>
            )}
            <CardTitle className="text-2xl text-center">{getTitle()}</CardTitle>
            <CardDescription className="text-center">{getDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {/* Full Name - signup only */}
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Seu nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`pl-10 ${errors.fullName ? "border-destructive" : ""}`}
                      disabled={loading}
                    />
                  </div>
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>
              )}

              {/* Phone - signup only */}
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`pl-10 ${errors.phone ? "border-destructive" : ""}`}
                      disabled={loading}
                    />
                  </div>
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
              )}

              {/* Email - shown on login, signup, forgot */}
              {mode !== "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                      disabled={loading}
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
              )}

              {/* Password - shown on login, signup, reset */}
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">{mode === "reset" ? "Nova senha" : "Senha"}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
              )}

              {/* Confirm Password - shown on signup and reset */}
              {(mode === "signup" || mode === "reset") && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                      disabled={loading}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "login" ? "Entrando..." : mode === "signup" ? "Criando conta..." : mode === "forgot" ? "Enviando..." : "Redefinindo..."}
                  </>
                ) : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : mode === "forgot" ? "Enviar link" : "Redefinir senha"}
              </Button>
            </form>

            {/* Footer links */}
            <div className="mt-6 text-center space-y-2">
              {mode === "login" && (
                <>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="block w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="block w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Não tem conta? Criar agora
                  </button>
                </>
              )}
              {mode === "signup" && (
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Já tem conta? Entrar
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
