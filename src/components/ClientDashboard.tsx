/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LogOut, 
  Sparkles, 
  Calendar, 
  Users, 
  UserCheck, 
  UserMinus, 
  HelpCircle, 
  Download, 
  MessageSquare, 
  Phone, 
  Mail, 
  Search,
  ExternalLink,
  Info,
  FileText,
  DollarSign,
  Printer,
  CheckCircle,
  Clock,
  XCircle,
  FileDown,
  QrCode,
  CreditCard,
  Plus,
  Trash2,
  Edit3,
  Upload,
  ShieldCheck,
  Receipt,
  ClipboardList,
  CheckSquare,
  Camera,
  Ticket,
  Check,
  AlertCircle
} from 'lucide-react';
import { Event, RSVP, UserSession, Quote, PaymentReceipt, VendorItem } from '../types';
import { AppService, isSupabaseConfigured } from '../lib/supabase';

interface ClientDashboardProps {
  currentUser: UserSession;
  onLogout: () => void;
  onNavigate: (route: string) => void;
}

export default function ClientDashboard({ currentUser, onLogout, onNavigate }: ClientDashboardProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'declined' | 'pending'>('all');
  
  // Tab Management
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'rsvps' | 'payments' | 'vendors'>('overview');
  
  // Printable view of selected quote
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // QR Pass Modal
  const [selectedPassRsvp, setSelectedPassRsvp] = useState<RSVP | null>(null);

  // Payment Upload Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payType, setPayType] = useState<'anticipo' | 'saldo' | 'abono_extra'>('anticipo');
  const [payMethod, setPayMethod] = useState<'transferencia' | 'efectivo' | 'tarjeta'>('transferencia');
  const [payRef, setPayRef] = useState('');
  const [payConcept, setPayConcept] = useState('');
  const [payProofUrl, setPayProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  // Vendor Modal State
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorCategory, setVendorCategory] = useState('Florería & Decoración');
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorStatus, setVendorStatus] = useState<'contratado' | 'en_proceso' | 'cotizando' | 'pendiente'>('contratado');
  const [vendorAmount, setVendorAmount] = useState<string>('');
  const [vendorNotes, setVendorNotes] = useState('');

  // Elegant Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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

  useEffect(() => {
    async function loadClientData() {
      setLoading(true);
      try {
        const clientEvents = await AppService.getEvents(currentUser);
        setEvents(clientEvents);
        
        if (clientEvents.length > 0) {
          setSelectedEvent(clientEvents[0]);
        }

        // Load quotes assigned to this client
        const clientQuotes = await AppService.getQuotes(currentUser);
        setQuotes(clientQuotes);

        // Load payment receipts
        const clientPayments = await AppService.getPaymentReceipts(currentUser);
        setPayments(clientPayments);

        // Load vendor items
        const clientVendors = await AppService.getVendors(currentUser.email);
        setVendors(clientVendors);
      } catch (err) {
        console.error('Error loading client dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadClientData();
  }, [currentUser]);

  useEffect(() => {
    async function loadRSVPs() {
      if (!selectedEvent) return;
      try {
        const rsvpData = await AppService.getRSVPsForEvent(selectedEvent.id);
        setRsvps(rsvpData);
      } catch (err) {
        console.error('Error loading RSVPs', err);
      }
    }
    loadRSVPs();
  }, [selectedEvent]);

  // Calculations for RSVPs
  const totalResponses = rsvps.length;
  const confirmedCount = rsvps.filter(r => r.attendance === 'confirmed').length;
  const declinedCount = rsvps.filter(r => r.attendance === 'declined').length;
  const pendingCount = rsvps.filter(r => r.attendance === 'pending').length;
  
  const totalPlusOnes = rsvps
    .filter(r => r.attendance === 'confirmed')
    .reduce((sum, r) => sum + (r.plus_ones || 0), 0);

  const totalGuestsProjected = confirmedCount + totalPlusOnes;

  // Account & Payments Financial Calculations
  const approvedQuoteTotal = quotes
    .filter(q => q.status === 'approved')
    .reduce((sum, q) => sum + q.total, 0) || 39250; // Fallback estimate if no formal quote yet
  
  const totalPaidVerified = payments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaidPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingBalance = Math.max(0, approvedQuoteTotal - totalPaidVerified);
  const paymentProgressPercent = Math.min(100, Math.round((totalPaidVerified / approvedQuoteTotal) * 100));

  // --- HANDLERS FOR PAYMENTS ---
  const handleUploadPaymentProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    try {
      const url = await AppService.uploadMedia(file);
      setPayProofUrl(url);
      showToast('Comprobante cargado correctamente.', 'success');
    } catch (err) {
      showToast('Error al subir el comprobante.', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(payAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return showToast('Ingresa un monto válido.', 'error');
    }
    try {
      const created = await AppService.submitPaymentReceipt({
        event_id: selectedEvent?.id || 'evt-default',
        client_id: currentUser.id || 'client-id',
        client_name: currentUser.name || currentUser.email.split('@')[0],
        client_email: currentUser.email,
        amount: numAmount,
        payment_type: payType,
        payment_method: payMethod,
        reference_code: payRef.trim() || 'SPEI-' + Math.floor(100000 + Math.random() * 900000),
        receipt_url: payProofUrl,
        concept: payConcept.trim() || `Abono (${payType}) registrado por cliente`
      });
      setPayments(prev => [created, ...prev]);
      setShowPaymentModal(false);
      setPayAmount('');
      setPayRef('');
      setPayConcept('');
      setPayProofUrl('');
      showToast('¡Comprobante enviado a verificación con éxito!', 'success');
    } catch (err) {
      showToast('Error al registrar el pago.', 'error');
    }
  };

  // --- HANDLERS FOR VENDORS ---
  const handleOpenAddVendor = () => {
    setEditingVendorId(null);
    setVendorCategory('Florería & Decoración');
    setVendorName('');
    setVendorPhone('');
    setVendorStatus('contratado');
    setVendorAmount('');
    setVendorNotes('');
    setShowVendorModal(true);
  };

  const handleOpenEditVendor = (v: VendorItem) => {
    setEditingVendorId(v.id);
    setVendorCategory(v.category);
    setVendorName(v.vendor_name);
    setVendorPhone(v.contact_phone || '');
    setVendorStatus(v.status);
    setVendorAmount(v.amount_agreed ? v.amount_agreed.toString() : '');
    setVendorNotes(v.notes || '');
    setShowVendorModal(true);
  };

  const handleSubmitVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) return showToast('Ingresa el nombre del proveedor.', 'error');
    try {
      const payload = {
        client_email: currentUser.email,
        category: vendorCategory,
        vendor_name: vendorName.trim(),
        contact_phone: vendorPhone.trim(),
        status: vendorStatus,
        amount_agreed: vendorAmount ? parseFloat(vendorAmount) : undefined,
        notes: vendorNotes.trim()
      };
      if (editingVendorId) {
        const updated = await AppService.updateVendor(editingVendorId, payload);
        if (updated) {
          setVendors(prev => prev.map(item => item.id === editingVendorId ? updated : item));
          showToast('Proveedor actualizado.', 'success');
        }
      } else {
        const created = await AppService.addVendor(payload);
        setVendors(prev => [created, ...prev]);
        showToast('Proveedor registrado en el checklist.', 'success');
      }
      setShowVendorModal(false);
    } catch (err) {
      showToast('Error al guardar proveedor.', 'error');
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este proveedor del checklist?')) return;
    try {
      await AppService.deleteVendor(id);
      setVendors(prev => prev.filter(v => v.id !== id));
      showToast('Proveedor eliminado.', 'info');
    } catch (err) {
      showToast('Error al eliminar proveedor.', 'error');
    }
  };

  const handleToggleCheckIn = async (rsvp: RSVP) => {
    const newStatus = !rsvp.checked_in;
    try {
      const updated = await AppService.checkInRSVP(rsvp.id, newStatus);
      if (updated) {
        setRsvps(prev => prev.map(r => r.id === rsvp.id ? updated : r));
        showToast(newStatus ? `Entrada marcada para ${rsvp.name}` : `Entrada desmarcada para ${rsvp.name}`, 'success');
      }
    } catch (err) {
      showToast('Error al actualizar estatus de entrada.', 'error');
    }
  };

  // Filtered RSVPs for table
  const filteredRsvps = rsvps.filter(rsvp => {
    const matchesSearch = rsvp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          rsvp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rsvp.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' ? true : rsvp.attendance === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Action: Accept/Approve a Quote in client portal
  const handleApproveQuote = async (quoteId: string) => {
    const confirmApprove = window.confirm('¿Está seguro de que desea aprobar esta cotización formalmente?');
    if (!confirmApprove) return;

    try {
      const updated = await AppService.updateQuote(quoteId, { status: 'approved' });
      if (updated) {
        setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'approved' } : q));
        if (selectedQuote?.id === quoteId) {
          setSelectedQuote(prev => prev ? { ...prev, status: 'approved' } : null);
        }
        showToast('Cotización aprobada correctamente. Nuestro equipo comercial se comunicará para el contrato formal.', 'success');
      }
    } catch (err) {
      console.error('Error approving quote', err);
      showToast('Error al aprobar cotización.', 'error');
    }
  };

  // Export Attendees to CSV
  const handleExportCSV = () => {
    if (!selectedEvent || rsvps.length === 0) {
      showToast('No hay asistentes registrados para exportar.', 'error');
      return;
    }

    const headers = [
      'ID',
      'Fecha Registro',
      'Nombre Invitado Principal',
      'Correo Electrónico',
      'Teléfono / WhatsApp',
      'Estado Asistencia',
      'Acompañantes adicionales',
      'Total Lugares (Principal + Acompañantes)',
      'Notas Especiales / Alergias'
    ];

    const rows = rsvps.map(r => [
      r.id,
      new Date(r.created_at).toLocaleString('es-MX'),
      `"${r.name.replace(/"/g, '""')}"`,
      r.email,
      r.phone,
      r.attendance === 'confirmed' ? 'Confirmado' : (r.attendance === 'declined' ? 'Declinado' : 'Pendiente'),
      r.plus_ones,
      r.attendance === 'confirmed' ? 1 + r.plus_ones : 0,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `asistentes_${selectedEvent.title.replace(/\s+/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQuote = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080a] flex items-center justify-center text-white font-sans">
        <div className="text-center">
          <div className="h-10 w-10 border-t-2 border-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-mono tracking-widest text-gray-500 uppercase">Cargando su portal de cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080a] text-gray-200 font-sans pb-16 selection:bg-amber-400 selection:text-black">
      
      {/* Printable Quote Wrapper (hidden on screen, visible only when printing) */}
      {selectedQuote && (
        <div className="hidden print:block p-8 bg-white text-black font-sans min-h-screen">
          <div className="flex justify-between items-start border-b-2 border-amber-500 pb-6 mb-6">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-widest text-amber-600 uppercase">CHARLITRON</h1>
              <p className="text-[10px] tracking-[0.2em] text-gray-500 font-mono uppercase">Planeación de Eventos & Producción Visual</p>
              <p className="text-xs text-gray-600 mt-2">Av. Paseo de la Reforma 250, Juárez, CDMX</p>
              <p className="text-xs text-gray-600">Tel: +52 1 55 1234 5678 | Email: contacto@charlitron.com</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded bg-amber-500/10 text-amber-800 text-xs font-mono font-bold tracking-wider uppercase mb-2">
                COTIZACIÓN OFICIAL
              </span>
              <p className="text-sm font-mono font-bold text-gray-900">FOLIO: {selectedQuote.folio}</p>
              <p className="text-xs text-gray-500">Fecha: {new Date(selectedQuote.created_at).toLocaleDateString('es-MX')}</p>
              <p className="text-xs text-gray-500 uppercase mt-1">Estatus: <strong>{selectedQuote.status}</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-bold text-gray-800 uppercase font-mono tracking-wider mb-2">DATOS DEL CLIENTE</h4>
              <p className="text-sm font-semibold">{selectedQuote.client_name}</p>
              <p className="text-gray-600">Email: {selectedQuote.client_email}</p>
              <p className="text-gray-600">Tel: {selectedQuote.client_phone}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-gray-800 uppercase font-mono tracking-wider mb-1">CONTRATISTA</h4>
                <p className="font-semibold text-gray-900">Charlitron S.A. de C.V.</p>
              </div>
              <p className="text-[10px] text-gray-500 italic">Vigencia: 30 días naturales a partir de la fecha de emisión.</p>
            </div>
          </div>

          <table className="w-full text-xs text-left border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-gray-300 text-gray-700 uppercase font-mono tracking-wider bg-gray-100">
                <th className="py-3 px-4">Concepto / Servicio</th>
                <th className="py-3 px-4 text-right">Precio Unitario</th>
                <th className="py-3 px-4 text-center">Cant.</th>
                <th className="py-3 px-4 text-right">Desc.</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {selectedQuote.items.map((item, idx) => {
                const itemTotal = (item.price * item.quantity) - item.discount;
                return (
                  <tr key={item.id || idx}>
                    <td className="py-3 px-4 font-medium">{item.description}</td>
                    <td className="py-3 px-4 text-right font-mono">${item.price.toLocaleString('es-MX')}</td>
                    <td className="py-3 px-4 text-center font-mono">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono text-red-500">-${item.discount.toLocaleString('es-MX')}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">${itemTotal.toLocaleString('es-MX')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-end mb-8">
            <div className="w-80 text-xs font-mono space-y-2 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-gray-600">
                <span>SUBTOTAL:</span>
                <span>${selectedQuote.subtotal.toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>DESCUENTOS:</span>
                <span>-${selectedQuote.discount_total.toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2 text-sm font-bold text-gray-900">
                <span>TOTAL NETO:</span>
                <span>${selectedQuote.total.toLocaleString('es-MX')} MXN</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-[10px] text-gray-500 border-t pt-6">
            <div>
              <h5 className="font-bold uppercase text-gray-700">Observaciones</h5>
              <p className="leading-relaxed font-light">{selectedQuote.observations || 'N/A'}</p>
            </div>
            <div>
              <h5 className="font-bold uppercase text-gray-700">Términos y Condiciones</h5>
              <p className="leading-relaxed font-light">{selectedQuote.terms || 'N/A'}</p>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-12 text-center text-[10px] uppercase tracking-wider font-semibold">
            <div className="border-t border-gray-400 pt-4">
              <p>Firma de Conformidad Cliente</p>
              <p className="font-mono text-gray-400 font-normal mt-1">{selectedQuote.client_name}</p>
            </div>
            <div className="border-t border-gray-400 pt-4">
              <p>Firma Autorizada Charlitron</p>
              <p className="font-serif italic text-amber-600 mt-1">Director de Planeación</p>
            </div>
          </div>
        </div>
      )}

      {/* Screen View */}
      <div className="print:hidden">
        {/* Top Navigation Bar */}
        <nav className="border-b border-gray-800 bg-[#0c0e12]/95 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full border border-amber-500/50 flex items-center justify-center bg-amber-500/10">
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[9px] tracking-[0.25em] text-amber-500 font-mono uppercase font-bold">PORTAL DE CLIENTES</p>
                <h2 className="text-sm font-serif font-semibold text-white tracking-wide">Charlitron | Experiencias</h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-xs text-white font-medium">{currentUser.name}</p>
                <p className="text-[9px] font-mono text-gray-500">{currentUser.email}</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 rounded-full border border-gray-800 hover:border-red-500/30 hover:bg-red-500/5 text-gray-400 hover:text-red-400 transition-all cursor-pointer"
                title="Cerrar sesión"
                id="btn-client-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </nav>

        {/* Tab Selector bar */}
        <div className="bg-[#0a0c10] border-b border-gray-900 px-6">
          <div className="max-w-7xl mx-auto flex gap-6 text-xs font-mono uppercase tracking-widest font-semibold py-3 overflow-x-auto whitespace-nowrap">
            <button 
              onClick={() => { setActiveTab('overview'); setSelectedQuote(null); }}
              className={`pb-1 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Estatus del Evento
            </button>
            <button 
              onClick={() => { setActiveTab('quotes'); }}
              className={`pb-1 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'quotes' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <FileText className="w-3.5 h-3.5" />
              Mis Cotizaciones ({quotes.length})
            </button>
            <button 
              onClick={() => { setActiveTab('rsvps'); setSelectedQuote(null); }}
              className={`pb-1 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'rsvps' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Pases QR / Invitados ({rsvps.length})
            </button>
            <button 
              onClick={() => { setActiveTab('payments'); setSelectedQuote(null); }}
              className={`pb-1 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'payments' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Estado de Cuenta & Pagos ({payments.length})
            </button>
            <button 
              onClick={() => { setActiveTab('vendors'); setSelectedQuote(null); }}
              className={`pb-1 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'vendors' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Checklist Proveedores ({vendors.length})
            </button>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-6 pt-8">
          
          {/* Welcome Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="font-serif text-3xl text-white font-light">
                ¡Qué gusto verte, <span className="text-amber-500 italic font-medium">{currentUser.name}</span>!
              </h1>
              <p className="text-xs text-gray-500 mt-1 font-light">
                Consulta tus cotizaciones, estatus de planeación y confirma la asistencia de tus invitados desde tu portal.
              </p>
            </div>
            
            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono tracking-widest text-amber-500 uppercase font-semibold">
              Rol: Cliente Premium
            </div>
          </div>

          {/* TAB 1: OVERVIEW / STATUS */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Event card or empty status */}
              {events.length > 0 ? (
                <div className="grid lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 bg-[#0d0e12] border border-gray-800 rounded-2xl p-6 space-y-6">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono text-amber-500 uppercase font-bold tracking-widest">
                          SITIO DE TARJETA ACTIVO
                        </span>
                        <h3 className="font-serif text-2xl text-white mt-2 font-medium">{selectedEvent?.title}</h3>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed font-light">{selectedEvent?.description}</p>
                      </div>
                      
                      <button
                        onClick={() => onNavigate(`event/${selectedEvent?.id}`)}
                        className="px-4 py-2 rounded-lg bg-amber-500 text-black font-mono text-[10px] tracking-widest font-bold flex items-center gap-1.5 hover:bg-amber-400 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        ABRIR INVITACIÓN DIGITAL
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4 border-t border-b border-gray-800/60 py-6 text-xs font-mono">
                      <div>
                        <p className="text-gray-500 uppercase text-[9px] tracking-widest">FECHA DEL EVENTO</p>
                        <p className="text-white font-medium text-sm mt-1">📅 {selectedEvent?.date}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 uppercase text-[9px] tracking-widest">HORARIO REUNIÓN</p>
                        <p className="text-white font-medium text-sm mt-1">⏰ {selectedEvent?.time} HRS</p>
                      </div>
                      <div>
                        <p className="text-gray-500 uppercase text-[9px] tracking-widest">LUGAR / SALÓN</p>
                        <p className="text-white font-medium text-sm mt-1 truncate">📍 {selectedEvent?.location_name}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-mono tracking-widest text-amber-500 uppercase font-bold">ESTATUS DE SERVICIOS ADQUIRIDOS:</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl border border-gray-800">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-xs font-medium text-white">Invitación Digital Premium</span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Entregado / Al Aire</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl border border-gray-800">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                            <span className="text-xs font-medium text-white">Producción de Video & Fotografía Cinematográfica</span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">En Planeación (Equipo asignado)</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl border border-gray-800">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                            <span className="text-xs font-medium text-white">Servicio de Banquetes, Cocina & Meseros</span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Confirmado (Menú seleccionado)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar stats/files block */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#0d0e12] border border-gray-800 rounded-2xl p-6">
                      <h4 className="font-serif text-white font-medium text-lg mb-4">Descargas de Archivos</h4>
                      <p className="text-gray-400 text-xs font-light mb-6">Descarga los documentos relacionados a tu planeación de evento:</p>
                      
                      <div className="space-y-3">
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); showToast('Iniciando descarga de ficha de planeación técnica...', 'info'); }}
                          className="flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-black/20 hover:border-amber-500/30 hover:bg-amber-500/5 text-xs transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-500" />
                            Guía_Logistica_Boda.pdf
                          </span>
                          <FileDown className="w-4 h-4 text-gray-500" />
                        </a>
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); showToast('Descargando croquis de distribución de mesas...', 'info'); }}
                          className="flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-black/20 hover:border-amber-500/30 hover:bg-amber-500/5 text-xs transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-500" />
                            Distribucion_Mesas.pdf
                          </span>
                          <FileDown className="w-4 h-4 text-gray-500" />
                        </a>
                      </div>
                    </div>

                    <div className="bg-[#0d0e12] border border-gray-800 rounded-2xl p-6 space-y-4">
                      <h4 className="font-serif text-white font-medium text-lg">Asistencia Proyectada</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-black/40 border border-gray-800 rounded-xl text-center">
                          <p className="text-gray-500 text-[10px] font-mono uppercase">CONFIRMADOS</p>
                          <p className="text-2xl font-serif font-light text-white mt-1">{confirmedCount}</p>
                        </div>
                        <div className="p-4 bg-black/40 border border-gray-800 rounded-xl text-center">
                          <p className="text-gray-500 text-[10px] font-mono uppercase">LUGARES TOTALES</p>
                          <p className="text-2xl font-serif font-light text-amber-500 mt-1">{totalGuestsProjected}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('rsvps')}
                        className="w-full py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black font-mono text-[10px] font-bold tracking-widest uppercase transition-all"
                      >
                        Ver Detalle de Invitados
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-800 bg-[#0d0e12] p-10 text-center">
                  <Info className="w-10 h-10 text-amber-500/40 mx-auto mb-4 animate-pulse" />
                  <h3 className="font-serif text-xl text-white mb-1">Tu evento está en fase de cotización</h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed mt-2">
                    Aún no se ha dado de alta tu tarjeta digital ni asignado evento formal para esta cuenta. Para revisar los precios propuestos, dirígete a la sección <strong>"Mis Cotizaciones"</strong> en el menú superior para aprobar tus folios.
                  </p>
                  <button 
                    onClick={() => setActiveTab('quotes')}
                    className="mt-6 px-6 py-2.5 rounded-full bg-[#13151a] hover:bg-amber-500 hover:text-black border border-amber-500/30 text-amber-500 font-mono text-[10px] tracking-widest font-bold transition-all"
                  >
                    VER MIS COTIZACIONES
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY QUOTES LIST */}
          {activeTab === 'quotes' && (
            <div className="space-y-8">
              {selectedQuote ? (
                // Selected quote details inside the panel
                <div className="bg-[#0d0e12] border border-gray-800 rounded-2xl p-6 md:p-8 space-y-8 relative">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                    <button 
                      onClick={() => setSelectedQuote(null)}
                      className="text-xs font-mono tracking-widest text-amber-500 hover:text-amber-400 transition-colors uppercase font-bold flex items-center gap-1"
                    >
                      ← Volver al listado
                    </button>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={printQuote}
                        className="p-2.5 rounded-lg border border-gray-800 hover:border-amber-500/30 text-gray-400 hover:text-white font-mono text-[10px] tracking-widest flex items-center gap-1.5 transition-all"
                        title="Imprimir o guardar PDF"
                      >
                        <Printer className="w-4 h-4 text-amber-500" />
                        IMPRIMIR / PDF
                      </button>
                      
                      {selectedQuote.status === 'sent' && (
                        <button 
                          onClick={() => handleApproveQuote(selectedQuote.id)}
                          className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono text-[11px] tracking-widest font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          APROBAR COTIZACIÓN
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Screen Quote Preview */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-start flex-wrap gap-4 bg-black/30 p-5 rounded-xl border border-gray-800/80">
                      <div>
                        <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                          {selectedQuote.status === 'approved' ? '✓ Aprobada' : '⏳ Esperando tu respuesta'}
                        </span>
                        <h4 className="font-serif text-2xl text-white mt-3 font-semibold">Folio: {selectedQuote.folio}</h4>
                        <p className="text-xs text-gray-500 mt-1 font-mono">Emitido el: {new Date(selectedQuote.created_at).toLocaleDateString('es-MX')}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-[10px] font-mono text-gray-500">Monto Total Estimado</p>
                        <p className="text-3xl font-serif text-amber-500 font-bold mt-1">${selectedQuote.total.toLocaleString('es-MX')} MXN</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-1">Con IVA incluido</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-xs font-mono tracking-widest text-gray-400 uppercase font-bold">Conceptos desglosados:</h5>
                      <div className="rounded-xl border border-gray-800/80 overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-black/40 border-b border-gray-800 text-[10px] font-mono tracking-wider text-gray-500 uppercase">
                              <th className="py-3.5 px-5">Descripción de Concepto</th>
                              <th className="py-3.5 px-5 text-right">Precio Unitario</th>
                              <th className="py-3.5 px-5 text-center">Cant.</th>
                              <th className="py-3.5 px-5 text-right">Desc.</th>
                              <th className="py-3.5 px-5 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/40">
                            {selectedQuote.items.map((item, idx) => {
                              const totalRow = (item.price * item.quantity) - item.discount;
                              return (
                                <tr key={item.id || idx} className="hover:bg-gray-800/10 transition-colors">
                                  <td className="py-4 px-5 text-white font-medium">{item.description}</td>
                                  <td className="py-4 px-5 text-right font-mono text-gray-400">${item.price.toLocaleString('es-MX')}</td>
                                  <td className="py-4 px-5 text-center font-mono text-gray-400">{item.quantity}</td>
                                  <td className="py-4 px-5 text-right font-mono text-red-400">-${item.discount.toLocaleString('es-MX')}</td>
                                  <td className="py-4 px-5 text-right font-mono font-bold text-white">${totalRow.toLocaleString('es-MX')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 text-xs leading-relaxed font-light">
                      <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
                        <h5 className="font-serif text-white font-medium mb-2 uppercase tracking-wide text-amber-500 font-mono text-[10px]">Observaciones Generales</h5>
                        <p className="text-gray-400">{selectedQuote.observations}</p>
                      </div>
                      <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
                        <h5 className="font-serif text-white font-medium mb-2 uppercase tracking-wide text-amber-500 font-mono text-[10px]">Términos & Compromisos Comerciales</h5>
                        <p className="text-gray-400">{selectedQuote.terms}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Quotes overview table list
                <div className="bg-[#0d0e12] border border-gray-800 rounded-2xl p-6 space-y-4">
                  <h3 className="font-serif text-xl text-white font-medium">Cotizaciones Emitidas</h3>
                  <p className="text-xs text-gray-500 font-light mb-4">Seleccione una cotización para ver su desglose conceptual detallado, descargar su PDF o dar su aprobación de conformidad.</p>
                  
                  <div className="overflow-x-auto rounded-xl border border-gray-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-black/40 border-b border-gray-800 text-[10px] font-mono tracking-wider text-gray-500 uppercase">
                          <th className="py-4 px-6">Folio de Referencia</th>
                          <th className="py-4 px-6">Fecha Emisión</th>
                          <th className="py-4 px-6">Servicios cotizados</th>
                          <th className="py-4 px-6 text-center">Estado</th>
                          <th className="py-4 px-6 text-right">Monto Total</th>
                          <th className="py-4 px-6 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/40">
                        {quotes.length > 0 ? (
                          quotes.map((q) => (
                            <tr key={q.id} className="hover:bg-[#12141a]/50 transition-colors">
                              <td className="py-4 px-6 font-mono font-bold text-amber-500">{q.folio}</td>
                              <td className="py-4 px-6 text-gray-400 font-mono">{new Date(q.created_at).toLocaleDateString('es-MX')}</td>
                              <td className="py-4 px-6 text-white font-medium truncate max-w-xs">
                                {q.items.map(i => i.description).join(', ')}
                              </td>
                              <td className="py-4 px-6 text-center">
                                {q.status === 'approved' ? (
                                  <span className="inline-flex px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono uppercase tracking-wider">Aprobado</span>
                                ) : q.status === 'sent' ? (
                                  <span className="inline-flex px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-mono uppercase tracking-wider">Enviado</span>
                                ) : q.status === 'draft' ? (
                                  <span className="inline-flex px-2 py-0.5 rounded bg-gray-500/10 border border-gray-500/20 text-gray-400 text-[9px] font-mono uppercase tracking-wider">Borrador</span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-mono uppercase tracking-wider">Cancelado</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right font-mono font-bold text-white text-sm">${q.total.toLocaleString('es-MX')}</td>
                              <td className="py-4 px-6 text-center">
                                <button 
                                  onClick={() => setSelectedQuote(q)}
                                  className="px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black font-mono text-[10px] tracking-widest font-bold transition-all uppercase"
                                >
                                  Ver Detalle
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-gray-500">
                              <Info className="w-8 h-8 text-gray-700 mx-auto mb-2 animate-pulse" />
                              <p className="text-xs">No tiene ninguna cotización formal registrada con este correo electrónico.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RSVP ASSISTANTS LIST */}
          {activeTab === 'rsvps' && selectedEvent && (
            <div className="space-y-8">
              {/* RSVP cards summary panel */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-[#0d0e12] border border-gray-800 p-5 rounded-2xl text-center">
                  <div className="text-gray-500 text-[10px] font-mono tracking-wider uppercase mb-2 flex items-center justify-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    Confirmados
                  </div>
                  <div className="font-serif text-3xl font-light text-white">{confirmedCount}</div>
                  <div className="text-[9px] font-mono text-gray-600 mt-1">Gente que dijo Sí</div>
                </div>

                <div className="bg-[#0d0e12] border border-gray-800 p-5 rounded-2xl text-center">
                  <div className="text-gray-500 text-[10px] font-mono tracking-wider uppercase mb-2 flex items-center justify-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    Acompañantes
                  </div>
                  <div className="font-serif text-3xl font-light text-white">{totalPlusOnes}</div>
                  <div className="text-[9px] font-mono text-gray-600 mt-1">Invitados adicionales</div>
                </div>

                <div className="bg-[#0d0e12] border border-gray-800 p-5 rounded-2xl text-center">
                  <div className="text-gray-500 text-[10px] font-mono tracking-wider uppercase mb-2 flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Total Lugares
                  </div>
                  <div className="font-serif text-3xl font-light text-emerald-400">{totalGuestsProjected}</div>
                  <div className="text-[9px] font-mono text-gray-600 mt-1">Platillos reservados</div>
                </div>

                <div className="bg-[#0d0e12] border border-gray-800 p-5 rounded-2xl text-center">
                  <div className="text-gray-500 text-[10px] font-mono tracking-wider uppercase mb-2 flex items-center justify-center gap-1">
                    <UserMinus className="w-3.5 h-3.5 text-red-500" />
                    Declinados
                  </div>
                  <div className="font-serif text-3xl font-light text-white">{declinedCount}</div>
                  <div className="text-[9px] font-mono text-gray-600 mt-1">No asistirán</div>
                </div>

                <div className="bg-[#0d0e12] border border-gray-800 p-5 rounded-2xl col-span-2 lg:col-span-1 text-center">
                  <div className="text-gray-500 text-[10px] font-mono tracking-wider uppercase mb-2 flex items-center justify-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                    Pendientes
                  </div>
                  <div className="font-serif text-3xl font-light text-white">{pendingCount}</div>
                  <div className="text-[9px] font-mono text-gray-600 mt-1">Por confirmar</div>
                </div>
              </div>

              {/* Guests RSVP detailed table */}
              <div className="bg-[#0d0e12] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-800 bg-black/40 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                  <div>
                    <h3 className="font-serif text-lg text-white">Registro de Asistencia de Invitados</h3>
                    <p className="text-xs text-gray-500 font-light mt-0.5">Filtre y busque respuestas o exporte toda la lista para el control de mesas.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative shrink-0">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-600 pointer-events-none">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar invitado..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#07080a] border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors w-44 sm:w-56"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e: any) => setStatusFilter(e.target.value)}
                      className="bg-[#07080a] border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer shrink-0"
                    >
                      <option value="all">Ver Todos</option>
                      <option value="confirmed">Confirmados</option>
                      <option value="declined">Declinados</option>
                      <option value="pending">Pendientes</option>
                    </select>

                    <button
                      onClick={handleExportCSV}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold tracking-wider transition-colors flex items-center gap-1.5 shrink-0 justify-center cursor-pointer"
                      title="Exportar archivo CSV para Excel"
                    >
                      <Download className="w-4 h-4 text-black" />
                      EXPORTAR LISTA
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] font-mono tracking-wider text-gray-500 uppercase bg-[#0c0e12]/20">
                        <th className="py-4 px-6">Nombre del Invitado</th>
                        <th className="py-4 px-6">Contacto</th>
                        <th className="py-4 px-6 text-center">Estatus</th>
                        <th className="py-4 px-6 text-center">Acompañantes</th>
                        <th className="py-4 px-6 text-center">Lugares</th>
                        <th className="py-4 px-6 text-center">Acceso / Pase QR</th>
                        <th className="py-4 px-6">Notas Especiales / Alergias</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {filteredRsvps.length > 0 ? (
                        filteredRsvps.map((rsvp) => (
                          <tr key={rsvp.id} className="hover:bg-gray-800/10 text-xs transition-colors">
                            <td className="py-4 px-6">
                              <p className="font-serif text-white text-sm font-medium">{rsvp.name}</p>
                              <p className="text-[10px] text-amber-500 font-mono mt-0.5">FOLIO: {rsvp.pass_code || rsvp.id.substr(0, 8)}</p>
                            </td>
                            <td className="py-4 px-6 font-mono text-[11px] space-y-0.5 text-gray-400">
                              <p className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-gray-600 shrink-0" />
                                {rsvp.email}
                              </p>
                              <p className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-600 shrink-0" />
                                {rsvp.phone}
                              </p>
                            </td>
                            <td className="py-4 px-6 text-center">
                              {rsvp.attendance === 'confirmed' ? (
                                <span className="inline-flex px-2 py-1 rounded bg-green-500/10 text-green-400 text-[9px] font-mono uppercase tracking-wider border border-green-500/20">SÍ ASISTE</span>
                              ) : rsvp.attendance === 'declined' ? (
                                <span className="inline-flex px-2 py-1 rounded bg-red-500/10 text-red-400 text-[9px] font-mono uppercase tracking-wider border border-red-500/20">DECLINÓ</span>
                              ) : (
                                <span className="inline-flex px-2 py-1 rounded bg-gray-500/10 text-gray-400 text-[9px] font-mono uppercase tracking-wider border border-gray-500/20">PENDIENTE</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center font-mono font-medium text-gray-300">
                              {rsvp.attendance === 'confirmed' ? rsvp.plus_ones : '-'}
                            </td>
                            <td className="py-4 px-6 text-center font-mono text-sm text-white font-semibold">
                              {rsvp.attendance === 'confirmed' ? 1 + rsvp.plus_ones : 0}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {rsvp.attendance === 'confirmed' ? (
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    onClick={() => setSelectedPassRsvp(rsvp)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Ver Pase Digital con Código QR"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                    VER PASE QR
                                  </button>
                                  
                                  <button
                                    onClick={() => handleToggleCheckIn(rsvp)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                                      rsvp.checked_in 
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                                        : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-white'
                                    }`}
                                  >
                                    {rsvp.checked_in ? '✓ INGRESÓ' : '+ MARCAR ENTRADA'}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-600 text-[10px] italic">Sin pase</span>
                              )}
                            </td>
                            <td className="py-4 px-6 max-w-xs text-gray-400 leading-relaxed font-light">
                              {rsvp.notes ? (
                                <div className="flex gap-2 items-start">
                                  <MessageSquare className="w-3.5 h-3.5 text-amber-500/70 shrink-0 mt-0.5" />
                                  <span className="text-[11px] italic">"{rsvp.notes}"</span>
                                </div>
                              ) : (
                                <span className="text-gray-600 italic text-[11px]">Ninguno</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-500">
                            <Info className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                            <p className="text-xs">No se encontraron confirmaciones de asistencia recibidas.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ESTADO DE CUENTA Y COMPROBANTES DE PAGO */}
          {activeTab === 'payments' && (
            <div className="space-y-8">
              {/* Financial Account Summary Card */}
              <div className="bg-[#0d0e12] border border-gray-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-gray-800">
                  <div>
                    <span className="text-[10px] font-mono tracking-[0.3em] text-amber-500 uppercase font-bold">ESTADO DE CUENTA Y COMPROBANTES</span>
                    <h3 className="font-serif text-2xl text-white font-light mt-1">Control de Anticipos y Saldos Pendientes</h3>
                    <p className="text-xs text-gray-400 font-light mt-1 max-w-xl leading-relaxed">
                      Consulta el desglose oficial de tus abonos registrados, descarga tus comprobantes y sube tus transferencias bancarias para conciliación rápida.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-mono font-bold tracking-wider transition-all duration-300 shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
                    id="btn-upload-payment"
                  >
                    <Upload className="w-4 h-4 text-black" />
                    REGISTRAR NUEVO COMPROBANTE DE PAGO
                  </button>
                </div>

                {/* Progress & Totals Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                  <div className="bg-[#12141a] border border-gray-800/80 p-5 rounded-2xl">
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">PRESUPUESTO TOTAL CONTRATADO</p>
                    <p className="font-serif text-2xl text-white font-semibold">${approvedQuoteTotal.toLocaleString('es-MX')} <span className="text-xs text-gray-500 font-mono font-normal">MXN</span></p>
                    <p className="text-[10px] text-gray-500 mt-2 font-mono">Basado en cotización formal aprobada</p>
                  </div>

                  <div className="bg-[#12141a] border border-emerald-500/20 bg-emerald-500/5 p-5 rounded-2xl">
                    <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1">TOTAL ABONADO VERIFICADO</p>
                    <p className="font-serif text-2xl text-emerald-400 font-semibold">${totalPaidVerified.toLocaleString('es-MX')} <span className="text-xs text-emerald-600 font-mono font-normal">MXN</span></p>
                    {totalPaidPending > 0 && (
                      <p className="text-[10px] text-amber-400 mt-2 font-mono">⏳ ${totalPaidPending.toLocaleString('es-MX')} MXN en revisión</p>
                    )}
                  </div>

                  <div className="bg-[#12141a] border border-amber-500/20 bg-amber-500/5 p-5 rounded-2xl">
                    <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-1">SALDO PENDIENTE POR LIQUIDAR</p>
                    <p className="font-serif text-2xl text-amber-400 font-semibold">${pendingBalance.toLocaleString('es-MX')} <span className="text-xs text-amber-600 font-mono font-normal">MXN</span></p>
                    <p className="text-[10px] text-gray-500 mt-2 font-mono">A liquidar antes de la fecha del evento</p>
                  </div>
                </div>

                {/* Payment Progress Bar */}
                <div className="mt-6 pt-4 border-t border-gray-800/60">
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-gray-400">Progreso de Pago del Evento</span>
                    <span className="text-amber-400 font-bold">{paymentProgressPercent}% Cubierto</span>
                  </div>
                  <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-800">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-1000"
                      style={{ width: `${paymentProgressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Payment Receipts History Table */}
              <div className="bg-[#0d0e12] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-800 bg-black/40 flex justify-between items-center">
                  <div>
                    <h4 className="font-serif text-lg text-white">Historial de Comprobantes de Pago</h4>
                    <p className="text-xs text-gray-500 font-light mt-0.5">Listado detallado de transferencias y depósitos enviados.</p>
                  </div>
                  <span className="text-xs font-mono text-gray-400 bg-gray-800/40 px-3 py-1 rounded-full border border-gray-800">
                    {payments.length} comprobante(s) registrado(s)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] font-mono tracking-wider text-gray-500 uppercase bg-[#0c0e12]/20">
                        <th className="py-4 px-6">Folio / Referencia</th>
                        <th className="py-4 px-6">Fecha Registro</th>
                        <th className="py-4 px-6">Concepto / Tipo</th>
                        <th className="py-4 px-6">Método de Pago</th>
                        <th className="py-4 px-6 text-center">Estatus</th>
                        <th className="py-4 px-6 text-right">Monto</th>
                        <th className="py-4 px-6 text-center">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {payments.length > 0 ? (
                        payments.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-800/10 text-xs transition-colors">
                            <td className="py-4 px-6 font-mono text-amber-400 font-bold">
                              {p.reference_code}
                            </td>
                            <td className="py-4 px-6 text-gray-400 font-mono">
                              {new Date(p.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-4 px-6">
                              <p className="text-white font-medium capitalize">{p.concept}</p>
                              <p className="text-[10px] font-mono text-gray-500 uppercase">{p.payment_type}</p>
                            </td>
                            <td className="py-4 px-6 font-mono text-gray-400 capitalize">
                              💳 {p.payment_method}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {p.status === 'verified' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono uppercase tracking-wider border border-emerald-500/20">
                                  <CheckCircle className="w-3 h-3" /> VERIFICADO
                                </span>
                              ) : p.status === 'rejected' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 text-red-400 text-[9px] font-mono uppercase tracking-wider border border-red-500/20">
                                  <XCircle className="w-3 h-3" /> RECHAZADO
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 text-[9px] font-mono uppercase tracking-wider border border-amber-500/20">
                                  <Clock className="w-3 h-3" /> EN REVISIÓN
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right font-mono font-bold text-sm text-white">
                              ${p.amount.toLocaleString('es-MX')} MXN
                            </td>
                            <td className="py-4 px-6 text-center">
                              {p.receipt_url ? (
                                <a
                                  href={p.receipt_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-400 hover:underline font-mono text-[11px] inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Ver Adjunto
                                </a>
                              ) : (
                                <span className="text-gray-600 font-mono text-[10px]">Sin imagen</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-500">
                            <Receipt className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                            <p className="text-xs">Aún no has registrado comprobantes de pago.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ALINEACIÓN DE PROVEEDORES / CHECKLIST */}
          {activeTab === 'vendors' && (
            <div className="space-y-8">
              <div className="bg-[#0d0e12] border border-gray-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-gray-800">
                  <div>
                    <span className="text-[10px] font-mono tracking-[0.3em] text-amber-500 uppercase font-bold">COORDINACIÓN INTEGRAL</span>
                    <h3 className="font-serif text-2xl text-white font-light mt-1">Alineación de Proveedores del Evento</h3>
                    <p className="text-xs text-gray-400 font-light mt-1 max-w-xl leading-relaxed">
                      Lleva el control centralizado de tus otros proveedores (Florista, Fotógrafo, Repostería, Maquillaje, etc.) para que el equipo de logística de Charlitron garantice una coordinación perfecta el día del evento.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenAddVendor}
                    className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold tracking-wider transition-all duration-300 shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
                    id="btn-add-vendor"
                  >
                    <Plus className="w-4 h-4 text-black" />
                    AGREGAR PROVEEDOR AL CHECKLIST
                  </button>
                </div>

                {/* Vendors Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
                  <div className="bg-[#12141a] border border-gray-800 p-5 rounded-2xl text-center">
                    <p className="text-gray-500 text-[10px] font-mono uppercase">TOTAL REGISTRADOS</p>
                    <p className="font-serif text-2xl text-white mt-1">{vendors.length}</p>
                  </div>

                  <div className="bg-[#12141a] border border-emerald-500/20 p-5 rounded-2xl text-center">
                    <p className="text-emerald-400 text-[10px] font-mono uppercase">CONTRATADOS ✓</p>
                    <p className="font-serif text-2xl text-emerald-400 mt-1">
                      {vendors.filter(v => v.status === 'contratado').length}
                    </p>
                  </div>

                  <div className="bg-[#12141a] border border-amber-500/20 p-5 rounded-2xl text-center">
                    <p className="text-amber-400 text-[10px] font-mono uppercase">EN PROCESO / COTIZANDO</p>
                    <p className="font-serif text-2xl text-amber-400 mt-1">
                      {vendors.filter(v => v.status === 'en_proceso' || v.status === 'cotizando').length}
                    </p>
                  </div>

                  <div className="bg-[#12141a] border border-gray-800 p-5 rounded-2xl text-center">
                    <p className="text-gray-500 text-[10px] font-mono uppercase">INVERSIÓN ESTIMADA</p>
                    <p className="font-serif text-2xl text-white mt-1">
                      ${vendors.reduce((sum, v) => sum + (v.amount || 0), 0).toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vendors List Table */}
              <div className="bg-[#0d0e12] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-800 bg-black/40">
                  <h4 className="font-serif text-lg text-white">Directorio de Proveedores y Coordinación</h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] font-mono tracking-wider text-gray-500 uppercase bg-[#0c0e12]/20">
                        <th className="py-4 px-6">Categoría / Especialidad</th>
                        <th className="py-4 px-6">Nombre del Proveedor</th>
                        <th className="py-4 px-6">Teléfono / Contacto</th>
                        <th className="py-4 px-6 text-center">Estatus</th>
                        <th className="py-4 px-6 text-right">Costo Acordado</th>
                        <th className="py-4 px-6">Notas / Indicaciones</th>
                        <th className="py-4 px-6 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {vendors.length > 0 ? (
                        vendors.map((v) => (
                          <tr key={v.id} className="hover:bg-gray-800/10 text-xs transition-colors">
                            <td className="py-4 px-6 font-mono text-amber-400 font-bold">
                              {v.category}
                            </td>
                            <td className="py-4 px-6 font-serif text-white text-sm font-medium">
                              {v.vendor_name}
                            </td>
                            <td className="py-4 px-6 font-mono text-gray-400">
                              {v.contact_phone ? (
                                <a href={`tel:${v.contact_phone}`} className="hover:text-amber-400 inline-flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-gray-500" /> {v.contact_phone}
                                </a>
                              ) : (
                                <span className="text-gray-600 font-mono">Sin teléfono</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {v.status === 'contratado' ? (
                                <span className="inline-flex px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono uppercase tracking-wider border border-emerald-500/20">CONTRATADO</span>
                              ) : v.status === 'en_proceso' ? (
                                <span className="inline-flex px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 text-[9px] font-mono uppercase tracking-wider border border-amber-500/20">EN PROCESO</span>
                              ) : (
                                <span className="inline-flex px-2.5 py-1 rounded bg-gray-500/10 text-gray-400 text-[9px] font-mono uppercase tracking-wider border border-gray-500/20">COTIZANDO</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right font-mono font-bold text-white">
                              {v.amount_agreed ? `$${v.amount_agreed.toLocaleString('es-MX')}` : '-'}
                            </td>
                            <td className="py-4 px-6 text-gray-400 max-w-xs font-light italic">
                              {v.notes || 'Sin observaciones'}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEditVendor(v)}
                                  className="p-1.5 rounded-lg border border-gray-800 hover:border-amber-500/40 text-gray-400 hover:text-amber-400 transition-colors"
                                  title="Editar Proveedor"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteVendor(v.id)}
                                  className="p-1.5 rounded-lg border border-gray-800 hover:border-red-500/40 text-gray-400 hover:text-red-400 transition-colors"
                                  title="Eliminar Proveedor"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-500">
                            <ClipboardList className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                            <p className="text-xs">No has agregado proveedores a tu checklist de coordinación.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: QR PASS PREVIEW */}
      {selectedPassRsvp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl border-2 border-amber-500/60 bg-[#0b0c10] shadow-2xl relative overflow-hidden text-center p-6 sm:p-8"
          >
            <button 
              onClick={() => setSelectedPassRsvp(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white font-mono text-xs"
            >
              ✕ Cerrar
            </button>

            <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-black py-2.5 px-4 rounded-xl font-mono text-[11px] font-bold tracking-widest uppercase mb-6 flex items-center justify-center gap-2">
              <Ticket className="w-4 h-4" /> PASE DIGITAL CHARLITRON
            </div>

            <h3 className="font-serif text-2xl text-white font-semibold">{selectedPassRsvp.name}</h3>
            <p className="text-xs text-amber-400 font-mono font-bold mt-1 uppercase">
              {1 + selectedPassRsvp.plus_ones} LUGAR(ES) CONFIRMADO(S)
            </p>

            <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center border-4 border-amber-500/40 my-4">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedPassRsvp.pass_code || selectedPassRsvp.id}`} 
                alt="QR Pass" 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-3 bg-black/60 rounded-xl border border-gray-800 font-mono text-center mb-6">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">FOLIO ÚNICO DE INVITADO</p>
              <p className="text-lg text-amber-400 font-bold tracking-widest">{selectedPassRsvp.pass_code || 'PASS-849201'}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-xs font-mono font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> IMPRIMIR PASE
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: UPLOAD PAYMENT RECEIPT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-3xl border border-gray-800 bg-[#0e1014] p-6 sm:p-8 shadow-2xl relative"
          >
            <div className="flex justify-between items-center pb-4 border-b border-gray-800 mb-6">
              <h3 className="font-serif text-xl text-amber-400">Registrar Comprobante de Pago</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-white font-mono text-xs">✕</button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Monto Abonado ($ MXN)*</label>
                <input 
                  type="number"
                  required
                  placeholder="Ej. 10000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-[#14161c] border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Tipo de Pago</label>
                  <select
                    value={payType}
                    onChange={(e: any) => setPayType(e.target.value)}
                    className="w-full bg-[#14161c] border border-gray-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="anticipo">Anticipo (50%)</option>
                    <option value="saldo">Saldo / Liquidación</option>
                    <option value="abono_extra">Abono Parcial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Método de Pago</label>
                  <select
                    value={payMethod}
                    onChange={(e: any) => setPayMethod(e.target.value)}
                    className="w-full bg-[#14161c] border border-gray-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="transferencia">Transferencia SPEI</option>
                    <option value="efectivo">Efectivo / Caja</option>
                    <option value="tarjeta">Tarjeta / Depósito</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Folio o Referencia Bancaria</label>
                <input 
                  type="text"
                  placeholder="Ej. SPEI-984029 o Clave RASTREO"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full bg-[#14161c] border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Adjuntar Imagen de Comprobante / Voucher</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleUploadPaymentProof}
                    className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-mono file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20"
                  />
                  {uploadingProof && <span className="text-xs text-amber-400 font-mono animate-pulse">Subiendo...</span>}
                </div>
                {payProofUrl && (
                  <p className="text-[10px] text-emerald-400 font-mono mt-1">✓ Comprobante cargado correctamente</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Concepto / Comentario</label>
                <input 
                  type="text"
                  placeholder="Ej. Transferencia anticipo para apartar fecha"
                  value={payConcept}
                  onChange={(e) => setPayConcept(e.target.value)}
                  className="w-full bg-[#14161c] border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-800 text-gray-400 text-xs font-mono hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold"
                >
                  ENVIAR REGISTRO DE PAGO
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD / EDIT VENDOR */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-3xl border border-gray-800 bg-[#0e1014] p-6 sm:p-8 shadow-2xl relative"
          >
            <div className="flex justify-between items-center pb-4 border-b border-gray-800 mb-6">
              <h3 className="font-serif text-xl text-amber-400">
                {editingVendorId ? 'Editar Proveedor' : 'Agregar Proveedor al Checklist'}
              </h3>
              <button onClick={() => setShowVendorModal(false)} className="text-gray-500 hover:text-white font-mono text-xs">✕</button>
            </div>

            <form onSubmit={handleSubmitVendor} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Categoría / Servicio</label>
                <select
                  value={vendorCategory}
                  onChange={(e) => setVendorCategory(e.target.value)}
                  className="w-full bg-[#14161c] border border-gray-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Florería & Decoración">Florería & Decoración</option>
                  <option value="Fotografía & Video">Fotografía & Video</option>
                  <option value="Pastel & Repostería">Pastel & Repostería</option>
                  <option value="Catering & Banquete">Catering & Banquete</option>
                  <option value="Música / DJ / Grupo">Música / DJ / Grupo</option>
                  <option value="Maquillaje & Peinado">Maquillaje & Peinado</option>
                  <option value="Vestido / Traje">Vestido / Traje</option>
                  <option value="Otro Proveedor">Otro Proveedor</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Nombre de la Empresa / Proveedor*</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej. Flores & Eventos S.A."
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full bg-[#14161c] border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Teléfono de Contacto</label>
                  <input 
                    type="tel"
                    placeholder="Ej. 5512345678"
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                    className="w-full bg-[#14161c] border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Estatus</label>
                  <select
                    value={vendorStatus}
                    onChange={(e: any) => setVendorStatus(e.target.value)}
                    className="w-full bg-[#14161c] border border-gray-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="contratado">Contratado ✓</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="cotizando">Cotizando</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Costo Acordado ($ MXN Opcional)</label>
                <input 
                  type="number"
                  placeholder="Ej. 15000"
                  value={vendorAmount}
                  onChange={(e) => setVendorAmount(e.target.value)}
                  className="w-full bg-[#14161c] border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Notas / Indicaciones para Coordinación</label>
                <textarea 
                  rows={3}
                  placeholder="Ej. Llega a las 14:00 hrs para montaje de centro de mesa."
                  value={vendorNotes}
                  onChange={(e) => setVendorNotes(e.target.value)}
                  className="w-full bg-[#14161c] border border-gray-800 rounded-xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-800 text-gray-400 text-xs font-mono hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold"
                >
                  GUARDAR PROVEEDOR
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
        </main>
      </div>

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
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />}
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
