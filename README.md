# Tarjetas Digitales de Eventos & Sistema de Gestión (Event Planner SaaS)

Plataforma integral para la creación, personalización y administración de Invitaciones / Tarjetas Digitales de Eventos, pases de acceso con código QR, control de confirmaciones RSVP, cotizador en vivo, checklist de proveedores y módulo de auditoría de comprobantes de pago.

---

## 🚀 Características Principales

1. **Gestión de Eventos y Pases Digitales con QR:**
   - Creación de eventos (Bodas, XV Años, Cumpleaños, Corporativos).
   - Generación de pases individuales con código QR de seguridad.
   - Confirmación de asistencia RSVP en línea y check-in en puerta.

2. **Auditoría & Verificación de Comprobantes de Pago (Admin Supremo):**
   - Módulo exclusivo de revisión de transferencias, fichas de depósito y abonos enviadas por clientes.
   - Estatus en tiempo real: `En Revisión`, `Recibido / Verificado` y `Rechazado`.
   - Adjunto de imágenes de capturas con visor e historial de observaciones del administrador.

3. **Checklist & Control de Proveedores (Panel de Cliente):**
   - Seguimiento de contrataciones (Música, Fotografía, Banquete, Florería, etc.).
   - Estado de pago y montos acordados.

4. **Cotizador Interactivo & Exportación a PDF:**
   - Cálculo instantáneo de cotizaciones para clientes con desglose de servicios.
   - Descarga directa en PDF profesional y envío a WhatsApp.

5. **Modo Híbrido (Supabase + Fallback LocalStorage):**
   - Funciona instantáneamente con almacenamiento local y se sincroniza automáticamente con Supabase cuando se configuran las credenciales en `.env`.

---

## 🛠️ Instalación y Uso Local

### 1. Clonar e Instalar Dependencias
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd <NOMBRE_DEL_PROYECTO>
npm install
```

### 2. Configurar Variables de Entorno
Copia el archivo de ejemplo `.env.example` a `.env`:
```bash
cp .env.example .env
```
Edita `.env` con tus credenciales (opcional para Supabase):
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
GEMINI_API_KEY=tu_api_key_de_gemini
```

### 3. Ejecutar Servidor de Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 4. Compilar para Producción
```bash
npm run build
```

---

## 📂 Estructura del Proyecto

```text
├── src/
│   ├── components/
│   │   ├── AdminDashboard.tsx     # Panel de administración e inspección de pagos/eventos
│   │   ├── ClientDashboard.tsx    # Panel de control para el cliente del evento
│   │   ├── LandingPage.tsx        # Portada, cotizador en vivo y captura de leads
│   │   ├── LoginPage.tsx          # Autenticación e inicio de sesión
│   │   └── MicrositePage.tsx      # Micrositio de invitación pública y pase QR
│   ├── lib/
│   │   ├── pdfGenerator.ts        # Exportación de cotizaciones a PDF
│   │   └── supabase.ts            # Servicio de base de datos (Supabase + LocalStorage)
│   ├── types.ts                   # Interfaces y tipos de TypeScript
│   ├── App.tsx                    # Componente principal y router
│   └── main.tsx                   # Punto de entrada Vite/React
├── .env.example                   # Ejemplo de variables de entorno
├── .gitignore                     # Exclusiones de Git
├── package.json                   # Dependencias y scripts del proyecto
└── README.md                      # Documentación del proyecto
```

---

## 📄 Licencia

Este proyecto está listo para ser migrado a tu repositorio privado de Git y desplegado en producción (Vercel, Netlify, Cloud Run o Supabase).
