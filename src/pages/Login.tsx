import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { APP_NAME } from '../constants';
import { Logo } from '../components/Logo';

const Login: React.FC = () => {
  const { login, isLoading, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email) {
      errors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Digite um email válido';
    }
    
    if (!password) {
      errors.password = 'Senha é obrigatória';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await login(email, password);
    } catch (err) {
      // Erro já tratado no contexto
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors duration-200">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-4 text-primary-600 dark:text-primary-400 shadow-sm">
            <Logo className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            Entrar no {APP_NAME}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Digite suas credenciais para acessar seu dashboard
          </p>
        </div>

        {authError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{authError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="usuario@exemplo.com"
            value={email}
            onChange={(e) => {
                setEmail(e.target.value);
                if (authError) clearError();
            }}
            error={formErrors.email}
          />

          <Input
            id="password"
            type="password"
            label="Senha"
            placeholder="••••••"
            value={password}
            onChange={(e) => {
                setPassword(e.target.value);
                if (authError) clearError();
            }}
            error={formErrors.password}
          />

          <Button 
            type="submit" 
            isLoading={isLoading} 
            fullWidth
            className="mt-2"
          >
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;