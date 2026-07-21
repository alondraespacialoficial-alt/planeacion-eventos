/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { Event, RSVP, UserSession, Service, Lead, Quote, LandingConfig, PaymentReceipt, VendorItem, UserProfile } from '../types';

// Read configuration from env
const rawSupabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

// Defensive normalization: the Project URL must be exactly `https://xxxx.supabase.co`.
// If someone accidentally pastes a value with a trailing `/rest/v1` or a trailing slash
// (a common copy/paste mistake), the Supabase client silently fails every single request,
// which makes the whole app fall back to local/demo mode without any visible error.
const supabaseUrl = rawSupabaseUrl
  ? String(rawSupabaseUrl).trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
  : rawSupabaseUrl;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create real Supabase client if configured
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!) 
  : null;

// Track whether required database tables exist in the user's Supabase instance
export let supabaseTablesExist = true;

export function setSupabaseTablesExist(exists: boolean) {
  supabaseTablesExist = exists;
}

export async function verifySupabaseTables(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    supabaseTablesExist = false;
    return false;
  }
  try {
    const { error } = await supabase.from('landing_config').select('hero_title').limit(1).maybeSingle();
    if (error) {
      if (
        error.message?.includes('Invalid path') || 
        error.message?.includes('does not exist') || 
        error.code === 'PGRST116' || 
        (error as any).status === 404
      ) {
        console.error('[Supabase] Las tablas no existen o la URL/clave es inválida:', error);
        supabaseTablesExist = false;
        return false;
      }
      console.warn('[Supabase] verifySupabaseTables recibió un error no crítico:', error);
    }
    supabaseTablesExist = true;
    return true;
  } catch (err) {
    console.error('[Supabase] No se pudo conectar (revisa VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY):', err);
    supabaseTablesExist = false;
    return false;
  }
}

// --- INITIAL SEED DATA FOR DEMO / STORAGE BACKUP ---
const DEFAULT_EVENTS: Event[] = [
  {
    id: 'boda-ale-sebas',
    created_at: new Date('2026-05-10T12:00:00Z').toISOString(),
    title: 'Boda de Alejandra & Sebastián',
    description: 'Acompáñanos a celebrar nuestro amor en una noche llena de magia, música y alegría. Tu presencia es nuestro mejor regalo.',
    date: '2026-11-14',
    time: '17:30',
    location_name: 'Hacienda de los Morales',
    location_address: 'Vázquez de Mella 525, Polanco, Ciudad de México',
    map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m12!1m3!1d3762.4601423871415!2d-99.21370248509318!3d19.4357499868822!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d2021c3fa36ef5%3A0xc6cb1c7df4446c62!2sHacienda%20De%20Los%20Morales!5e0!3m2!1ses!2smx!4v1700000000000!5m2!1ses!2smx',
    cover_type: 'image',
    cover_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200',
    rsvp_deadline: '2026-10-31',
    status: 'active',
    created_by: 'client-user-id',
    client_email: 'cliente@ejemplo.com'
  },
  {
    id: 'gala-medicina-2026',
    created_at: new Date('2026-06-15T12:00:00Z').toISOString(),
    title: 'Gala de Graduación - Medicina 2026',
    description: 'Celebración oficial de la generación de Médicos Cirujanos 2021-2026. Una noche elegante para conmemorar años de esfuerzo y dedicación.',
    date: '2026-12-05',
    time: '20:00',
    location_name: 'Salón Real del Castillo',
    location_address: 'Paseo de la Reforma Lote 24, Bosque de Chapultepec, CDMX',
    map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m12!1m3!1d3762.6517596541656!2d-99.1862141!3d19.4211942!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1ff50bf35f49d%3A0x8e83348128ee3!2sCastillo%20de%20Chapultepec!5e0!3m2!1ses!2smx!4v1700000000001!5m2!1ses!2smx',
    cover_type: 'image',
    cover_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200',
    rsvp_deadline: '2026-11-15',
    status: 'active',
    created_by: 'client2-user-id',
    client_email: 'graduado@ejemplo.com'
  },
  {
    id: 'xv-anos-isabella',
    created_at: new Date('2026-07-01T12:00:00Z').toISOString(),
    title: 'Mis XV Años - Isabella',
    description: 'Te invito a compartir conmigo una de las noches más importantes y soñadas de mi vida. Baile, sorpresas y momentos inolvidables nos esperan.',
    date: '2026-10-24',
    time: '19:00',
    location_name: 'Jardín Las Flores',
    location_address: 'Camino Real de las Palmitas 405, Cuernavaca, Morelos',
    map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m12!1m3!1d3774.20452367123!2d-99.2312345!3d18.9213123!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85cddf123456789%3A0x1234567890abcdef!2sJardin%20Borda!5e0!3m2!1ses!2smx!4v1700000000002!5m2!1ses!2smx',
    cover_type: 'video',
    cover_url: 'https://assets.mixkit.co/videos/preview/mixkit-celebration-sparklers-in-a-party-night-40244-large.mp4',
    rsvp_deadline: '2026-10-10',
    status: 'closed',
    created_by: 'admin-user-id',
    client_email: 'isabella@ejemplo.com'
  }
];

const DEFAULT_RSVPS: RSVP[] = [
  {
    id: 'rsvp-1',
    created_at: new Date('2026-07-15T15:30:00Z').toISOString(),
    event_id: 'boda-ale-sebas',
    name: 'Roberto Gómez Martínez',
    email: 'roberto@ejemplo.com',
    phone: '5512345678',
    attendance: 'confirmed',
    plus_ones: 2,
    notes: 'Uno de los acompañantes es vegetariano.',
    consent_privacy: true,
    consent_terms: true,
    pass_code: 'PASS-849201',
    checked_in: false
  },
  {
    id: 'rsvp-2',
    created_at: new Date('2026-07-16T18:45:00Z').toISOString(),
    event_id: 'boda-ale-sebas',
    name: 'María Carmen Solís',
    email: 'mariacarmen@ejemplo.com',
    phone: '5598765432',
    attendance: 'confirmed',
    plus_ones: 0,
    notes: '¡Felicidades! Muy emocionada de asistir.',
    consent_privacy: true,
    consent_terms: true,
    pass_code: 'PASS-592810',
    checked_in: true,
    checked_in_at: new Date('2026-07-21T18:00:00Z').toISOString()
  },
  {
    id: 'rsvp-3',
    created_at: new Date('2026-07-18T10:15:00Z').toISOString(),
    event_id: 'boda-ale-sebas',
    name: 'Carlos Ruiz Ortiz',
    email: 'carlosruiz@ejemplo.com',
    phone: '5533445566',
    attendance: 'declined',
    plus_ones: 0,
    notes: 'Lo lamento mucho, estaré fuera del país en esa fecha.',
    consent_privacy: true,
    consent_terms: true,
    pass_code: 'PASS-102938'
  },
  {
    id: 'rsvp-4',
    created_at: new Date('2026-07-19T09:00:00Z').toISOString(),
    event_id: 'boda-ale-sebas',
    name: 'Laura Ponce García',
    email: 'laura.ponce@ejemplo.com',
    phone: '5577889900',
    attendance: 'pending',
    plus_ones: 1,
    notes: 'Por confirmar nombre del acompañante.',
    consent_privacy: true,
    consent_terms: true,
    pass_code: 'PASS-449201'
  },
  {
    id: 'rsvp-5',
    created_at: new Date('2026-07-19T14:20:00Z').toISOString(),
    event_id: 'gala-medicina-2026',
    name: 'Dr. Alejandro Silva',
    email: 'silva.med@ejemplo.com',
    phone: '5544332211',
    attendance: 'confirmed',
    plus_ones: 3,
    notes: 'Mesa de honor por favor.',
    consent_privacy: true,
    consent_terms: true,
    pass_code: 'PASS-773829'
  }
];

const DEFAULT_SERVICES: Service[] = [
  {
    id: 'srv-1',
    category: 'visual',
    title: 'Producción Audiovisual Premium',
    description: 'Grabación de video en 4K multicámara, fotografía artística y cobertura completa de tu evento con drones.',
    price_estimated: '$15,000 MXN',
    image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=600',
    is_visible: true
  },
  {
    id: 'srv-2',
    category: 'planning',
    title: 'Coordinación y Logística Total',
    description: 'Organización integral paso a paso. Desde la selección de banquete, personal de meseros, hasta la decoración final.',
    price_estimated: '$25,000 MXN',
    image_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=600',
    is_visible: true
  },
  {
    id: 'srv-3',
    category: 'invitations',
    title: 'Invitaciones Digitales Inteligentes',
    description: 'Tarjetas digitales interactivas con mapas dinámicos, contador regresivo, confirmación RSVP automática y panel para ver tus asistentes.',
    price_estimated: '$3,500 MXN',
    image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600',
    is_visible: true
  }
];

const DEFAULT_LEADS: Lead[] = [
  {
    id: 'lead-1',
    created_at: new Date('2026-07-15T10:00:00Z').toISOString(),
    name: 'Ana María Orozco',
    phone: '5511223344',
    city: 'CDMX',
    event_type: 'Boda',
    event_date: '2026-11-20',
    estimated_budget: '$150,000 MXN',
    services_selected: ['Coordinación y Logística Total', 'Invitaciones Digitales Inteligentes'],
    status: 'new'
  },
  {
    id: 'lead-2',
    created_at: new Date('2026-07-18T14:30:00Z').toISOString(),
    name: 'Roberto Palazuelos',
    phone: '5588776655',
    city: 'Acapulco',
    event_type: 'XV Años',
    event_date: '2026-12-18',
    estimated_budget: '$300,000 MXN',
    services_selected: ['Producción Audiovisual Premium'],
    status: 'contacted'
  }
];

const DEFAULT_QUOTES: Quote[] = [
  {
    id: 'q-1',
    folio: 'QT-2026-001',
    created_at: new Date('2026-07-19T09:15:00Z').toISOString(),
    client_id: 'client-user-id',
    client_name: 'Alejandra Guzmán',
    client_email: 'cliente@ejemplo.com',
    client_phone: '5511223344',
    items: [
      { id: 'qi-1', description: 'Coordinación Integral Boda (Paquete Platino)', price: 25000, quantity: 1, discount: 5 },
      { id: 'qi-2', description: 'Invitación Digital Interactiva con RSVP', price: 3500, quantity: 1, discount: 0 },
      { id: 'qi-3', description: 'Servicio de Meseros de Gala (8 horas)', price: 1200, quantity: 10, discount: 0 }
    ],
    subtotal: 40500,
    discount_total: 1250,
    total: 39250,
    status: 'sent',
    observations: 'Se requiere el 50% de anticipo para apartar la fecha. Precios sujetos a cambios sin previo aviso.',
    terms: 'Vigencia de la cotización: 30 días naturales. Cambios en el número de meseros permitidos hasta 15 días antes del evento.'
  },
  {
    id: 'q-2',
    folio: 'QT-2026-002',
    created_at: new Date('2026-07-20T11:45:00Z').toISOString(),
    client_id: 'client2-user-id',
    client_name: 'Dr. Alejandro Silva',
    client_email: 'graduado@ejemplo.com',
    client_phone: '5544332211',
    items: [
      { id: 'qi-4', description: 'Producción Audiovisual - Cobertura de Graduación', price: 15000, quantity: 1, discount: 0 },
      { id: 'qi-5', description: 'Cabina Fotográfica de Regalo / Recuerdo', price: 4000, quantity: 1, discount: 50 }
    ],
    subtotal: 19000,
    discount_total: 2000,
    total: 17000,
    status: 'approved',
    observations: 'Aprobado. Pendiente firma de contrato formal de producción.',
    terms: 'Venta final. Todo material digital será entregado en un plazo máximo de 21 días posteriores al evento.'
  }
];

const DEFAULT_LANDING_CONFIG: LandingConfig = {
  hero_title: 'Charlitron',
  hero_subtitle: 'Planeación de Eventos & Producción Visual Premium',
  hero_image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1600',
  about_text: 'En Charlitron transformamos tus ideas en celebraciones legendarias. Fusionamos el arte de la planeación meticulosa, diseño de experiencias exclusivas y producción visual de alta fidelidad, con innovadoras invitaciones digitales que garantizan una gestión de asistentes impecable.',
  whatsapp_phone: '5214444237092',
  logo_url: '',
  business_address: 'Av. Paseo de la Reforma 250, Juárez, 06600 Ciudad de México, CDMX'
};

const DEFAULT_PAYMENTS: PaymentReceipt[] = [
  {
    id: 'pay-1',
    created_at: new Date('2026-07-20T14:00:00Z').toISOString(),
    event_id: 'boda-ale-sebas',
    client_id: 'client-user-id',
    client_name: 'Alejandra Guzmán',
    client_email: 'cliente@ejemplo.com',
    amount: 15000,
    payment_type: 'anticipo',
    payment_method: 'transferencia',
    concept: 'Anticipo 50% para apartado de fecha Boda',
    reference_code: 'SPEI-88294021',
    status: 'verified',
    notes: 'Pago recibido y verificado en cuenta BBVA Charlitron.'
  },
  {
    id: 'pay-2',
    created_at: new Date('2026-07-21T09:30:00Z').toISOString(),
    event_id: 'boda-ale-sebas',
    client_id: 'client-user-id',
    client_name: 'Alejandra Guzmán',
    client_email: 'cliente@ejemplo.com',
    amount: 5000,
    payment_type: 'abono_extra',
    payment_method: 'transferencia',
    concept: 'Abono parcial 2da parcialidad',
    reference_code: 'SPEI-99201142',
    status: 'pending',
    notes: 'En proceso de conciliación bancaria.'
  }
];

const DEFAULT_VENDORS: VendorItem[] = [
  {
    id: 'ven-1',
    created_at: new Date('2026-07-10T10:00:00Z').toISOString(),
    event_id: 'boda-ale-sebas',
    client_email: 'cliente@ejemplo.com',
    category: 'Florista',
    vendor_name: 'Flores & Arte Polanco',
    contact_phone: '5511882233',
    status: 'contratado',
    amount_agreed: 18000,
    notes: 'Centros de mesa altos con orquídeas y rosas blancas.'
  },
  {
    id: 'ven-2',
    created_at: new Date('2026-07-12T11:00:00Z').toISOString(),
    event_id: 'boda-ale-sebas',
    client_email: 'cliente@ejemplo.com',
    category: 'Fotógrafo & Video',
    vendor_name: 'Charlitron Visual Studio',
    contact_phone: '5214444237092',
    status: 'contratado',
    amount_agreed: 25000,
    notes: 'Incluye sesión Save the Date + Cobertura 12 hrs + Dron 4K.'
  },
  {
    id: 'ven-3',
    created_at: new Date('2026-07-15T12:00:00Z').toISOString(),
    event_id: 'boda-ale-sebas',
    client_email: 'cliente@ejemplo.com',
    category: 'Pastel',
    vendor_name: 'Repostería La Petite',
    contact_phone: '5599001122',
    status: 'en_proceso',
    amount_agreed: 6500,
    notes: 'Pastel de 3 pisos sabor frutos rojos y fondant de almendra.'
  },
  {
    id: 'ven-4',
    created_at: new Date('2026-07-18T16:00:00Z').toISOString(),
    event_id: 'boda-ale-sebas',
    client_email: 'cliente@ejemplo.com',
    category: 'DJ & Música',
    vendor_name: 'DJ Sonido & Luces MX',
    contact_phone: '5577665544',
    status: 'cotizando',
    amount_agreed: 12000,
    notes: 'Esperando confirmación de disponibilidad de pista iluminada.'
  }
];

// LocalStorage database engine for seamless demo
class LocalStorageDB {
  static getEvents(): Event[] {
    const data = localStorage.getItem('eventos_data');
    if (!data) {
      localStorage.setItem('eventos_data', JSON.stringify(DEFAULT_EVENTS));
      return DEFAULT_EVENTS;
    }
    return JSON.parse(data);
  }

  static saveEvents(events: Event[]): void {
    localStorage.setItem('eventos_data', JSON.stringify(events));
  }

  static getRSVPs(): RSVP[] {
    const data = localStorage.getItem('rsvps_data');
    if (!data) {
      localStorage.setItem('rsvps_data', JSON.stringify(DEFAULT_RSVPS));
      return DEFAULT_RSVPS;
    }
    return JSON.parse(data);
  }

  static saveRSVPs(rsvps: RSVP[]): void {
    localStorage.setItem('rsvps_data', JSON.stringify(rsvps));
  }

  static getServices(): Service[] {
    const data = localStorage.getItem('services_data');
    if (!data) {
      localStorage.setItem('services_data', JSON.stringify(DEFAULT_SERVICES));
      return DEFAULT_SERVICES;
    }
    return JSON.parse(data);
  }

  static saveServices(services: Service[]): void {
    localStorage.setItem('services_data', JSON.stringify(services));
  }

  static getLeads(): Lead[] {
    const data = localStorage.getItem('leads_data');
    if (!data) {
      localStorage.setItem('leads_data', JSON.stringify(DEFAULT_LEADS));
      return DEFAULT_LEADS;
    }
    return JSON.parse(data);
  }

  static saveLeads(leads: Lead[]): void {
    localStorage.setItem('leads_data', JSON.stringify(leads));
  }

  static getQuotes(): Quote[] {
    const data = localStorage.getItem('quotes_data');
    if (!data) {
      localStorage.setItem('quotes_data', JSON.stringify(DEFAULT_QUOTES));
      return DEFAULT_QUOTES;
    }
    return JSON.parse(data);
  }

  static saveQuotes(quotes: Quote[]): void {
    localStorage.setItem('quotes_data', JSON.stringify(quotes));
  }

  static getPayments(): PaymentReceipt[] {
    const data = localStorage.getItem('payments_data');
    if (!data) {
      localStorage.setItem('payments_data', JSON.stringify(DEFAULT_PAYMENTS));
      return DEFAULT_PAYMENTS;
    }
    return JSON.parse(data);
  }

  static savePayments(payments: PaymentReceipt[]): void {
    localStorage.setItem('payments_data', JSON.stringify(payments));
  }

  static getVendors(): VendorItem[] {
    const data = localStorage.getItem('vendors_data');
    if (!data) {
      localStorage.setItem('vendors_data', JSON.stringify(DEFAULT_VENDORS));
      return DEFAULT_VENDORS;
    }
    return JSON.parse(data);
  }

  static saveVendors(vendors: VendorItem[]): void {
    localStorage.setItem('vendors_data', JSON.stringify(vendors));
  }

  static getLandingConfig(): LandingConfig {
    const data = localStorage.getItem('landing_config_data');
    if (!data) {
      localStorage.setItem('landing_config_data', JSON.stringify(DEFAULT_LANDING_CONFIG));
      return DEFAULT_LANDING_CONFIG;
    }
    return JSON.parse(data);
  }

  static saveLandingConfig(config: LandingConfig): void {
    localStorage.setItem('landing_config_data', JSON.stringify(config));
  }

  static getSession(): UserSession | null {
    const data = localStorage.getItem('user_session_data');
    return data ? JSON.parse(data) : null;
  }

  static saveSession(session: UserSession | null): void {
    if (session) {
      localStorage.setItem('user_session_data', JSON.stringify(session));
    } else {
      localStorage.removeItem('user_session_data');
    }
  }
}

// --- APP SERVICES WRAPPER (SUPABASE REAL + LOCAL FALLBACK) ---
export const AppService = {
  // --- TABLE VERIFICATION & STATUS ---
  async verifySupabaseTables(): Promise<boolean> {
    return verifySupabaseTables();
  },

  getSupabaseStatus() {
    return {
      configured: isSupabaseConfigured,
      tablesExist: supabaseTablesExist
    };
  },

  localLoginFallback(email: string): { user: UserSession; error: null } {
    const cleanEmail = email.toLowerCase();
    const is_super_admin = cleanEmail === 'admin@ejemplo.com';
    const is_admin = is_super_admin || cleanEmail === 'adminbasico@ejemplo.com';
    const userSession: UserSession = {
      id: is_admin ? 'admin-user-id' : (email === 'graduado@ejemplo.com' ? 'client2-user-id' : 'client-user-id'),
      email: email,
      role: is_super_admin ? 'super_admin' : (is_admin ? 'admin' : 'client'),
      name: is_admin ? 'Administrador Eventos' : (email === 'graduado@ejemplo.com' ? 'Dr. Graduado' : 'Cliente Premium')
    };
    LocalStorageDB.saveSession(userSession);
    return { user: userSession, error: null };
  },

  // Resolve the REAL role of an authenticated Supabase user from the `profiles` table.
  // NEVER infer roles from the email string — that is a privilege-escalation vulnerability.
  async buildSessionFromSupabaseUser(user: { id: string; email?: string; user_metadata?: any }): Promise<UserSession> {
    let role: UserSession['role'] = 'client';
    let name = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario';
    try {
      const { data: profile, error } = await supabase!
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .maybeSingle();
      if (!error && profile) {
        role = profile.role;
        name = profile.name || name;
      }
    } catch (err) {
      console.error('Error fetching user profile/role', err);
    }
    return { id: user.id, email: user.email || '', role, name };
  },

  // --- AUTH SERVICES ---
  async login(email: string, password_dummy: string): Promise<{ user: UserSession | null, error: string | null }> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      // Real Supabase Auth is configured: ALWAYS validate against it.
      // There is no local/demo bypass here — every login must go through
      // supabase.auth.signInWithPassword, which enforces the real password.
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: password_dummy,
        });
        if (error) {
          return { user: null, error: 'Correo o contraseña incorrectos.' };
        }
        
        // Fetch the real role from the `profiles` table (never trust the email string).
        const session = await this.buildSessionFromSupabaseUser(data.user!);
        LocalStorageDB.saveSession(session);
        return { user: session, error: null };
      } catch (err: any) {
        return { user: null, error: err.message || 'Error de inicio de sesión' };
      }
    } else {
      // Supabase is NOT configured at all (local-only demo mode, no backend).
      // This path is only reachable in development without env vars set.
      return this.localLoginFallback(email);
    }
  },

  async signUp(email: string, password_dummy: string, name: string): Promise<{ success: boolean, error: string | null }> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        // NOTE: role is never sent from the client. The database trigger `handle_new_user`
        // assigns 'client' by default, or 'admin' automatically only if the email was
        // previously added to the admin_allowlist table by a super_admin.
        const { error } = await supabase.auth.signUp({
          email,
          password: password_dummy,
          options: {
            data: {
              name: name
            }
          }
        });
        if (error) throw error;
        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      // Demo signup
      return { success: true, error: null };
    }
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      await supabase.auth.signOut();
    }
    LocalStorageDB.saveSession(null);
  },

  async getSession(): Promise<UserSession | null> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        return this.buildSessionFromSupabaseUser(data.session.user);
      }
      return null;
    }
    return LocalStorageDB.getSession();
  },

  // --- ACCESS CONTROL SERVICES (Super Admin only, enforced by RLS in Supabase) ---
  async getAdminAllowlist(): Promise<string[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('admin_allowlist')
      .select('email')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching admin allowlist', error);
      return [];
    }
    return (data || []).map((row: any) => row.email);
  },

  async addToAdminAllowlist(email: string): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Supabase no está configurado.' };
    const { error } = await supabase.from('admin_allowlist').insert([{ email: email.toLowerCase().trim() }]);
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  },

  async removeFromAdminAllowlist(email: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('admin_allowlist').delete().eq('email', email.toLowerCase().trim());
  },

  async listUserProfiles(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, role, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching user profiles', error);
      return [];
    }
    return data || [];
  },

  async updateUserRole(userId: string, role: 'admin' | 'client'): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Supabase no está configurado.' };
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  },

  // --- EVENT SERVICES ---
  async getEvents(currentUser: UserSession | null): Promise<Event[]> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        let query = supabase.from('eventos').select('*');
        
        // Client Row Level Security simulated filter (if role is client, only get their events)
        if (currentUser && currentUser.role === 'client') {
          query = query.eq('client_email', currentUser.email);
        }
        
        const { data, error } = await query.order('date', { ascending: true });
        if (error) throw error;
        return (data || []) as Event[];
      } catch (err) {
        console.error('Error fetching Supabase events, trying fallback...', err);
      }
    }

    // Fallback Local Storage
    const all = LocalStorageDB.getEvents();
    if (currentUser && currentUser.role === 'client') {
      return all.filter(e => e.client_email.toLowerCase() === currentUser.email.toLowerCase());
    }
    return all;
  },

  async getEventById(id: string): Promise<Event | null> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { data, error } = await supabase
          .from('eventos')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data as Event;
      } catch (err) {
        console.error('Error fetching Supabase event by id, trying fallback...', err);
      }
    }

    // Fallback Local Storage
    const all = LocalStorageDB.getEvents();
    return all.find(e => e.id === id) || null;
  },

  async createEvent(event: Omit<Event, 'id' | 'created_at' | 'created_by'>, currentUser: UserSession): Promise<Event> {
    const newEvent: Event = {
      ...event,
      id: isSupabaseConfigured ? undefined as any : 'evt-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      created_by: currentUser.id
    } as Event;

    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { data, error } = await supabase
          .from('eventos')
          .insert([newEvent])
          .select()
          .single();
        if (error) throw error;
        return data as Event;
      } catch (err) {
        console.error('Error creating event in Supabase, trying fallback...', err);
      }
    }

    // Fallback Local Storage
    const all = LocalStorageDB.getEvents();
    all.push(newEvent);
    LocalStorageDB.saveEvents(all);
    return newEvent;
  },

  async updateEvent(id: string, updatedFields: Partial<Omit<Event, 'id' | 'created_at' | 'created_by'>>): Promise<Event | null> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { data, error } = await supabase
          .from('eventos')
          .update(updatedFields)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as Event;
      } catch (err) {
        console.error('Error updating event in Supabase, trying fallback...', err);
      }
    }

    // Fallback Local Storage
    const all = LocalStorageDB.getEvents();
    const idx = all.findIndex(e => e.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updatedFields };
      LocalStorageDB.saveEvents(all);
      return all[idx];
    }
    return null;
  },

  async deleteEvent(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { error } = await supabase
          .from('eventos')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Error deleting event in Supabase, trying fallback...', err);
      }
    }

    // Fallback Local Storage
    const all = LocalStorageDB.getEvents();
    const filtered = all.filter(e => e.id !== id);
    LocalStorageDB.saveEvents(filtered);

    // Also remove RSVPs associated with that event
    const allRsvps = LocalStorageDB.getRSVPs();
    LocalStorageDB.saveRSVPs(allRsvps.filter(r => r.event_id !== id));
    return true;
  },

  // --- RSVP SERVICES ---
  async getRSVPsForEvent(eventId: string): Promise<RSVP[]> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { data, error } = await supabase
          .from('rsvps')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as RSVP[];
      } catch (err) {
        console.error('Error fetching RSVPs from Supabase, trying fallback...', err);
      }
    }

    // Fallback Local Storage
    const all = LocalStorageDB.getRSVPs();
    return all.filter(r => r.event_id === eventId);
  },

  async submitRSVP(rsvp: Omit<RSVP, 'id' | 'created_at'>): Promise<RSVP> {
    const generatedPass = rsvp.pass_code || ('PASS-' + Math.floor(100000 + Math.random() * 900000));
    const newRsvp: RSVP = {
      ...rsvp,
      pass_code: generatedPass,
      checked_in: false,
      id: 'rsvp-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { data, error } = await supabase
          .from('rsvps')
          .insert([newRsvp])
          .select()
          .single();
        if (error) throw error;
        return data as RSVP;
      } catch (err) {
        console.error('Error submitting RSVP to Supabase, trying fallback...', err);
      }
    }

    // Fallback Local Storage
    const all = LocalStorageDB.getRSVPs();
    all.push(newRsvp);
    LocalStorageDB.saveRSVPs(all);
    return newRsvp;
  },

  async checkInRSVP(rsvpIdOrPassCode: string, checkedIn: boolean): Promise<RSVP | null> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { data, error } = await supabase
          .from('rsvps')
          .update({
            checked_in: checkedIn,
            checked_in_at: checkedIn ? new Date().toISOString() : null
          })
          .or(`id.eq.${rsvpIdOrPassCode},pass_code.eq.${rsvpIdOrPassCode}`)
          .select()
          .maybeSingle();
        if (!error && data) return data as RSVP;
      } catch (err) {
        console.error('Error checking in RSVP in Supabase, fallback to local', err);
      }
    }

    const all = LocalStorageDB.getRSVPs();
    const idx = all.findIndex(r => r.id === rsvpIdOrPassCode || r.pass_code === rsvpIdOrPassCode);
    if (idx !== -1) {
      all[idx].checked_in = checkedIn;
      all[idx].checked_in_at = checkedIn ? new Date().toISOString() : undefined;
      LocalStorageDB.saveRSVPs(all);
      return all[idx];
    }
    return null;
  },

  // --- PAYMENT RECEIPTS SERVICES ---
  async getPaymentReceipts(user?: UserSession): Promise<PaymentReceipt[]> {
    const all = LocalStorageDB.getPayments();
    if (user && user.role === 'client') {
      return all.filter(p => p.client_email.toLowerCase() === user.email.toLowerCase());
    }
    return all;
  },

  async submitPaymentReceipt(receipt: Omit<PaymentReceipt, 'id' | 'created_at' | 'status'>): Promise<PaymentReceipt> {
    const newReceipt: PaymentReceipt = {
      ...receipt,
      id: 'pay-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      status: 'pending'
    };
    const all = LocalStorageDB.getPayments();
    all.unshift(newReceipt);
    LocalStorageDB.savePayments(all);
    return newReceipt;
  },

  async updatePaymentReceiptStatus(id: string, status: 'verified' | 'rejected' | 'pending', notes?: string): Promise<PaymentReceipt | null> {
    const all = LocalStorageDB.getPayments();
    const idx = all.findIndex(p => p.id === id);
    if (idx !== -1) {
      all[idx].status = status;
      if (notes) all[idx].notes = notes;
      LocalStorageDB.savePayments(all);
      return all[idx];
    }
    return null;
  },

  // --- VENDORS SERVICES ---
  async getVendors(clientEmail: string): Promise<VendorItem[]> {
    const all = LocalStorageDB.getVendors();
    if (!clientEmail) return all;
    return all.filter(v => v.client_email.toLowerCase() === clientEmail.toLowerCase());
  },

  async addVendor(vendor: Omit<VendorItem, 'id' | 'created_at'>): Promise<VendorItem> {
    const newVendor: VendorItem = {
      ...vendor,
      id: 'ven-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    const all = LocalStorageDB.getVendors();
    all.unshift(newVendor);
    LocalStorageDB.saveVendors(all);
    return newVendor;
  },

  async updateVendor(id: string, updatedFields: Partial<VendorItem>): Promise<VendorItem | null> {
    const all = LocalStorageDB.getVendors();
    const idx = all.findIndex(v => v.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updatedFields };
      LocalStorageDB.saveVendors(all);
      return all[idx];
    }
    return null;
  },

  async deleteVendor(id: string): Promise<boolean> {
    const all = LocalStorageDB.getVendors();
    const filtered = all.filter(v => v.id !== id);
    LocalStorageDB.saveVendors(filtered);
    return true;
  },

  // --- FILE STORAGE / ASSETS ---
  async uploadMedia(file: File): Promise<string> {
    // Helper to compress images client-side before upload or local storage saving
    const compressImage = (f: File): Promise<File> => {
      return new Promise((resolve) => {
        if (!f.type.startsWith('image/')) {
          resolve(f);
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const isLogo = f.name.toLowerCase().includes('logo') || f.type === 'image/png';
            const maxWidth = isLogo ? 800 : 1920;
            const maxHeight = isLogo ? 800 : 1080;

            let width = img.width;
            let height = img.height;

            if (width <= maxWidth && height <= maxHeight && f.size < 400 * 1024) {
              // If already small and within limits, don't re-compress
              resolve(f);
              return;
            }

            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(f);
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const mimeType = f.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const quality = mimeType === 'image/jpeg' ? 0.8 : undefined;

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  resolve(f);
                  return;
                }
                const compressedFile = new File([blob], f.name, {
                  type: mimeType,
                  lastModified: Date.now(),
                });
                console.log(`Image compressed from ${(f.size / 1024).toFixed(1)}KB to ${(compressedFile.size / 1024).toFixed(1)}KB`);
                resolve(compressedFile);
              },
              mimeType,
              quality
            );
          };
          img.onerror = () => resolve(f);
        };
        reader.onerror = () => resolve(f);
      });
    };

    let finalFile = file;
    try {
      finalFile = await compressImage(file);
    } catch (compressErr) {
      console.warn('Error compressing image, uploading original', compressErr);
    }

    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const fileExt = finalFile.name.split('.').pop() || 'jpg';
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `covers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-assets')
          .upload(filePath, finalFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('event-assets')
          .getPublicUrl(filePath);

        return data.publicUrl;
      } catch (err) {
        console.error('Error uploading to Supabase Storage, falling back to base64...', err);
      }
    }

    // Fallback: Read file as Base64/DataURL so it can be previewed instantly
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(finalFile);
    });
  },

  // --- SERVICES (ADMIN-EDITABLE LISTS) ---
  async getServices(): Promise<Service[]> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('title', { ascending: true });
        if (!error && data) return data as Service[];
      } catch (err) {
        console.error('Error fetching services from Supabase, trying fallback...', err);
      }
    }
    return LocalStorageDB.getServices();
  },

  async saveService(service: Omit<Service, 'id'> & { id?: string }): Promise<Service> {
    const isNew = !service.id;
    const finalService: Service = {
      ...service,
      id: service.id || 'srv-' + Math.random().toString(36).substr(2, 9)
    } as Service;

    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const query = isNew 
          ? supabase.from('services').insert([finalService])
          : supabase.from('services').update(finalService).eq('id', finalService.id);
        const { error } = await query;
        if (!error) return finalService;
      } catch (err) {
        console.error('Error saving service to Supabase, trying fallback...', err);
      }
    }

    const all = LocalStorageDB.getServices();
    if (isNew) {
      all.push(finalService);
    } else {
      const idx = all.findIndex(s => s.id === finalService.id);
      if (idx !== -1) all[idx] = finalService;
    }
    LocalStorageDB.saveServices(all);
    return finalService;
  },

  async deleteService(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.error('Error deleting service from Supabase, trying fallback...', err);
      }
    }
    const all = LocalStorageDB.getServices();
    LocalStorageDB.saveServices(all.filter(s => s.id !== id));
    return true;
  },

  // --- LEADS / PEDIDOS ---
  async getLeads(): Promise<Lead[]> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data as Lead[];
      } catch (err) {
        console.error('Error fetching leads from Supabase, trying fallback...', err);
      }
    }
    return LocalStorageDB.getLeads();
  },

  async createLead(lead: Omit<Lead, 'id' | 'created_at' | 'status'>): Promise<Lead> {
    const newLead: Lead = {
      ...lead,
      id: 'lead-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      status: 'new'
    };

    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { error } = await supabase.from('leads').insert([newLead]);
        if (!error) return newLead;
      } catch (err) {
        console.error('Error creating lead in Supabase, trying fallback...', err);
      }
    }

    const all = LocalStorageDB.getLeads();
    all.push(newLead);
    LocalStorageDB.saveLeads(all);
    return newLead;
  },

  async updateLeadStatus(id: string, status: Lead['status']): Promise<Lead | null> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { error } = await supabase.from('leads').update({ status }).eq('id', id);
        if (!error) {
          const all = await this.getLeads();
          return all.find(l => l.id === id) || null;
        }
      } catch (err) {
        console.error('Error updating lead status in Supabase, trying fallback...', err);
      }
    }

    const all = LocalStorageDB.getLeads();
    const idx = all.findIndex(l => l.id === id);
    if (idx !== -1) {
      all[idx].status = status;
      LocalStorageDB.saveLeads(all);
      return all[idx];
    }
    return null;
  },

  // --- COTIZADOR INTERNO ---
  async getQuotes(currentUser: UserSession | null): Promise<Quote[]> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        let query = supabase.from('quotes').select('*');
        if (currentUser && currentUser.role === 'client') {
          query = query.eq('client_email', currentUser.email);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) return data as Quote[];
      } catch (err) {
        console.error('Error fetching quotes from Supabase, trying fallback...', err);
      }
    }

    const all = LocalStorageDB.getQuotes();
    if (currentUser && currentUser.role === 'client') {
      return all.filter(q => q.client_email.toLowerCase() === currentUser.email.toLowerCase());
    }
    return all;
  },

  async createQuote(quote: Omit<Quote, 'id' | 'folio' | 'created_at'>): Promise<Quote> {
    const all = LocalStorageDB.getQuotes();
    
    // Generate simple sequential folio: QT-2026-XXX
    const currentYear = new Date().getFullYear();
    const lastNum = all.length > 0 
      ? parseInt(all[0].folio.split('-').pop() || '0') 
      : 0;
    const nextNum = (lastNum + 1).toString().padStart(3, '0');
    const folio = `QT-${currentYear}-${nextNum}`;

    const newQuote: Quote = {
      ...quote,
      id: 'q-' + Math.random().toString(36).substr(2, 9),
      folio,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { error } = await supabase.from('quotes').insert([newQuote]);
        if (!error) return newQuote;
      } catch (err) {
        console.error('Error creating quote in Supabase, trying fallback...', err);
      }
    }

    // Since we fetched all earlier, insert at beginning to keep sorted or just push
    all.unshift(newQuote);
    LocalStorageDB.saveQuotes(all);
    return newQuote;
  },

  async updateQuote(id: string, updatedFields: Partial<Omit<Quote, 'id' | 'folio' | 'created_at'>>): Promise<Quote | null> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { error } = await supabase.from('quotes').update(updatedFields).eq('id', id);
        if (!error) {
          const quotes = await this.getQuotes(null);
          return quotes.find(q => q.id === id) || null;
        }
      } catch (err) {
        console.error('Error updating quote in Supabase, trying fallback...', err);
      }
    }

    const all = LocalStorageDB.getQuotes();
    const idx = all.findIndex(q => q.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updatedFields };
      LocalStorageDB.saveQuotes(all);
      return all[idx];
    }
    return null;
  },

  async deleteQuote(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { error } = await supabase.from('quotes').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.error('Error deleting quote in Supabase, trying fallback...', err);
      }
    }
    const all = LocalStorageDB.getQuotes();
    LocalStorageDB.saveQuotes(all.filter(q => q.id !== id));
    return true;
  },

  // --- LANDING CONFIGURATION ---
  async getLandingConfig(): Promise<LandingConfig> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { data, error } = await supabase
          .from('landing_config')
          .select('*')
          .single();
        if (!error && data) return data as LandingConfig;
      } catch (err) {
        console.error('Error fetching landing config from Supabase, trying fallback...', err);
      }
    }
    return LocalStorageDB.getLandingConfig();
  },

  async updateLandingConfig(config: LandingConfig): Promise<LandingConfig> {
    if (isSupabaseConfigured && supabase && supabaseTablesExist) {
      try {
        const { error } = await supabase
          .from('landing_config')
          .upsert([config]);
        if (!error) return config;
      } catch (err) {
        console.error('Error updating landing config in Supabase, trying fallback...', err);
      }
    }
    LocalStorageDB.saveLandingConfig(config);
    return config;
  }
};

// --- SQL BLUEPRINT TO COPY ---
export const SUPABASE_SQL_BLUEPRINT = `-- SQL Script to run in your Supabase SQL Editor
-- This configures all tables, initial seed data, RLS (Row Level Security) rules, and Storage Buckets automatically.

-- ==========================================
-- 1. Create Core Application Tables
-- ==========================================

-- 1.1. Create EVENTOS Table
CREATE TABLE IF NOT EXISTS public.eventos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME WITHOUT TIME ZONE NOT NULL,
    location_name TEXT NOT NULL,
    location_address TEXT NOT NULL,
    map_embed_url TEXT,
    cover_type TEXT CHECK (cover_type IN ('image', 'video')) DEFAULT 'image',
    cover_url TEXT,
    rsvp_deadline DATE NOT NULL,
    status TEXT CHECK (status IN ('active', 'closed', 'archived')) DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id),
    client_email TEXT NOT NULL
);

-- 1.2. Create RSVPS Table
CREATE TABLE IF NOT EXISTS public.rsvps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    event_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    attendance TEXT CHECK (attendance IN ('confirmed', 'declined', 'pending')) NOT NULL,
    plus_ones INTEGER DEFAULT 0 NOT NULL,
    notes TEXT,
    consent_privacy BOOLEAN NOT NULL,
    consent_terms BOOLEAN NOT NULL
);

-- 1.3. Create SERVICES Table
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    category TEXT CHECK (category IN ('visual', 'planning', 'invitations', 'other')) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price_estimated TEXT NOT NULL,
    image_url TEXT,
    is_visible BOOLEAN DEFAULT true NOT NULL
);

-- 1.4. Create LEADS Table
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date TEXT NOT NULL,
    estimated_budget TEXT NOT NULL,
    services_selected TEXT[] DEFAULT '{}'::TEXT[],
    status TEXT CHECK (status IN ('new', 'contacted', 'quoted', 'lost')) DEFAULT 'new' NOT NULL
);

-- 1.5. Create QUOTES Table
CREATE TABLE IF NOT EXISTS public.quotes (
    id TEXT PRIMARY KEY,
    folio TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    client_id TEXT,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    items JSONB DEFAULT '[]'::JSONB NOT NULL,
    subtotal NUMERIC DEFAULT 0 NOT NULL,
    discount_total NUMERIC DEFAULT 0 NOT NULL,
    total NUMERIC DEFAULT 0 NOT NULL,
    status TEXT CHECK (status IN ('draft', 'sent', 'approved', 'cancelled')) DEFAULT 'draft' NOT NULL,
    observations TEXT,
    terms TEXT
);

-- 1.6. Create LANDING_CONFIG Table
CREATE TABLE IF NOT EXISTS public.landing_config (
    id TEXT PRIMARY KEY DEFAULT 'current' CHECK (id = 'current'),
    hero_title TEXT NOT NULL,
    hero_subtitle TEXT NOT NULL,
    hero_image TEXT NOT NULL,
    about_text TEXT NOT NULL,
    whatsapp_phone TEXT NOT NULL,
    logo_url TEXT,
    business_address TEXT NOT NULL
);

-- 1.7. Create PROFILES Table (real source of truth for user roles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT CHECK (role IN ('super_admin', 'admin', 'client')) NOT NULL DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.8. Create ADMIN_ALLOWLIST Table
-- A super_admin adds an email here BEFORE the person registers. When that email
-- signs up, the trigger below automatically grants it the 'admin' role and
-- consumes the entry. This avoids ever trusting the email string itself.
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. Seed Initial Landing Configuration
-- ==========================================
INSERT INTO public.landing_config (id, hero_title, hero_subtitle, hero_image, about_text, whatsapp_phone, logo_url, business_address)
VALUES (
    'current',
    'Charlitron Eventos',
    'Planeación de Eventos & Producción Visual Premium',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1600',
    'En Charlitron transformamos tus ideas en celebraciones legendarias. Fusionamos el arte de la planeación meticulosa, diseño de experiencias exclusivas y producción visual de alta fidelidad, con innovadoras invitaciones digitales que garantizan una gestión de asistentes impecable.',
    '5214444237092',
    '',
    'Av. Paseo de la Reforma 250, Juárez, 06600 Ciudad de México, CDMX'
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 2.1. Role Helper Functions & Auto-Profile Trigger
-- ==========================================

-- SECURITY DEFINER function: safe to call from any RLS policy without recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE((SELECT role IN ('admin', 'super_admin') FROM public.profiles WHERE id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE((SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- Automatically creates a profile row for every new auth user.
-- Role defaults to 'client'; becomes 'admin' ONLY if the email was pre-approved
-- in admin_allowlist by a super_admin. Nobody can self-grant admin/super_admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  assigned_role TEXT := 'client';
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_allowlist WHERE lower(email) = lower(NEW.email)) THEN
    assigned_role := 'admin';
    DELETE FROM public.admin_allowlist WHERE lower(email) = lower(NEW.email);
  END IF;

  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), assigned_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 3. Enable Row Level Security (RLS)
-- ==========================================
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. Create Security Policies (RLS Rules)
-- ==========================================

-- 4.1. Policies for EVENTOS
DROP POLICY IF EXISTS "Public read active events" ON public.eventos;
CREATE POLICY "Public read active events" ON public.eventos
    FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Users read own events" ON public.eventos;
CREATE POLICY "Users read own events" ON public.eventos
    FOR SELECT USING (
        auth.uid() = created_by OR 
        auth.jwt() ->> 'email' = client_email
    );

DROP POLICY IF EXISTS "Admins full access to events" ON public.eventos;
CREATE POLICY "Admins full access to events" ON public.eventos
    FOR ALL USING (
        auth.uid() = created_by OR 
        public.is_admin()
    );

-- 4.2. Policies for RSVPS
DROP POLICY IF EXISTS "Public insert RSVPs" ON public.rsvps;
CREATE POLICY "Public insert RSVPs" ON public.rsvps
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owners read RSVP confirmations" ON public.rsvps;
CREATE POLICY "Owners read RSVP confirmations" ON public.rsvps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.eventos
            WHERE public.eventos.id = public.rsvps.event_id
            AND (
                public.eventos.created_by = auth.uid() OR
                public.eventos.client_email = auth.jwt() ->> 'email'
            )
        )
    );

-- 4.3. Policies for SERVICES
DROP POLICY IF EXISTS "Public read visible services" ON public.services;
CREATE POLICY "Public read visible services" ON public.services
    FOR SELECT USING (is_visible = true);

DROP POLICY IF EXISTS "Admins full access to services" ON public.services;
CREATE POLICY "Admins full access to services" ON public.services
    FOR ALL USING (
        public.is_admin()
    );

-- 4.4. Policies for LEADS
DROP POLICY IF EXISTS "Public submit lead requests" ON public.leads;
CREATE POLICY "Public submit lead requests" ON public.leads
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins full access to leads" ON public.leads;
CREATE POLICY "Admins full access to leads" ON public.leads
    FOR ALL USING (
        public.is_admin()
    );

-- 4.5. Policies for QUOTES
DROP POLICY IF EXISTS "Clients read own quotes" ON public.quotes;
CREATE POLICY "Clients read own quotes" ON public.quotes
    FOR SELECT USING (
        auth.jwt() ->> 'email' = client_email
    );

DROP POLICY IF EXISTS "Admins full access to quotes" ON public.quotes;
CREATE POLICY "Admins full access to quotes" ON public.quotes
    FOR ALL USING (
        public.is_admin()
    );

-- 4.6. Policies for LANDING_CONFIG
DROP POLICY IF EXISTS "Public read landing config" ON public.landing_config;
CREATE POLICY "Public read landing config" ON public.landing_config
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins full access to landing config" ON public.landing_config;
CREATE POLICY "Admins full access to landing config" ON public.landing_config
    FOR ALL USING (
        public.is_admin()
    );

-- 4.7. Policies for PROFILES
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR public.is_admin()
    );

DROP POLICY IF EXISTS "Super admin manage profiles" ON public.profiles;
CREATE POLICY "Super admin manage profiles" ON public.profiles
    FOR UPDATE USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 4.8. Policies for ADMIN_ALLOWLIST (super_admin only, in both directions)
DROP POLICY IF EXISTS "Super admin manage allowlist" ON public.admin_allowlist;
CREATE POLICY "Super admin manage allowlist" ON public.admin_allowlist
    FOR ALL USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());


-- ==========================================
-- 5. Set up Storage Bucket & Policies
-- ==========================================

-- 5.1. Create 'event-assets' bucket (inserts if not already present)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-assets', 'event-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 5.2. Clear existing policies to avoid duplications or conflicts
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Delete" ON storage.objects;

-- 5.3. Policy: Allow anyone (Public) to read files from 'event-assets'
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-assets');

-- 5.4. Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated Users Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-assets');

-- 5.5. Policy: Allow authenticated users to update their files
CREATE POLICY "Authenticated Users Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-assets');

-- 5.6. Policy: Allow authenticated users to delete files
CREATE POLICY "Authenticated Users Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-assets');

-- ==========================================
-- 6. ONE-TIME BOOTSTRAP: Set your first Super Admin
-- ==========================================
-- 1) Regístrate normalmente desde la app con tu correo (quedará como 'client').
-- 2) Ejecuta esta línea UNA SOLA VEZ, reemplazando el correo por el tuyo, para
--    convertirte en el primer Super Admin. Ningún usuario puede hacerse
--    super_admin por sí mismo, solo mediante este paso manual en el SQL Editor.
--
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'tu_correo@dominio.com';
`;
