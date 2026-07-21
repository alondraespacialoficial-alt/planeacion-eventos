/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Sparkles, ArrowLeft, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2, User, UserPlus } from 'lucide-react';
import { AppService, isSupabaseConfigured, supabaseTablesExist } from '../lib/supabase';
import { UserSession } from '../types';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
  onNavigate: (route: string) => void;
}

export default function LoginPage({ onLoginSuccess, onNavigate }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (infoMessage) {
      const timer = setTimeout(() => {
        setInfoMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [infoMessage]);

  useEffect(() => {
    // Check if the secret door was activated from the landing page logo
    if (localStorage.getItem('showSecretDoor') === 'true') {
      setShowSecretDoor(true);
      localStorage.removeItem('showSecretDoor');
    }
  }, []);

  // Hidden admin click backdoor (5 clicks on logo)
  const [logoClicks, setLogoClicks] = useState(0);
  const [showSecretDoor, setShowSecretDoor] = useState(false);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const nextClicks = prev + 1;
      if (nextClicks >= 5) {
        setShowSecretDoor(true);
        return 0;
      }
      return nextClicks;
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      // Pass any mock password for demo fallback, real password for Supabase Auth
      const { user, error: authError } = await AppService.login(
        email.trim().toLowerCase(), 
        password || 'password123'
      );

      if (authError) {
        setError(authError);
      } else if (user) {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError('Ocurrió un error inesperado al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (type: 'admin' | 'client') => {
    if (type === 'admin') {
      setEmail('admin@ejemplo.com');
      setPassword('admin123');
    } else {
      setEmail('cliente@ejemplo.com');
      setPassword('cliente123');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Ingresa tu nombre completo.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const { success, error: signUpError } = await AppService.signUp(email.trim().toLowerCase(), password, name.trim());
      if (signUpError) {
        setError(signUpError);
      } else if (success) {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setInfoMessage('Cuenta creada correctamente. Si tu proyecto de Supabase requiere confirmación por correo, revisa tu bandeja antes de iniciar sesión.');
      }
    } catch (err: any) {
      setError('Ocurrió un error inesperado al crear tu cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0d] text-gray-200 font-sans flex items-center justify-center p-6 relative">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-amber-500/3 rounded-full filter blur-[120px] pointer-events-none"></div>

      {/* Back button */}
      <div className="absolute top-6 left-6 z-10">
        <button 
          onClick={() => onNavigate('landing')}
          className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 hover:border-amber-500/50 text-[10px] tracking-widest font-mono text-gray-400 hover:text-white transition-all flex items-center gap-2"
          id="login-back-btn"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          REGRESAR AL INICIO
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Card Frame */}
        <div className="rounded-2xl border border-gray-800 bg-[#0e1014]/90 backdrop-blur-md p-8 shadow-2xl relative overflow-hidden">
          
          {/* Decorative Top Accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>

          {/* Logo Heading */}
          <div className="text-center mb-8">
            <div 
              onClick={handleLogoClick}
              className="h-12 w-12 rounded-full border border-amber-500/30 flex items-center justify-center bg-amber-500/10 mx-auto mb-4 cursor-pointer hover:border-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all relative group"
              title="Haz 5 clics para el portal de administrador directo"
            >
              <Sparkles className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
              {logoClicks > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-black font-mono text-[9px] font-bold flex items-center justify-center animate-ping-once">
                  {5 - logoClicks}
                </span>
              )}
            </div>
            <h2 className="font-serif text-2xl text-white font-light tracking-wide uppercase">CHARLITRON PORTAL</h2>
            <p className="text-[10px] font-mono tracking-wider text-gray-500 mt-1">ORGANIZADORES & CLIENTES</p>
          </div>

          {/* Login / Signup mode toggle */}
          <div className="flex mb-6 rounded-xl border border-gray-800 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-mono tracking-widest transition-all cursor-pointer ${mode === 'login' ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              id="btn-mode-login"
            >
              INICIAR SESIÓN
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-mono tracking-widest transition-all cursor-pointer ${mode === 'signup' ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              id="btn-mode-signup"
            >
              CREAR CUENTA
            </button>
          </div>

          {showSecretDoor && mode === 'login' && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/35 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400 font-mono tracking-widest font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  ⚡ ACCESO ADMINISTRADORES
                </span>
                <button 
                  type="button"
                  onClick={() => setShowSecretDoor(false)} 
                  className="text-gray-400 hover:text-amber-500 text-[11px]"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@ejemplo.com');
                    setPassword('admin123');
                    setInfoMessage('Credenciales de Administrador Supremo cargadas');
                  }}
                  className="py-2 px-2.5 rounded bg-black/80 border border-amber-500/30 text-[9px] font-mono font-bold tracking-wider text-amber-400 hover:bg-amber-500 hover:text-black hover:border-amber-400 transition-all cursor-pointer text-center"
                >
                  ADMIN SUPREMO
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('adminbasico@ejemplo.com');
                    setPassword('admin123');
                    setInfoMessage('Credenciales de Administrador Básico cargadas');
                  }}
                  className="py-2 px-2.5 rounded bg-black/80 border border-amber-500/30 text-[9px] font-mono font-bold tracking-wider text-amber-400 hover:bg-amber-500 hover:text-black hover:border-amber-400 transition-all cursor-pointer text-center"
                >
                  ADMIN BÁSICO
                </button>
              </div>
            </div>
          )}

          {/* Alert Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {/* Info/Success Message */}
          {infoMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{infoMessage}</p>
            </div>
          )}

          {/* Auth form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label htmlFor="signup-name" className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2">NOMBRE COMPLETO</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    placeholder="Ej. Alejandra Gómez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#13151a] border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2">CORREO ELECTRÓNICO</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#13151a] border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2">CONTRASEÑA</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#13151a] border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label htmlFor="signup-confirm-password" className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2">CONFIRMAR CONTRASEÑA</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#13151a] border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold font-mono tracking-widest transition-all duration-300 shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer mt-2"
              id="btn-login-submit"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
              ) : mode === 'login' ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-black" />
                  INICIAR SESIÓN SEGURO
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-black" />
                  CREAR MI CUENTA
                </>
              )}
            </button>
          </form>

          {/* Quick-fill section to streamline the demo evaluation */}
          {mode === 'login' && (
            <div className="mt-8 pt-6 border-t border-gray-900 text-center">
              <p className="text-[9px] font-mono text-gray-500 tracking-wider uppercase mb-3.5">ACCESO DE CLIENTES</p>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => handleQuickFill('client')}
                  className="w-full py-2.5 px-3 rounded-lg border border-gray-800 bg-gray-950/60 hover:bg-amber-500/5 hover:border-amber-500/30 text-[10px] font-mono tracking-wider text-amber-400 transition-all cursor-pointer"
                  id="btn-quickfill-client"
                >
                  ENTRAR COMO CLIENTE / HOST
                </button>
              </div>
              <p className="text-[9px] text-gray-600 font-light font-sans mt-3 text-center leading-relaxed">
                *En el modo Demo local, cualquier contraseña de tu elección es aceptada.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
