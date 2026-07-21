/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Event {
  id: string;
  created_at: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location_name: string;
  location_address: string;
  map_embed_url: string;
  cover_type: 'image' | 'video';
  cover_url: string;
  rsvp_deadline: string;
  status: 'active' | 'closed' | 'archived'; // active, closed, archived
  created_by: string; // user id
  client_email: string; // associated client email
}

export interface RSVP {
  id: string;
  created_at: string;
  event_id: string;
  name: string;
  email: string;
  phone: string;
  attendance: 'confirmed' | 'declined' | 'pending';
  plus_ones: number;
  notes: string;
  consent_privacy: boolean;
  consent_terms: boolean;
  pass_code?: string;
  checked_in?: boolean;
  checked_in_at?: string;
}

export interface PaymentReceipt {
  id: string;
  created_at: string;
  event_id?: string;
  client_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  payment_type: 'anticipo' | 'saldo' | 'abono_extra';
  payment_method: 'transferencia' | 'efectivo' | 'tarjeta';
  concept: string;
  reference_code: string;
  receipt_url?: string; // base64 or photo URL
  status: 'pending' | 'verified' | 'rejected';
  notes?: string;
}

export interface VendorItem {
  id: string;
  created_at?: string;
  event_id?: string;
  client_email: string;
  category: string; // 'Florista', 'Fotógrafo & Video', 'Pastel', 'Banquete', 'DJ & Música', 'Decoración', 'Maquillaje', 'Otro'
  vendor_name: string;
  contact_phone: string;
  status: 'contratado' | 'en_proceso' | 'cotizando' | 'pendiente';
  amount_agreed?: number;
  notes?: string;
}

export interface UserSession {
  id: string;
  email: string;
  role: 'admin' | 'client';
  name: string;
}

export interface Service {
  id: string;
  category: 'visual' | 'planning' | 'invitations' | 'other';
  title: string;
  description: string;
  price_estimated: string;
  image_url: string;
  is_visible: boolean;
}

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  city: string;
  event_type: string;
  event_date: string;
  estimated_budget: string;
  services_selected: string[];
  guests_count?: number;
  status: 'new' | 'contacted' | 'quoted' | 'confirmed' | 'lost';
}

export interface GalleryItem {
  id: string;
  category: 'bodas' | 'graduaciones' | 'galas_xv' | 'corporativos';
  title: string;
  location: string;
  cover_url: string;
  cover_type: 'image' | 'video';
  description: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  price: number;
  quantity: number;
  discount: number; // percentage or fixed
}

export interface Quote {
  id: string;
  folio: string;
  created_at: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  items: QuoteItem[];
  subtotal: number;
  discount_total: number;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'cancelled';
  observations: string;
  terms: string;
}

export interface LandingConfig {
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  about_text: string;
  whatsapp_phone: string;
  logo_url: string;
  business_address: string;
}
