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
  ChevronLeft, 
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
  Download,
  RefreshCw,
  ArrowUp,
  Wine,
  Utensils,
  Filter,
  Maximize2,
  X,
  Plus,
  Minus,
  Menu,
  ChevronDown,
  Search
} from 'lucide-react';
import { AppService } from '../lib/supabase';
import { LandingConfig, Service, Event, GalleryItem } from '../types';
import { generateQuotePdf } from '../lib/pdfGenerator';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

/**
 * Imagen de servicio que se adapta a la orientación real subida desde el panel admin:
 * horizontal usa "cover" (llena el marco), vertical usa "contain" (se ve completa, sin recortar cabezas/pies).
 */
function AdaptiveServiceImage({ src, alt, className, imgClassName }: { src: string; alt: string; className?: string; imgClassName?: string }) {
  const [isPortrait, setIsPortrait] = useState(false);

  return (
    <div className={`${className || ''} ${isPortrait ? 'bg-black' : ''}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          const img = e.currentTarget;
          setIsPortrait(img.naturalHeight > img.naturalWidth);
        }}
        className={`w-full h-full ${isPortrait ? 'object-contain' : 'object-cover'} ${imgClassName || ''}`}
      />
    </div>
  );
}

function getServiceCategoryLabel(category: Service['category']): string {
  return category === 'visual' ? 'Producción Visual'
    : category === 'planning' ? 'Planeación de Eventos'
    : category === 'invitations' ? 'Tarjetas / Invitaciones'
    : 'Otros Servicios';
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [config, setConfig] = useState<LandingConfig>({
    hero_title: 'Celebra tu Evento',
    hero_subtitle: 'Planeador de Eventos & Producción Visual Premium en San Luis Potosí',
    hero_image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1600',
    about_text: 'En Celebra tu Evento transformamos tus ideas en celebraciones legendarias en San Luis Potosí y alrededores. Fusionamos el arte de la planeación meticulosa, diseño de experiencias exclusivas y producción visual de alta fidelidad, con innovadoras invitaciones digitales que garantizan una gestión de asistentes impecable.',
    whatsapp_phone: '5214444237092',
    logo_url: '',
    business_address: 'San Luis Potosí, S.L.P., México'
  });

  const [services, setServices] = useState<Service[]>([]);
  const [showcaseEvents, setShowcaseEvents] = useState<Event[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for Public Quote Form
  const [quoteForm, setQuoteForm] = useState({
    name: '',
    phone: '',
    city: '',
    event_type: 'Boda',
    event_date: '',
    estimated_budget: '$30,000 – $50,000 MXN',
    selected_services: [] as string[],
    consent: false
  });

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [guestsCount, setGuestsCount] = useState<number>(30);
  const [foodType, setFoodType] = useState<'Taquiza' | 'Cazuelada' | 'Pozolada'>('Taquiza');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [galleryFilter, setGalleryFilter] = useState<string>('todos');
  const [gallerySearch, setGallerySearch] = useState<string>('');
  const [activeGalleryItem, setActiveGalleryItem] = useState<GalleryItem | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [activeServiceDetail, setActiveServiceDetail] = useState<{ title: string; description: string; image_url?: string; price: string; categoryLabel?: string } | null>(null);
  const [lastSubmittedFolio, setLastSubmittedFolio] = useState<string>('COT-2026-001');
  const [activeLegalDoc, setActiveLegalDoc] = useState<'privacy' | 'terms' | null>(null);
  const [quickServiceSearch, setQuickServiceSearch] = useState('');

  // Estimador inicial de alimentos y personal (base preliminar, no cotiza el evento completo)
  const FOOD_PRICES: Record<'Taquiza' | 'Cazuelada' | 'Pozolada', number> = { Taquiza: 90, Cazuelada: 90, Pozolada: 120 };
  const WAITER_COST = 600;
  const getWaitersCount = (guests: number): number => {
    if (guests <= 50) return 1;
    if (guests <= 100) return 2;
    if (guests <= 150) return 3;
    if (guests <= 200) return 4;
    if (guests <= 250) return 5;
    return 6;
  };
  const foodPricePerPerson = FOOD_PRICES[foodType];
  const calculatedFoodTotal = guestsCount * foodPricePerPerson;
  const calculatedWaiters = getWaitersCount(guestsCount);
  const calculatedWaitersTotal = calculatedWaiters * WAITER_COST;
  const totalPreliminar = calculatedFoodTotal + calculatedWaitersTotal;

  // Filtro combinado de la galería: por categoría (tabs) y por texto libre (nombre, lugar, descripción)
  const filteredGalleryItems = galleryItems
    .filter(item => galleryFilter === 'todos' || item.category === galleryFilter)
    .filter(item => {
      const query = gallerySearch.trim().toLowerCase();
      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });

  // Buscador rápido del hero (visitantes sin sesión): filtra el catálogo de servicios por título/descripción
  const quickServiceResults = quickServiceSearch.trim()
    ? services.filter(srv => {
        const query = quickServiceSearch.trim().toLowerCase();
        return srv.title.toLowerCase().includes(query) || srv.description.toLowerCase().includes(query);
      }).slice(0, 4)
    : [];

  // Categorías del cotizador: solo alimentos + meseros se calculan automático, el resto es referencia para cotización personalizada
  const QUOTE_CATEGORIES = [
    { title: 'Alimentos para evento', note: 'Taquiza, cazuelada o pozolada · se calcula abajo en el estimador' },
    { title: 'Producción visual', note: 'Fotografía desde $3,700 · Video/Dron desde $5,300' },
    { title: 'Barras y snacks', note: 'Chilaquiles, dulces, elotes, frutas o bebidas · desde $1,300' },
    { title: 'Personal para evento', note: 'Meseros incluidos en el estimador · Hostess/Edecanes desde $700 (jornada 2h)' },
    { title: 'Show y animación', note: 'Show Charlitron desde $2,100' },
    { title: 'Invitaciones digitales', note: 'Invitaciones interactivas desde $250' },
    { title: 'Restauración y enmarcado', note: 'Restauración de fotografías y enmarcado desde $200' }
  ];

  const FAQ_ITEMS = [
    {
      question: '¿Qué servicios para eventos ofrecen en San Luis Potosí?',
      answer: 'Ofrecemos taquiza, cazuelada y pozolada, producción visual (foto, video y dron), barras y snacks, meseros y hostess, show y animación, invitaciones digitales interactivas, y restauración y enmarcado de fotografías, todo con precotización preliminar inmediata por WhatsApp.'
    },
    {
      question: '¿Hacen taquizas o cazueladas para eventos grandes en SLP?',
      answer: 'Sí, calculamos el costo de alimentos y meseros según tu número de invitados directamente en nuestro precotizador en línea, desde 30 hasta 300 personas.'
    },
    {
      question: '¿Cómo funciona la precotización preliminar?',
      answer: 'Eliges los servicios e ingresas tu número de invitados en el formulario del sitio; el sistema calcula una estimación automática y te la enviamos por WhatsApp para afinar los detalles y darte una cotización real.'
    },
    {
      question: '¿También ofrecen invitaciones digitales para bodas y XV años en San Luis Potosí?',
      answer: 'Sí, diseñamos invitaciones digitales interactivas con confirmación de asistencia (RSVP), ideales para bodas, XV años, graduaciones y eventos corporativos.'
    }
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const loadedConfig = await AppService.getLandingConfig();
        if (loadedConfig) {
          setConfig(loadedConfig);
        }
        const loadedServices = await AppService.getServices();
        setServices(loadedServices.filter(s => s.is_visible));
        const loadedShowcase = await AppService.getPublicShowcaseEvents();
        setShowcaseEvents(loadedShowcase);
        const loadedGalleryItems = await AppService.getGalleryItems();
        setGalleryItems(loadedGalleryItems.filter(g => g.is_visible));
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

    // Servicios adicionales de interés (no se suman al estimador automático de alimentos + meseros)
    const extraServices = quoteForm.selected_services.filter(s => s !== 'Alimentos para evento');

    try {
      // 1. Save Lead to database so it shows up in Admin Panel
      await AppService.createLead({
        name: quoteForm.name,
        phone: quoteForm.phone,
        city: quoteForm.city,
        event_type: quoteForm.event_type,
        event_date: quoteForm.event_date || 'Sin fecha fija',
        estimated_budget: quoteForm.estimated_budget,
        services_selected: quoteForm.selected_services.length > 0 ? quoteForm.selected_services : ['Información General'],
        guests_count: guestsCount
      });

      // 2. Build structured WhatsApp message
      const extraStr = extraServices.length > 0 ? extraServices.join(', ') : 'Ninguno';
      const formattedMessage = `¡Hola Celebra tu Evento! Quiero solicitar mi cotización real. Esta es mi precotización automática (Folio: ${folioNum}):
• *Nombre:* ${quoteForm.name}
• *Teléfono:* ${quoteForm.phone}
• *Ciudad:* ${quoteForm.city}
• *Tipo de Evento:* ${quoteForm.event_type}
• *Invitados Estimados:* ${guestsCount} personas
• *Fecha:* ${quoteForm.event_date || 'Por definir'}
• *Presupuesto de Referencia:* ${quoteForm.estimated_budget}

*ESTIMACIÓN AUTOMÁTICA (alimentos + personal):*
• Alimentos: ${foodType} ($${foodPricePerPerson} x ${guestsCount} personas) = $${calculatedFoodTotal.toLocaleString('es-MX')} MXN
• Meseros sugeridos: ${calculatedWaiters} ($${WAITER_COST} c/u) = $${calculatedWaitersTotal.toLocaleString('es-MX')} MXN
• *Total preliminar:* $${totalPreliminar.toLocaleString('es-MX')} MXN

*SERVICIOS ADICIONALES DE INTERÉS (sujetos a cotización personalizada):*
${extraStr}`;

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
    const extraServices = quoteForm.selected_services.filter(s => s !== 'Alimentos para evento');

    // Solo alimentos + meseros forman el subtotal preliminar (estimación automática)
    const items = [
      {
        description: `Alimentos: ${foodType} - estimación automática (${guestsCount} personas)`,
        quantity: guestsCount,
        price: foodPricePerPerson
      },
      {
        description: `Meseros sugeridos - estimación automática (jornada de 5h)`,
        quantity: calculatedWaiters,
        price: WAITER_COST
      }
    ];

    const subtotal = items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const extraNote = extraServices.length > 0
      ? `Servicio adicional sujeto a cotización personalizada: ${extraServices.join(', ')}.`
      : 'Sin servicios adicionales seleccionados.';

    generateQuotePdf({
      folio: lastSubmittedFolio,
      date: today,
      clientName: quoteForm.name || 'Cliente Celebra tu Evento',
      clientPhone: quoteForm.phone || 'N/A',
      city: quoteForm.city || 'CDMX',
      eventType: quoteForm.event_type || 'Evento Especial',
      eventDate: quoteForm.event_date || 'Por confirmar',
      guestsCount: guestsCount,
      items: items,
      subtotal: subtotal,
      discountTotal: 0,
      total: subtotal,
      observations: `Estimación automática (alimentos + personal) para ${guestsCount} asistentes. ${extraNote} Los valores son aproximados y funcionan como guía inicial; la propuesta final puede variar según ubicación, tipo de servicio, número de asistentes y requerimientos del evento.`,
      terms: 'Precotización automática (alimentos + personal) válida como referencia por 15 días hábiles. La cotización real y definitiva, incluyendo los servicios adicionales de interés, se confirma directamente contigo. Para reservar la fecha se requiere el 50% de anticipo.',
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
      estimated_budget: '$30,000 – $50,000 MXN',
      selected_services: [],
      consent: false
    });
    setGuestsCount(30);
    setFoodType('Taquiza');
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
      description: 'Fotografía, dron, video y contenido visual para conservar y presentar tu evento con una imagen cuidada, emotiva y profesional. Ideal para celebraciones sociales, contenido de recuerdo y presencia digital del evento.',
      icon: <Video className="w-6 h-6 text-amber-500" />
    },
    {
      id: 'planning',
      title: 'Planeación y Coordinación',
      description: 'Apoyamos en la organización de momentos clave de tu evento, integrando servicios seleccionados y atención personalizada según el tipo de celebración y sus necesidades.',
      icon: <Sparkles className="w-6 h-6 text-amber-500" />
    },
    {
      id: 'invitations',
      title: 'Invitaciones Digitales y Tarjetas',
      description: 'Nuestra propuesta digital para eventos: invitaciones interactivas con diseño elegante, confirmación RSVP, ubicación, galería y herramientas pensadas para una experiencia moderna y funcional.',
      icon: <FileText className="w-6 h-6 text-amber-500" />
    }
  ];

  const triggerDirectWA = (serviceName: string) => {
    const formattedMessage = `Hola Celebra tu Evento, me interesa cotizar de forma directa el servicio: *${serviceName}*. ¿Me podrían dar más detalles?`;
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
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('landing')}>
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
            <a href="#preguntas-frecuentes" className="hover:text-amber-500 transition-colors uppercase">FAQ</a>
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
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="lg:hidden p-2.5 rounded-full border border-gray-800 text-gray-300 hover:text-amber-500 hover:border-amber-500/40 transition-all cursor-pointer"
              aria-label="Abrir menú de navegación"
              id="btn-mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu (breakpoints below lg) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden overflow-hidden"
            >
              <nav className="flex flex-col text-xs font-semibold tracking-widest text-gray-400 font-mono pt-4">
                <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-3 border-t border-gray-900 hover:text-amber-500 transition-colors uppercase">QUIÉNES SOMOS</a>
                <a href="#experiencias" onClick={() => setMobileMenuOpen(false)} className="py-3 border-t border-gray-900 hover:text-amber-500 transition-colors uppercase">EXPERIENCIAS</a>
                <a href="#galeria-producciones" onClick={() => setMobileMenuOpen(false)} className="py-3 border-t border-gray-900 hover:text-amber-500 transition-colors uppercase">GALERÍA</a>
                <a href="#servicios-detallados" onClick={() => setMobileMenuOpen(false)} className="py-3 border-t border-gray-900 hover:text-amber-500 transition-colors uppercase">SERVICIOS</a>
                <a href="#cotizador-rapido" onClick={() => setMobileMenuOpen(false)} className="py-3 border-t border-b border-gray-900 hover:text-amber-500 transition-colors uppercase">COTIZADOR</a>
                <a href="#preguntas-frecuentes" onClick={() => setMobileMenuOpen(false)} className="py-3 border-b border-gray-900 hover:text-amber-500 transition-colors uppercase">FAQ</a>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
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
              <span className="font-serif italic font-normal text-amber-500">Estilo y Distinción</span>
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-300 text-sm md:text-base max-w-xl mb-8 font-light leading-relaxed"
            >
              En <strong className="text-amber-500 font-medium">{config.hero_title}</strong> diseñamos experiencias memorables para bodas, graduaciones, celebraciones sociales y eventos especiales. Combinamos organización, presentación visual y soluciones digitales como invitaciones interactivas para ayudarte a crear un evento más práctico, atractivo y bien cuidado.
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
                COTIZAR MI EVENTO
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="#servicios-detallados"
                className="px-7 py-4 rounded-full border border-gray-700 hover:border-amber-500/40 hover:bg-amber-500/5 text-gray-300 hover:text-white text-[11px] tracking-widest font-mono font-bold transition-all flex items-center justify-center gap-2"
              >
                VER SERVICIOS DISPONIBLES
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
              <p className="text-gray-400 text-xs font-light mb-6">Descubre una muestra de nuestras invitaciones digitales con confirmación RSVP y experiencia interactiva para eventos.</p>

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
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION: Buscador rápido de servicios (visible sin necesidad de iniciar sesión) */}
      <section className="py-10 border-t border-gray-900 bg-[#08090c] px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-gray-400 text-xs font-light mb-4">
            ¿Buscas un servicio en específico? Escribe aquí y te mostramos opciones al instante, sin necesidad de crear una cuenta.
          </p>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={quickServiceSearch}
              onChange={(e) => setQuickServiceSearch(e.target.value)}
              placeholder="Ej. fotografía, dron, banquete, decoración..."
              id="hero-quick-service-search"
              className="w-full pl-12 pr-4 py-4 rounded-full bg-[#0d0e12] border border-gray-800 text-white text-sm font-light placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {quickServiceSearch.trim() && (
            <div className="mt-4 rounded-2xl border border-gray-800 bg-[#0d0e12] overflow-hidden divide-y divide-gray-800/60">
              {quickServiceResults.length > 0 ? (
                quickServiceResults.map((srv, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveServiceDetail({ title: srv.title, description: srv.description, image_url: srv.image_url, price: srv.price_estimated, categoryLabel: getServiceCategoryLabel(srv.category) });
                      setQuickServiceSearch('');
                    }}
                    className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-amber-500/5 transition-colors"
                  >
                    <div>
                      <p className="text-white text-sm font-serif">{srv.title}</p>
                      <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mt-0.5">{getServiceCategoryLabel(srv.category)}</p>
                    </div>
                    <span className="text-amber-500 text-xs font-mono shrink-0">{srv.price_estimated}</span>
                  </button>
                ))
              ) : (
                <div className="px-5 py-4 text-center">
                  <p className="text-gray-500 text-xs">No encontramos ese servicio en nuestro catálogo.</p>
                  <a href="#servicios-detallados" className="text-amber-500 text-xs font-mono underline underline-offset-4 mt-1 inline-block">
                    Ver catálogo completo
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* SECTION: Vitrina pública de invitaciones autorizadas por sus clientes */}
      {showcaseEvents.length > 0 && (
        <section id="invitaciones-clientes" className="py-20 border-t border-gray-900 bg-[#090a0d] px-6 relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-[10px] tracking-[0.3em] font-mono text-amber-500 uppercase mb-2">Casos reales</p>
              <h2 className="font-serif text-3xl md:text-4xl text-white font-light">Invitaciones que hemos creado</h2>
              <p className="text-gray-400 text-sm font-light mt-3 max-w-xl mx-auto">Ejemplos autorizados por nuestros clientes para compartir su experiencia con nuestras invitaciones digitales.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {showcaseEvents.map((evt) => (
                <div key={evt.id} className="rounded-xl overflow-hidden border border-gray-800 bg-[#0d0e11] group">
                  <div className="aspect-video relative overflow-hidden">
                    {evt.cover_type === 'video' ? (
                      <video muted loop autoPlay playsInline className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" src={evt.cover_url} />
                    ) : (
                      <img src={evt.cover_url} alt={evt.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e11] via-transparent to-transparent"></div>
                  </div>
                  <div className="p-5">
                    <p className="font-serif text-white text-base font-medium mb-3">{evt.title}</p>
                    <button
                      onClick={() => onNavigate(`event/${evt.id}`)}
                      className="w-full py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500 hover:text-black text-amber-500 text-[10px] font-mono font-bold tracking-widest transition-colors"
                    >
                      VER INVITACIÓN
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION: Quienes Somos (About Section) */}
      <section id="about" className="py-24 border-t border-gray-900 bg-[#090a0d] px-6 relative">
        <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5 relative">
            <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-amber-500/40"></div>
            <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-amber-500/40"></div>
            <img 
              src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800" 
              alt="Quiénes Somos Celebra tu Evento" 
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
            <p className="text-amber-500 font-mono text-xs tracking-[0.4em] uppercase font-bold mb-3">CONOCE NUESTROS SERVICIOS</p>
            <h3 className="font-serif text-3xl md:text-4xl text-white font-light tracking-tight">Servicios Seleccionados para tu Celebración</h3>
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
            {services.map((srv, idx) => {
              const categoryLabel = getServiceCategoryLabel(srv.category);
              return (
              <div 
                key={idx} 
                className="overflow-hidden rounded-xl border border-gray-800 bg-[#0d0e11] hover:border-amber-500/40 transition-all group shadow-md cursor-pointer"
                onClick={() => setActiveServiceDetail({ title: srv.title, description: srv.description, image_url: srv.image_url, price: srv.price_estimated, categoryLabel })}
              >
                <div className="h-48 overflow-hidden relative">
                  <AdaptiveServiceImage
                    src={srv.image_url}
                    alt={srv.title}
                    className="w-full h-full"
                    imgClassName="group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/75 border border-amber-500/20 text-[9px] font-mono tracking-widest text-amber-500 uppercase font-semibold">
                    {categoryLabel}
                  </div>
                  <div className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-black/70 border border-amber-500/40 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <h4 className="font-serif text-lg text-white font-medium">{srv.title}</h4>
                  <p className="text-gray-400 text-xs font-light line-clamp-3 leading-relaxed">{srv.description}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-800/60 text-xs">
                    <span className="text-gray-500 font-mono">Estimado: <strong className="text-amber-500 font-medium">{srv.price_estimated}</strong></span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); triggerDirectWA(srv.title); }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black font-mono text-[10px] tracking-widest font-bold transition-all"
                    >
                      SOLICITAR INFO
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
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
              Explora una selección de bodas, graduaciones, XV años y galas corporativas producidas por el equipo de Celebra tu Evento.
            </p>

            {/* Filter Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mt-8">
              {[
                { id: 'todos', label: 'Todos los Eventos' },
                { id: 'bodas', label: 'Bodas' },
                { id: 'graduaciones', label: 'Graduaciones' },
                { id: 'galas_xv', label: 'XV Años & Galas' },
                { id: 'corporativos', label: 'Corporativos' },
                { id: 'infantiles', label: 'Infantiles' }
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

            {/* Search Input */}
            <div className="relative max-w-md mx-auto mt-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={gallerySearch}
                onChange={(e) => setGallerySearch(e.target.value)}
                placeholder="Buscar por nombre, lugar o descripción..."
                className="w-full pl-11 pr-4 py-3 rounded-full bg-[#0d0e12] border border-gray-800 text-white text-xs font-light placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Gallery Items Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGalleryItems.map(item => (
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
                  onClick={() => { setActiveGalleryItem(item); setActiveMediaIndex(0); }}
                >
                  {item.media[0]?.type === 'video' ? (
                    <video 
                      src={item.media[0].url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" 
                      muted 
                      loop 
                      autoPlay 
                      playsInline 
                    />
                  ) : (
                    <img 
                      src={item.media[0]?.url} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-transparent to-black/30"></div>
                  
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/80 border border-amber-500/30 text-amber-500 font-mono text-[9px] uppercase tracking-widest font-bold">
                    {item.categoryLabel}
                  </span>

                  {item.media.length > 1 && (
                    <span className="absolute top-3 right-3 px-2 py-1 rounded bg-black/80 border border-gray-700 text-gray-300 font-mono text-[9px] uppercase tracking-widest font-bold">
                      +{item.media.length} fotos
                    </span>
                  )}

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

          {filteredGalleryItems.length === 0 && (
            <p className="text-center text-gray-500 text-xs font-mono mt-10">
              No encontramos producciones que coincidan con tu búsqueda.
            </p>
          )}
        </div>
      </section>

      {/* Lightbox Modal for Gallery Media */}
      <AnimatePresence>
        {activeGalleryItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => setActiveGalleryItem(null)}
          >
            <div 
              className="relative max-w-5xl w-full bg-[#0d0e12] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/40">
                <div>
                  <h4 className="font-serif text-base text-white font-medium">{activeGalleryItem.title}</h4>
                  <p className="text-[11px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0 text-amber-500" />
                    {activeGalleryItem.location}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {activeGalleryItem.media.length > 1 && (
                    <span className="text-[11px] font-mono text-gray-400">{activeMediaIndex + 1} / {activeGalleryItem.media.length}</span>
                  )}
                  <button 
                    onClick={() => setActiveGalleryItem(null)}
                    className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="relative p-2 bg-black flex items-center justify-center min-h-[300px] h-[60vh] md:h-[65vh]">
                {activeGalleryItem.media[activeMediaIndex].type === 'video' ? (
                  <video 
                    key={activeGalleryItem.media[activeMediaIndex].url}
                    src={activeGalleryItem.media[activeMediaIndex].url} 
                    controls 
                    autoPlay 
                    className="max-h-full max-w-full w-auto h-auto rounded-lg" 
                  />
                ) : (
                  <img 
                    key={activeGalleryItem.media[activeMediaIndex].url}
                    src={activeGalleryItem.media[activeMediaIndex].url} 
                    alt={activeGalleryItem.title} 
                    className="max-h-full max-w-full w-auto h-auto object-contain rounded-lg" 
                    referrerPolicy="no-referrer" 
                  />
                )}

                {activeGalleryItem.media.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveMediaIndex(prev => (prev - 1 + activeGalleryItem.media.length) % activeGalleryItem.media.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/70 border border-gray-700 hover:border-amber-500/60 flex items-center justify-center text-gray-300 hover:text-amber-500 transition-colors"
                      aria-label="Foto anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActiveMediaIndex(prev => (prev + 1) % activeGalleryItem.media.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/70 border border-gray-700 hover:border-amber-500/60 flex items-center justify-center text-gray-300 hover:text-amber-500 transition-colors"
                      aria-label="Foto siguiente"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {activeGalleryItem.media.length > 1 && (
                <div className="flex gap-2 p-3 border-t border-gray-800 bg-black/30 overflow-x-auto">
                  {activeGalleryItem.media.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveMediaIndex(i)}
                      className={`shrink-0 h-14 w-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === activeMediaIndex ? 'border-amber-500' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      {m.type === 'video' ? (
                        <video src={m.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal for "Especialidades a la carta" service cards */}
      <AnimatePresence>
        {activeServiceDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => setActiveServiceDetail(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-2xl w-full max-h-[85vh] overflow-y-auto bg-[#0d0e12] border border-gray-800 rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setActiveServiceDetail(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/70 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {activeServiceDetail.image_url && (
                <div className="h-64 md:h-72 w-full overflow-hidden relative">
                  <AdaptiveServiceImage
                    src={activeServiceDetail.image_url}
                    alt={activeServiceDetail.title}
                    className="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-transparent to-transparent" />
                  {activeServiceDetail.categoryLabel && (
                    <div className="absolute top-4 left-4 px-2.5 py-1 rounded bg-black/75 border border-amber-500/20 text-[10px] font-mono tracking-widest text-amber-500 uppercase font-semibold">
                      {activeServiceDetail.categoryLabel}
                    </div>
                  )}
                </div>
              )}

              <div className="p-6 md:p-8 space-y-5">
                <h4 className="font-serif text-2xl md:text-3xl text-white font-medium">{activeServiceDetail.title}</h4>
                <p className="text-gray-300 text-sm font-light leading-relaxed whitespace-pre-line">{activeServiceDetail.description}</p>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-gray-800/60">
                  <span className="text-gray-400 font-mono text-xs">Estimado: <strong className="text-amber-500 font-medium">{activeServiceDetail.price}</strong></span>
                  <button 
                    onClick={() => { triggerDirectWA(activeServiceDetail.title); setActiveServiceDetail(null); }}
                    className="px-5 py-2.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-mono text-xs tracking-widest font-bold transition-all"
                  >
                    SOLICITAR INFO POR WHATSAPP
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION: Double interactive Public Quote Form */}
      <section id="cotizador-rapido" className="py-24 border-t border-gray-900 bg-[#07080a] px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-amber-500 font-mono text-xs tracking-[0.4em] uppercase font-bold mb-3">PRECOTIZADOR INMEDIATO</p>
            <h3 className="font-serif text-3xl md:text-4xl text-white font-light tracking-tight">Arma el presupuesto preliminar de tu evento</h3>
            <p className="text-gray-400 text-xs font-light mt-4 leading-relaxed">
              Selecciona los servicios que te interesan y obtén una precotización automática de alimentos y personal según el número de invitados. Los demás servicios se cotizan de forma personalizada y no se suman a este cálculo automático.
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
                  <h4 className="font-serif text-2xl text-white font-medium mt-3">¡Solicitud de Precotización Registrada con Éxito!</h4>
                  <p className="text-gray-400 text-xs max-w-md mx-auto mt-2 leading-relaxed">
                    Hemos guardado tus requerimientos en nuestro sistema Celebra tu Evento. Ya puedes descargar tu PDF de precotización o iniciar el contacto directo en WhatsApp para tu cotización real.
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
                    OTRA PRECOTIZACIÓN
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
                    {QUOTE_CATEGORIES.map((cat, idx) => {
                      const isSelected = quoteForm.selected_services.includes(cat.title);
                      return (
                        <div 
                          key={idx}
                          onClick={() => handleServiceSelect(cat.title)}
                          className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isSelected 
                              ? 'border-amber-500 bg-amber-500/5 text-white shadow-lg shadow-amber-500/5' 
                              : 'border-gray-800 bg-[#0a0b0d] hover:border-gray-700 text-gray-400'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-medium block">{cat.title}</span>
                            <span className="text-[10px] text-gray-500 font-light mt-0.5 block">{cat.note}</span>
                          </div>
                          <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                            isSelected ? 'bg-amber-500 border-amber-500 text-black' : 'border-gray-600'
                          }`}>
                            {isSelected && <CheckCircle className="w-3.5 h-3.5 text-black fill-black" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ESTIMADOR INICIAL DE ALIMENTOS Y PERSONAL (única parte con cálculo automático) */}
                <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-mono text-[10px] tracking-widest uppercase font-bold border border-amber-500/30">
                        ESTIMACIÓN AUTOMÁTICA
                      </span>
                      <h4 className="font-serif text-lg text-white font-medium mt-1">Estimador inicial de alimentos y personal</h4>
                      <p className="text-gray-500 text-[11px] font-light mt-1">Calcula una referencia aproximada de alimentos y apoyo operativo según el número de asistentes.</p>
                      <p className="text-amber-500/90 text-[10px] font-mono uppercase tracking-wide mt-1.5 font-semibold">Esta es tu precotización automática · no incluye los servicios adicionales marcados arriba</p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-[#0a0b0d] border border-gray-800 p-2 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setGuestsCount(Math.max(30, guestsCount - 10))}
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
                        onClick={() => setGuestsCount(Math.min(300, guestsCount + 10))}
                        className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:text-amber-500 hover:border-amber-500/40 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Selector de tipo de alimentos */}
                  <div className="space-y-2">
                    <label className="block text-gray-400 text-[11px] uppercase font-mono tracking-widest font-semibold">TIPO DE ALIMENTOS</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Taquiza', 'Cazuelada', 'Pozolada'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFoodType(type)}
                          className={`py-2.5 px-2 rounded-lg border text-xs font-mono font-semibold tracking-wide transition-all cursor-pointer ${
                            foodType === type
                              ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                              : 'border-gray-800 bg-[#0a0b0d] text-gray-400 hover:border-gray-700'
                          }`}
                        >
                          {type} <span className="block text-[9px] text-gray-500">${FOOD_PRICES[type]}/persona</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interactive slider */}
                  <div className="space-y-2">
                    <input 
                      type="range"
                      min={30}
                      max={300}
                      step={10}
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer bg-gray-800 h-2 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-gray-500">
                      <span>30 pax</span>
                      <span>165 pax</span>
                      <span>300 pax</span>
                    </div>
                  </div>

                  {/* Calculated metrics cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 bg-[#0a0b0d] border border-gray-800/80 rounded-xl">
                      <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                        <Utensils className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono font-bold uppercase">Servicio de alimentos</span>
                      </div>
                      <p className="font-mono text-sm font-semibold text-white">{foodType}</p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">Total: ${calculatedFoodTotal.toLocaleString('es-MX')} MXN</p>
                    </div>

                    <div className="p-3 bg-[#0a0b0d] border border-gray-800/80 rounded-xl">
                      <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono font-bold uppercase">Costo por persona</span>
                      </div>
                      <p className="font-mono text-sm font-semibold text-white">${foodPricePerPerson} MXN</p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">Según tipo de alimento</p>
                    </div>

                    <div className="p-3 bg-[#0a0b0d] border border-gray-800/80 rounded-xl">
                      <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono font-bold uppercase">Personal sugerido</span>
                      </div>
                      <p className="font-mono text-sm font-semibold text-white">{calculatedWaiters} {calculatedWaiters === 1 ? 'mesero' : 'meseros'}</p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">$600 / jornada de 5h c/u</p>
                    </div>

                    <div className="p-3 bg-[#0a0b0d] border border-gray-800/80 rounded-xl">
                      <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                        <Wine className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono font-bold uppercase">Rango preliminar</span>
                      </div>
                      <p className="font-mono text-xs font-bold text-amber-400">${totalPreliminar.toLocaleString('es-MX')} MXN</p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">Alimentos + meseros</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 font-light leading-relaxed pt-1">
                    Los valores mostrados son aproximados y funcionan como guía inicial. La propuesta final puede variar según ubicación, tipo de servicio, número de asistentes y requerimientos del evento.
                  </p>
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
                        <option value="Boda">Boda</option>
                        <option value="XV Años">XV Años</option>
                        <option value="Graduación">Graduación</option>
                        <option value="Cumpleaños">Cumpleaños</option>
                        <option value="Bautizo / Primera Comunión">Bautizo / Primera Comunión</option>
                        <option value="Evento corporativo">Evento corporativo</option>
                        <option value="Aniversario">Aniversario</option>
                        <option value="Otro">Otro</option>
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
                        placeholder="Ej. San Luis Potosí, Soledad, Villa de Reyes"
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
                        <option value="$5,000 – $15,000 MXN">$5,000 – $15,000 MXN</option>
                        <option value="$15,000 – $30,000 MXN">$15,000 – $30,000 MXN</option>
                        <option value="$30,000 – $50,000 MXN">$30,000 – $50,000 MXN</option>
                        <option value="$50,000 – $80,000 MXN">$50,000 – $80,000 MXN</option>
                        <option value="$80,000 – $120,000 MXN">$80,000 – $120,000 MXN</option>
                        <option value="$120,000 – $200,000 MXN">$120,000 – $200,000 MXN</option>
                        <option value="Más de $200,000 MXN">Más de $200,000 MXN</option>
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
                      Doy consentimiento para que Celebra tu Evento almacene mis datos de contacto de manera segura de acuerdo con su <strong className="underline cursor-pointer hover:text-amber-500" onClick={() => setActiveLegalDoc('privacy')}>Aviso de Privacidad</strong>, con la única finalidad de brindarme esta precotización y, posteriormente, mi cotización real personalizada vía WhatsApp o telefónica.
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
                    SOLICITAR MI COTIZACIÓN REAL POR WHATSAPP
                  </button>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleResetQuote}
                      className="flex-1 py-3 px-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-amber-500/40 text-gray-300 hover:text-white font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                      id="btn-form-reset-quote"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                      Limpiar / Hacer Otra Precotización
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

      {/* SECTION: FAQ (coincide con el FAQPage schema en index.html) */}
      <section id="preguntas-frecuentes" className="py-24 border-t border-gray-900 bg-[#090a0d] px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-amber-500 font-mono text-xs tracking-[0.4em] uppercase font-bold mb-3">PREGUNTAS FRECUENTES</p>
            <h2 className="font-serif text-3xl md:text-4xl text-white font-light tracking-tight">
              Todo sobre nuestros eventos en <span className="italic text-amber-500">San Luis Potosí</span>
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="border border-gray-800 rounded-xl bg-[#0a0b0d] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 py-4 px-5 text-left cursor-pointer"
                  >
                    <span className="text-white text-sm md:text-base font-medium">{item.question}</span>
                    <ChevronDown className={`w-4 h-4 text-amber-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="text-gray-400 text-sm font-light leading-relaxed px-5 pb-5">{item.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
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
              © 2026 CELEBRA TU EVENTO PLANEADOR DE EVENTOS. TODOS LOS DERECHOS RESERVADOS.
            </p>
            <p className="text-[10px] text-gray-600 font-mono mt-1 uppercase">
              {config.business_address}
            </p>
          </div>
          <div className="flex justify-center md:justify-end gap-6 text-[10px] font-mono tracking-wider text-gray-500">
            <button type="button" onClick={() => setActiveLegalDoc('privacy')} className="hover:text-amber-500 transition-colors cursor-pointer">Aviso de Privacidad</button>
            <span>•</span>
            <button type="button" onClick={() => setActiveLegalDoc('terms')} className="hover:text-amber-500 transition-colors cursor-pointer">Términos de Servicio</button>
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

      {/* Legal Modal: Aviso de Privacidad / Términos de Servicio */}
      <AnimatePresence>
        {activeLegalDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => setActiveLegalDoc(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-2xl w-full max-h-[85vh] overflow-y-auto bg-[#0d0e12] border border-gray-800 rounded-2xl shadow-2xl p-6 md:p-8"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveLegalDoc(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/70 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>

              {activeLegalDoc === 'privacy' ? (
                <div className="space-y-5 pr-6">
                  <div>
                    <h4 className="font-serif text-2xl text-white font-medium">Aviso de Privacidad</h4>
                    <p className="text-amber-500 text-xs font-mono mt-1">Celebra tu Evento</p>
                    <p className="text-gray-500 text-[11px] font-mono mt-2">Última actualización: 31 de julio de 2026</p>
                  </div>
                  <p className="text-gray-400 text-sm font-light leading-relaxed">
                    En Celebra tu Evento respetamos y protegemos la información personal de nuestros clientes y visitantes. Este Aviso de Privacidad explica qué datos recopilamos, para qué los usamos y cómo puedes ejercer tus derechos.
                  </p>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">1. Responsable de los datos</h5>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">
                      Celebra tu Evento es responsable del tratamiento de los datos personales que nos proporciones a través de nuestra página web, redes sociales, formularios de contacto y canales de mensajería (como WhatsApp o correo electrónico). Contacto: <strong className="text-amber-500 font-normal">integrandotugente@hotmail.com</strong>
                    </p>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">2. Datos que podemos recopilar</h5>
                    <ul className="text-gray-400 text-sm font-light leading-relaxed list-disc list-inside space-y-1">
                      <li>Nombre completo</li>
                      <li>Teléfono (principalmente WhatsApp)</li>
                      <li>Correo electrónico</li>
                      <li>Ciudad y lugar del evento</li>
                      <li>Tipo de evento (boda, XV años, graduación, etc.)</li>
                      <li>Número estimado de invitados y rango de presupuesto</li>
                      <li>Información adicional que tú decidas compartirnos sobre tu evento</li>
                    </ul>
                    <p className="text-gray-500 text-xs font-light mt-2">No solicitamos datos bancarios ni información financiera a través de formularios públicos.</p>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">3. Finalidades del tratamiento</h5>
                    <ul className="text-gray-400 text-sm font-light leading-relaxed list-disc list-inside space-y-1">
                      <li>Elaborar y enviarte cotizaciones de eventos</li>
                      <li>Dar seguimiento a tus solicitudes y dudas</li>
                      <li>Confirmar información necesaria para la organización del evento</li>
                      <li>Enviarte recordatorios, actualizaciones o cambios sobre tu servicio</li>
                      <li>Fines estadísticos internos para mejorar nuestros servicios</li>
                    </ul>
                    <p className="text-gray-500 text-xs font-light mt-2">Si te suscribes a alguna lista de difusión, también podremos enviarte promociones o novedades, siempre con opción a dejar de recibirlas.</p>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">4. Compartir información con terceros</h5>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">
                      Podemos compartir parte de tus datos solo con proveedores y colaboradores relacionados con tu evento (por ejemplo, foto, video, alimentos, show, hostess, etc.), únicamente con el propósito de cotizar y coordinar el servicio que tú solicitaste. No vendemos, rentamos ni cedemos tu información personal a terceros ajenos al servicio del evento.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">5. Conservación de los datos</h5>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">
                      Conservaremos tus datos mientras tengamos una relación activa contigo (cotización en curso o evento confirmado) y/o sea necesario para cumplir obligaciones legales o fiscales aplicables. Después de un tiempo razonable, tus datos podrán ser anonimizados o eliminados de nuestros registros activos.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">6. Derechos ARCO</h5>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">
                      Tienes derecho a Acceder, Rectificar, Cancelar y Oponerte al uso de tus datos personales. Para ejercer estos derechos, envía un correo a <strong className="text-amber-500 font-normal">integrandotugente@hotmail.com</strong> con tu nombre completo, medio de contacto y la petición concreta. Te responderemos en un plazo razonable.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">7. Uso de cookies y tecnologías similares</h5>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">
                      Nuestra página puede utilizar cookies y herramientas de análisis para mejorar la experiencia del usuario. Estas cookies no contienen información personal sensible y puedes desactivarlas desde la configuración de tu navegador.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">8. Cambios al Aviso de Privacidad</h5>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">
                      Podemos actualizar este Aviso de Privacidad en cualquier momento. La versión más reciente estará siempre disponible en nuestra página.
                    </p>
                  </div>

                  <p className="text-gray-500 text-xs font-light pt-3 border-t border-gray-800/60">
                    Dudas sobre este Aviso de Privacidad: <strong className="text-amber-500 font-normal">integrandotugente@hotmail.com</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-5 pr-6">
                  <div>
                    <h4 className="font-serif text-2xl text-white font-medium">Términos y Condiciones de Servicio</h4>
                    <p className="text-amber-500 text-xs font-mono mt-1">Celebra tu Evento</p>
                    <p className="text-gray-500 text-[11px] font-mono mt-2">Última actualización: 31 de julio de 2026</p>
                  </div>
                  <p className="text-gray-400 text-sm font-light leading-relaxed">
                    Al utilizar nuestra página web, formularios de contacto, redes sociales o servicios de cotización, aceptas los siguientes términos y condiciones:
                  </p>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">1. Descripción del servicio</h5>
                    <ul className="text-gray-400 text-sm font-light leading-relaxed list-disc list-inside space-y-1">
                      <li>Planeación y coordinación básica de eventos</li>
                      <li>Alimentos para evento (taquizas, cazueladas, pozoladas)</li>
                      <li>Barras y snacks</li>
                      <li>Fotografía, video y dron en colaboración con proveedores especializados</li>
                      <li>Hostess, edecanes y meseros</li>
                      <li>Show infantil Charlitron y animación</li>
                      <li>Invitaciones digitales</li>
                      <li>Restauración y enmarcado de fotografías</li>
                    </ul>
                    <p className="text-gray-500 text-xs font-light mt-2">Algunos servicios son realizados directamente por nuestro equipo y otros en coordinación con colaboradores y proveedores aliados.</p>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">2. Cotizaciones y estimaciones</h5>
                    <ul className="text-gray-400 text-sm font-light leading-relaxed list-disc list-inside space-y-1">
                      <li>Las cotizaciones emitidas son preliminares y pueden ajustarse según cambios en fecha, lugar, invitados, horario y logística.</li>
                      <li>La calculadora de la página web muestra un estimado inicial, no una cotización final ni un contrato.</li>
                      <li>Toda cotización tiene una vigencia limitada; después de esa fecha podrá actualizarse sin previo aviso.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">3. Reservaciones y pagos</h5>
                    <ul className="text-gray-400 text-sm font-light leading-relaxed list-disc list-inside space-y-1">
                      <li>Para confirmar un servicio se puede solicitar un anticipo, notificado en cada cotización.</li>
                      <li>El saldo restante deberá cubrirse en las condiciones y fechas acordadas previamente.</li>
                      <li>En caso de cancelación, las políticas de devolución de anticipo se especificarán en la cotización o acuerdo particular de cada evento.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">4. Colaboradores y proveedores</h5>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">
                      Trabajamos con una red de colaboradores y proveedores de confianza (taquizas y alimentos, fotógrafos y videógrafos, show y animación, hostess, edecanes y meseros). Celebra tu Evento coordina y supervisa, pero cada proveedor puede tener sus propias políticas específicas, las cuales te serán informadas en cada caso.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">5. Responsabilidades</h5>
                    <p className="text-gray-400 text-sm font-light leading-relaxed mb-2">Nos comprometemos a tratar a cada cliente con respeto y profesionalismo, cumplir en la medida de lo posible con los servicios contratados en la fecha, hora y lugar acordados, e informar con anticipación cualquier cambio necesario por causas de fuerza mayor.</p>
                    <p className="text-gray-400 text-sm font-light leading-relaxed mb-2">El cliente se compromete a proporcionar información veraz y actualizada, respetar horarios y condiciones pactadas, y cubrir en tiempo los pagos y anticipos acordados.</p>
                    <p className="text-gray-500 text-xs font-light">Celebra tu Evento no será responsable por cancelaciones o cambios por causas de fuerza mayor (clima extremo, cierres de recintos, restricciones oficiales, etc.) ni por daños causados por asistentes, terceros o situaciones fuera de nuestro control directo.</p>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">6. Uso del sitio web</h5>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">
                      El contenido del sitio (textos, imágenes, logotipos) es propiedad de Celebra tu Evento y no puede utilizarse sin autorización. Cualquier uso indebido del sitio o intento de afectar su funcionamiento puede derivar en restricciones de acceso.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-serif text-white font-medium mb-1">7. Actualizaciones de términos</h5>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">
                      Podemos modificar estos Términos y Condiciones en cualquier momento. Los cambios se publicarán en nuestra página y entrarán en vigor a partir de su publicación.
                    </p>
                  </div>

                  <p className="text-gray-500 text-xs font-light pt-3 border-t border-gray-800/60">
                    Dudas sobre estos términos: <strong className="text-amber-500 font-normal">integrandotugente@hotmail.com</strong>
                  </p>
                </div>
              )}

              <button
                onClick={() => setActiveLegalDoc(null)}
                className="mt-6 w-full py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black font-mono text-xs tracking-widest font-bold transition-all cursor-pointer"
              >
                VOLVER AL SITIO
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
