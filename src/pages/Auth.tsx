import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, User, Phone, Gift } from "lucide-react";
import logo from "@/assets/logo.png";
import { z } from "zod";
import { validateReferralCode } from "@/lib/referralValidation";
import { motion, AnimatePresence } from "framer-motion";

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
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset" | "mfa">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const mfaFlagRef = useRef<(v: boolean) => void>(() => {});

  useEffect(() => {
    let mfaInProgress = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setMode("reset");
          return;
        }
        if (session && !mfaInProgress) {
          setTimeout(() => {
            checkMfaAndNavigate();
          }, 0);
        }
      }
    );

    const checkMfaAndNavigate = async () => {
      try {
        const [factorsRes, aalRes] = await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);
        const hasMfa = factorsRes.data?.totp?.some((f: any) => f.status === "verified");
        if (hasMfa && aalRes.data?.currentLevel !== "aal2") {
          return;
        }
        navigate("/dashboard");
      } catch {
        navigate("/dashboard");
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkMfaAndNavigate();
      }
    });

    mfaFlagRef.current = (v: boolean) => { mfaInProgress = v; };

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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({ variant: "destructive", title: "Erro ao entrar", description: "E-mail ou senha incorretos." });
          } else if (error.message.includes("Email not confirmed")) {
            toast({ variant: "destructive", title: "E-mail não confirmado", description: "Verifique seu e-mail para confirmar a conta." });
          } else {
            toast({ variant: "destructive", title: "Erro ao entrar", description: "Ocorreu um erro. Tente novamente." });
          }
        } else if (data?.session) {
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedFactor = factorsData?.totp?.find((f: any) => f.status === "verified");
          if (verifiedFactor) {
            mfaFlagRef.current(true);
            const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
            if (challengeError) {
              toast({ variant: "destructive", title: "Erro ao iniciar 2FA", description: challengeError.message });
              mfaFlagRef.current(false);
            } else {
              setMfaFactorId(verifiedFactor.id);
              setMfaChallengeId(challenge.id);
              setMode("mfa");
            }
          }
        }
      } else if (mode === "mfa") {
        if (!mfaFactorId || !mfaChallengeId || mfaCode.length !== 6) {
          toast({ variant: "destructive", title: "Digite o código de 6 dígitos" });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: mfaChallengeId,
          code: mfaCode,
        });
        if (error) {
          toast({ variant: "destructive", title: "Código inválido", description: "Verifique o código e tente novamente." });
        } else {
          mfaFlagRef.current(false);
          navigate("/dashboard");
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
          if (referralCode.trim()) {
            const code = referralCode.trim().toUpperCase();
            try {
              // Validate coupon via edge function
              const { data: couponResult, error: couponError } = await supabase.functions.invoke('validate-coupon', {
                body: { code },
              });

              if (!couponError && couponResult?.valid) {
                // Coupon is valid — apply it
                if (couponResult.type === 'vip_access') {
                  await supabase
                    .from("profiles")
                    .update({ plan_type: "vip" } as any)
                    .eq("user_id", data.user.id);
                }
                // Increment usage count
                await supabase
                  .from("coupons")
                  .update({ usage_count: (couponResult.usage_count || 0) + 1 } as any)
                  .eq("code", code);
              } else {
                // Not a coupon — try as referral code
                const validation = validateReferralCode(code);
                if (validation.valid) {
                  const { data: affiliate } = await supabase
                    .from("profiles")
                    .select("user_id")
                    .eq("referral_code", validation.code)
                    .maybeSingle();
                  if (affiliate && affiliate.user_id !== data.user.id) {
                    await supabase
                      .from("profiles")
                      .update({ referred_by: affiliate.user_id } as any)
                      .eq("user_id", data.user.id);
                  }
                }
              }
            } catch {
              // Non-blocking
            }
          }
          toast({ title: "Conta criada com sucesso!", description: "Verifique seu e-mail para confirmar a conta." });
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://www.fatiadolucro.com.br/auth/reset-password',
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
      case "login": return "Bem-vindo de volta";
      case "signup": return "Criar conta";
      case "forgot": return "Recuperar senha";
      case "reset": return "Nova senha";
      case "mfa": return "Verificação 2FA";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "login": return "Entre com seu e-mail e senha";
      case "signup": return "Comece a gerenciar sua confeitaria";
      case "forgot": return "Enviaremos um link para seu e-mail";
      case "reset": return "Digite sua nova senha";
      case "mfa": return "Digite o código do autenticador";
    }
  };

  const switchMode = (newMode: typeof mode) => {
    setMode(newMode);
    setErrors({});
    if (newMode !== "signup") {
      setFullName("");
      setPhone("");
      setReferralCode("");
      setShowReferralInput(false);
    }
    if (newMode === "login") {
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top brand section */}
      <div className="flex-shrink-0 pt-safe-top px-6 pt-12 pb-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mb-4"
        >
          <img src={logo} alt="Fatia do Lucro" className="w-20 h-20 rounded-2xl shadow-lg mx-auto" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-bold text-foreground"
        >
          Fatia do Lucro
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-sm text-muted-foreground mt-1"
        >
          Gestão inteligente para confeitarias
        </motion.p>
      </div>

      {/* Form section — fills remaining space */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-1 bg-card rounded-t-3xl shadow-lg border-t px-6 pt-8 pb-8 overflow-y-auto"
      >
        <div className="max-w-md mx-auto">
          {/* Back button */}
          <AnimatePresence mode="wait">
            {(mode === "forgot" || mode === "reset" || mode === "mfa") && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                type="button"
                onClick={() => switchMode("login")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4 touch-target -ml-2 px-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </motion.button>
            )}
          </AnimatePresence>

          <h2 className="text-xl font-bold text-foreground mb-1">{getTitle()}</h2>
          <p className="text-sm text-muted-foreground mb-6">{getDescription()}</p>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Full Name - signup only */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`pl-11 h-12 rounded-xl text-base ${errors.fullName ? "border-destructive" : ""}`}
                    disabled={loading}
                  />
                </div>
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
            )}

            {/* Phone - signup only */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`pl-11 h-12 rounded-xl text-base ${errors.phone ? "border-destructive" : ""}`}
                    disabled={loading}
                  />
                </div>
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
            )}

            {/* Email */}
            {mode !== "reset" && mode !== "mfa" && (
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-11 h-12 rounded-xl text-base ${errors.email ? "border-destructive" : ""}`}
                    disabled={loading}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            )}

            {/* Password */}
            {mode !== "forgot" && mode !== "mfa" && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">{mode === "reset" ? "Nova senha" : "Senha"}</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-11 pr-11 h-12 rounded-xl text-base ${errors.password ? "border-destructive" : ""}`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-target"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
            )}

            {/* Confirm Password */}
            {(mode === "signup" || mode === "reset") && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-11 h-12 rounded-xl text-base ${errors.confirmPassword ? "border-destructive" : ""}`}
                    disabled={loading}
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>
            )}

            {/* MFA Code Input */}
            {mode === "mfa" && (
              <div className="space-y-1.5">
                <Label htmlFor="mfaCode" className="text-sm font-medium">Código 2FA</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pl-11 h-12 rounded-xl text-center text-lg tracking-widest"
                    maxLength={6}
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">Abra seu app autenticador e digite o código de 6 dígitos</p>
              </div>
            )}

            {/* Referral / Coupon code - signup only */}
            {mode === "signup" && (
              <div className="space-y-2">
                {!showReferralInput ? (
                  <button
                    type="button"
                    onClick={() => setShowReferralInput(true)}
                    className="flex items-center gap-1.5 text-xs text-primary font-medium touch-target"
                  >
                    <Gift className="h-3.5 w-3.5" />
                    Tem um código de indicação ou cupom?
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="referralCode" className="text-sm font-medium">Código de Indicação / Cupom</Label>
                    <Input
                      id="referralCode"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="Ex: MARIA10"
                      className="font-mono uppercase text-sm h-12 rounded-xl"
                      maxLength={20}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">Desconto vitalício de R$ 14,99/mês</p>
                  </div>
                )}
              </div>
            )}

            {/* Terms checkbox - signup only */}
            {mode === "signup" && (
              <label className="flex items-start gap-3 cursor-pointer touch-target py-1">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-border accent-primary"
                />
                <span className="text-sm text-muted-foreground leading-tight">
                  Li e concordo com os{" "}
                  <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-primary font-medium">
                    Termos de Uso
                  </a>{" "}
                  e{" "}
                  <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-primary font-medium">
                    Política de Privacidade
                  </a>.
                </span>
              </label>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary-hover text-primary-foreground shadow-md"
              style={{ boxShadow: '0 4px 14px -2px hsl(160 84% 39% / 0.3)' }}
              disabled={loading || (mode === "mfa" && mfaCode.length !== 6) || (mode === "signup" && !acceptedTerms)}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "login" ? "Entrando..." : mode === "signup" ? "Criando conta..." : mode === "forgot" ? "Enviando..." : mode === "mfa" ? "Verificando..." : "Redefinindo..."}
                </>
              ) : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : mode === "forgot" ? "Enviar link" : mode === "mfa" ? "Verificar" : "Redefinir senha"}
            </Button>
          </form>

          {/* Footer links */}
          <div className="mt-8 text-center space-y-3">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="block w-full text-sm text-muted-foreground hover:text-primary transition-colors touch-target"
                >
                  Esqueci minha senha
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="block w-full text-sm font-medium text-primary touch-target"
                >
                  Não tem conta? <span className="underline">Criar agora</span>
                </button>
              </>
            )}
            {mode === "signup" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-sm font-medium text-primary touch-target"
              >
                Já tem conta? <span className="underline">Entrar</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
