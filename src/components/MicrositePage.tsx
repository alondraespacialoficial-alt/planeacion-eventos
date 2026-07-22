/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Music, 
  Volume2, 
  VolumeX, 
  Share2, 
  Sparkles, 
  UserCheck, 
  ArrowLeft,
  ChevronDown,
  Info,
  ShieldCheck,
  Check,
  QrCode,
  Download,
  Printer,
  Ticket,
  CheckCircle,
  Images
} from 'lucide-react';
import { Event, RSVP } from '../types';
import { AppService } from '../lib/supabase';

interface MicrositePageProps {
  eventId: string;
  onNavigate: (route: string) => void;
}

export default function MicrositePage({ eventId, onNavigate }: MicrositePageProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // RSVP Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [attendance, setAttendance] = useState<'confirmed' | 'declined'>('confirmed');
  const [plusOnes, setPlusOnes] = useState(0);
  const [notes, setNotes] = useState('');
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedRsvp, setSubmittedRsvp] = useState<RSVP | null>(null);
  
  // Background Music Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Legal terms expansion
  const [showLegalDialog, setShowLegalDialog] = useState<boolean>(false);
  const [legalType, setLegalType] = useState<'privacy' | 'terms'>('privacy');

  useEffect(() => {
    async function loadEvent() {
      setLoading(true);
      try {
        const data = await AppService.getEventById(eventId);
        if (data) {
          setEvent(data);
          setError(null);
        } else {
          setError('El evento solicitado no existe o no se encuentra activo.');
        }
      } catch (err) {
        setError('Error al cargar la información del evento.');
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [eventId]);

  // Play/pause the background audio track when the user toggles the music control
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Countdown timer logic
  useEffect(() => {
    if (!event) return;

    const targetDate = new Date(`${event.date}T${event.time}:00`).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [event]);

  const handleSubmitRSVP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!name.trim()) return alert('Por favor ingresa tu nombre.');
    if (!email.trim()) return alert('Por favor ingresa tu correo electrónico.');
    if (!phone.trim()) return alert('Por favor ingresa tu número telefónico.');
    if (!consentPrivacy || !consentTerms) {
      return alert('Debes aceptar el aviso de privacidad y los términos de servicio para continuar.');
    }

    setSubmitting(true);
    try {
      const created = await AppService.submitRSVP({
        event_id: event.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        attendance: attendance,
        plus_ones: attendance === 'confirmed' ? plusOnes : 0,
        notes: notes.trim(),
        consent_privacy: consentPrivacy,
        consent_terms: consentTerms
      });
      setSubmittedRsvp(created);
      setSubmitSuccess(true);
    } catch (err) {
      alert('Hubo un problema al registrar tu asistencia. Por favor vuelve a intentarlo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/#event/${eventId}`;
    navigator.clipboard.writeText(shareUrl);
    alert('¡Enlace de invitación copiado al portapapeles!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070809] flex items-center justify-center text-white font-sans">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-t-2 border-amber-500 animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-mono tracking-widest text-gray-500 uppercase">Cargando Invitación Exclusiva...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#070809] flex items-center justify-center text-white px-6 font-sans">
        <div className="text-center max-w-md">
          <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <Info className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="font-serif text-2xl mb-2 text-white">Invitación no encontrada</h2>
          <p className="text-gray-400 text-sm mb-8 font-light leading-relaxed">
            {error || 'El micrositio privado solicitado no está disponible en este momento.'}
          </p>
          <button 
            onClick={() => onNavigate('landing')}
            className="px-6 py-3 rounded-full border border-gray-800 hover:border-amber-500/50 text-xs tracking-widest font-mono text-gray-300 hover:text-white transition-all flex items-center gap-2 mx-auto"
            id="btn-error-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            VOLVER AL INICIO
          </button>
        </div>
      </div>
    );
  }

  const isEventClosed = event.status !== 'active';
  const rsvpDeadlinePassed = new Date() > new Date(`${event.rsvp_deadline}T23:59:59`);

  return (
    <div className="min-h-screen bg-[#08090b] text-gray-200 font-sans relative selection:bg-amber-400 selection:text-black pb-20">
      
      {/* Dynamic Cover Asset (Image or Video) */}
      <section className="h-screen w-full relative flex items-center justify-center overflow-hidden">
        {event.cover_type === 'video' ? (
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover opacity-50 scale-105"
            src={event.cover_url}
          />
        ) : (
          <img 
            className="absolute inset-0 w-full h-full object-cover opacity-55 scale-105"
            src={event.cover_url}
            alt={event.title}
            referrerPolicy="no-referrer"
          />
        )}
        
        {/* Soft elegant vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#08090b]/40 via-[#08090b]/60 to-[#08090b]"></div>
        
        {/* Ambient Floating Particle Effect (visual style reinforcement) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.04)_0,transparent_100%)]"></div>

        {/* Floating Controls */}
        {event.show_branding !== false && (
          <div className="absolute top-6 left-6 z-30">
            <button 
              onClick={() => onNavigate('landing')}
              className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 hover:border-amber-500/50 text-[10px] tracking-widest font-mono text-gray-300 hover:text-white transition-all flex items-center gap-2"
              id="microsite-back-home"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              AURA STUDIO
            </button>
          </div>
        )}

        <div className="absolute top-6 right-6 z-30 flex items-center gap-2">
          {event.music_url && (
            <>
              <audio ref={audioRef} src={event.music_url} loop preload="none" />
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-amber-400 hover:scale-105 transition-all flex items-center justify-center"
                title="Música de ambiente"
                id="btn-play-music"
              >
                {isPlaying ? <Volume2 className="w-4 h-4 animate-bounce" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
              </button>
            </>
          )}
          
          <button 
            onClick={handleCopyLink}
            className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:text-amber-400 hover:scale-105 transition-all"
            title="Compartir tarjeta"
            id="btn-share-card"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Centered Invitation Title Card */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto mt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2 }}
          >
            <p className="font-mono text-xs tracking-[0.5em] text-amber-400 uppercase mb-4">NUESTRA INVITACIÓN EXCLUSIVA</p>
            <div className="w-12 h-[1px] bg-amber-500/40 mx-auto mb-8"></div>
            
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-light tracking-wide text-white leading-snug mb-6">
              {event.title}
            </h1>
            
            <p className="font-serif italic font-light text-amber-100/80 text-lg md:text-xl max-w-xl mx-auto leading-relaxed mb-12">
              "{event.description}"
            </p>

            <a 
              href="#ceremony-details"
              className="inline-flex items-center justify-center p-3 rounded-full border border-amber-500/20 hover:border-amber-500 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 transition-all text-xs tracking-widest font-mono"
            >
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Gallery: Nuestra Historia */}
      {event.gallery_urls && event.gallery_urls.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-20 relative" id="our-story">
          <div className="text-center mb-12">
            <div className="h-10 w-10 rounded-full border border-amber-500/30 flex items-center justify-center bg-amber-500/10 mx-auto mb-4">
              <Images className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-[10px] tracking-[0.3em] font-mono text-gray-500 uppercase mb-2">Momentos que atesoramos</p>
            <h2 className="font-serif text-3xl text-white font-light">Nuestra Historia</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {event.gallery_urls.map((url, index) => (
              <div key={index} className="aspect-square rounded-xl overflow-hidden border border-gray-800 group">
                <img 
                  src={url} 
                  alt={`Momento ${index + 1}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ceremony Details & Timer */}
      <section id="ceremony-details" className="max-w-4xl mx-auto px-6 py-20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
        
        {/* Countdown component */}
        <div className="mb-20 text-center">
          <p className="text-[10px] tracking-[0.3em] font-mono text-gray-500 uppercase mb-6">CUENTA REGRESIVA PARA EL EVENTO</p>
          <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
            <div className="bg-[#121317]/80 border border-gray-800/80 p-4 rounded-xl">
              <span className="block font-serif text-2xl md:text-3xl text-amber-400 font-light">{timeLeft.days}</span>
              <span className="text-[9px] font-mono tracking-widest text-gray-500 uppercase">Días</span>
            </div>
            <div className="bg-[#121317]/80 border border-gray-800/80 p-4 rounded-xl">
              <span className="block font-serif text-2xl md:text-3xl text-amber-400 font-light">{timeLeft.hours}</span>
              <span className="text-[9px] font-mono tracking-widest text-gray-500 uppercase">Horas</span>
            </div>
            <div className="bg-[#121317]/80 border border-gray-800/80 p-4 rounded-xl">
              <span className="block font-serif text-2xl md:text-3xl text-amber-400 font-light">{timeLeft.minutes}</span>
              <span className="text-[9px] font-mono tracking-widest text-gray-500 uppercase">Mins</span>
            </div>
            <div className="bg-[#121317]/80 border border-gray-800/80 p-4 rounded-xl">
              <span className="block font-serif text-2xl md:text-3xl text-amber-400 font-light">{timeLeft.seconds}</span>
              <span className="text-[9px] font-mono tracking-widest text-gray-500 uppercase">Segs</span>
            </div>
          </div>
        </div>

        {/* Date, Time, Venue card */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="p-8 rounded-2xl border border-gray-800 bg-[#0e1013]/90 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-full bg-amber-500/5 border border-amber-500/15 flex items-center justify-center text-amber-400 mb-6">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl text-white mb-2">Cuándo</h3>
              <p className="text-gray-400 text-sm font-light leading-relaxed mb-4">
                Aparta la fecha en tu calendario para acompañarnos en esta magnífica celebración.
              </p>
            </div>
            <div className="border-t border-gray-800/80 pt-4 mt-6">
              <p className="font-serif text-lg text-white font-medium mb-1">
                {new Date(`${event.date}T00:00:00`).toLocaleDateString('es-MX', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="font-mono text-xs text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                A las {event.time} hrs
              </p>
            </div>
          </div>

          <div className="p-8 rounded-2xl border border-gray-800 bg-[#0e1013]/90 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-full bg-amber-500/5 border border-amber-500/15 flex items-center justify-center text-amber-400 mb-6">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl text-white mb-2">Dónde</h3>
              <p className="text-gray-400 text-sm font-light leading-relaxed mb-4">
                El evento se llevará a cabo en una locación excepcional equipada con todas las comodidades.
              </p>
            </div>
            <div className="border-t border-gray-800/80 pt-4 mt-6">
              <p className="font-serif text-lg text-white font-medium mb-1">{event.location_name}</p>
              <p className="text-xs text-gray-500 leading-relaxed font-sans">{event.location_address}</p>
            </div>
          </div>
        </div>

        {/* Location Map */}
        <div className="rounded-2xl overflow-hidden border border-gray-800 bg-[#0e1013] shadow-2xl relative">
          <div className="p-4 bg-black/40 border-b border-gray-800/80 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-gray-400 uppercase flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              MAPA DE GEOLOCALIZACIÓN
            </span>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_name + ' ' + event.location_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-amber-400 hover:underline tracking-wider"
            >
              ABRIR EN WAZE / MAPS
            </a>
          </div>
          <div className="aspect-[16/9] w-full bg-gray-900/40 relative">
            {event.map_embed_url ? (
              <iframe
                title="Google Maps Location"
                src={event.map_embed_url}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="filter invert grayscale opacity-80"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-gray-900 to-black">
                <MapPin className="w-10 h-10 text-amber-500/40 mb-3 animate-bounce" />
                <p className="font-serif text-white text-base font-light mb-1">{event.location_name}</p>
                <p className="text-xs text-gray-500 max-w-sm">{event.location_address}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* RSVP RSVP Form Section */}
      <section className="max-w-xl mx-auto px-6 py-12 relative z-10" id="rsvp-section">
        <div className="rounded-2xl border border-amber-500/20 bg-[#0e1013]/95 backdrop-blur-md p-8 relative overflow-hidden shadow-2xl">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-[50px] pointer-events-none"></div>

          <div className="text-center mb-8">
            <div className="h-10 w-10 rounded-full border border-amber-500/30 flex items-center justify-center bg-amber-500/10 mx-auto mb-4">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="font-serif text-2xl text-white font-light tracking-wide">Confirmación de Asistencia</h2>
            <p className="text-xs text-gray-500 font-mono tracking-wider uppercase mt-1">RSVP • CONFIRMA TU LUGAR</p>
            <div className="w-10 h-[1px] bg-amber-500/40 mx-auto mt-4"></div>
          </div>

          {isEventClosed ? (
            <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
              <p className="font-serif text-amber-400 text-lg mb-1">El RSVP se encuentra cerrado</p>
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                Este evento ya no está aceptando nuevas confirmaciones de asistencia.
              </p>
            </div>
          ) : rsvpDeadlinePassed ? (
            <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
              <p className="font-serif text-amber-400 text-lg mb-1">Fecha límite expirada</p>
              <p className="text-xs text-gray-400 font-light leading-relaxed mb-4">
                La fecha límite para confirmar fue el {new Date(`${event.rsvp_deadline}T12:00:00`).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}.
              </p>
            </div>
          ) : submitSuccess ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {attendance === 'confirmed' ? (
                <div className="bg-[#0b0c10] border-2 border-amber-500/60 rounded-3xl overflow-hidden shadow-2xl relative">
                  {/* Pass Header */}
                  <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5" />
                      <span className="font-mono text-xs font-bold tracking-widest uppercase">PASE DIGITAL DE ACCESO VIP</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-black/20 px-2.5 py-0.5 rounded font-bold">
                      {event.title.split(' ')[0]}
                    </span>
                  </div>

                  <div className="p-6 sm:p-8 space-y-6 text-center">
                    <div>
                      <span className="text-[10px] font-mono text-amber-500 tracking-widest uppercase font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                        {1 + (submittedRsvp?.plus_ones || plusOnes)} LUGAR(ES) RESERVADO(S)
                      </span>
                      <h3 className="font-serif text-2xl text-white mt-3 font-semibold">{submittedRsvp?.name || name}</h3>
                      <p className="text-xs text-gray-400 font-light mt-1">Presenta este código en la recepción del evento para tu acceso directo.</p>
                    </div>

                    {/* QR Code Container */}
                    <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center border-4 border-amber-500/40 shadow-inner my-4 relative">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${submittedRsvp?.pass_code || 'PASS-DIGITAL-CHARLITRON'}`} 
                        alt="Código QR de Acceso" 
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="p-3 bg-black/60 rounded-xl border border-gray-800 font-mono text-center space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">CÓDIGO DE FOLIO UNICO</p>
                      <p className="text-lg text-amber-400 font-bold tracking-widest">{submittedRsvp?.pass_code || 'PASS-849201'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left text-xs font-mono border-t border-b border-gray-800 py-4">
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase">FECHA</p>
                        <p className="text-white font-medium">📅 {event.date}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase">HORARIO</p>
                        <p className="text-white font-medium">⏰ {event.time} HRS</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[9px] text-gray-500 uppercase">LUGAR</p>
                        <p className="text-white font-medium truncate">📍 {event.location_name}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={() => window.print()}
                        className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        GUARDAR / IMPRIMIR PASE
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Ya confirmé mi asistencia a ${event.title}. Mi código de acceso es ${submittedRsvp?.pass_code || 'PASS-849201'}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-3 px-4 rounded-xl border border-gray-800 hover:border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold tracking-wider transition-colors flex items-center justify-center gap-2"
                      >
                        ENVIAR AL CELULAR
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-amber-400 text-lg mb-2">Respuesta Registrada</h4>
                  <p className="text-xs text-gray-300 font-light leading-relaxed mb-6">
                    Lamentamos que no nos puedas acompañar en esta ocasión. Muchas gracias por avisar a los anfitriones.
                  </p>
                  <div className="p-3 bg-black/40 rounded border border-gray-800 text-[11px] text-gray-500 font-mono">
                    Registrado el {new Date().toLocaleDateString('es-MX')}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <form onSubmit={handleSubmitRSVP} className="space-y-6">
              
              {/* Attendance Selection */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-3">¿ASISTIRÁS AL EVENTO?</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setAttendance('confirmed')}
                    className={`p-3.5 rounded-xl border text-xs tracking-wider font-mono font-medium transition-all ${
                      attendance === 'confirmed' 
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400' 
                        : 'border-gray-800 bg-[#121316]/60 hover:bg-gray-800/40 text-gray-400'
                    }`}
                  >
                    SÍ, ASISTIRÉ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendance('declined')}
                    className={`p-3.5 rounded-xl border text-xs tracking-wider font-mono font-medium transition-all ${
                      attendance === 'declined' 
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400' 
                        : 'border-gray-800 bg-[#121316]/60 hover:bg-gray-800/40 text-gray-400'
                    }`}
                  >
                    NO PODRÉ ASISTIR
                  </button>
                </div>
              </div>

              {/* Guest Name */}
              <div>
                <label htmlFor="rsvp-name" className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2">NOMBRE COMPLETO</label>
                <input
                  id="rsvp-name"
                  type="text"
                  required
                  placeholder="Ej. Roberto Gómez Martínez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#121317] border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/80 transition-colors"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rsvp-email" className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2">CORREO ELECTRÓNICO</label>
                  <input
                    id="rsvp-email"
                    type="email"
                    required
                    placeholder="Ej. correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#121317] border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/80 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="rsvp-phone" className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2">WHATSAPP / TELÉFONO</label>
                  <input
                    id="rsvp-phone"
                    type="tel"
                    required
                    placeholder="Ej. 5512345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#121317] border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/80 transition-colors"
                  />
                </div>
              </div>

              {/* Plus Ones (Only if confirmed) */}
              {attendance === 'confirmed' && (
                <div>
                  <label htmlFor="rsvp-plusones" className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2">NÚMERO DE ACOMPAÑANTES ({plusOnes})</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPlusOnes(Math.max(0, plusOnes - 1))}
                      className="w-10 h-10 rounded-lg border border-gray-800 bg-[#121317] flex items-center justify-center text-lg hover:border-amber-500/40 transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <div className="w-14 text-center font-mono text-sm text-white font-bold">
                      {plusOnes}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPlusOnes(plusOnes + 1)}
                      className="w-10 h-10 rounded-lg border border-gray-800 bg-[#121317] flex items-center justify-center text-lg hover:border-amber-500/40 transition-colors cursor-pointer"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-gray-500 font-light font-sans ml-2">Adicionales a ti</span>
                  </div>
                </div>
              )}

              {/* Special dietary / comments */}
              <div>
                <label htmlFor="rsvp-notes" className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-2">NOTAS ESPECIALES O ALERGIAS</label>
                <textarea
                  id="rsvp-notes"
                  placeholder="Ej. Un acompañante requiere menú vegetariano, alergia a mariscos o felicitaciones."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-[#121317] border border-gray-800 rounded-xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/80 transition-colors resize-none"
                />
              </div>

              {/* Legal Checklist (GDPR / Privacy Consent) */}
              <div className="space-y-3.5 pt-2 border-t border-gray-900">
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center h-5">
                    <input
                      id="consent-privacy"
                      type="checkbox"
                      required
                      checked={consentPrivacy}
                      onChange={(e) => setConsentPrivacy(e.target.checked)}
                      className="h-4 w-4 bg-[#121317] border-gray-800 text-amber-500 focus:ring-0 rounded"
                    />
                  </div>
                  <div className="text-xs">
                    <label htmlFor="consent-privacy" className="text-gray-400 font-light leading-snug cursor-pointer select-none">
                      He leído y acepto el{' '}
                      <button 
                        type="button" 
                        onClick={() => { setLegalType('privacy'); setShowLegalDialog(true); }}
                        className="text-amber-400 hover:underline font-normal inline bg-transparent p-0 m-0 border-none cursor-pointer"
                      >
                        Aviso de Privacidad
                      </button>
                      . Consiento el tratamiento de mis datos de contacto para la confirmación de este evento.
                    </label>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="flex items-center h-5">
                    <input
                      id="consent-terms"
                      type="checkbox"
                      required
                      checked={consentTerms}
                      onChange={(e) => setConsentTerms(e.target.checked)}
                      className="h-4 w-4 bg-[#121317] border-gray-800 text-amber-500 focus:ring-0 rounded"
                    />
                  </div>
                  <div className="text-xs">
                    <label htmlFor="consent-terms" className="text-gray-400 font-light leading-snug cursor-pointer select-none">
                      Acepto los{' '}
                      <button 
                        type="button" 
                        onClick={() => { setLegalType('terms'); setShowLegalDialog(true); }}
                        className="text-amber-400 hover:underline font-normal inline bg-transparent p-0 m-0 border-none cursor-pointer"
                      >
                        Términos de Servicio
                      </button>{' '}
                      y doy mi consentimiento expreso para almacenar mis respuestas.
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs tracking-widest font-bold font-mono transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                id="btn-rsvp-submit"
              >
                {submitting ? (
                  <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-black" />
                    REGISTRAR ASISTENCIA SEGURA
                  </>
                )}
              </button>

              {/* Small trust note */}
              <p className="text-[10px] text-gray-600 text-center font-mono uppercase tracking-wider">
                🔒 CONEXIÓN CIFRADA SEGURO CON SUPABASE RLS
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Legal Dialog Overlay */}
      {showLegalDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#0e1013] p-6 shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-4">
              <h3 className="font-serif text-lg text-amber-400">
                {legalType === 'privacy' ? 'Aviso de Privacidad Simplificado' : 'Términos y Condiciones'}
              </h3>
              <button 
                onClick={() => setShowLegalDialog(false)}
                className="text-gray-500 hover:text-white font-mono text-sm"
              >
                Cerrar [X]
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto text-xs text-gray-400 font-light leading-relaxed space-y-3.5 pr-2">
              {legalType === 'privacy' ? (
                <>
                  <p><strong>Responsable del Tratamiento:</strong> Aura Studio Digital y los Organizadores Privados del evento "{event.title}".</p>
                  <p><strong>Finalidades:</strong> Recopilamos sus datos únicamente con el fin de cuantificar y validar su asistencia, necesidades de alimentación y número de acompañantes para la planeación del evento.</p>
                  <p><strong>Datos Recabados:</strong> Nombre completo, dirección de correo electrónico, número de teléfono WhatsApp, número de acompañantes y especificaciones de notas/comentarios.</p>
                  <p><strong>Transferencias:</strong> Sus datos se almacenan de manera segura en la base de datos Supabase con protección Row Level Security y solo se comparten con el anfitrión/cliente del evento.</p>
                  <p>Usted puede revocar su consentimiento para el uso de sus datos enviando un correo al anfitrión del evento.</p>
                </>
              ) : (
                <>
                  <p>Al hacer uso de este micrositio y enviar el formulario de Confirmación RSVP, usted acepta las siguientes condiciones:</p>
                  <p>1. Certifica que la información ingresada es real y corresponde a su persona.</p>
                  <p>2. Consiente que el anfitrión del evento reciba de manera inmediata su número de acompañantes y notas de servicio en su panel de administración para la organización de mesas y banquetes.</p>
                  <p>3. Aura Studio Digital proporciona este canal interactivo de manera tecnológica, sin embargo, la logística, cancelación o reprogramación del evento es de absoluta responsabilidad de los anfitriones.</p>
                  <p>4. No se permite la duplicación de confirmaciones con correos maliciosos.</p>
                </>
              )}
            </div>

            <div className="border-t border-gray-800/80 pt-4 mt-6 flex justify-end">
              <button
                onClick={() => setShowLegalDialog(false)}
                className="px-5 py-2 rounded-full bg-amber-500 text-black text-xs font-mono font-bold tracking-widest hover:bg-amber-400"
              >
                ENTENDIDO
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
