import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

export default function LoginScreen() {
    const { signIn, signUp } = useApp();
    const { showToast } = useToast();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState(''); // Only for register

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
                // Toast not needed on success as UI will switch automatically
            } else {
                // Register
                await signUp(email, password, fullName);
                showToast('success', 'Conta criada com sucesso! Você já está logado.');
            }
        } catch (error: any) {
            showToast('error', error.message || 'Erro de autenticação');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side - Image/Branding */}
            <div className="hidden lg:flex w-1/2 bg-navy relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[url('/assets/bg-login.jpg')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
                <div className="relative z-10 text-center p-12">
                    <img src="/assets/logo.png" alt="Empire" className="h-24 mx-auto mb-8 animate-in fade-in zoom-in duration-500" />
                    <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Gestão de Excelência</h1>
                    <p className="text-gold/80 text-lg font-light max-w-md mx-auto">
                        Sistema exclusivo para controle de trajes finos, contratos e financeiro.
                    </p>
                </div>
                {/* Decorative Circles */}
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gold/10 rounded-full blur-3xl"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50/50">
                <div className="max-w-md w-full space-y-8 animate-in slide-in-from-right-8 duration-500">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-black text-navy">{isLogin ? 'Bem-vindo de volta' : 'Criar nova conta'}</h2>
                        <p className="mt-2 text-gray-500">
                            {isLogin ? 'Insira suas credenciais para acessar.' : 'Preencha os dados para começar.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-6 bg-white p-8 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100">
                        {/* Validation Error Message could go here */}

                        {!isLogin && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-navy"
                                    placeholder="Seu nome"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-navy"
                                placeholder="usuario@exemplo.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Senha</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-navy"
                                placeholder={isLogin ? "••••••••" : "Crie uma senha forte"}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary shadow-primary/30 hover:bg-primary-dark'}`}
                        >
                            {loading ? (
                                <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <span className="material-symbols-outlined">{isLogin ? 'login' : 'person_add'}</span>
                            )}
                            {isLogin ? 'Entrar no Sistema' : 'Criar Conta'}
                        </button>
                    </form>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm font-bold text-gray-400 hover:text-primary transition-colors"
                        >
                            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça Login'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
