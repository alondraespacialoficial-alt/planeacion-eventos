/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Sparkles, 
  LogOut, 
  FileCode, 
  Check, 
  Copy, 
  Calendar, 
  Clock, 
  MapPin, 
  Upload, 
  Mail, 
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  Video,
  Settings,
  DollarSign,
  Users,
  FileText,
  RefreshCw,
  FolderOpen,
  CheckSquare,
  Sliders,
  Trash,
  Phone,
  Layers,
  Award,
  MessageCircle,
  Download,
  Filter,
  CreditCard,
  Receipt,
  Eye,
  XCircle,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  UserCog
} from 'lucide-react';
import { Event, UserSession, Service, Lead, Quote, QuoteItem, LandingConfig, PaymentReceipt, UserProfile } from '../types';
import { AppService, isSupabaseConfigured, SUPABASE_SQL_BLUEPRINT } from '../lib/supabase';
import { generateQuotePdf } from '../lib/pdfGenerator';

interface AdminDashboardProps {
  currentUser: UserSession;
  onLogout: () => void;
  onNavigate: (route: string) => void;
}

export default function AdminDashboard({ currentUser, onLogout, onNavigate }: AdminDashboardProps) {
  const isSuperAdmin = currentUser.role === 'super_admin';

  // Tabs State: 'cards' (Events), 'quotes', 'payments', 'leads', 'services', 'config', 'access'
  const [activeTab, setActiveTab] = useState<'cards' | 'quotes' | 'payments' | 'leads' | 'services' | 'config' | 'access'>(
    isSuperAdmin ? 'cards' : 'leads'
  );

  const [loading, setLoading] = useState(true);

  // Core Entity States
  const [events, setEvents] = useState<Event[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [selectedPaymentModal, setSelectedPaymentModal] = useState<PaymentReceipt | null>(null);
  const [adminPaymentNoteInput, setAdminPaymentNoteInput] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [landingConfig, setLandingConfig] = useState<LandingConfig>({
    hero_title: 'Charlitron',
    hero_subtitle: 'Planeador de Eventos & Producción Visual Premium',
    hero_image: '',
    about_text: '',
    whatsapp_phone: '',
    logo_url: '',
    business_address: ''
  });

  // SQL Schema reference viewer
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Access control state (Super Admin only)
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [newAllowlistEmail, setNewAllowlistEmail] = useState('');
  const [accessActionLoading, setAccessActionLoading] = useState(false);

  // 1. =========================================================
  // MODAL / FORM STATE FOR DIGITAL CARDS (EVENTS)
  // =========================================================
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDescription, setEvtDescription] = useState('');
  const [evtDate, setEvtDate] = useState('');
  const [evtTime, setEvtTime] = useState('');
  const [evtLocationName, setEvtLocationName] = useState('');
  const [evtLocationAddress, setEvtLocationAddress] = useState('');
  const [evtMapEmbedUrl, setEvtMapEmbedUrl] = useState('');
  const [evtCoverType, setEvtCoverType] = useState<'image' | 'video'>('image');
  const [evtCoverUrl, setEvtCoverUrl] = useState('');
  const [evtRsvpDeadline, setEvtRsvpDeadline] = useState('');
  const [evtClientEmail, setEvtClientEmail] = useState('');
  const [evtGalleryUrls, setEvtGalleryUrls] = useState<string[]>([]);
  const [evtMusicUrl, setEvtMusicUrl] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeroBg, setUploadingHeroBg] = useState(false);

  const MAX_GALLERY_PHOTOS = 6;

  // 2. =========================================================
  // MODAL / FORM STATE FOR QUOTES (COTIZACIONES)
  // =========================================================
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  const [quoteClientName, setQuoteClientName] = useState('');
  const [quoteClientEmail, setQuoteClientEmail] = useState('');
  const [quoteClientPhone, setQuoteClientPhone] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<Quote['status']>('draft');
  const [quoteObservations, setQuoteObservations] = useState('');
  const [quoteTerms, setQuoteTerms] = useState('');
  
  // Quote Items builder state
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  // Item inputs
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemDiscount, setNewItemDiscount] = useState(0);

  // 3. =========================================================
  // MODAL / FORM STATE FOR SERVICES (ESPECIALIDADES)
  // =========================================================
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [srvTitle, setSrvTitle] = useState('');
  const [srvCategory, setSrvCategory] = useState<Service['category']>('visual');
  const [srvDescription, setSrvDescription] = useState('');
  const [srvPriceEstimated, setSrvPriceEstimated] = useState('');
  const [srvImageUrl, setSrvImageUrl] = useState('');
  const [srvIsVisible, setSrvIsVisible] = useState(true);

  // Elegant Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [leadFilter, setLeadFilter] = useState<string>('all');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // =========================================================
  // INITIAL DATA LIFECYCLE LOAD
  // =========================================================
  useEffect(() => {
    async function loadAllAdminData() {
      setLoading(true);
      try {
        const [loadedEvents, loadedQuotes, loadedLeads, loadedServices, loadedConfig, loadedPayments] = await Promise.all([
          AppService.getEvents(null), // Admin gets all events
          AppService.getQuotes(null), // Admin gets all quotes
          AppService.getLeads(),
          AppService.getServices(),
          AppService.getLandingConfig(),
          AppService.getPaymentReceipts() // Admin gets all client receipts
        ]);

        setEvents(loadedEvents);
        setQuotes(loadedQuotes);
        setLeads(loadedLeads);
        setServices(loadedServices);
        setPayments(loadedPayments || []);
        if (loadedConfig) {
          setLandingConfig(loadedConfig);
        }
      } catch (err) {
        console.error('Error loading admin platform datasets', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllAdminData();
  }, []);

  // Load access-control data (allowlist + user profiles) only for super_admin
  const loadAccessData = async () => {
    if (!isSuperAdmin) return;
    try {
      const [loadedAllowlist, loadedProfiles] = await Promise.all([
        AppService.getAdminAllowlist(),
        AppService.listUserProfiles()
      ]);
      setAllowlist(loadedAllowlist);
      setUserProfiles(loadedProfiles);
    } catch (err) {
      console.error('Error loading access control data', err);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadAccessData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const handleAddAllowlistEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newAllowlistEmail.trim().toLowerCase();
    if (!email) return;
    setAccessActionLoading(true);
    try {
      const { success, error } = await AppService.addToAdminAllowlist(email);
      if (success) {
        showToast('Correo autorizado. Cuando esa persona cree su cuenta, obtendrá el rol de Administrador automáticamente.', 'success');
        setNewAllowlistEmail('');
        await loadAccessData();
      } else {
        showToast(error || 'No se pudo autorizar el correo.', 'error');
      }
    } finally {
      setAccessActionLoading(false);
    }
  };

  const handleRemoveAllowlistEmail = async (email: string) => {
    setAccessActionLoading(true);
    try {
      await AppService.removeFromAdminAllowlist(email);
      showToast('Autorización removida.', 'info');
      await loadAccessData();
    } finally {
      setAccessActionLoading(false);
    }
  };

  const handleChangeUserRole = async (profile: UserProfile, role: 'admin' | 'client') => {
    setAccessActionLoading(true);
    try {
      const { success, error } = await AppService.updateUserRole(profile.id, role);
      if (success) {
        showToast(`${profile.email} ahora tiene el rol de ${role === 'admin' ? 'Administrador' : 'Cliente'}.`, 'success');
        await loadAccessData();
      } else {
        showToast(error || 'No se pudo actualizar el rol.', 'error');
      }
    } finally {
      setAccessActionLoading(false);
    }
  };

  // Handler for Admin Supremo verifying/updating payment receipt status
  const handleUpdatePaymentStatus = async (paymentId: string, status: 'verified' | 'rejected' | 'pending', notes?: string) => {
    try {
      const updated = await AppService.updatePaymentReceiptStatus(paymentId, status, notes);
      if (updated) {
        setPayments(prev => prev.map(p => p.id === paymentId ? updated : p));
      } else {
        setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status, notes: notes || p.notes } : p));
      }

      showToast(
        status === 'verified'
          ? '¡Comprobante VERIFICADO Y RECIBIDO con éxito!'
          : status === 'rejected'
          ? 'Comprobante marcado como Rechazado.'
          : 'Comprobante regresado a estatus Pendiente de revisión.',
        status === 'verified' ? 'success' : 'info'
      );

      if (selectedPaymentModal && selectedPaymentModal.id === paymentId) {
        setSelectedPaymentModal(prev => prev ? { ...prev, status, notes: notes || prev.notes } : null);
      }
    } catch (err) {
      showToast('Error al actualizar el estatus del comprobante de pago.', 'error');
    }
  };

  // =========================================================
  // EVENT CRUD HANDLERS (CARDS)
  // =========================================================
  const handleOpenCreateEvent = () => {
    setEditingEventId(null);
    setEvtTitle('');
    setEvtDescription('');
    setEvtDate('');
    setEvtTime('');
    setEvtLocationName('');
    setEvtLocationAddress('');
    setEvtMapEmbedUrl('');
    setEvtCoverType('image');
    setEvtCoverUrl('');
    setEvtRsvpDeadline('');
    setEvtClientEmail('');
    setEvtGalleryUrls([]);
    setEvtMusicUrl('');
    setUploadedFileName('');
    setIsEventFormOpen(true);
  };

  const handleOpenEditEvent = (evt: Event) => {
    setEditingEventId(evt.id);
    setEvtTitle(evt.title);
    setEvtDescription(evt.description);
    setEvtDate(evt.date);
    setEvtTime(evt.time);
    setEvtLocationName(evt.location_name);
    setEvtLocationAddress(evt.location_address);
    setEvtMapEmbedUrl(evt.map_embed_url || '');
    setEvtCoverType(evt.cover_type);
    setEvtCoverUrl(evt.cover_url);
    setEvtRsvpDeadline(evt.rsvp_deadline);
    setEvtClientEmail(evt.client_email);
    setEvtGalleryUrls(evt.gallery_urls || []);
    setEvtMusicUrl(evt.music_url || '');
    setIsEventFormOpen(true);
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle || !evtDate || !evtTime || !evtLocationName || !evtLocationAddress || !evtClientEmail) {
      showToast('Por favor complete todos los campos obligatorios del evento.', 'error');
      return;
    }

    try {
      const payload = {
        title: evtTitle,
        description: evtDescription,
        date: evtDate,
        time: evtTime,
        location_name: evtLocationName,
        location_address: evtLocationAddress,
        map_embed_url: evtMapEmbedUrl,
        cover_type: evtCoverType,
        cover_url: evtCoverUrl || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200',
        gallery_urls: evtGalleryUrls,
        music_url: evtMusicUrl,
        rsvp_deadline: evtRsvpDeadline,
        status: (editingEventId ? events.find(ev => ev.id === editingEventId)?.status : 'active') || 'active',
        client_email: evtClientEmail.trim().toLowerCase()
      };

      if (editingEventId) {
        const updated = await AppService.updateEvent(editingEventId, payload);
        if (updated) {
          setEvents(prev => prev.map(ev => ev.id === editingEventId ? updated : ev));
          showToast('¡Micrositio de Invitación actualizado con éxito!', 'success');
        }
      } else {
        const created = await AppService.createEvent(payload, currentUser);
        setEvents(prev => [...prev, created]);
        showToast('¡Micrositio de Invitación Digital creado con éxito!', 'success');
      }
      setIsEventFormOpen(false);
    } catch (err) {
      showToast('Error al guardar el evento.', 'error');
    }
  };

  const handleEventStatusChange = async (id: string, nextStatus: Event['status']) => {
    try {
      const updated = await AppService.updateEvent(id, { status: nextStatus });
      if (updated) {
        setEvents(prev => prev.map(ev => ev.id === id ? updated : ev));
        showToast(`Estatus del evento cambiado a: ${nextStatus === 'active' ? 'RSVP Abierto' : 'RSVP Cerrado'}`, 'info');
      }
    } catch (err) {
      showToast('Error al cambiar el estatus del evento.', 'error');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('¿Está totalmente seguro de borrar esta invitación? Se perderán todas las confirmaciones RSVP.')) return;
    try {
      const ok = await AppService.deleteEvent(id);
      if (ok) {
        setEvents(prev => prev.filter(ev => ev.id !== id));
        showToast('Invitación eliminada correctamente.', 'success');
      }
    } catch (err) {
      showToast('Error al eliminar invitación.', 'error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    setUploadedFileName(file.name);
    try {
      const url = await AppService.uploadMedia(file);
      setEvtCoverUrl(url);
      setEvtCoverType(file.type.startsWith('video/') ? 'video' : 'image');
      showToast('Archivo subido con éxito.', 'success');
    } catch (err) {
      showToast('Error al subir archivo.', 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const availableSlots = MAX_GALLERY_PHOTOS - evtGalleryUrls.length;
    if (availableSlots <= 0) {
      showToast(`Ya alcanzaste el máximo de ${MAX_GALLERY_PHOTOS} fotos en la galería.`, 'error');
      e.target.value = '';
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      showToast(`Solo se subirán ${availableSlots} foto(s), el máximo es ${MAX_GALLERY_PHOTOS}.`, 'info');
    }

    setUploadingGallery(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        const url = await AppService.uploadMedia(file);
        uploadedUrls.push(url);
      }
      setEvtGalleryUrls(prev => [...prev, ...uploadedUrls]);
      showToast('Fotos de galería subidas con éxito.', 'success');
    } catch (err) {
      showToast('Error al subir una o más fotos de la galería.', 'error');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setEvtGalleryUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleMusicFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMusic(true);
    try {
      const url = await AppService.uploadMedia(file);
      setEvtMusicUrl(url);
      showToast('Audio de fondo subido con éxito.', 'success');
    } catch (err) {
      showToast('Error al subir el audio.', 'error');
    } finally {
      setUploadingMusic(false);
      e.target.value = '';
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await AppService.uploadMedia(file);
      setLandingConfig(prev => ({ ...prev, logo_url: url }));
      showToast('Logo subido con éxito.', 'success');
    } catch (err) {
      showToast('Error al subir el logo.', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleHeroBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeroBg(true);
    try {
      const url = await AppService.uploadMedia(file);
      setLandingConfig(prev => ({ ...prev, hero_image: url }));
      showToast('Imagen de fondo subida con éxito.', 'success');
    } catch (err) {
      showToast('Error al subir la imagen de fondo.', 'error');
    } finally {
      setUploadingHeroBg(false);
    }
  };

  // =========================================================
  // QUOTE (COTIZACIÓN) CRUD HANDLERS & INTERNAL CALCULATOR
  // =========================================================
  const handleOpenCreateQuote = () => {
    setEditingQuoteId(null);
    setQuoteClientName('');
    setQuoteClientEmail('');
    setQuoteClientPhone('');
    setQuoteStatus('draft');
    setQuoteObservations('Agradecemos su preferencia. Esta cotización tiene validez de 30 días.');
    setQuoteTerms('Forma de pago: 50% de anticipo para reserva de fecha y 50% restante 15 días antes de la ejecución del evento.');
    setQuoteItems([]);
    
    // Clear item fields
    setNewItemDesc('');
    setNewItemPrice(0);
    setNewItemQty(1);
    setNewItemDiscount(0);
    setIsQuoteFormOpen(true);
  };

  const handleOpenEditQuote = (q: Quote) => {
    setEditingQuoteId(q.id);
    setQuoteClientName(q.client_name);
    setQuoteClientEmail(q.client_email);
    setQuoteClientPhone(q.client_phone);
    setQuoteStatus(q.status);
    setQuoteObservations(q.observations || '');
    setQuoteTerms(q.terms || '');
    setQuoteItems([...q.items]);
    setIsQuoteFormOpen(true);
  };

  const handleAddQuoteItem = () => {
    if (!newItemDesc) {
      showToast('Indique la descripción del concepto.', 'error');
      return;
    }
    if (newItemPrice <= 0) {
      showToast('Indique un precio unitario mayor a cero.', 'error');
      return;
    }

    const newItem: QuoteItem = {
      id: 'itm-' + Math.random().toString(36).substr(2, 5),
      description: newItemDesc,
      price: newItemPrice,
      quantity: newItemQty,
      discount: newItemDiscount
    };

    setQuoteItems(prev => [...prev, newItem]);
    
    // reset item inputs
    setNewItemDesc('');
    setNewItemPrice(0);
    setNewItemQty(1);
    setNewItemDiscount(0);
  };

  const handleRemoveQuoteItem = (itemId: string) => {
    setQuoteItems(prev => prev.filter(it => it.id !== itemId));
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteClientName || !quoteClientEmail || quoteItems.length === 0) {
      showToast('Complete los datos del cliente y agregue al menos un servicio cotizado.', 'error');
      return;
    }

    // Perform live sum totals
    const subtotal = quoteItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount_total = quoteItems.reduce((sum, item) => sum + item.discount, 0);
    const total = subtotal - discount_total;

    const payload = {
      client_id: 'cli-' + Math.random().toString(36).substr(2, 5),
      client_name: quoteClientName,
      client_email: quoteClientEmail.trim().toLowerCase(),
      client_phone: quoteClientPhone,
      items: quoteItems,
      subtotal,
      discount_total,
      total,
      status: quoteStatus,
      observations: quoteObservations,
      terms: quoteTerms
    };

    try {
      if (editingQuoteId) {
        const updated = await AppService.updateQuote(editingQuoteId, payload);
        if (updated) {
          setQuotes(prev => prev.map(q => q.id === editingQuoteId ? updated : q));
          showToast('¡Cotización actualizada con éxito!', 'success');
        }
      } else {
        const created = await AppService.createQuote(payload);
        setQuotes(prev => [created, ...prev]);
        showToast('¡Cotización generada y registrada con éxito!', 'success');
      }
      setIsQuoteFormOpen(false);
    } catch (err) {
      showToast('Error al guardar cotización.', 'error');
    }
  };

  // Duplicate quote action
  const handleDuplicateQuote = async (q: Quote) => {
    const confirmCopy = window.confirm(`¿Desea duplicar la cotización con folio ${q.folio}? Se generará un nuevo folio correlativo.`);
    if (!confirmCopy) return;

    try {
      const payload = {
        client_id: q.client_id,
        client_name: `${q.client_name} (Copia)`,
        client_email: q.client_email,
        client_phone: q.client_phone,
        items: q.items.map(it => ({ ...it, id: 'itm-' + Math.random().toString(36).substr(2, 5) })),
        subtotal: q.subtotal,
        discount_total: q.discount_total,
        total: q.total,
        status: 'draft' as const, // resets to draft for safety
        observations: q.observations,
        terms: q.terms
      };

      const created = await AppService.createQuote(payload);
      setQuotes(prev => [created, ...prev]);
      showToast('¡Cotización duplicada con éxito como Borrador!', 'success');
    } catch (err) {
      console.error('Error duplicating quote', err);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    if (!window.confirm('¿Desea eliminar permanentemente esta cotización?')) return;
    try {
      const ok = await AppService.deleteQuote(id);
      if (ok) {
        setQuotes(prev => prev.filter(q => q.id !== id));
        showToast('Cotización eliminada correctamente.', 'success');
      }
    } catch (err) {
      showToast('Error al eliminar la cotización.', 'error');
    }
  };

  // =========================================================
  // LEADS ACTIONS & AUTOMATED PREFILL TO CONVERT TO QUOTE
  // =========================================================
  const handleLeadStatusChange = async (id: string, nextStatus: Lead['status']) => {
    try {
      const updated = await AppService.updateLeadStatus(id, nextStatus);
      if (updated) {
        setLeads(prev => prev.map(l => l.id === id ? updated : l));
        showToast(`Estado del prospecto actualizado a: ${nextStatus}`, 'info');
      }
    } catch (err) {
      showToast('Error al cambiar estado.', 'error');
    }
  };

  const handleConvertLeadToQuote = (lead: Lead) => {
    // We auto-fill the Quote form using lead details and open the builder!
    setEditingQuoteId(null);
    setQuoteClientName(lead.name);
    setQuoteClientEmail(`${lead.name.toLowerCase().replace(/\s+/g, '')}@ejemplo.com`); // Safe fallback
    setQuoteClientPhone(lead.phone);
    setQuoteStatus('draft');
    setQuoteObservations(`Cotización generada a partir del prospecto web de ${lead.event_type} en ${lead.city}. Presupuesto estimado indicado: ${lead.estimated_budget}.`);
    setQuoteTerms('Forma de pago estándar: 50% anticipo, 50% liquidación.');
    
    // Auto populate selected items
    const prefilledItems = lead.services_selected.map((srvName, idx) => ({
      id: 'itm-' + Math.random().toString(36).substr(2, 5),
      description: srvName,
      price: srvName.includes('Audiovisual') || srvName.includes('Video') ? 25000 : 15000, // intelligent mockup pricing
      quantity: 1,
      discount: 0
    }));

    setQuoteItems(prefilledItems);
    
    // Open Quote Tab & Form
    setActiveTab('quotes');
    setIsQuoteFormOpen(true);
    
    // Update Lead state to Contacted/Quoted
    handleLeadStatusChange(lead.id, 'quoted');
  };

  // =========================================================
  // SERVICE CATALOG CRUD HANDLERS (ESPECIALIDADES)
  // =========================================================
  const handleOpenCreateService = () => {
    setEditingServiceId(null);
    setSrvTitle('');
    setSrvCategory('visual');
    setSrvDescription('');
    setSrvPriceEstimated('');
    setSrvImageUrl('');
    setSrvIsVisible(true);
    setIsServiceFormOpen(true);
  };

  const handleOpenEditService = (srv: Service) => {
    setEditingServiceId(srv.id);
    setSrvTitle(srv.title);
    setSrvCategory(srv.category);
    setSrvDescription(srv.description);
    setSrvPriceEstimated(srv.price_estimated);
    setSrvImageUrl(srv.image_url);
    setSrvIsVisible(srv.is_visible);
    setIsServiceFormOpen(true);
  };

  const handleSubmitService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvTitle || !srvPriceEstimated) {
      showToast('Complete los campos obligatorios del servicio.', 'error');
      return;
    }

    try {
      const payload = {
        title: srvTitle,
        category: srvCategory,
        description: srvDescription,
        price_estimated: srvPriceEstimated,
        image_url: srvImageUrl || 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&q=80&w=600',
        is_visible: srvIsVisible
      };

      const result = await AppService.saveService(
        editingServiceId ? { ...payload, id: editingServiceId } : payload
      );

      if (editingServiceId) {
        setServices(prev => prev.map(s => s.id === editingServiceId ? result : s));
        showToast('Servicio actualizado correctamente en el catálogo.', 'success');
      } else {
        setServices(prev => [...prev, result]);
        showToast('Servicio guardado correctamente en catálogo.', 'success');
      }
      setIsServiceFormOpen(false);
    } catch (err) {
      showToast('Error al guardar servicio.', 'error');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este servicio de su catálogo público?')) return;
    try {
      const ok = await AppService.deleteService(id);
      if (ok) {
        setServices(prev => prev.filter(s => s.id !== id));
        showToast('Servicio eliminado correctamente de catálogo.', 'success');
      }
    } catch (err) {
      showToast('Error al eliminar.', 'error');
    }
  };

  // =========================================================
  // LANDING DESIGN CUSTOMIZATION HANDLER
  // =========================================================
  const handleSaveLandingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await AppService.updateLandingConfig(landingConfig);
      showToast('¡Configuración de diseño de Landing Guardada y Publicada con Éxito!', 'success');
    } catch (err) {
      showToast('Error al guardar configuración.', 'error');
    }
  };

  // Copy SQL script to clipboard helper
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_BLUEPRINT);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080a] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="h-10 w-10 border-t-2 border-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-mono tracking-widest text-gray-500 uppercase">Estableciendo conexión segura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080a] text-gray-200 font-sans pb-16 selection:bg-amber-400 selection:text-black">
      
      {/* Dynamic top bar */}
      <nav className="border-b border-gray-800 bg-[#0c0e12]/95 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full border border-amber-500/50 flex items-center justify-center bg-amber-500/10 overflow-hidden shrink-0">
              {landingConfig.logo_url ? (
                <img src={landingConfig.logo_url} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-[9px] tracking-[0.25em] text-amber-500 font-mono uppercase font-bold">PLATAFORMA ADMINISTRADOR</p>
              <h2 className="text-sm font-serif font-semibold text-white tracking-wide">{landingConfig.hero_title || 'Charlitron'} | Panel de Control</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <button
                onClick={() => setShowSqlGuide(!showSqlGuide)}
                className="px-4 py-2 rounded-full border border-amber-500/20 hover:border-amber-500/50 text-[10px] tracking-widest font-mono text-amber-500 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                SQL BLUEPRINT
              </button>
            )}

            <button 
              onClick={onLogout}
              className="p-2 rounded-full border border-gray-800 hover:border-red-500/30 hover:bg-red-500/5 text-gray-400 hover:text-red-400 transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Tab Selectors */}
      <div className="bg-[#0a0c10] border-b border-gray-900 px-6">
        <div className="max-w-7xl mx-auto flex gap-6 text-xs font-mono uppercase tracking-widest font-semibold py-3 overflow-x-auto">
          {isSuperAdmin && (
            <button 
              onClick={() => setActiveTab('cards')}
              className={`pb-1 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'cards' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              Tarjetas Digitales ({events.length})
            </button>
          )}
          <button 
            onClick={() => setActiveTab('quotes')}
            className={`pb-1 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'quotes' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Cotizador Interno ({quotes.length})
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={`pb-1 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'payments' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Comprobantes de Pago {payments.filter(p => p.status === 'pending').length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-bold animate-pulse">
                {payments.filter(p => p.status === 'pending').length} por verificar
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('leads')}
            className={`pb-1 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'leads' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            <Users className="w-3.5 h-3.5" />
            Bandeja Leads ({leads.length})
          </button>
          {isSuperAdmin && (
            <button 
              onClick={() => setActiveTab('services')}
              className={`pb-1 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'services' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Catálogo Servicios ({services.length})
            </button>
          )}
          {isSuperAdmin && (
            <button 
              onClick={() => setActiveTab('config')}
              className={`pb-1 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'config' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Settings className="w-3.5 h-3.5" />
              Personalizar Landing
            </button>
          )}
          {isSuperAdmin && (
            <button 
              onClick={() => setActiveTab('access')}
              className={`pb-1 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'access' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Gestión de Accesos
            </button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-8">
        
        {/* SQL Guide panel */}
        {showSqlGuide && isSuperAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-2xl border border-amber-500/20 bg-[#0e1014] relative"
          >
            <div className="absolute top-4 right-4">
              <button onClick={() => setShowSqlGuide(false)} className="text-gray-500 hover:text-white font-mono text-xs">✕</button>
            </div>
            <h3 className="font-serif text-lg text-amber-400 mb-2 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-amber-400" />
              Blueprint SQL Supabase
            </h3>
            <p className="text-xs text-gray-400 font-light leading-relaxed mb-4">
              Copia y ejecuta este script SQL en la consola de Supabase para activar las tablas y políticas de seguridad requeridas en producción:
            </p>
            <div className="relative">
              <pre className="p-4 bg-black/60 rounded-xl border border-gray-800 text-[10px] font-mono text-gray-300 overflow-x-auto max-h-56 leading-relaxed">
                {SUPABASE_SQL_BLUEPRINT}
              </pre>
              <button
                onClick={handleCopySql}
                className="absolute top-3 right-3 p-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-amber-500/40 text-gray-400 hover:text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
              >
                {sqlCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {sqlCopied ? 'COPIADO' : 'COPIAR'}
              </button>
            </div>
          </motion.div>
        )}

        {/* TAB 1: CARDS MANAGEMENT */}
        {activeTab === 'cards' && isSuperAdmin && (
          <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div>
                <h3 className="font-serif text-2xl text-white">Tarjetas Digitales e Invitaciones</h3>
                <p className="text-xs text-gray-500">Cree micrositios privados con RSVP interactivo asociado a cada cliente.</p>
              </div>
              <button 
                onClick={handleOpenCreateEvent}
                className="px-5 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold tracking-widest flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                NUEVA TARJETA
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(ev => (
                <div key={ev.id} className="rounded-xl border border-gray-800 bg-[#0d0e12] overflow-hidden flex flex-col justify-between">
                  <div className="h-40 w-full relative">
                    <img src={ev.cover_url} alt={ev.title} className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] to-transparent"></div>
                    <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[8px] font-mono tracking-widest border font-semibold ${
                      ev.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {ev.status === 'active' ? 'RSVP ABIERTO' : 'RSVP CERRADO'}
                    </span>
                  </div>

                  <div className="p-5 space-y-4 flex-grow flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-lg text-white font-medium line-clamp-1">{ev.title}</h4>
                      <p className="text-gray-500 font-mono text-[10px] mt-1">Anfitrión: <span className="text-white underline">{ev.client_email}</span></p>
                      
                      <div className="grid grid-cols-2 gap-2 pt-3 text-[10px] font-mono text-gray-400 border-t border-gray-800/60 mt-3">
                        <p>📅 {ev.date}</p>
                        <p>⏰ {ev.time} HRS</p>
                        <p className="col-span-2 truncate">📍 {ev.location_name}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-800/80 flex justify-between items-center text-[10px] font-mono gap-1 flex-wrap">
                      <button 
                        onClick={() => {
                          const link = `${window.location.origin}/#event/${ev.id}`;
                          navigator.clipboard.writeText(link);
                          showToast('¡Enlace de invitación copiado al portapapeles!', 'success');
                        }}
                        className="text-amber-500 hover:underline flex items-center gap-1"
                        title="Copiar enlace directo"
                      >
                        <Copy className="w-3 h-3" /> COPIAR LINK
                      </button>
                      
                      <button 
                        onClick={() => {
                          const link = `${window.location.origin}/#event/${ev.id}`;
                          const msg = `¡Hola! Te compartimos el enlace de acceso rápido y confirmaciones RSVP para el evento *${ev.title}*:\n${link}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                        title="Enviar enlace por WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3" /> ENVIAR WA
                      </button>

                      <button 
                        onClick={() => onNavigate(`event/${ev.id}`)}
                        className="text-gray-400 hover:text-white flex items-center gap-0.5"
                      >
                        VER micrositio <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button 
                        onClick={() => handleEventStatusChange(ev.id, ev.status === 'active' ? 'closed' : 'active')}
                        className="px-2.5 py-1 rounded bg-black/40 border border-gray-800 text-[9px] font-mono text-gray-400 hover:border-amber-500/40 hover:text-amber-500"
                      >
                        {ev.status === 'active' ? 'Cerrar RSVP' : 'Abrir RSVP'}
                      </button>
                      <button onClick={() => handleOpenEditEvent(ev)} className="p-1.5 hover:bg-amber-500/15 text-gray-400 hover:text-amber-500 rounded">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="p-1.5 hover:bg-red-500/15 text-gray-400 hover:text-red-400 rounded">
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: QUOTE SYSTEM CRUD */}
        {activeTab === 'quotes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div>
                <h3 className="font-serif text-2xl text-white">Control de Cotizaciones</h3>
                <p className="text-xs text-gray-500">Genere folios con desgloses, descuentos y estatus para el cliente.</p>
              </div>
              <button 
                onClick={handleOpenCreateQuote}
                className="px-5 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold tracking-widest flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                NUEVA COTIZACIÓN
              </button>
            </div>

            <div className="bg-[#0d0e12] border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/40 border-b border-gray-800 text-[10px] font-mono text-gray-500 uppercase">
                    <th className="py-4 px-6">Folio</th>
                    <th className="py-4 px-6">Cliente</th>
                    <th className="py-4 px-6">Email / Teléfono</th>
                    <th className="py-4 px-6 text-center">Estado</th>
                    <th className="py-4 px-6 text-right">Monto Total</th>
                    <th className="py-4 px-6 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {quotes.map(q => (
                    <tr key={q.id} className="hover:bg-black/20">
                      <td className="py-4 px-6 font-mono font-bold text-amber-500">{q.folio}</td>
                      <td className="py-4 px-6 font-serif font-medium text-white">{q.client_name}</td>
                      <td className="py-4 px-6 text-gray-400 font-mono">
                        <p>{q.client_email}</p>
                        <p className="text-[10px] text-gray-500">{q.client_phone}</p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase border ${
                          q.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          q.status === 'sent' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-gray-500/10 border-gray-800 text-gray-400'
                        }`}>
                          {q.status === 'approved' ? 'Aprobado' : q.status === 'sent' ? 'Enviado' : 'Borrador'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-white text-sm">${q.total.toLocaleString('es-MX')}</td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => generateQuotePdf({
                              folio: q.folio,
                              date: new Date(q.created_at || Date.now()).toLocaleDateString('es-MX'),
                              clientName: q.client_name,
                              clientPhone: q.client_phone || 'N/A',
                              clientEmail: q.client_email,
                              eventType: 'Cotización Charlitron',
                              items: q.items.map(i => ({ description: i.description, price: i.price, quantity: i.quantity, discount: i.discount })),
                              subtotal: q.subtotal,
                              discountTotal: q.discount_total,
                              total: q.total,
                              observations: q.notes,
                              whatsappPhone: landingConfig.whatsapp_phone,
                              businessAddress: landingConfig.business_address
                            })}
                            className="p-1.5 hover:bg-amber-500/10 text-amber-500 rounded"
                            title="Descargar PDF de Cotización"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDuplicateQuote(q)}
                            className="p-1.5 hover:bg-amber-500/10 text-gray-400 hover:text-amber-400 rounded"
                            title="Duplicar Cotización"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleOpenEditQuote(q)}
                            className="p-1.5 hover:bg-amber-500/10 text-gray-400 hover:text-amber-400 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteQuote(q.id)}
                            className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: COMPROBANTES DE PAGO (AUDITORÍA & VERIFICACIÓN ADMIN SUPREMO) */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl text-white flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-amber-500" />
                  Auditoría & Verificación de Comprobantes de Pago
                </h3>
                <p className="text-xs text-gray-400">
                  Gestión centralizada de comprobantes de pago, fichas de depósito y transferencias enviadas por clientes. Marque como <span className="text-emerald-400 font-bold">RECIBIDO / VERIFICADO</span> tras validar con el banco.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const loaded = await AppService.getPaymentReceipts();
                    setPayments(loaded || []);
                    showToast('Comprobantes de pago actualizados', 'info');
                  }}
                  className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-amber-500/40 text-gray-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Recargar comprobantes"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                  Actualizar Lista
                </button>
              </div>
            </div>

            {/* Financial Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-gray-800 bg-[#0d0e12]">
                <span className="text-[10px] font-mono uppercase text-gray-500 block">Total Comprobantes</span>
                <p className="text-2xl font-mono font-bold text-white mt-1">{payments.length}</p>
                <p className="text-[10px] text-gray-500 mt-1">Recibidos en plataforma</p>
              </div>

              <div className={`p-4 rounded-xl border ${payments.filter(p => p.status === 'pending').length > 0 ? 'border-amber-500/40 bg-amber-500/10' : 'border-gray-800 bg-[#0d0e12]'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">⏳ Pendientes de Verificar</span>
                  {payments.filter(p => p.status === 'pending').length > 0 && (
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  )}
                </div>
                <p className="text-2xl font-mono font-bold text-amber-400 mt-1">
                  {payments.filter(p => p.status === 'pending').length}
                </p>
                <p className="text-[10px] text-amber-300/70 mt-1">Requieren acción del Admin Supremo</p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">✓ Verificados & Recibidos</span>
                <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                  ${payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('es-MX')} MXN
                </p>
                <p className="text-[10px] text-emerald-300/70 mt-1">{payments.filter(p => p.status === 'verified').length} pagos confirmados en banco</p>
              </div>

              <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/10">
                <span className="text-[10px] font-mono uppercase text-red-400 font-bold">✕ Rechazados / Incidencias</span>
                <p className="text-2xl font-mono font-bold text-red-400 mt-1">
                  {payments.filter(p => p.status === 'rejected').length}
                </p>
                <p className="text-[10px] text-red-300/70 mt-1">Comprobantes no validados</p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs font-mono text-gray-500 flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Filtrar:</span>
              {[
                { id: 'all', label: `Todos (${payments.length})` },
                { id: 'pending', label: `⏳ Por Verificar (${payments.filter(p => p.status === 'pending').length})` },
                { id: 'verified', label: `✓ Verificados / Recibidos (${payments.filter(p => p.status === 'verified').length})` },
                { id: 'rejected', label: `✕ Rechazados (${payments.filter(p => p.status === 'rejected').length})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPaymentFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono tracking-wider transition-all cursor-pointer ${
                    paymentFilter === f.id
                      ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/10'
                      : 'bg-black/40 border border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Payments Table */}
            <div className="bg-[#0d0e12] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
              {payments.filter(p => paymentFilter === 'all' || p.status === paymentFilter).length === 0 ? (
                <div className="p-12 text-center text-gray-500 font-mono text-xs">
                  No hay comprobantes de pago en esta categoría.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-black/60 border-b border-gray-800 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                        <th className="py-4 px-6">Fecha & Cliente</th>
                        <th className="py-4 px-6">Monto & Concepto</th>
                        <th className="py-4 px-6">Método & Ref.</th>
                        <th className="py-4 px-6 text-center">Estado Auditoría</th>
                        <th className="py-4 px-6 text-center">Ficha / Comprobante</th>
                        <th className="py-4 px-6 text-center">{isSuperAdmin ? 'Acciones (Super Admin)' : 'Estado'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {payments
                        .filter(p => paymentFilter === 'all' || p.status === paymentFilter)
                        .map(p => (
                          <tr key={p.id} className="hover:bg-black/30 transition-colors">
                            <td className="py-4 px-6">
                              <p className="font-mono text-[10px] text-gray-500">
                                {new Date(p.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="font-serif text-sm font-semibold text-white mt-0.5">{p.client_name || 'Cliente'}</p>
                              <p className="text-[10px] font-mono text-amber-500">{p.client_email}</p>
                            </td>

                            <td className="py-4 px-6">
                              <p className="font-mono text-base font-bold text-amber-400">
                                ${p.amount.toLocaleString('es-MX')} MXN
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                  p.payment_type === 'anticipo'
                                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                                    : p.payment_type === 'saldo'
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                    : 'bg-purple-500/10 border border-purple-500/30 text-purple-400'
                                }`}>
                                  {p.payment_type.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic">{p.concept}</p>
                            </td>

                            <td className="py-4 px-6">
                              <p className="font-mono text-gray-300 font-medium uppercase text-xs">
                                {p.payment_method === 'transferencia' ? '🏦 Transferencia SPEI' : p.payment_method === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}
                              </p>
                              <p className="font-mono text-[11px] text-gray-400 mt-0.5">
                                Ref: <span className="text-white font-bold">{p.reference_code || 'S/N'}</span>
                              </p>
                            </td>

                            <td className="py-4 px-6 text-center">
                              {p.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider animate-pulse">
                                  <Clock className="w-3 h-3" />
                                  EN REVISIÓN
                                </span>
                              )}
                              {p.status === 'verified' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                                  <CheckCircle2 className="w-3 h-3" />
                                  RECIBIDO / VERIFICADO
                                </span>
                              )}
                              {p.status === 'rejected' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/40 text-red-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                                  <XCircle className="w-3 h-3" />
                                  RECHAZADO
                                </span>
                              )}

                              {p.notes && (
                                <p className="text-[9px] text-gray-400 italic mt-1 max-w-[150px] mx-auto truncate" title={p.notes}>
                                  Nota: {p.notes}
                                </p>
                              )}
                            </td>

                            <td className="py-4 px-6 text-center">
                              {p.receipt_url ? (
                                <button
                                  onClick={() => {
                                    setSelectedPaymentModal(p);
                                    setAdminPaymentNoteInput(p.notes || '');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-amber-500/50 text-amber-400 text-[10px] font-mono font-bold flex items-center gap-1 mx-auto transition-all cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver Ficha
                                </button>
                              ) : (
                                <span className="text-[10px] font-mono text-gray-600">Sin archivo</span>
                              )}
                            </td>

                            <td className="py-4 px-6">
                              {isSuperAdmin ? (
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                                  {p.status !== 'verified' && (
                                    <button
                                      onClick={() => handleUpdatePaymentStatus(p.id, 'verified')}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black text-emerald-400 font-mono text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer w-full sm:w-auto"
                                      title="Aprobar y marcar como Recibido en banco"
                                    >
                                      ✓ Marcar Recibido
                                    </button>
                                  )}

                                  {p.status !== 'rejected' && (
                                    <button
                                      onClick={() => handleUpdatePaymentStatus(p.id, 'rejected')}
                                      className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-400 font-mono text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer w-full sm:w-auto"
                                      title="Rechazar comprobante"
                                    >
                                      ✕ Rechazar
                                    </button>
                                  )}

                                  {p.status !== 'pending' && (
                                    <button
                                      onClick={() => handleUpdatePaymentStatus(p.id, 'pending')}
                                      className="px-2 py-1 text-gray-500 hover:text-amber-400 font-mono text-[9px] uppercase transition-colors"
                                      title="Regresar a revisión"
                                    >
                                      ⏳ Reinstaurar
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-center text-[9px] font-mono text-gray-600 uppercase tracking-wider">
                                  Solo lectura
                                </p>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: VERIFICACIÓN & INSPECCIÓN DE COMPROBANTE DE PAGO */}
        {selectedPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0d0e12] border border-gray-800 rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 relative shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedPaymentModal(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white font-mono text-sm cursor-pointer"
              >
                ✕
              </button>

              <div className="border-b border-gray-800 pb-4">
                <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold block">
                  AUDITORÍA COMPROBANTE SUPREMO • {selectedPaymentModal.id}
                </span>
                <h3 className="font-serif text-xl text-white font-medium mt-1">
                  Comprobante de {selectedPaymentModal.client_name || selectedPaymentModal.client_email}
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Correo del Cliente: <span className="text-amber-400">{selectedPaymentModal.client_email}</span>
                </p>
              </div>

              {/* Detail fields */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-black/40 p-4 rounded-xl border border-gray-800/60 font-mono text-xs">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase block">Monto Registrado</span>
                  <p className="text-amber-400 font-bold text-base mt-0.5">
                    ${selectedPaymentModal.amount.toLocaleString('es-MX')} MXN
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase block">Tipo de Pago</span>
                  <p className="text-white font-bold capitalize mt-0.5">
                    {selectedPaymentModal.payment_type.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase block">Método de Pago</span>
                  <p className="text-white font-bold capitalize mt-0.5">
                    {selectedPaymentModal.payment_method}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase block">Código / Folio Ref.</span>
                  <p className="text-white font-bold mt-0.5">{selectedPaymentModal.reference_code || 'S/N'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[9px] text-gray-500 uppercase block">Concepto</span>
                  <p className="text-gray-300 italic mt-0.5">{selectedPaymentModal.concept}</p>
                </div>
              </div>

              {/* Receipt Preview */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono text-gray-400 uppercase">
                  Ficha / Captura Adjunta por el Cliente:
                </label>
                {selectedPaymentModal.receipt_url ? (
                  <div className="border border-gray-800 rounded-xl overflow-hidden bg-black/60 p-2 flex flex-col items-center max-h-80">
                    <img
                      src={selectedPaymentModal.receipt_url}
                      alt="Comprobante Adjunto"
                      className="max-h-72 w-auto object-contain rounded"
                      referrerPolicy="no-referrer"
                    />
                    <a
                      href={selectedPaymentModal.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Abrir imagen original en nueva pestaña
                    </a>
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-gray-800 rounded-xl text-center text-gray-500 font-mono text-xs">
                    El cliente no adjuntó archivo de captura para este registro.
                  </div>
                )}
              </div>

              {/* Observation / Notes Input for Admin */}
              <div className="space-y-2 pt-2 border-t border-gray-800">
                <label className="block text-[10px] font-mono text-gray-400 uppercase">
                  Observaciones Internas del Admin Supremo:
                </label>
                <input
                  type="text"
                  value={adminPaymentNoteInput}
                  onChange={(e) => setAdminPaymentNoteInput(e.target.value)}
                  placeholder="Ej. Verificado en banca Santander con número de rastreo SPEI 88421..."
                  className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white font-mono text-xs cursor-pointer"
                >
                  Cerrar
                </button>

                {isSuperAdmin ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdatePaymentStatus(selectedPaymentModal.id, 'rejected', adminPaymentNoteInput);
                        setSelectedPaymentModal(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-400 font-mono text-xs font-bold tracking-wider uppercase cursor-pointer"
                    >
                      ✕ Rechazar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdatePaymentStatus(selectedPaymentModal.id, 'verified', adminPaymentNoteInput);
                        setSelectedPaymentModal(null);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold tracking-wider uppercase shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      ✓ Marcar como Recibido y Verificado
                    </button>
                  </>
                ) : (
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider self-center">
                    Solo el super admin puede aprobar o rechazar pagos.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* TAB 3: LEADS INBOX (EMBUDO DE VENTAS PARA CLIENTES) */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl text-white">Embudo de Ventas & Leads</h3>
                <p className="text-xs text-gray-500">Clasifique y gestione el ciclo de ventas comercial de prospectos y cotizaciones enviadas.</p>
              </div>
            </div>

            {/* Funnel Pipeline Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { id: 'new', label: '1. NUEVOS', count: leads.filter(l => l.status === 'new').length, color: 'text-amber-500 border-amber-500/30 bg-amber-500/5' },
                { id: 'contacted', label: '2. CONTACTADOS', count: leads.filter(l => l.status === 'contacted').length, color: 'text-blue-400 border-blue-500/30 bg-blue-500/5' },
                { id: 'quoted', label: '3. COTIZADOS', count: leads.filter(l => l.status === 'quoted').length, color: 'text-purple-400 border-purple-500/30 bg-purple-500/5' },
                { id: 'confirmed', label: '4. CONFIRMADOS', count: leads.filter(l => l.status === 'confirmed').length, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
                { id: 'lost', label: '5. PERDIDOS', count: leads.filter(l => l.status === 'lost').length, color: 'text-gray-500 border-gray-800 bg-gray-900/40' },
              ].map(stage => (
                <div 
                  key={stage.id} 
                  onClick={() => setLeadFilter(leadFilter === stage.id ? 'all' : stage.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    leadFilter === stage.id ? 'ring-2 ring-amber-500' : ''
                  } ${stage.color}`}
                >
                  <span className="text-[10px] font-mono tracking-widest font-bold block">{stage.label}</span>
                  <p className="text-2xl font-mono font-bold text-white mt-1">{stage.count}</p>
                </div>
              ))}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs font-mono text-gray-500 flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Filtrar:</span>
              {[
                { id: 'all', label: 'Todos los Prospectos' },
                { id: 'new', label: 'Nuevos' },
                { id: 'contacted', label: 'Contactados' },
                { id: 'quoted', label: 'Cotización Enviada' },
                { id: 'confirmed', label: 'Confirmados' },
                { id: 'lost', label: 'Perdidos' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setLeadFilter(f.id)}
                  className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all ${
                    leadFilter === f.id
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-black/40 border border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="bg-[#0d0e12] border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/40 border-b border-gray-800 text-[10px] font-mono text-gray-500 uppercase">
                    <th className="py-4 px-6">Fecha</th>
                    <th className="py-4 px-6">Interesado</th>
                    <th className="py-4 px-6">Evento / Lugar</th>
                    <th className="py-4 px-6">Conceptos Solicitados</th>
                    <th className="py-4 px-6 text-center">Estado Embudo</th>
                    <th className="py-4 px-6 text-center">Acciones Comercial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {leads.filter(l => leadFilter === 'all' || l.status === leadFilter).map(lead => (
                    <tr key={lead.id} className="hover:bg-black/20">
                      <td className="py-4 px-6 text-gray-500 font-mono text-[10px]">
                        {new Date(lead.created_at).toLocaleDateString('es-MX')}
                      </td>
                      <td className="py-4 px-6 font-serif">
                        <p className="font-semibold text-white text-sm">{lead.name}</p>
                        <a 
                          href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(lead.name)},%20te%20contacto%20de%20Charlitron%20Producciones...`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline font-mono text-[10px] mt-0.5 flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3 fill-emerald-400/20" /> {lead.phone}
                        </a>
                      </td>
                      <td className="py-4 px-6 space-y-0.5">
                        <p className="text-white font-medium">{lead.event_type} {lead.guests_count ? `(${lead.guests_count} pax)` : ''}</p>
                        <p className="text-gray-400 text-[10px]">Ciudad: {lead.city}</p>
                        <p className="text-amber-500 text-[9px] font-mono uppercase bg-amber-500/10 px-1.5 py-0.5 rounded w-fit">{lead.estimated_budget}</p>
                      </td>
                      <td className="py-4 px-6 text-gray-400 max-w-xs leading-relaxed">
                        {lead.services_selected.join(', ')}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <select 
                          value={lead.status}
                          onChange={(e) => handleLeadStatusChange(lead.id, e.target.value as any)}
                          className="bg-black/80 border border-gray-700 text-xs text-white rounded p-1.5 font-mono focus:border-amber-500"
                        >
                          <option value="new">1. Nuevo (Sin atender)</option>
                          <option value="contacted">2. Contactado (WhatsApp/Tel)</option>
                          <option value="quoted">3. Cotización Enviada</option>
                          <option value="confirmed">4. Evento Confirmado (Ganado)</option>
                          <option value="lost">5. Cancelado / Perdido</option>
                        </select>
                      </td>
                      <td className="py-4 px-6 text-center space-y-2">
                        <button 
                          onClick={() => handleConvertLeadToQuote(lead)}
                          className="px-3 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500 border border-amber-500/20 text-amber-500 hover:text-black font-mono text-[10px] tracking-wider font-bold uppercase transition-all flex items-center justify-center gap-1 mx-auto"
                          title="Convertir lead en cotización formal"
                        >
                          Cotizar →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SERVICES CATALOG */}
        {activeTab === 'services' && isSuperAdmin && (
          <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div>
                <h3 className="font-serif text-2xl text-white">Catálogo de Especialidades</h3>
                <p className="text-xs text-gray-500">Defina y publique los servicios, banquetes, video 4K y paquetes de su firma.</p>
              </div>
              <button 
                onClick={handleOpenCreateService}
                className="px-5 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold tracking-widest flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                NUEVO SERVICIO
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(srv => (
                <div key={srv.id} className="rounded-xl border border-gray-800 bg-[#0d0e12] overflow-hidden flex flex-col justify-between p-5">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono text-amber-500 uppercase">
                        {srv.category}
                      </span>
                      <span className={`h-2.5 w-2.5 rounded-full ${srv.is_visible ? 'bg-emerald-500' : 'bg-red-500'}`} title={srv.is_visible ? 'Visible en Landing' : 'Oculto'} />
                    </div>

                    <h4 className="font-serif text-lg text-white font-medium">{srv.title}</h4>
                    <p className="text-gray-400 text-xs font-light leading-relaxed line-clamp-3">{srv.description}</p>
                    <p className="text-amber-500 font-mono text-xs font-bold pt-2 border-t border-gray-800/40">Estimado: {srv.price_estimated}</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-900 mt-4">
                    <button onClick={() => handleOpenEditService(srv)} className="p-1.5 hover:bg-amber-500/10 text-gray-400 hover:text-amber-400 rounded">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteService(srv.id)} className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded">
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: WEBSITE SETTINGS */}
        {activeTab === 'config' && isSuperAdmin && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="font-serif text-2xl text-white font-medium">Personalización de Landing Page</h3>
              <p className="text-xs text-gray-500">Controle de manera dinámica las imágenes, textos informativos y teléfono de contacto principal.</p>
            </div>

            <form onSubmit={handleSaveLandingConfig} className="bg-[#0d0e12] border border-gray-800 rounded-xl p-6 md:p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase mb-2">Título de la Marca / Empresa</label>
                  <input 
                    type="text"
                    required
                    value={landingConfig.hero_title}
                    onChange={(e) => setLandingConfig(prev => ({ ...prev, hero_title: e.target.value }))}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase mb-2">WhatsApp de Atención Comercial (Código País sin +)</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ej. 5214444237092"
                    value={landingConfig.whatsapp_phone}
                    onChange={(e) => setLandingConfig(prev => ({ ...prev, whatsapp_phone: e.target.value }))}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-2">Slogan / Subtítulo Principal de Hero</label>
                <input 
                  type="text"
                  required
                  value={landingConfig.hero_subtitle}
                  onChange={(e) => setLandingConfig(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                  className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* BRAND LOGO DESIGN CONFIGURATION */}
              <div className="p-5 rounded-xl border border-gray-800 bg-black/20 space-y-4">
                <h4 className="text-[11px] font-mono font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Logo de la Marca
                </h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-mono text-gray-400 uppercase">URL de Logo de la Marca (Opcional - Imagen con transparencia sugerida)</label>
                    <input 
                      type="text"
                      placeholder="https://ejemplo.com/logo.png"
                      value={landingConfig.logo_url || ''}
                      onChange={(e) => setLandingConfig(prev => ({ ...prev, logo_url: e.target.value }))}
                      className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-gray-500">
                      Puede ingresar un enlace directo o seleccionar un archivo de imagen desde su PC a la derecha para subirlo automáticamente a Supabase Storage.
                    </p>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="border border-dashed border-gray-800 rounded-lg p-4 bg-black/40 text-center relative hover:border-amber-500/50 transition-colors h-28 flex flex-col items-center justify-center cursor-pointer">
                      <input 
                        type="file" 
                        onChange={handleLogoFileChange} 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      />
                      {uploadingLogo ? (
                        <div className="text-center">
                          <RefreshCw className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-2" />
                          <p className="text-amber-500 text-xs font-mono">Subiendo logo a Supabase...</p>
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <Upload className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                          <p className="text-xs text-gray-400 font-medium">Subir Logo desde la PC</p>
                          <p className="text-[9px] text-gray-600 font-mono">Haga clic o arrastre un archivo</p>
                        </div>
                      )}
                    </div>
                    {landingConfig.logo_url && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase font-mono">Vista Previa:</span>
                        <div className="h-6 w-6 rounded bg-gray-900 border border-gray-800 flex items-center justify-center p-0.5 overflow-hidden">
                          <img src={landingConfig.logo_url} alt="Logo Preview" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                        <span className="text-[10px] text-gray-400 truncate flex-1">{landingConfig.logo_url}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* HERO BACKGROUND IMAGE CONFIGURATION */}
              <div className="p-5 rounded-xl border border-gray-800 bg-black/20 space-y-4">
                <h4 className="text-[11px] font-mono font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  Imagen de Fondo Principal (Hero)
                </h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-mono text-gray-400 uppercase">URL de Imagen de Fondo Principal (Hero)</label>
                    <input 
                      type="text"
                      required
                      value={landingConfig.hero_image || ''}
                      onChange={(e) => setLandingConfig(prev => ({ ...prev, hero_image: e.target.value }))}
                      className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-gray-500">
                      Esta imagen aparecerá en el fondo de la sección de bienvenida de la página de inicio.
                    </p>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="border border-dashed border-gray-800 rounded-lg p-4 bg-black/40 text-center relative hover:border-amber-500/50 transition-colors h-28 flex flex-col items-center justify-center cursor-pointer">
                      <input 
                        type="file" 
                        onChange={handleHeroBgFileChange} 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      />
                      {uploadingHeroBg ? (
                        <div className="text-center">
                          <RefreshCw className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-2" />
                          <p className="text-amber-500 text-xs font-mono">Subiendo fondo a Supabase...</p>
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <Upload className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                          <p className="text-xs text-gray-400 font-medium">Subir Fondo desde la PC</p>
                          <p className="text-[9px] text-gray-600 font-mono">Haga clic o arrastre un archivo</p>
                        </div>
                      )}
                    </div>
                    {landingConfig.hero_image && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase font-mono">Vista Previa:</span>
                        <div className="h-6 w-10 rounded bg-gray-900 border border-gray-800 flex items-center justify-center overflow-hidden">
                          <img src={landingConfig.hero_image} alt="Hero Preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <span className="text-[10px] text-gray-400 truncate flex-1">{landingConfig.hero_image}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-2">Sección "Quiénes Somos" / Reseña Corporativa</label>
                <textarea 
                  rows={4}
                  required
                  value={landingConfig.about_text}
                  onChange={(e) => setLandingConfig(prev => ({ ...prev, about_text: e.target.value }))}
                  className="w-full bg-black/40 border border-gray-800 rounded-lg p-4 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-2">Dirección Física / Oficinas</label>
                <input 
                  type="text"
                  required
                  value={landingConfig.business_address}
                  onChange={(e) => setLandingConfig(prev => ({ ...prev, business_address: e.target.value }))}
                  className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-900 flex justify-end">
                <button 
                  type="submit"
                  className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold tracking-widest transition-colors"
                >
                  GUARDAR AJUSTES LANDING
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'access' && isSuperAdmin && (
          <div className="space-y-8 max-w-4xl pb-12">
            <div>
              <h3 className="font-serif text-2xl text-white font-medium">Gestión de Accesos</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
                Los <span className="text-amber-500">clientes</span> crean su propia cuenta libremente desde la pantalla de inicio de sesión (pestaña "Crear cuenta").
                Los <span className="text-amber-500">administradores</span> nunca se auto-asignan el rol por su cuenta: primero autoriza aquí su correo,
                y cuando esa persona se registre con ese mismo correo, obtendrá el rol de Administrador automáticamente. El rol de{' '}
                <span className="text-amber-500">Super Admin</span> solo se otorga manualmente desde la consola SQL de Supabase.
              </p>
            </div>

            {/* Allowlist Manager */}
            <div className="bg-[#0d0e12] border border-gray-800 rounded-xl p-6 space-y-4">
              <h4 className="text-[11px] font-mono font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <UserCog className="w-3.5 h-3.5" />
                Autorizar Nuevos Administradores
              </h4>
              <form onSubmit={handleAddAllowlistEmail} className="flex gap-3">
                <input
                  type="email"
                  required
                  placeholder="correo@equipo.com"
                  value={newAllowlistEmail}
                  onChange={(e) => setNewAllowlistEmail(e.target.value)}
                  className="flex-1 bg-black/40 border border-gray-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={accessActionLoading}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold tracking-widest transition-colors disabled:opacity-50"
                >
                  AUTORIZAR
                </button>
              </form>

              {allowlist.length > 0 ? (
                <div className="space-y-2 pt-2">
                  {allowlist.map((email) => (
                    <div key={email} className="flex items-center justify-between bg-black/30 border border-gray-800 rounded-lg px-4 py-2.5">
                      <span className="text-xs text-gray-300 font-mono">{email}</span>
                      <button
                        onClick={() => handleRemoveAllowlistEmail(email)}
                        disabled={accessActionLoading}
                        className="text-red-400 hover:text-red-300 text-[10px] font-mono uppercase tracking-widest disabled:opacity-50"
                      >
                        Revocar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 italic">No hay correos pendientes de autorización.</p>
              )}
            </div>

            {/* Existing Users & Roles */}
            <div className="bg-[#0d0e12] border border-gray-800 rounded-xl p-6 space-y-4">
              <h4 className="text-[11px] font-mono font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Usuarios Registrados ({userProfiles.length})
              </h4>
              <div className="space-y-2">
                {userProfiles.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between bg-black/30 border border-gray-800 rounded-lg px-4 py-3 gap-4">
                    <div className="min-w-0">
                      <p className="text-xs text-white font-medium truncate">{profile.name || profile.email}</p>
                      <p className="text-[10px] text-gray-500 font-mono truncate">{profile.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest ${
                        profile.role === 'super_admin' ? 'bg-purple-500/15 text-purple-400' :
                        profile.role === 'admin' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-gray-500/15 text-gray-400'
                      }`}>
                        {profile.role === 'super_admin' ? 'Super Admin' : profile.role === 'admin' ? 'Admin' : 'Cliente'}
                      </span>
                      {profile.role !== 'super_admin' && profile.id !== currentUser.id && (
                        profile.role === 'admin' ? (
                          <button
                            onClick={() => handleChangeUserRole(profile, 'client')}
                            disabled={accessActionLoading}
                            className="text-[9px] font-mono uppercase tracking-widest text-gray-400 hover:text-red-400 disabled:opacity-50"
                          >
                            Quitar Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleChangeUserRole(profile, 'admin')}
                            disabled={accessActionLoading}
                            className="text-[9px] font-mono uppercase tracking-widest text-gray-400 hover:text-amber-400 disabled:opacity-50"
                          >
                            Hacer Admin
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
                {userProfiles.length === 0 && (
                  <p className="text-[11px] text-gray-500 italic">Aún no hay usuarios registrados en Supabase.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* =========================================================
          EVENT MODAL OVERLAY
          ========================================================= */}
      {isEventFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-[#0e1014] p-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <h4 className="font-serif text-xl text-amber-500 font-medium">{editingEventId ? 'Modificar Tarjeta' : 'Diseñar Nueva Tarjeta RSVP'}</h4>
              <button onClick={() => setIsEventFormOpen(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitEvent} className="space-y-5 text-xs">
              <div>
                <label className="block font-mono text-gray-400 mb-1">TÍTULO DEL EVENTO *</label>
                <input type="text" required value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="Ej. Boda de Ale & Sebas" />
              </div>
              
              <div>
                <label className="block font-mono text-gray-400 mb-1">RESEÑA BREVE</label>
                <textarea rows={2} value={evtDescription} onChange={(e) => setEvtDescription(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white resize-none" placeholder="Pequeña reseña para tus invitados" />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-gray-400 mb-1">FECHA *</label>
                  <input type="date" required value={evtDate} onChange={(e) => setEvtDate(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" />
                </div>
                <div>
                  <label className="block font-mono text-gray-400 mb-1">HORA *</label>
                  <input type="time" required value={evtTime} onChange={(e) => setEvtTime(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" />
                </div>
                <div>
                  <label className="block font-mono text-gray-400 mb-1">LÍMITE RSVP *</label>
                  <input type="date" required value={evtRsvpDeadline} onChange={(e) => setEvtRsvpDeadline(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" />
                </div>
              </div>

              <div>
                <label className="block font-mono text-gray-400 mb-1">EMAIL ASOCIADO DEL CLIENTE *</label>
                <input type="email" required value={evtClientEmail} onChange={(e) => setEvtClientEmail(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="cliente@ejemplo.com" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-gray-400 mb-1">NOMBRE DEL LUGAR *</label>
                  <input type="text" required value={evtLocationName} onChange={(e) => setEvtLocationName(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="Ej. Club de Banquetes" />
                </div>
                <div>
                  <label className="block font-mono text-gray-400 mb-1">DIRECCIÓN COMPLETA *</label>
                  <input type="text" required value={evtLocationAddress} onChange={(e) => setEvtLocationAddress(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="Av. Juárez 10, Col. Centro" />
                </div>
              </div>

              <div>
                <label className="block font-mono text-gray-400 mb-1">IFRAME SRC DE GOOGLE MAPS (OPCIONAL)</label>
                <input type="text" value={evtMapEmbedUrl} onChange={(e) => setEvtMapEmbedUrl(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="https://www.google.com/maps/embed?pb=..." />
              </div>

              <div>
                <label className="block font-mono text-gray-400 mb-1">URL PORTADA COMPLETA</label>
                <input type="text" value={evtCoverUrl} onChange={(e) => setEvtCoverUrl(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="Enlace directo o suba abajo" />
              </div>

              <div className="border border-dashed border-gray-800 rounded-lg p-4 bg-black/20 text-center relative cursor-pointer">
                <input type="file" onChange={handleFileChange} accept="image/*,video/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                {uploadingMedia ? <p className="text-amber-500">Subiendo {uploadedFileName}...</p> : <p className="text-gray-500">Arrastre o seleccione archivo de portada para almacenar en Supabase Storage</p>}
              </div>

              <div>
                <label className="block font-mono text-gray-400 mb-1">GALERÍA "NUESTRA HISTORIA" ({evtGalleryUrls.length}/{MAX_GALLERY_PHOTOS} FOTOS)</label>
                {evtGalleryUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                    {evtGalleryUrls.map((url, index) => (
                      <div key={index} className="relative aspect-square rounded overflow-hidden border border-gray-800 group">
                        <img src={url} alt={`Foto galería ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(index)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {evtGalleryUrls.length < MAX_GALLERY_PHOTOS && (
                  <div className="border border-dashed border-gray-800 rounded-lg p-4 bg-black/20 text-center relative cursor-pointer">
                    <input type="file" multiple onChange={handleGalleryFileChange} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                    {uploadingGallery ? <p className="text-amber-500">Subiendo fotos...</p> : <p className="text-gray-500">Agregar fotos de los festejados para la sección "Nuestra Historia"</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-mono text-gray-400 mb-1">AUDIO DE FONDO (OPCIONAL)</label>
                <input type="text" value={evtMusicUrl} onChange={(e) => setEvtMusicUrl(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white mb-2" placeholder="Enlace directo .mp3 o suba abajo" />
                <div className="border border-dashed border-gray-800 rounded-lg p-4 bg-black/20 text-center relative cursor-pointer">
                  <input type="file" onChange={handleMusicFileChange} accept="audio/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                  {uploadingMusic ? <p className="text-amber-500">Subiendo audio...</p> : <p className="text-gray-500">Arrastre o seleccione un archivo de audio (mp3) para almacenar en Supabase Storage</p>}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsEventFormOpen(false)} className="px-4 py-2 border border-gray-800 rounded hover:bg-gray-800 text-gray-400">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-black font-mono font-bold rounded">Guardar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* =========================================================
          QUOTE (COTIZACIÓN) MODAL OVERLAY WITH INTERNAL CALCULATOR
          ========================================================= */}
      {isQuoteFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-3xl rounded-2xl border border-gray-800 bg-[#0e1014] p-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <h4 className="font-serif text-xl text-amber-500 font-medium">{editingQuoteId ? 'Modificar Cotización' : 'Nueva Cotización de Autor'}</h4>
              <button onClick={() => setIsQuoteFormOpen(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitQuote} className="space-y-6 text-xs">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-gray-400 mb-1">CLIENTE *</label>
                  <input type="text" required value={quoteClientName} onChange={(e) => setQuoteClientName(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="Ej. Laura Jiménez" />
                </div>
                <div>
                  <label className="block font-mono text-gray-400 mb-1">EMAIL DEL CLIENTE *</label>
                  <input type="email" required value={quoteClientEmail} onChange={(e) => setQuoteClientEmail(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="ejemplo@correo.com" />
                </div>
                <div>
                  <label className="block font-mono text-gray-400 mb-1">TELÉFONO DE CONTACTO</label>
                  <input type="tel" value={quoteClientPhone} onChange={(e) => setQuoteClientPhone(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="5512345678" />
                </div>
              </div>

              <div>
                <label className="block font-mono text-gray-400 mb-1">ESTATUS COTIZACIÓN</label>
                <select value={quoteStatus} onChange={(e) => setQuoteStatus(e.target.value as any)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white cursor-pointer">
                  <option value="draft">Borrador (Oculto al cliente)</option>
                  <option value="sent">Enviado (Disponible para el cliente)</option>
                  <option value="approved">Aprobado / Contratado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              {/* Items Table Builder */}
              <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-gray-800/80">
                <h5 className="font-mono text-amber-500 text-[10px] uppercase font-bold">DESGLOSE DE SERVICIOS EN COTIZACIÓN:</h5>
                
                {quoteItems.length > 0 ? (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-500 text-[9px] uppercase font-mono text-left">
                        <th className="pb-2">Servicio / Concepto</th>
                        <th className="pb-2 text-right">Precio Unit.</th>
                        <th className="pb-2 text-center">Cant.</th>
                        <th className="pb-2 text-right">Descuento</th>
                        <th className="pb-2 text-right">Total</th>
                        <th className="pb-2 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40 font-mono text-[11px]">
                      {quoteItems.map((item, index) => {
                        const totalItem = (item.price * item.quantity) - item.discount;
                        return (
                          <tr key={item.id || index}>
                            <td className="py-2.5 text-white font-medium">{item.description}</td>
                            <td className="py-2.5 text-right">${item.price.toLocaleString()}</td>
                            <td className="py-2.5 text-center">{item.quantity}</td>
                            <td className="py-2.5 text-right text-red-400">-${item.discount.toLocaleString()}</td>
                            <td className="py-2.5 text-right text-white font-bold">${totalItem.toLocaleString()}</td>
                            <td className="py-2.5 text-center">
                              <button type="button" onClick={() => handleRemoveQuoteItem(item.id)} className="text-red-400 hover:text-red-300">✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 italic text-[10px] text-center py-3">No hay servicios agregados todavía.</p>
                )}

                {/* New Item Adding form rows */}
                <div className="pt-3 border-t border-gray-800 grid sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[9px] font-mono text-gray-500 mb-1">CONCEPTO</label>
                    <input type="text" value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-1.5 text-white" placeholder="Ej. Cobertura Drone 4K" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[9px] font-mono text-gray-500 mb-1">PRECIO ($)</label>
                    <input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)} className="w-full bg-black/40 border border-gray-800 rounded p-1.5 text-white" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-mono text-gray-500 mb-1">CANT.</label>
                    <input type="number" value={newItemQty} onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)} className="w-full bg-black/40 border border-gray-800 rounded p-1.5 text-white" />
                  </div>
                  <div className="sm:col-span-2">
                    <button type="button" onClick={handleAddQuoteItem} className="w-full py-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black font-mono font-bold transition-all uppercase">
                      + AGREGAR
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-mono text-gray-400 mb-1">OBSERVACIONES INTERNAS / NOTAS</label>
                <textarea rows={2} value={quoteObservations} onChange={(e) => setQuoteObservations(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white resize-none" placeholder="Observaciones en PDF" />
              </div>

              <div>
                <label className="block font-mono text-gray-400 mb-1">TÉRMINOS COMERCIALES</label>
                <textarea rows={2} value={quoteTerms} onChange={(e) => setQuoteTerms(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white resize-none" placeholder="Términos comerciales" />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsQuoteFormOpen(false)} className="px-4 py-2 border border-gray-800 rounded hover:bg-gray-800 text-gray-400">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-black font-mono font-bold rounded">Guardar Cotización</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* =========================================================
          SERVICE MODAL OVERLAY
          ========================================================= */}
      {isServiceFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl rounded-2xl border border-gray-800 bg-[#0e1014] p-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <h4 className="font-serif text-xl text-amber-500 font-medium">{editingServiceId ? 'Modificar Especialidad' : 'Nueva Especialidad'}</h4>
              <button onClick={() => setIsServiceFormOpen(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitService} className="space-y-5 text-xs">
              <div>
                <label className="block font-mono text-gray-400 mb-1">TÍTULO DEL SERVICIO *</label>
                <input type="text" required value={srvTitle} onChange={(e) => setSrvTitle(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="Ej. Filmación con Drone 4K" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-gray-400 mb-1">CATEGORÍA</label>
                  <select value={srvCategory} onChange={(e: any) => setSrvCategory(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white">
                    <option value="visual">Producción Visual</option>
                    <option value="planning">Planeación de Eventos</option>
                    <option value="invitations">Tarjetas / Invitaciones</option>
                    <option value="other">Otros servicios</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-gray-400 mb-1">PRECIO ESTIMADO *</label>
                  <input type="text" required value={srvPriceEstimated} onChange={(e) => setSrvPriceEstimated(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="Ej. $12,000 MXN o $450/persona" />
                </div>
              </div>

              <div>
                <label className="block font-mono text-gray-400 mb-1">DESCRIPCIÓN COMERCIAL</label>
                <textarea rows={3} value={srvDescription} onChange={(e) => setSrvDescription(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white resize-none" placeholder="Breve párrafo vendedor para cautivar clientes" />
              </div>

              <div>
                <label className="block font-mono text-gray-400 mb-1">URL IMAGEN REFERENCIAL</label>
                <input type="text" value={srvImageUrl} onChange={(e) => setSrvImageUrl(e.target.value)} className="w-full bg-black/40 border border-gray-800 rounded p-2.5 text-white" placeholder="https://images.unsplash.com/..." />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="srv-visible" checked={srvIsVisible} onChange={(e) => setSrvIsVisible(e.target.checked)} className="accent-amber-500" />
                <label htmlFor="srv-visible" className="text-gray-300 select-none">Mostrar públicamente en el catálogo de servicios de la landing</label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsServiceFormOpen(false)} className="px-4 py-2 border border-gray-800 rounded hover:bg-gray-800 text-gray-400">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-black font-mono font-bold rounded">Guardar Servicio</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl backdrop-blur-md max-w-sm ${
              toast.type === 'success' 
                ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-300 shadow-emerald-950/50' 
                : toast.type === 'error'
                ? 'bg-red-950/95 border-red-500/30 text-red-300 shadow-red-950/50'
                : 'bg-amber-950/95 border-amber-500/30 text-amber-300 shadow-amber-950/50'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />}
            {toast.type === 'error' && <Info className="w-5 h-5 shrink-0 text-red-400" />}
            {toast.type === 'info' && <Sparkles className="w-5 h-5 shrink-0 text-amber-400" />}
            
            <div className="flex-1 text-xs font-mono font-medium leading-relaxed">
              {toast.message}
            </div>
            
            <button 
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-white text-xs font-sans transition-colors pl-1"
            >
              ✕
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}
