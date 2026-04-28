import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Página dedicada para definição/redefinição de senha.
 *
 * Acessada via:
 *  - Link de recuperação de senha (Supabase event PASSWORD_RECOVERY)
 *  - Link de convite (?invite=1) enviado pelo admin
 *
 * Enquanto a flag `rizzo:needs-password-reset` existir em sessionStorage,
 * todas as rotas protegidas redirecionam para cá.
 */
export default function RedefinirSenha() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');

    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'Use pelo menos 8 caracteres.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas diferentes',
        description: 'Confirme a mesma senha nos dois campos.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (!user) {
      toast({
        title: 'Sessão expirada',
        description: 'Solicite um novo link de redefinição de senha.',
        variant: 'destructive',
      });
      setIsLoading(false);
      navigate('/auth', { replace: true });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({
        title: 'Erro ao definir senha',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      sessionStorage.removeItem('rizzo:needs-password-reset');
    } catch {
      // ignore
    }

    toast({
      title: 'Senha definida com sucesso',
      description: 'Você já pode acessar o sistema normalmente.',
    });
    setIsLoading(false);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-xl border border-border/50 relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src="/logo-rizzo.png" alt="Rizzo Imobiliária" className="h-10 object-contain" />
          </div>
          <CardTitle className="text-xl">Definir nova senha</CardTitle>
          <CardDescription>
            Crie uma senha para concluir o seu acesso ao Rizzo Flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
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
                'Salvar nova senha'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Conexão segura. Sua senha é criptografada.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
