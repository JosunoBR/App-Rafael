import React, { useState } from 'react';
import { API_BASE_URL } from '../utils/config';
import {
  Building2, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  ShoppingBag, 
  PackageCheck, 
  Truck, 
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { User, UserRole } from '../shared/types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !senha) {
      setErrorMsg('Por favor, informe seu e-mail e senha.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha na autenticação.');
      }

      // Salva sessão local
      localStorage.setItem('mega12_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Atalho de login rápido para demonstração de perfis
  const handleQuickLogin = (demoEmail: string, demoPass: string = '123456') => {
    setEmail(demoEmail);
    setSenha(demoPass);
    setIsLoading(true);
    setErrorMsg('');

    fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: demoEmail, senha: demoPass })
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          localStorage.setItem('mega12_user', JSON.stringify(data.user));
          onLoginSuccess(data.user);
        } else {
          setErrorMsg(data.error || 'Erro no login rápido');
        }
      })
      .catch(err => setErrorMsg(err.message))
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Luz de Fundo Decorativa */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[250px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Cabeçalho com Logomarca */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl shadow-lg shadow-emerald-900/50 mb-2">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            Rede Mega 12
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold">
              20 Lojas
            </span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Sistema Integrado de Compras, Engenharia Fiscal & Separação
          </p>
        </div>

        {/* Card do Formulário de Login */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
          
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Acesso ao Sistema
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Entre com suas credenciais autorizadas
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                E-mail ou Usuário
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: diretoria@mega12.com.br"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Senha de Acesso
                </label>
                <span className="text-[11px] text-slate-400">Padrão: 123456</span>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            {/* Botão de Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </>
              )}
            </button>
          </form>

          {/* Atalhos Rápidos para Teste Prático */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Acesso Rápido para Testes:
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              
              {/* Perfil 1: Rafael (Diretoria) */}
              <button
                type="button"
                onClick={() => handleQuickLogin('diretoria@mega12.com.br')}
                className="p-3 rounded-2xl bg-slate-800/70 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-500/60 text-left transition flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center font-bold transition shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-white text-xs">Rafael (Diretoria)</div>
                  <div className="text-[10px] text-slate-400">Acesso Total • Compras & Fiscal</div>
                </div>
              </button>

              {/* Perfil 2: Jorge (Separação) */}
              <button
                type="button"
                onClick={() => handleQuickLogin('separacao@mega12.com.br')}
                className="p-3 rounded-2xl bg-slate-800/70 hover:bg-teal-950/40 border border-slate-700 hover:border-teal-500/60 text-left transition flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 group-hover:bg-teal-500 group-hover:text-white flex items-center justify-center font-bold transition shrink-0">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-white text-xs">Jorge (Separação)</div>
                  <div className="text-[10px] text-slate-400">Doca • Conferência & Avarias</div>
                </div>
              </button>

            </div>
          </div>

        </div>

        {/* Rodapé Seguro */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Ambiente Seguro • SQLite Conectado</span>
        </div>

      </div>

    </div>
  );
};
