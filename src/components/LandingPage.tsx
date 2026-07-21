/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Camera, 
  Video, 
  Tv, 
  MessageCircle, 
  User, 
  ChevronRight, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle,
  FileText,
  Heart,
  Sliders,
  DollarSign,
  Users,
  Award,
  Music,
  Briefcase,
  Download,
  RefreshCw,
  ArrowUp,
  Wine,
  Utensils,
  Filter,
  Maximize2,
  X,
  Plus,
  Minus
} from 'lucide-react';
import { AppService } from '../lib/supabase';
import { LandingConfig, Service } from '../types';
import { generateQuotePdf } from '../lib/pdfGenerator';

const GALLERY_ITEMS: Array<{
  id: string;
  category: 'bodas' | 'graduaciones' | 'galas_xv' | 'corporativos';
  categoryLabel: string;
  title: string;
  location: string;
  cover_url: string;
  cover_type: 'image' | 'video';
  description: string;
}> = [
  {
    id: 'gal-1',
    category: 'bodas',
    categoryLabel: 'Boda de Ensueño',
    title: 'Boda Alejandra & Sebastián',
    location: 'Hacienda de los Morales, CDMX',
    cover_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200',
    cover_type: 'image',
    description: 'Montaje de luces arquitectónicas, video 4K cinematográfico e iluminación DMX personalizada para 250 invitados.'
  },
  {
    id: 'gal-2',
    category: 'graduaciones',
    categoryLabel: 'Gala de Graduación',
    title: 'Gala Medicina 2026',
    location: 'Castillo de Chapultepec, CDMX',
    cover_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200',
    cover_type: 'image',
    description: 'Producción escénica monumental con pantalla LED gigante, pirotecnia fría y cobertura con drones en directo.'
  },
  {
    id: 'gal-3',
    category: 'galas_xv',
    categoryLabel: 'XV Años Temáticos',
    title: 'Mis XV Años - Isabella',
    location: 'Jardín Las Flores, Cuernavaca',
    cover_url: 'https://assets.mixkit.co/videos/preview/mixkit-celebration-sparklers-in-a-party-night-40244-large.mp4',
    cover_type: 'video',
    description: 'Espectáculo de luces robóticas, pista iluminada de cristal y show audiovisual para quinceañera.'
  },
  {
    id: 'gal-4',
    category: 'bodas',
    categoryLabel: 'Boda de Autor',
    title: 'Boda Romántica al Atardecer',
    location: 'Jardín Borda, Cuernavaca',
    cover_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=1200',
    cover_type: 'image',
    description: 'Decoración floral de autor, banquetes gourmet a 4 tiempos y coordinación integral sin contratiempos.'
  },
  {
    id: 'gal-5',
    category: 'corporativos',
    categoryLabel: 'Evento Corporativo',
    title: 'Cumbre de Innovación Anual',
    location: 'Hotel St. Regis, CDMX',
    cover_url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1200',
    cover_type: 'image',
    description: 'Sonorización HD multipunto, transmisión en vivo simultánea e invitaciones digitales con control de asistencia QR.'
  },
  {
    id: 'gal-6',
    category: 'galas_xv',
    categoryLabel: 'Gala & Fiesta',
    title: 'Noche de Gala y Celebración',
    location: 'Salón Real, Polanco',
    cover_url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=1200',
    cover_type: 'image',
    description: 'Catering gourmet, cabina de fotos interactiva 360 y diseño ambiental con iluminación neón cálida.'
  }
];

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [config, setConfig] = useState<LandingConfig>({
    hero_title: 'Charlitron',
    hero_subtitle: 'Planeador de Eventos & Producción Visual Premium',
    hero_image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1600',
    about_text: 'En Charlitron transformamos tus ideas en celebraciones legendarias. Fusionamos el arte de la planeación meticulosa, diseño de experiencias exclusivas y producción visual de alta fidelidad, con innovadoras invitaciones digitales que garantizan una gestión de asistentes impecable.',
    whatsapp_phone: '5214444237092',
    logo_url: '',
    business_address: 'Av. Paseo de la Reforma 250, Juárez, 06600 Ciudad de México, CDMX'
  });

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Hidden admin click backdoor (5 clicks on logo)
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        localStorage.setItem('showSecretDoor', 'true');
        onNavigate('login');
        return 0;
      }
      return next;
    });
  };

  // Form State for Public Quote Form
  const [quoteForm, setQuoteForm] = useState({
    name: '',
    phone: '',
    city: '',
    event_type: 'Boda',
    event_date: '',
    estimated_budget: '$100k - $200k MXN',
    selected_services: [] as string[],
    consent: false
  });

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [guestsCount, setGuestsCount] = useState<number>(100);
  const [galleryFilter, setGalleryFilter] = useState<string>('todos');
  const [activeModalMedia, setActiveModalMedia] = useState<{ url: string; type: 'image' | 'video'; title: string } | null>(null);
  const [lastSubmittedFolio, setLastSubmittedFolio] = useState<string>('COT-2026-001');

  // Interactive Estimator Calculations
  const calculatedCatering = guestsCount * 380;
  const calculatedBottles = Math.ceil(guestsCount / 4);
  const calculatedWaiters = Math.ceil(guestsCount / 15);
  const calculatedTables = Math.ceil(guestsCount / 10);
  const selectedServicesCount = quoteForm.selected_services.length || 1;
  const estimatedTotalMin = (guestsCount * 420) + (selectedServicesCount * 4500);
  const estimatedTotalMax = (guestsCount * 620) + (selectedServicesCount * 8500);

  useEffect(() => {
    async function loadData() {
      try {
        const loadedConfig = await AppService.getLandingConfig();
        if (loadedConfig) {
          setConfig(loadedConfig);
        }
        const loadedServices = await AppService.getServices();
        setServices(loadedServices.filter(s => s.is_visible));
      } catch (err) {
        console.error('Error loading landing page data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleServiceSelect = (serviceTitle: string) => {
    setQuoteForm(prev => {
      const alreadySelected = prev.selected_services.includes(serviceTitle);
      return {
        ...prev,
        selected_services: alreadySelected
          ? prev.selected_services.filter(s => s !== serviceTitle)
          : [...prev.selected_services, serviceTitle]
      };
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.name || !quoteForm.phone || !quoteForm.city || !quoteForm.consent) {
      alert('Por favor complete todos los campos obligatorios y acepte las políticas.');
      return;
    }

    const folioNum = `COT-2026-${Math.floor(100 + Math.random() * 900)}`;
    setLastSubmittedFolio(folioNum);

    try {
      // 1. Save Lead to database so it shows up in Admin Panel
      await AppService.createLead({
        name: quoteForm.name,
        phone: quoteForm.phone,
        city: quoteForm.city,
        event_type: quoteForm.event_type,
        event_date: quoteForm.event_date || 'Sin fecha fija',
        estimated_budget: `$${estimatedTotalMin.toLocaleString('es-MX')} - $${estimatedTotalMax.toLocaleString('es-MX')} MXN`,
        services_selected: quoteForm.selected_services.length > 0 ? quoteForm.selected_services : ['Información General'],
        guests_count: guestsCount
      });

      // 2. Build structured WhatsApp message
      const servicesStr = quoteForm.selected_services.length > 0 
        ? quoteForm.selected_services.join(', ') 
        : 'Información general de servicios';
      const formattedMessage = `¡Hola Charlitron! Me gustaría cotizar mi evento (Folio: ${folioNum}):
• *Nombre:* ${quoteForm.name}
• *Teléfono:* ${quoteForm.phone}
• *Ciudad:* ${quoteForm.city}
• *Tipo de Evento:* ${quoteForm.event_type}
• *Invitados Estimados:* ${guestsCount} personas
• *Fecha:* ${quoteForm.event_date || 'Por definir'}
• *Presupuesto Estimado:* $${estimatedTotalMin.toLocaleString('es-MX')} - $${estimatedTotalMax.toLocaleString('es-MX')} MXN
• *Servicios Solicitados:* ${servicesStr}`;

      const waUrl = `https://wa.me/${config.whatsapp_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(formattedMessage)}`;
      
      setFormSubmitted(true);
      
      // Open WhatsApp
      setTimeout(() => {
        window.open(waUrl, '_blank');
      }, 1000);

    } catch (err) {
      console.error('Error submitting public quote lead', err);
    }
  };

  const handleDownloadPdf = () => {
    const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const items = quoteForm.selected_services.map(srv => ({
      description: srv,
      quantity: 1,
      price: Math.round(estimatedTotalMin / (quoteForm.selected_services.length || 1))
    }));

    items.push({
      description: `Servicio de Banquete & Cristalería (${guestsCount} invitados)`,
      quantity: guestsCount,
      price: 380
    });

    const subtotal = items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    generateQuotePdf({
      folio: lastSubmittedFolio,
      date: today,
      clientName: quoteForm.name || 'Cliente Charlitron',
      clientPhone: quoteForm.phone || 'N/A',
      city: quoteForm.city || 'CDMX',
      eventType: quoteForm.event_type || 'Evento Especial',
      eventDate: quoteForm.event_date || 'Por confirmar',
      guestsCount: guestsCount,
      items: items,
      subtotal: subtotal,
      discountTotal: 0,
      total: subtotal,
      observations: `Presupuesto estimado generado para ${guestsCount} asistentes con servicios: ${quoteForm.selected_services.join(', ')}.`,
      terms: 'Cotización válida por 15 días hábiles. Para reservar la fecha se requiere el 50% de anticipo.',
      whatsappPhone: config.whatsapp_phone,
      businessAddress: config.business_address
    });
  };

  const handleResetQuote = () => {
    setFormSubmitted(false);
    setQuoteForm({
      name: '',
      phone: '',
      city: '',
      event_type: 'Boda',
      event_date: '',
      estimated_budget: '$100k - $200k MXN',
      selected_services: [],
      consent: false
    });
    setGuestsCount(100);
    const elem = document.getElementById('cotizar-section');
    if (elem) elem.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categories = [
    {
      id: 'visual',
      title: 'Producción Visual',
      description: 'Video cinematográfico 4K, fotografía artística, cobertura aérea con drones, video mapping y pantallas LED escénicas.',
      icon: <Video className="w-6 h-6 text-amber-500" />
    },
    {
      id: 'planning',
      title: 'Planeación de Eventos',
      description: 'Organización integral y logística de autor, catering exclusivo, meseros profesionales, sonido envolvente y diseño de iluminación.',
      icon: <Sparkles className="w-6 h-6 text-amber-500" />
    },
    {
      id: 'invitations',
      title: 'Invitaciones Digitales / Tarjetas',
      description: 'Nuestra firma tecnológica: micrositios elegantes interactivos con música, mapas GPS y confirmación de asistencia en tiempo real.',
      icon: <FileText className="w-6 h-6 text-amber-500" />
    }
  ];

  const triggerDirectWA = (serviceName: string) => {
    const formattedMessage = `Hola Charlitron, me interesa cotizar de forma directa el servicio: *${serviceName}*. ¿Me podrían dar más detalles?`;
    const waUrl = `https://wa.me/${config.whatsapp_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(formattedMessage)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-gray-200 font-sans selection:bg-amber-500 selection:text-black">
      {/* Background ambient radial gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full filter blur-[150px] pointer-events-none"></div>
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-amber-500/3 rounded-full filter blur-[180px] pointer-events-none"></div>

      {/* Floating Elegant Navigation Header */}
      <header id="top" className="sticky top-0 z-50 backdrop-blur-md bg-[#07080a]/85 border-b border-gray-800/50 px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleLogoClick}>
            <div className="h-10 w-10 rounded-full border border-amber-500/40 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-transparent group-hover:border-amber-400 transition-all overflow-hidden shrink-0">
              {config.logo_url ? (
                <img src={config.logo_url} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold tracking-widest text-amber-500 group-hover:text-amber-400 transition-colors">{config.hero_title}</h1>
              <p className="text-[9px] tracking-[0.3em] text-gray-500 font-mono uppercase">Planeación de Eventos</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold tracking-widest text-gray-400 font-mono">
            <a href="#about" className="hover:text-amber-500 transition-colors uppercase">QUIÉNES SOMOS</a>
            <a href="#experiencias" className="hover:text-amber-500 transition-colors uppercase">EXPERIENCIAS</a>
            <a href="#galeria-producciones" className="hover:text-amber-500 transition-colors uppercase">GALERÍA</a>
            <a href="#servicios-detallados" className="hover:text-amber-500 transition-colors uppercase">SERVICIOS</a>
            <a href="#cotizador-rapido" className="hover:text-amber-500 transition-colors uppercase">COTIZADOR</a>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('login')}
              className="px-5 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/35 hover:bg-amber-500 hover:text-black text-[11px] tracking-widest text-amber-500 hover:border-amber-500 transition-all duration-300 font-mono font-bold flex items-center gap-2 shadow-lg shadow-amber-500/5"
              id="btn-login-navigation"
            >
              <User className="w-3.5 h-3.5" />
              ACCESO CLIENTES
            </button>
          </div>
        </div>
      </header>

      {/* Hero section with dynamic customizable background image */}
      <section 
        className="relative min-h-[85vh] flex items-center px-6 py-20 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(to bottom, rgba(7, 8, 10, 0.92) 15%, rgba(7, 8, 10, 0.7) 50%, rgba(7, 8, 10, 0.98) 100%), url(${config.hero_image})` }}
      >
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-500 mb-6 uppercase tracking-wider font-semibold"
            >
              <Sparkles className="w-3 h-3 text-amber-500 animate-spin-slow" />
              PRODUCTOR DE EVENTOS & FIRMA DIGITAL PREMIUM
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-serif text-5xl md:text-6xl lg:text-7xl font-extralight tracking-tight text-white mb-6 leading-[1.1]"
            >
              Celebra con <br />
              <span className="font-serif italic font-normal text-amber-500">Impecable Distinción</span>
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-300 text-sm md:text-base max-w-xl mb-8 font-light leading-relaxed"
            >
              En <strong className="text-amber-500 font-medium">{config.hero_title}</strong> elevamos cada instante de tu boda, graduación o gala exclusiva. Fusionamos la coordinación logística meticulosa y la producción audiovisual artística de alto calibre con la interactividad de nuestras tarjetas digitales de vanguardia.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <a 
                href="#cotizador-rapido"
                className="px-7 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[11px] tracking-widest font-bold font-mono transition-all duration-300 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 group"
                id="hero-scroll-quote-btn"
              >
                <Sliders className="w-4 h-4" />
                COTIZAR AL INSTANTE
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="#servicios-detallados"
                className="px-7 py-4 rounded-full border border-gray-700 hover:border-amber-500/40 hover:bg-amber-500/5 text-gray-300 hover:text-white text-[11px] tracking-widest font-mono font-bold transition-all flex items-center justify-center gap-2"
              >
                EXPLORAR SERVICIOS
              </a>
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            {/* Elegant glassmorphic quick-access widget */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="rounded-2xl border border-gray-800/80 bg-[#0d0e11]/80 p-6 md:p-8 backdrop-blur-md relative shadow-2xl"
            >
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono tracking-widest uppercase text-amber-500 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Demo Invitación
              </div>

              <h4 className="font-serif text-xl text-white font-medium mb-1">Invitaciones Digitales</h4>
              <p className="text-gray-400 text-xs font-light mb-6">Prueba la experiencia de confirmación RSVP interactiva de nuestra demo activa:</p>

              <div className="rounded-xl overflow-hidden aspect-video relative mb-6 group">
                <img 
                  src="https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&q=80&w=600" 
                  alt="Invitación Demo" 
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e11] via-[#0d0e11]/20 to-transparent flex items-end justify-center p-4">
                  <div className="text-center w-full">
                    <p className="font-serif text-sm text-white font-light tracking-wide mb-2">Boda de Alejandra & Sebastián</p>
                    <button
                      onClick={() => onNavigate('event/boda-ale-sebas')}
                      className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-mono font-bold tracking-widest transition-colors shadow-md"
                      id="hero-widget-demo-trigger"
                    >
                      VER SITIO DE INVITACIÓN DEMO
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-800/60 pt-4">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Sincronización en vivo</span>
                <span className="text-[10px] text-amber-500 font-mono font-semibold uppercase tracking-widest">Activo en Base de Datos</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION: Quienes Somos (About Section) */}
      <section id="about" className="py-24 border-t border-gray-900 bg-[#090a0d] px-6 relative">
        <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5 relative">
            <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-amber-500/40"></div>
            <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-amber-500/40"></div>
            <img 
              src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800" 
              alt="Quiénes Somos Charlitron" 
              className="rounded-lg shadow-2xl border border-gray-800/80 w-full object-cover aspect-[4/5]"
            />
          </div>
          <div className="md:col-span-7 space-y-6">
            <p className="text-amber-500 font-mono text-xs tracking-[0.4em] uppercase font-bold">ALTA PLANEACIÓN DE AUTOR</p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-white font-light tracking-tight leading-tight">
              Diseñamos leyendas que <br />
              <span className="font-serif italic font-normal text-amber-500">permanecen para siempre</span>
            </h2>
            <p className="text-gray-400 text-sm md:text-base font-light leading-relaxed">
              {config.about_text}
            </p>
            <div className="grid sm:grid-cols-2 gap-4 border-t border-gray-800/60 pt-6">
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-serif text-white font-medium text-sm">Experiencia de Lujo</h4>
                  <p className="text-gray-500 text-xs font-light mt-1">Garantizamos estándares impecables en etiqueta, tiempos y elegancia visual.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-serif text-white font-medium text-sm">Atención Personalizada</h4>
                  <p className="text-gray-500 text-xs font-light mt-1">Un planificador senior dedicado y equipo de directores de cámara en tu evento.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: 3 Main Access Areas (Visual, Planning, Invitations) */}
      <section id="experiencias" className="py-24 border-t border-gray-900 bg-[#07080a] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-amber-500 font-mono text-xs tracking-[0.4em] uppercase font-bold mb-3">CONOCE LAS EXPERIENCIAS</p>
            <h3 className="font-serif text-3xl md:text-4xl text-white font-light tracking-tight">Nuestras Tres Áreas de Excelencia</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {categories.map((cat, index) => (
              <div 
                key={index} 
                className="p-8 rounded-2xl border border-gray-800/40 bg-[#0d0e11]/90 hover:border-amber-500/35 transition-all duration-300 flex flex-col justify-between group h-full shadow-lg"
              >
                <div>
                  <div className="mb-6 p-3 w-fit rounded-xl bg-amber-500/10 border border-amber-500/25 group-hover:bg-amber-500/20 transition-all">
                    {cat.icon}
                  </div>
                  <h4 className="font-serif text-xl text-white mb-3 tracking-wide">{cat.title}</h4>
                  <p className="text-gray-400 text-xs font-light leading-relaxed">{cat.description}</p>
                </div>
                <div className="mt-8 border-t border-gray-800/60 pt-4 flex items-center justify-between">
                  <a 
                    href="#cotizador-rapido" 
                    className="text-[10px] font-mono tracking-widest text-amber-500 font-bold uppercase hover:text-amber-400 transition-colors flex items-center gap-1.5"
                  >
                    Cotizar Servicio
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </a>
                  <button 
                    onClick={() => triggerDirectWA(cat.title)}
                    className="p-2 rounded-full hover:bg-amber-500/10 text-gray-500 hover:text-amber-500 transition-all"
                    title="Contacto directo por WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 fill-none" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: Servicies List (Photography, Video, Planning, Drones, Decors, Waiters, Music, etc.) */}
      <section id="servicios-detallados" className="py-24 border-t border-gray-900 bg-[#090a0d] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <p className="text-amber-500 font-mono text-xs tracking-[0.4em] uppercase font-bold mb-3">CATÁLOGO EXCLUSIVO</p>
              <h3 className="font-serif text-3xl md:text-4xl text-white font-light tracking-tight">Especialidades a la carta</h3>
            </div>
            <a 
              href="#cotizador-rapido"
              className="text-xs font-mono tracking-widest text-amber-500 font-bold uppercase underline underline-offset-8 decoration-amber-500/40 hover:text-amber-400 transition-colors"
            >
              Ir al cotizador interactivo
            </a>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((srv, idx) => (
              <div 
                key={idx} 
                className="overflow-hidden rounded-xl border border-gray-800 bg-[#0d0e11] hover:border-gray-700 transition-all group shadow-md"
              >
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={srv.image_url} 
                    alt={srv.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/75 border border-amber-500/20 text-[9px] font-mono tracking-widest text-amber-500 uppercase font-semibold">
                    {srv.category === 'visual' ? 'Producción Visual' : srv.category === 'planning' ? 'Planeación' : 'Invitación'}
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <h4 className="font-serif text-lg text-white font-medium">{srv.title}</h4>
                  <p className="text-gray-400 text-xs font-light line-clamp-3 leading-relaxed">{srv.description}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-800/60 text-xs">
                    <span className="text-gray-500 font-mono">Estimado: <strong className="text-amber-500 font-medium">{srv.price_estimated}</strong></span>
                    <button 
                      onClick={() => triggerDirectWA(srv.title)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black font-mono text-[10px] tracking-widest font-bold transition-all"
                    >
                      SOLICITAR INFO
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Always visible fallback / basic items since user asked explicitly for recording, catering, waiters, decoration */}
            <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0d0e11] hover:border-gray-700 transition-all group shadow-md p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="p-2.5 w-fit rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="font-serif text-lg text-white font-medium">Banquete & Servicio de Meseros</h4>
                <p className="text-gray-400 text-xs font-light leading-relaxed">Catering de gala a 3 o 4 tiempos, mixología premium y equipo de meseros profesionales uniformados con protocolo de etiqueta estricto.</p>
              </div>
              <div className="pt-6 border-t border-gray-800/60 mt-4 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-mono">Desde $850 MXN / persona</span>
                <button onClick={() => triggerDirectWA('Servicio de Banquete y Meseros')} className="text-amber-500 font-mono text-[10px] tracking-widest font-bold uppercase hover:underline">Cotizar</button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0d0e11] hover:border-gray-700 transition-all group shadow-md p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="p-2.5 w-fit rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Briefcase className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="font-serif text-lg text-white font-medium">Decoración, Flores & Flores de Diseño</h4>
                <p className="text-gray-400 text-xs font-light leading-relaxed">Diseño floral exclusivo, arcos ceremoniales, centros de mesa interactivos con iluminación de bajo consumo, carpas de lujo y mobiliario lounge.</p>
              </div>
              <div className="pt-6 border-t border-gray-800/60 mt-4 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-mono">Personalizado según escala</span>
                <button onClick={() => triggerDirectWA('Decoración y Diseño de Espacios')} className="text-amber-500 font-mono text-[10px] tracking-widest font-bold uppercase hover:underline">Cotizar</button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0d0e11] hover:border-gray-700 transition-all group shadow-md p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="p-2.5 w-fit rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Music className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="font-serif text-lg text-white font-medium">Grabación de Audio, DJ & Audio Envolvente</h4>
                <p className="text-gray-400 text-xs font-light leading-relaxed">Sistemas de audio multizona lineal (L-Acoustics), DJs residentes calificados, microfonía Shure Axient inalámbrica y grabación multipista de discursos en vivo.</p>
              </div>
              <div className="pt-6 border-t border-gray-800/60 mt-4 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-mono">Desde $12,500 MXN</span>
                <button onClick={() => triggerDirectWA('Audio Profesional y DJ')} className="text-amber-500 font-mono text-[10px] tracking-widest font-bold uppercase hover:underline">Cotizar</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Galería de Eventos Filtrable (Portafolio Fotográfico y de Videos) */}
      <section id="galeria-producciones" className="py-24 border-t border-gray-900 bg-[#060709] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-amber-500 font-mono text-xs tracking-[0.4em] uppercase font-bold mb-3">PORTAFOLIO AUDIOVISUAL</p>
            <h3 className="font-serif text-3xl md:text-4xl text-white font-light tracking-tight">Galería de Producciones Legendarias</h3>
            <p className="text-gray-400 text-xs font-light mt-3 leading-relaxed">
              Explora una selección de bodas, graduaciones, XV años y galas corporativas producidas por el equipo de Charlitron.
            </p>

            {/* Filter Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mt-8">
              {[
                { id: 'todos', label: 'Todos los Eventos' },
                { id: 'bodas', label: 'Bodas' },
                { id: 'graduaciones', label: 'Graduaciones' },
                { id: 'galas_xv', label: 'XV Años & Galas' },
                { id: 'corporativos', label: 'Corporativos' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setGalleryFilter(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-mono tracking-wider transition-all duration-300 cursor-pointer ${
                    galleryFilter === tab.id
                      ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20'
                      : 'bg-[#0d0e12] border border-gray-800 text-gray-400 hover:border-amber-500/40 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gallery Items Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {GALLERY_ITEMS.filter(item => galleryFilter === 'todos' || item.category === galleryFilter).map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl border border-gray-800/80 bg-[#0d0e12] overflow-hidden group hover:border-amber-500/40 transition-all shadow-xl flex flex-col justify-between"
              >
                <div 
                  className="relative h-56 overflow-hidden cursor-pointer bg-black/60"
                  onClick={() => setActiveModalMedia({ url: item.cover_url, type: item.cover_type, title: item.title })}
                >
                  {item.cover_type === 'video' ? (
                    <video 
                      src={item.cover_url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" 
                      muted 
                      loop 
                      autoPlay 
                      playsInline 
                    />
                  ) : (
                    <img 
                      src={item.cover_url} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-transparent to-black/30"></div>
                  
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/80 border border-amber-500/30 text-amber-500 font-mono text-[9px] uppercase tracking-widest font-bold">
                    {item.categoryLabel}
                  </span>

                  <div className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-black/70 border border-amber-500/40 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h4 className="font-serif text-lg text-white font-medium group-hover:text-amber-400 transition-colors">{item.title}</h4>
                  <p className="text-[11px] text-amber-500 font-mono flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {item.location}
                  </p>
                  <p className="text-gray-400 text-xs font-light leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal for Gallery Media */}
      <AnimatePresence>
        {activeModalMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => setActiveModalMedia(null)}
          >
            <div 
              className="relative max-w-4xl w-full bg-[#0d0e12] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/40">
                <h4 className="font-serif text-base text-white font-medium">{activeModalMedia.title}</h4>
                <button 
                  onClick={() => setActiveModalMedia(null)}
                  className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-2 bg-black flex items-center justify-center min-h-[300px] max-h-[70vh]">
                {activeModalMedia.type === 'video' ? (
                  <video src={activeModalMedia.url} controls autoPlay className="max-h-[65vh] w-auto rounded-lg" />
                ) : (
                  <img src={activeModalMedia.url} alt={activeModalMedia.title} className="max-h-[65vh] w-auto object-contain rounded-lg" referrerPolicy="no-referrer" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION: Double interactive Public Quote Form */}
      <section id="cotizador-rapido" className="py-24 border-t border-gray-900 bg-[#07080a] px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-amber-500 font-mono text-xs tracking-[0.4em] uppercase font-bold mb-3">COTIZADOR INMEDIATO</p>
            <h3 className="font-serif text-3xl md:text-4xl text-white font-light tracking-tight">Arma el presupuesto preliminar de tu evento</h3>
            <p className="text-gray-400 text-xs font-light mt-4 leading-relaxed">
              Selecciona los servicios que te interesen y calcula de forma interactiva según el número de invitados. Te generaremos un presupuesto formal descargable en PDF y mensaje directo para WhatsApp.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800/80 bg-[#0d0e11] p-6 md:p-10 shadow-2xl relative" id="cotizar-section">
            {formSubmitted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-6"
              >
                <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-500 mb-2 animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
                
                <div>
                  <span className="px-3 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 font-mono text-xs uppercase tracking-widest font-bold">
                    FOLIO REGISTRADO: {lastSubmittedFolio}
                  </span>
                  <h4 className="font-serif text-2xl text-white font-medium mt-3">¡Solicitud de Cotización Registrada con Éxito!</h4>
                  <p className="text-gray-400 text-xs max-w-md mx-auto mt-2 leading-relaxed">
                    Hemos guardado tus requerimientos en nuestro sistema Charlitron. Ya puedes descargar tu documento PDF formal o iniciar el contacto directo en WhatsApp.
                  </p>
                </div>

                {/* 3 Main requested action buttons */}
                <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
                  <button
                    onClick={handleDownloadPdf}
                    className="py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
                    id="btn-download-pdf-quote"
                  >
                    <Download className="w-4 h-4" />
                    DESCARGAR PDF
                  </button>

                  <button
                    onClick={handleResetQuote}
                    className="py-3.5 px-4 rounded-xl bg-gray-900 border border-gray-700 hover:border-amber-500/50 hover:bg-gray-800 text-white font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                    id="btn-another-quote"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-500" />
                    OTRA COTIZACIÓN
                  </button>

                  <button
                    onClick={handleScrollToTop}
                    className="py-3.5 px-4 rounded-xl bg-gray-900 border border-gray-700 hover:border-amber-500/50 hover:bg-gray-800 text-gray-300 hover:text-white font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                    id="btn-return-to-menu"
                  >
                    <ArrowUp className="w-4 h-4 text-amber-500" />
                    MENÚ INICIO
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-8">
                {/* 1. Services selection checklist */}
                <div className="space-y-4">
                  <label className="text-xs font-mono tracking-widest text-amber-500 uppercase font-bold block">
                    1. SELECCIONA LOS CONCEPTOS QUE TE INTERESAN:
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      'Producción Audiovisual Premium',
                      'Coordinación y Logística Total',
                      'Invitaciones Digitales Inteligentes',
                      'Servicio de Catering & Meseros',
                      'Decoración & Ambientación Floral',
                      'Audio Profesional & DJ'
                    ].map((title, idx) => {
                      const isSelected = quoteForm.selected_services.includes(title);
                      return (
                        <div 
                          key={idx}
                          onClick={() => handleServiceSelect(title)}
                          className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                            isSelected 
                              ? 'border-amber-500 bg-amber-500/5 text-white shadow-lg shadow-amber-500/5' 
                              : 'border-gray-800 bg-[#0a0b0d] hover:border-gray-700 text-gray-400'
                          }`}
                        >
                          <span className="text-xs font-medium">{title}</span>
                          <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                            isSelected ? 'bg-amber-500 border-amber-500 text-black' : 'border-gray-600'
                          }`}>
                            {isSelected && <CheckCircle className="w-3.5 h-3.5 text-black fill-black" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CALCULADORA ESTIMATIVA PARA EVENTOS (Invitados, Banquetes, Bebidas) */}
                <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-mono text-[10px] tracking-widest uppercase font-bold border border-amber-500/30">
                        CALCULADORA ESTIMATIVA DE EVENTO
                      </span>
                      <h4 className="font-serif text-lg text-white font-medium mt-1">Estimador de Asistentes, Banquete & Bebidas</h4>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-[#0a0b0d] border border-gray-800 p-2 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setGuestsCount(Math.max(20, guestsCount - 10))}
                        className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:text-amber-500 hover:border-amber-500/40 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="text-center px-2 min-w-[70px]">
                        <span className="font-mono text-lg font-bold text-amber-500">{guestsCount}</span>
                        <span className="block text-[9px] font-mono text-gray-500 uppercase">personas</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGuestsCount(Math.min(1000, guestsCount + 10))}
                        className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:text-amber-500 hover:border-amber-500/40 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive slider */}
                  <div className="space-y-2">
                    <input 
                      type="range"
                      min={20}
                      max={500}
                      step={10}
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer bg-gray-800 h-2 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-gray-500">
                      <span>20 pax</span>
                      <span>100 pax</span>
                      <span>250 pax</span>
                      <span>500 pax</span>
                    </div>
                  </div>

                  {/* Calculated metrics cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 bg-[#0a0b0d] border border-gray-800/80 rounded-xl">
                      <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                        <Utensils className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono font-bold uppercase">Banquete Gourmet</span>
                      </div>
                      <p className="font-mono text-sm font-semibold text-white">${calculatedCatering.toLocaleString('es-MX')} MXN</p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">~$380 MXN / platillo</p>
                    </div>

                    <div className="p-3 bg-[#0a0b0d] border border-gray-800/80 rounded-xl">
                      <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                        <Wine className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono font-bold uppercase">Barra Libre / Bebida</span>
                      </div>
                      <p className="font-mono text-sm font-semibold text-white">{calculatedBottles} Botellas</p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">1 bot. c/4 invitados</p>
                    </div>

                    <div className="p-3 bg-[#0a0b0d] border border-gray-800/80 rounded-xl">
                      <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono font-bold uppercase">Meseros Sugeridos</span>
                      </div>
                      <p className="font-mono text-sm font-semibold text-white">{calculatedWaiters} Meseros</p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">1 c/15 personas</p>
                    </div>

                    <div className="p-3 bg-[#0a0b0d] border border-gray-800/80 rounded-xl">
                      <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono font-bold uppercase">Presupuesto Rango</span>
                      </div>
                      <p className="font-mono text-xs font-bold text-amber-400">${(estimatedTotalMin / 1000).toFixed(0)}k - ${(estimatedTotalMax / 1000).toFixed(0)}k MXN</p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">Aproximado total</p>
                    </div>
                  </div>
                </div>

                {/* 2. Event details */}
                <div className="space-y-4">
                  <label className="text-xs font-mono tracking-widest text-amber-500 uppercase font-bold block">
                    2. DETALLES DE LA CELEBRACIÓN:
                  </label>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-400 text-[11px] uppercase font-mono tracking-widest mb-2 font-semibold">TIPO DE EVENTO *</label>
                      <select 
                        value={quoteForm.event_type}
                        onChange={(e) => setQuoteForm(prev => ({ ...prev, event_type: e.target.value }))}
                        className="w-full bg-[#0a0b0d] border border-gray-800 rounded-lg py-3 px-4 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Boda">Boda de Ensueño</option>
                        <option value="XV Años">XV Años Temáticos</option>
                        <option value="Graduación">Gala de Graduación</option>
                        <option value="Aniversario">Aniversario o Cóctel</option>
                        <option value="Corporativo">Evento Corporativo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-[11px] uppercase font-mono tracking-widest mb-2 font-semibold">FECHA ESTIMADA</label>
                      <input 
                        type="date"
                        value={quoteForm.event_date}
                        min="2026-07-20"
                        onChange={(e) => setQuoteForm(prev => ({ ...prev, event_date: e.target.value }))}
                        className="w-full bg-[#0a0b0d] border border-gray-800 rounded-lg py-3 px-4 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-[11px] uppercase font-mono tracking-widest mb-2 font-semibold">CIUDAD DE REALIZACIÓN *</label>
                      <input 
                        type="text"
                        placeholder="Ej. CDMX, Cuernavaca, Acapulco"
                        required
                        value={quoteForm.city}
                        onChange={(e) => setQuoteForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full bg-[#0a0b0d] border border-gray-800 rounded-lg py-3 px-4 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-[11px] uppercase font-mono tracking-widest mb-2 font-semibold">PRESUPUESTO ESTIMADO *</label>
                      <select 
                        value={quoteForm.estimated_budget}
                        onChange={(e) => setQuoteForm(prev => ({ ...prev, estimated_budget: e.target.value }))}
                        className="w-full bg-[#0a0b0d] border border-gray-800 rounded-lg py-3 px-4 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Menos de $100k MXN">Menos de $100,000 MXN</option>
                        <option value="$100k - $200k MXN">$100,000 - $200,000 MXN</option>
                        <option value="$200k - $400k MXN">$200,000 - $400,000 MXN</option>
                        <option value="Más de $400k MXN">Más de $400,000 MXN (Premium)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Client details */}
                <div className="space-y-4">
                  <label className="text-xs font-mono tracking-widest text-amber-500 uppercase font-bold block">
                    3. INFORMACIÓN DE CONTACTO:
                  </label>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-400 text-[11px] uppercase font-mono tracking-widest mb-2 font-semibold">NOMBRE COMPLETO *</label>
                      <input 
                        type="text"
                        placeholder="Ingresa tu nombre completo"
                        required
                        value={quoteForm.name}
                        onChange={(e) => setQuoteForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-[#0a0b0d] border border-gray-800 rounded-lg py-3 px-4 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-[11px] uppercase font-mono tracking-widest mb-2 font-semibold">NÚMERO DE WHATSAPP *</label>
                      <input 
                        type="tel"
                        placeholder="Ej. 5512345678"
                        required
                        value={quoteForm.phone}
                        onChange={(e) => setQuoteForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full bg-[#0a0b0d] border border-gray-800 rounded-lg py-3 px-4 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Privacy & terms policy consent block */}
                <div className="p-4 bg-[#0a0b0d] border border-gray-800/80 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox"
                      id="privacy-consent-box"
                      required
                      checked={quoteForm.consent}
                      onChange={(e) => setQuoteForm(prev => ({ ...prev, consent: e.target.checked }))}
                      className="mt-1 accent-amber-500 h-4 w-4 bg-[#0a0b0d] border border-gray-800"
                    />
                    <label htmlFor="privacy-consent-box" className="text-[11px] text-gray-400 leading-relaxed font-light select-none">
                      Doy consentimiento para que Charlitron almacene mis datos de contacto de manera segura de acuerdo con su <strong>Aviso de Privacidad</strong>, con la única finalidad de brindarme una cotización personalizada y agendar llamadas vía WhatsApp o telefónica.
                    </label>
                  </div>
                </div>

                <div className="pt-4 text-center space-y-4">
                  <button 
                    type="submit"
                    className="w-full py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[12px] tracking-widest font-mono font-bold hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer"
                    id="submit-public-quote"
                  >
                    <MessageCircle className="w-5 h-5 fill-black" />
                    GENERAR MI COTIZACIÓN & ENVIAR A WHATSAPP
                  </button>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleResetQuote}
                      className="flex-1 py-3 px-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-amber-500/40 text-gray-300 hover:text-white font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                      id="btn-form-reset-quote"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                      Limpiar / Hacer Otra Cotización
                    </button>

                    <button
                      type="button"
                      onClick={handleScrollToTop}
                      className="flex-1 py-3 px-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-amber-500/40 text-gray-300 hover:text-white font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                      id="btn-form-return-to-menu"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
                      Volver al Menú Principal
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest pt-2">
                    Asistencia 100% personalizada • Sin costos de pre-consulta
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 bg-[#050608] border-t border-gray-950 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 items-center text-center md:text-left">
          <div>
            <h5 className="font-serif text-lg text-amber-500 tracking-wider font-bold uppercase">{config.hero_title}</h5>
            <p className="text-[10px] text-gray-500 tracking-[0.2em] font-mono mt-1">PRODUCCIÓN DE EXPERIENCIAS LEGENDARIAS</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-mono tracking-wider text-gray-600">
              © 2026 CHARLITRON PLANEADOR DE EVENTOS. TODOS LOS DERECHOS RESERVADOS.
            </p>
            <p className="text-[10px] text-gray-600 font-mono mt-1 uppercase">
              {config.business_address}
            </p>
          </div>
          <div className="flex justify-center md:justify-end gap-6 text-[10px] font-mono tracking-wider text-gray-500">
            <span className="hover:text-amber-500 cursor-pointer">Aviso de Privacidad</span>
            <span>•</span>
            <span className="hover:text-amber-500 cursor-pointer">Términos de Servicio</span>
          </div>
        </div>
      </footer>

      {/* Floating Sticky WhatsApp Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => triggerDirectWA('Información General')}
          className="w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#20ba5a] flex items-center justify-center text-black shadow-2xl transition-all duration-300 hover:scale-110 group cursor-pointer"
          aria-label="Contacto de WhatsApp"
          id="floating-whatsapp-trigger"
        >
          <MessageCircle className="w-7 h-7 fill-black" />
          <span className="absolute right-16 scale-0 bg-black text-white text-[10px] tracking-widest font-mono py-1.5 px-3 rounded-md group-hover:scale-100 transition-all uppercase font-semibold border border-gray-800 whitespace-nowrap">
            Atención en WhatsApp
          </span>
        </button>
      </div>
    </div>
  );
}
