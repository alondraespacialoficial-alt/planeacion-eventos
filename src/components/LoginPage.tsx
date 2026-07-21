/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Sparkles, ArrowLeft, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2, User, UserPlus } from 'lucide-react';
import { AppService } from '../lib/supabase';
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
  const supabaseStatus = AppService.getSupabaseStatus();
  const isRealBackend = supabaseStatus.configured && supabaseStatus.tablesExist;

  useEffect(() => {
    if (infoMessage) {
      const timer = setTimeout(() => {
        setInfoMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [infoMessage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      const { user, error: authError } = await AppService.login(
        email.trim().toLowerCase(), 
        password
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

          {/* Connection status indicator: helps confirm whether the app is really
              talking to Supabase (and not silently running in offline/demo mode) */}
          <div
            className={`mb-5 flex items-center gap-2 rounded-lg border px-3 py-2 text-[9px] font-mono tracking-wider ${
              isRealBackend
                ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isRealBackend ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
            {isRealBackend
              ? 'CONECTADO A SUPABASE (base de datos real)'
              : 'MODO LOCAL: sin conexión real a Supabase'}
          </div>

          {/* Logo Heading */}
          <div className="text-center mb-8">
            <div 
              className="h-12 w-12 rounded-full border border-amber-500/30 flex items-center justify-center bg-amber-500/10 mx-auto mb-4 relative group"
            >
              <Sparkles className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
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

          {mode === 'login' && (
            <div className="mt-8 pt-6 border-t border-gray-900 text-center">
              <p className="text-[9px] text-gray-600 font-light font-sans text-center leading-relaxed">
                ¿No tienes cuenta? Usa la pestaña "CREAR CUENTA" para registrarte como cliente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
