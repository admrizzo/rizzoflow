import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
 import { ArrowLeft, Loader2, Lock, Info } from 'lucide-react';
 import { perfMark, perfMeasure } from '@/lib/perfMark';
import { supabase } from '@/integrations/supabase/client';
import { buildPublicUrl } from '@/lib/appUrl';

const REMEMBER_EMAIL_KEY = 'flowrizzo:remember-email';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const flowType = params.get('type') || hashParams.get('type');
  const isPasswordFlow = !!user && (params.get('invite') === '1' || flowType === 'invite' || flowType === 'recovery');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRememberEmail(true);
      }
    } catch {
      // ignore (storage may be disabled)
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
   perfMark('auth:login:start');
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const emailValue = (formData.get('email') as string)?.trim();
    const password = formData.get('password') as string;

    const { error } = await signIn(emailValue, password);
    
    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      try {
        if (rememberEmail) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, emailValue);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        // ignore
      }
       perfMeasure('auth:login:success', 'auth:login:start');
       navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const emailValue = ((formData.get('email') as string) || '').trim();

    if (!emailValue) {
      toast({ title: 'Informe o e-mail', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
      redirectTo: buildPublicUrl('/redefinir-senha'),
    });

    // Por segurança, não revelar se o e-mail existe.
    if (error) {
      // Loga internamente, mas mostra mensagem genérica de sucesso ao usuário.
      console.error('[reset-password]', error.message);
    }

    toast({
      title: 'Verifique seu e-mail',
      description: 'Enviamos as instruções para o seu e-mail.',
    });
    setMode('signin');
    setIsLoading(false);
  };

  const handleSetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');

    if (password.length < 8) {
      toast({ title: 'Senha muito curta', description: 'Use pelo menos 8 caracteres.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Senhas diferentes', description: 'Confirme a mesma senha nos dois campos.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: 'Erro ao definir senha', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Senha definida com sucesso' });
      navigate('/dashboard', { replace: true });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Subtle background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-xl border border-border/50 relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img
              src="/logo-rizzo.png"
              alt="Rizzo Imobiliária"
              className="h-10 object-contain"
            />
          </div>
            <CardTitle className="text-xl">Rizzo Flow</CardTitle>
            <CardDescription>
              Gestão operacional de propostas e processos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPasswordFlow ? (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input
                    id="new-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Definir senha'
                  )}
                </Button>
              </form>
            ) : mode === 'forgot' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">E-mail</Label>
                  <Input
                    id="forgot-email"
                    name="email"
                    type="email"
                    placeholder="seu@rizzoimobiliaria.com"
                    defaultValue={email}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Enviaremos um link para redefinir sua senha.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar instruções'
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="w-full inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar para login
                </button>
              </form>
            ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder="seu@rizzoimobiliaria.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password">Senha</Label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Input
                  id="signin-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-email"
                  checked={rememberEmail}
                  onCheckedChange={(checked) => setRememberEmail(checked === true)}
                />
                <Label
                  htmlFor="remember-email"
                  className="text-xs font-normal text-muted-foreground cursor-pointer select-none"
                >
                  Lembrar meu e-mail
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
            )}

            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Acesso restrito à equipe autorizada.</span>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
