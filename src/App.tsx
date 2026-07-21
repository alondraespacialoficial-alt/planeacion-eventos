/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppService } from './lib/supabase';
import { UserSession } from './types';

// Importing our modular views
import LandingPage from './components/LandingPage';
import MicrositePage from './components/MicrositePage';
import LoginPage from './components/LoginPage';
import ClientDashboard from './components/ClientDashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('landing');
  const [eventId, setEventId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);

  // Parse location hash on load and when it changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '';
      
      if (hash.startsWith('#event/')) {
        const id = hash.replace('#event/', '');
        setCurrentRoute('event');
        setEventId(id);
      } else if (hash === '#login') {
        setCurrentRoute('login');
        setEventId(null);
      } else if (hash === '#dashboard') {
        setCurrentRoute('dashboard');
        setEventId(null);
      } else {
        setCurrentRoute('landing');
        setEventId(null);
      }
    };

    // Run on mount
    handleHashChange();

    // Listen to hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Fetch active session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        if (typeof (AppService as any).verifySupabaseTables === 'function') {
          await (AppService as any).verifySupabaseTables();
        }
        const session = await AppService.getSession();
        if (session) {
          setCurrentUser(session);
        }
      } catch (err) {
        console.error('Error fetching session', err);
      } finally {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, []);

  const handleLoginSuccess = (session: UserSession) => {
    setCurrentUser(session);
    // Redirect to dashboard hash
    window.location.hash = '#dashboard';
  };

  const handleLogout = async () => {
    await AppService.logout();
    setCurrentUser(null);
    // Redirect immediately to the public landing page as requested
    window.location.hash = '';
    setCurrentRoute('landing');
  };

  const handleNavigate = (route: string) => {
    window.location.hash = route === 'landing' ? '' : route;
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#090a0d] flex items-center justify-center text-white font-sans">
        <div className="text-center">
          <div className="h-10 w-10 border-t-2 border-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-mono tracking-widest text-gray-500 uppercase">Validando Acceso Seguro...</p>
        </div>
      </div>
    );
  }

  // Route Dispatcher
  switch (currentRoute) {
    case 'event':
      return <MicrositePage eventId={eventId || ''} onNavigate={handleNavigate} />;
      
    case 'login':
      if (currentUser) {
        // If already logged in, show their dashboard directly
        window.location.hash = '#dashboard';
      }
      return <LoginPage onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigate} />;
      
    case 'dashboard':
      if (!currentUser) {
        // Force authentication
        window.location.hash = '#login';
        return <LoginPage onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigate} />;
      }
      
      if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
        return (
          <AdminDashboard 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            onNavigate={handleNavigate} 
          />
        );
      } else {
        return (
          <ClientDashboard 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            onNavigate={handleNavigate} 
          />
        );
      }
      
    case 'landing':
    default:
      return <LandingPage onNavigate={handleNavigate} />;
  }
}

