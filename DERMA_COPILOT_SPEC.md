# 🏥 DERMA COPILOT - Especificación Técnica Completa

**MVP Production-Ready | 60 días de desarrollo**

---

## 📋 TABLA DE CONTENIDOS

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Stack Técnico](#stack-técnico)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Routes & Components](#frontend-routes--components)
7. [Prompts de IA para Dermatología](#prompts-de-ia-para-dermatología)
8. [Integraciones Externas](#integraciones-externas)
9. [Checklist de Desarrollo](#checklist-de-desarrollo)
10. [Instrucciones para Claude Code](#instrucciones-para-claude-code)

---

## 🎯 VISIÓN GENERAL

**Nombre:** DERMA COPILOT
**Objetivo:** Asistente IA que convierte dermatólogos en especialistas comerciales
**MVP Scope:** 5 módulos core + CRM básico + integraciones

### Módulos del MVP

| Módulo | Descripción | Prioridad |
|--------|-------------|-----------|
| Análisis de Caso | Foto + síntomas → diagnóstico + plan | P0 |
| Asistente de Consulta | Chat en tiempo real durante cita | P0 |
| Generador de Reportes | Notas → historia clínica formateada | P0 |
| Asesor Comercial | Scripts + paquetes de venta | P1 |
| Automatizaciones | Google Calendar + WhatsApp + SMS | P1 |

---

## 🏗️ ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│  ┌──────────────┬──────────────┬──────────────┐              │
│  │ Auth         │ Dashboard    │ Pacientes    │              │
│  │ Login/Signup │ Home         │ Gestión      │              │
│  └──────────────┴──────────────┴──────────────┘              │
│  ┌──────────────┬──────────────┬──────────────┐              │
│  │ Análisis     │ Consulta     │ Reportes     │              │
│  │ Foto+IA      │ Chat         │ Gen.         │              │
│  └──────────────┴──────────────┴──────────────┘              │
│  ┌──────────────┬──────────────┐                             │
│  │ Asesor       │ Automatizac. │                             │
│  │ Comercial    │ Integ.       │                             │
│  └──────────────┴──────────────┘                             │
└─────────────────────────────────────────────────────────────┘
                        ↓ API REST
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js/Express)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Routes & Controllers                                 │   │
│  │ - Auth (JWT)                                         │   │
│  │ - Dermatólogos                                       │   │
│  │ - Pacientes                                          │   │
│  │ - Análisis                                           │   │
│  │ - Consultas                                          │   │
│  │ - Reportes                                           │   │
│  │ - Transacciones                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Services & Business Logic                            │   │
│  │ - IA Service (Claude API)                            │   │
│  │ - Image Processing (vision)                          │   │
│  │ - Report Generation                                  │   │
│  │ - Payment Service (Stripe)                           │   │
│  │ - Integration Service (Google, Meta, WhatsApp)       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Middleware                                           │   │
│  │ - Authentication                                     │   │
│  │ - Error Handling                                     │   │
│  │ - Logging                                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL + Supabase)               │
│  Tablas: dermatologos, pacientes, casos, consultas,         │
│  reportes, transacciones, integraciones, sesiones_chat      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│            EXTERNAL INTEGRATIONS                             │
│  ┌──────────────┬──────────────┬──────────────┐              │
│  │ Claude API   │ Stripe       │ Google Calc. │              │
│  │ (Visión+Text)│ (Pagos)      │ (Agenda)     │              │
│  └──────────────┴──────────────┴──────────────┘              │
│  ┌──────────────┬──────────────┐                             │
│  │ Meta Pixel   │ Twilio/      │                             │
│  │ (Tracking)   │ WhatsApp API │                             │
│  └──────────────┴──────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 STACK TÉCNICO

### Frontend
- **Framework:** React 18 + Next.js 14 (SSR)
- **Styling:** Tailwind CSS
- **State Management:** Zustand o Context API
- **HTTP Client:** Axios
- **Image Upload:** React Dropzone + Cloudinary
- **Charts/Graphs:** Recharts (para analytics)
- **UI Components:** Headless UI + Radix UI
- **Forms:** React Hook Form + Zod validation
- **Authentication:** NextAuth.js (JWT)

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 15+
- **ORM:** Prisma
- **Authentication:** JWT (jsonwebtoken)
- **File Upload:** Multer + Cloudinary
- **API Documentation:** Swagger/OpenAPI
- **Validation:** Zod
- **Logging:** Winston
- **Environment:** dotenv

### Infrastructure & Deployment
- **Database Host:** Supabase (PostgreSQL managed)
- **Backend Deploy:** Vercel, Railway, o Render
- **Frontend Deploy:** Vercel
- **Image Storage:** Cloudinary
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry

### External APIs
- **Claude API:** Vision + Text Generation (Anthropic)
- **Stripe:** Payment processing
- **Google Calendar API:** Lectura/escritura de eventos
- **Google OAuth:** Autenticación
- **Meta Conversions API:** Pixel tracking
- **Twilio:** SMS/WhatsApp messaging
- **SendGrid:** Email transaccional

---

## 🗄️ DATABASE SCHEMA

### Tabla: dermatologos
```sql
CREATE TABLE dermatologos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255),
  especialidad VARCHAR(100) DEFAULT 'Dermatología',
  numero_cedula VARCHAR(50) UNIQUE,
  telefono VARCHAR(20),
  clinica VARCHAR(255),
  direccion_clinica TEXT,
  ciudad VARCHAR(100),
  pais VARCHAR(100),
  foto_perfil VARCHAR(500),
  bio TEXT,
  
  -- Integraciones
  google_calendar_token TEXT,
  google_calendar_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  meta_pixel_id VARCHAR(255),
  whatsapp_business_id VARCHAR(255),
  
  -- Datos de negocio
  precio_consulta DECIMAL(10, 2),
  moneda VARCHAR(3) DEFAULT 'USD',
  plan_suscripcion VARCHAR(50) DEFAULT 'free',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### Tabla: pacientes
```sql
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dermatologist_id UUID NOT NULL REFERENCES dermatologos(id),
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255),
  email VARCHAR(255),
  telefono VARCHAR(20),
  whatsapp VARCHAR(20),
  
  -- Datos demográficos
  edad INT,
  genero VARCHAR(20),
  ciudad VARCHAR(100),
  pais VARCHAR(100),
  
  -- Historial
  fecha_primer_contacto TIMESTAMP DEFAULT NOW(),
  fuente_contacto VARCHAR(100), -- 'Instagram Ads', 'Google', 'Referencia', etc.
  meta_ad_id VARCHAR(255), -- Para tracking
  
  -- Estado
  estado VARCHAR(50) DEFAULT 'nuevo', -- nuevo, consultado, en_tratamiento, completado
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(dermatologist_id, email)
);
```

### Tabla: casos
```sql
CREATE TABLE casos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  dermatologist_id UUID NOT NULL REFERENCES dermatologos(id),
  
  -- Información clínica
  tipo_lesion VARCHAR(100), -- acne, psoriasis, vitiligo, etc.
  descripcion TEXT,
  localizacion_cuerpo VARCHAR(100),
  duracion_lesion VARCHAR(100),
  tratamientos_previos TEXT,
  
  -- Fotos
  foto_url VARCHAR(500),
  foto_cloudinary_id VARCHAR(255),
  
  -- Análisis IA
  analisis_ia JSON, -- { diagnóstico, diferencial, recomendaciones }
  
  -- Plan de tratamiento
  diagnostico VARCHAR(255),
  plan_tratamiento TEXT,
  sesiones_estimadas INT,
  duracion_tratamiento_dias INT,
  precio_estimado DECIMAL(10, 2),
  
  -- Estado
  estado VARCHAR(50) DEFAULT 'analizado', -- analizado, propuesto, aceptado, en_tratamiento
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: consultas
```sql
CREATE TABLE consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL REFERENCES casos(id),
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  dermatologist_id UUID NOT NULL REFERENCES dermatologos(id),
  
  -- Chat
  contenido_chat JSONB, -- Array de {role, content, timestamp}
  
  -- Notas
  notas_dermatolog TEXT,
  hallazgos_clinicos TEXT,
  
  -- Sugerencias IA
  sugerencias_ia JSONB, -- Array de sugerencias durante la consulta
  
  -- Resultado
  diagnostico_final VARCHAR(255),
  plan_final TEXT,
  medicamentos_recetados JSONB,
  
  fecha_consulta TIMESTAMP DEFAULT NOW(),
  duracion_minutos INT,
  proximo_seguimiento TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: reportes
```sql
CREATE TABLE reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id UUID NOT NULL REFERENCES consultas(id),
  caso_id UUID NOT NULL REFERENCES casos(id),
  dermatologist_id UUID NOT NULL REFERENCES dermatologos(id),
  
  -- Contenido
  titulo VARCHAR(255),
  contenido_html TEXT,
  contenido_pdf VARCHAR(500), -- URL del PDF generado
  
  -- Generación
  generado_por_ia BOOLEAN DEFAULT true,
  template_usado VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: transacciones
```sql
CREATE TABLE transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dermatologist_id UUID NOT NULL REFERENCES dermatologos(id),
  paciente_id UUID REFERENCES pacientes(id),
  caso_id UUID REFERENCES casos(id),
  
  -- Pago
  stripe_payment_id VARCHAR(255) UNIQUE,
  monto DECIMAL(10, 2) NOT NULL,
  moneda VARCHAR(3) DEFAULT 'USD',
  concepto VARCHAR(255), -- deposito, consulta, paquete
  
  -- Estado
  estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, completado, rechazado, reembolsado
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: sesiones_chat
```sql
CREATE TABLE sesiones_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dermatologist_id UUID NOT NULL REFERENCES dermatologos(id),
  caso_id UUID REFERENCES casos(id),
  
  -- Chat
  mensajes JSONB, -- Array de {role: 'user'|'assistant', content, timestamp}
  contexto_caso JSONB, -- Info del caso para contexto de IA
  
  -- Estado
  activa BOOLEAN DEFAULT true,
  tipo_sesion VARCHAR(50) DEFAULT 'consulta', -- consulta, analisis, asesor
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: integraciones
```sql
CREATE TABLE integraciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dermatologist_id UUID NOT NULL REFERENCES dermatologos(id),
  
  -- Tokens seguros (encriptados en BD)
  google_access_token VARCHAR(1000),
  google_refresh_token VARCHAR(1000),
  stripe_api_key VARCHAR(255),
  
  -- Status
  google_calendar_conectado BOOLEAN DEFAULT false,
  stripe_conectado BOOLEAN DEFAULT false,
  whatsapp_conectado BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API ENDPOINTS

### Authentication
```
POST   /api/auth/register          - Registro de dermatólogo
POST   /api/auth/login             - Login
POST   /api/auth/logout            - Logout
POST   /api/auth/refresh-token     - Refresh JWT
GET    /api/auth/me                - Obtener perfil actual
```

### Dermatólogos
```
GET    /api/dermatologos/:id       - Obtener perfil
PATCH  /api/dermatologos/:id       - Actualizar perfil
GET    /api/dermatologos/:id/stats - Estadísticas (pacientes, ingresos)
```

### Pacientes
```
GET    /api/pacientes              - Listar pacientes del dermatólogo
POST   /api/pacientes              - Crear nuevo paciente
GET    /api/pacientes/:id          - Obtener paciente
PATCH  /api/pacientes/:id          - Actualizar paciente
DELETE /api/pacientes/:id          - Eliminar paciente
GET    /api/pacientes/:id/casos    - Casos del paciente
```

### Casos (Análisis de Foto)
```
POST   /api/casos                  - Crear nuevo caso (subir foto + síntomas)
GET    /api/casos/:id              - Obtener caso
PATCH  /api/casos/:id              - Actualizar caso
GET    /api/casos/:id/analisis     - Obtener análisis IA
POST   /api/casos/:id/analisis     - Generar análisis IA (foto + síntomas)
GET    /api/casos/:id/propuesta    - Obtener propuesta de venta
POST   /api/casos/:id/propuesta    - Generar propuesta comercial
```

### Consultas (Chat + Asistente)
```
GET    /api/consultas              - Listar consultas
POST   /api/consultas              - Crear nueva consulta
GET    /api/consultas/:id          - Obtener consulta
POST   /api/consultas/:id/mensaje  - Enviar mensaje al asistente IA
GET    /api/consultas/:id/sugerencias - Obtener sugerencias IA para caso
```

### Reportes
```
GET    /api/reportes               - Listar reportes
POST   /api/reportes               - Generar reporte (desde consulta)
GET    /api/reportes/:id           - Obtener reporte
GET    /api/reportes/:id/pdf       - Descargar como PDF
POST   /api/reportes/:id/enviar    - Enviar reporte a paciente
```

### Asesor Comercial
```
POST   /api/asesor/script-venta    - Generar script de venta personalizado
POST   /api/asesor/paquetes        - Generar paquetes de tratamiento
POST   /api/asesor/presupuesto     - Generar presupuesto para paciente
GET    /api/asesor/estadisticas    - Estadísticas de conversión
```

### Automatizaciones
```
POST   /api/automatizaciones/whatsapp - Enviar mensaje WhatsApp a paciente
POST   /api/automatizaciones/sms      - Enviar SMS recordatorio
GET    /api/automatizaciones/calendar - Obtener eventos Google Calendar
POST   /api/automatizaciones/calendar - Crear evento en Google Calendar
POST   /api/automatizaciones/reminders - Configurar recordatorios automáticos
```

### Transacciones & Pagos
```
GET    /api/transacciones          - Listar transacciones
POST   /api/transacciones/pagar    - Crear pago (Stripe)
GET    /api/transacciones/:id      - Estado del pago
POST   /api/transacciones/:id/webhook - Webhook de Stripe
```

### Integraciones
```
GET    /api/integraciones/google   - Estado integración Google
POST   /api/integraciones/google/conectar - Conectar Google Calendar
POST   /api/integraciones/google/desconectar - Desconectar
GET    /api/integraciones/stripe   - Estado integración Stripe
POST   /api/integraciones/stripe/conectar - Conectar Stripe
```

---

## 🖥️ FRONTEND ROUTES & COMPONENTS

### Rutas Principales
```
/                           - Landing (si no autenticado)
/login                      - Login
/register                   - Registro
/dashboard                  - Home (dashboard principal)

/pacientes                  - Gestión de pacientes
/pacientes/nuevo            - Crear paciente
/pacientes/:id              - Detalle paciente

/casos                      - Mis casos
/casos/nuevo                - Nuevo caso (análisis)
/casos/:id                  - Detalle caso
/casos/:id/analisis         - Vista análisis IA
/casos/:id/propuesta        - Propuesta de venta

/consultas                  - Historial de consultas
/consultas/:id              - Detalle consulta (chat)

/reportes                   - Mis reportes
/reportes/:id               - Ver reporte

/asesor-comercial           - Herramienta de asesor
/asesor-comercial/scripts   - Scripts de venta
/asesor-comercial/paquetes  - Paquetes de tratamiento

/perfil                     - Configuración personal
/integraciones              - Conectar plataformas
/facturacion                - Historial de pagos
```

### Componentes Clave
```
Auth/
  ├── LoginForm
  ├── RegisterForm
  └── ProtectedRoute

Dashboard/
  ├── StatsCards (pacientes, ingresos, conversiones)
  ├── RecentPatients
  ├── RecentCases
  └── QuickActions

Pacientes/
  ├── PatientList
  ├── PatientForm
  ├── PatientDetail
  └── PatientTimeline

Casos/
  ├── CaseForm (foto + síntomas)
  ├── CaseAnalysis (resultado IA)
  ├── ProposalGenerator
  └── CaseTimeline

Consultas/
  ├── ConsultationChat (interface de chat)
  ├── MessageInput
  ├── AISuggestions
  └── ConsultationNotes

Reportes/
  ├── ReportTemplate
  ├── ReportPreview
  └── ReportActions

Asesor/
  ├── SalesScriptGenerator
  ├── PackageBuilder
  └── BudgetCalculator

Common/
  ├── Navbar
  ├── Sidebar
  ├── Modal
  ├── Button
  ├── Input
  ├── Loader
  └── Toast
```

---

## 🤖 PROMPTS DE IA PARA DERMATOLOGÍA

### 1. ANÁLISIS DE CASO (Visión + Texto)

**Prompt Base para Análisis Visual:**
```
Eres un dermatólogo experto asistiendo en análisis de lesiones de piel.

Analiza la imagen enviada y proporciona:

1. DESCRIPCIÓN CLÍNICA
   - Tipo de lesión (pápula, placa, nódulo, etc.)
   - Color, tamaño estimado, bordes
   - Distribución y patrón

2. DIAGNÓSTICO DIFERENCIAL (en orden de probabilidad)
   - Diagnóstico más probable (con % confianza)
   - Diagnósticos alternativos
   - Diagnósticos a descartar

3. RECOMENDACIONES INICIALES
   - Pruebas diagnósticas sugeridas
   - Posibles tratamientos (orden de preferencia)
   - Cuándo derivar a especialista

4. EDUCACIÓN PACIENTE
   - Explicación simple de qué es la lesión
   - Pronóstico esperado
   - Factores de riesgo a evitar

5. ESTIMACIÓN COMERCIAL
   - Número probable de sesiones de tratamiento
   - Duración aproximada (en semanas)
   - Costo estimado (rango)

Información contextual:
- Ubicación lesión: {ubicacion}
- Duración síntomas: {duracion}
- Tratamientos previos: {tratamientos_previos}
- Edad paciente: {edad}

Responde en JSON con estructura clara.
```

### 2. ASISTENTE DE CONSULTA (Chat Contextual)

**Prompt Base para Chat:**
```
Eres un asistente IA para dermatólogos durante consultas.

Tu rol:
1. Sugerir preguntas clave que falte hacer
2. Recordar datos del paciente y caso anterior
3. Proponer diagnósticos basado en síntomas descritos
4. Generar educación del paciente (explicación simple)
5. Ayudar con decisiones de tratamiento

Contexto de caso:
- Paciente: {nombre_paciente}
- Lesión anterior: {tipo_lesion_anterior}
- Caso actual: {descripcion_caso}
- Historial: {historial_medico}

El dermatólogo escribirá síntomas/observaciones. Tú responde siempre en este formato:

{
  "preguntas_sugeridas": ["Pregunta 1?", "Pregunta 2?"],
  "diagnosticos_posibles": [{"diagnostico": "X", "probabilidad": "70%"}],
  "plan_recomendado": "Texto con plan de tratamiento",
  "educacion_paciente": "Explicación simple para el paciente",
  "proximos_pasos": "Qué hacer después de esta consulta"
}

Sé conciso, clínico pero comprensible.
```

### 3. GENERADOR DE REPORTES

**Prompt Base:**
```
Eres un redactor médico profesional. Genera una historia clínica formal basado en estos datos:

Información paciente:
- Nombre: {nombre}
- Edad: {edad}
- Diagnóstico: {diagnostico}

Datos de consulta:
- Síntomas: {sintomas}
- Hallazgos: {hallazgos}
- Plan: {plan}
- Medicamentos: {medicamentos}

Genera un reporte en formato HTML que incluya:
1. ENCABEZADO (clínica, dermatólogo, fecha)
2. ANTECEDENTES (historia del paciente)
3. EXAMEN FÍSICO (hallazgos clínicos)
4. IMPRESIÓN DIAGNÓSTICA
5. PLAN DE TRATAMIENTO (con detalles)
6. MEDICAMENTOS PRESCRITOS
7. SEGUIMIENTO (próxima cita)
8. FIRMA DIGITAL

Usa estilos profesionales. HTML válido.
```

### 4. ASESOR COMERCIAL (Scripts + Paquetes)

**Prompt Base para Scripts:**
```
Eres un experto en ventas de servicios dermatológicos de alto ticket.

Genera un script de venta personalizado basado en:
- Tipo de lesión: {tipo_lesion}
- Presupuesto estimado: {presupuesto}
- Perfil paciente: {perfil} (turismo médico / local / etc)

El script debe:
1. Abre con empatía (reconocer el problema del paciente)
2. Educación (explicar por qué el tratamiento funciona)
3. Opciones (presenta 2-3 paquetes)
4. Justificación de precio (valor, no costo)
5. Cierre (crear urgencia sin presión)
6. Objeción manejo (respuestas a preguntas comunes)

Responde en formato JSON con cada sección.
```

**Prompt Base para Paquetes:**
```
Diseña 3 paquetes de tratamiento para este caso:

Diagnóstico: {diagnostico}
Sesiones recomendadas: {sesiones}
Precio por sesión: ${precio_sesion}
Duración: {duracion_semanas} semanas

Crea:
1. PAQUETE STARTER - Precio accesible, beneficio básico
2. PAQUETE ESTÁNDAR - Recomendado, mejor valor
3. PAQUETE PREMIUM - Máximo resultado, incluye extras

Para cada uno especifica:
- Sesiones
- Productos incluidos
- Precio total
- Descuento vs sesiones sueltas
- Qué lo hace especial
- A quién dirigir (tipo paciente)

Responde en JSON.
```

### 5. ANÁLISIS DE FOTOS (Vision API)

**Instrucción para Claude Code:**
```javascript
// El prompt que envías a Claude Vision debe incluir:

const visionPrompt = `
Analiza esta fotografía de una lesión de piel.

Proporciona un análisis dermatológico profesional que incluya:
1. Características morfológicas observadas
2. Diagnósticos diferenciales (en orden de probabilidad)
3. Factores pronósticos
4. Recomendaciones de tratamiento
5. Cuándo derivar a especialista

Sé específico pero educativo. Recuerda que el resultado será compartido con el paciente.

Contexto adicional:
- Localización: ${lesionLocation}
- Duración: ${lesionDuration}
- Tratamientos previos: ${previousTreatments}
`;
```

---

## 🔗 INTEGRACIONES EXTERNAS

### Google Calendar API
```javascript
// .env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

// Funcionalidades:
// 1. Leer eventos del calendario
// 2. Crear evento automáticamente cuando se agenda cita
// 3. Enviar reminders 24h antes
// 4. Sincronizar disponibilidad
```

### Stripe API
```javascript
// .env
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...

// Funcionalidades:
// 1. Crear Payment Intent para depósitos
// 2. Procesar pagos en chat
// 3. Guardar métodos de pago
// 4. Webhooks para confirmación
// 5. Reportes de ingresos
```

### Claude API (Visión + Generación)
```javascript
// .env
ANTHROPIC_API_KEY=...

// Modelos:
// - claude-opus-4-1-vision-20250805 (para análisis de fotos)
// - claude-opus-4-1-20250805 (para generación de texto)

// Funcionalidades:
// 1. Analizar imágenes de lesiones
// 2. Generar reportes
// 3. Chat contextual
// 4. Scripts de venta
// 5. Educación de pacientes
```

### Meta Conversions API
```javascript
// .env
META_PIXEL_ID=...
META_ACCESS_TOKEN=...

// Eventos a trackear:
// 1. Lead (cuando dermatólogo obtiene paciente de anuncio)
// 2. Purchase (cuando paciente completa pago)
// 3. Custom: CaseAnalyzed, ProposalSent, AppointmentBooked
```

### Twilio (WhatsApp + SMS)
```javascript
// .env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

// Funcionalidades:
// 1. Enviar propuestas de venta vía WhatsApp
// 2. Recordatorios de cita (SMS)
// 3. Confirmación de pago
// 4. Educación post-consulta
```

---

## ✅ CHECKLIST DE DESARROLLO

### SEMANA 1-2: SETUP + AUTH + BASE

- [ ] Crear repos (backend + frontend)
- [ ] Configurar base de datos PostgreSQL en Supabase
- [ ] Crear schema SQL completo
- [ ] Configurar variables de entorno (.env)
- [ ] Setup Express.js con estructura básica
- [ ] Setup Next.js con estructura básica
- [ ] Implementar autenticación JWT (login/register)
- [ ] Crear middleware de autenticación
- [ ] Crear componentes de login/registro
- [ ] Testing de autenticación en frontend

### SEMANA 3-4: CRUD PACIENTES + DASHBOARD

- [ ] Endpoints CRUD para pacientes
- [ ] Endpoints CRUD para dermatólogos
- [ ] Frontend: Listar pacientes
- [ ] Frontend: Crear/editar paciente
- [ ] Frontend: Dashboard con estadísticas básicas
- [ ] Frontend: Navbar + Sidebar
- [ ] Testing API de pacientes
- [ ] Validaciones en frontend y backend

### SEMANA 5-6: MÓDULO 1 - ANÁLISIS DE CASO

- [ ] Endpoint para subir foto (Cloudinary integration)
- [ ] Endpoint para análisis IA (Claude Vision API)
- [ ] Frontend: Upload foto + síntomas
- [ ] Frontend: Mostrar análisis IA en tiempo real
- [ ] Frontend: Mostrar propuesta de venta generada
- [ ] Almacenar análisis en BD
- [ ] Testing con imágenes reales
- [ ] Refinamiento de prompts dermatológicos

### SEMANA 7-8: MÓDULO 2 - CHAT ASISTENTE

- [ ] Crear tabla sesiones_chat
- [ ] Endpoint para enviar mensaje al chat
- [ ] Lógica de contexto de caso en Claude
- [ ] Frontend: Interface de chat
- [ ] Frontend: Mostrar sugerencias IA
- [ ] Almacenar historial de conversación
- [ ] Testing de contexto
- [ ] Manejo de errores

### SEMANA 9-10: MÓDULO 3 - GENERADOR REPORTES

- [ ] Endpoint para generar reporte (HTML)
- [ ] Lógica para exportar PDF
- [ ] Frontend: Mostrar preview de reporte
- [ ] Frontend: Botón para descargar/enviar
- [ ] Integración con Stripe para envío
- [ ] Testing de templates
- [ ] Customización de reportes

### SEMANA 11-12: MÓDULO 4 - ASESOR COMERCIAL

- [ ] Endpoint para generar scripts de venta
- [ ] Endpoint para generar paquetes
- [ ] Frontend: Interface de asesor
- [ ] Frontend: Copy-paste de scripts
- [ ] Frontend: Visualización de paquetes
- [ ] Testing de prompts comerciales
- [ ] Almacenar sugerencias en BD

### SEMANA 13-14: MÓDULO 5 - AUTOMATIZACIONES

- [ ] Integración Google Calendar API
- [ ] Endpoint para crear evento en calendar
- [ ] Integración Twilio (SMS/WhatsApp)
- [ ] Endpoint para enviar propuestas vía WhatsApp
- [ ] Crear eventos automáticos al agendar
- [ ] Frontend: Conectar Google Calendar
- [ ] Frontend: Configurar recordatorios
- [ ] Testing de integraciones

### SEMANA 15: PAGOS + META TRACKING

- [ ] Integración Stripe
- [ ] Endpoint para Payment Intent
- [ ] Frontend: Botón de pago en chat
- [ ] Meta Pixel eventos
- [ ] Webhook para confirmación Stripe
- [ ] Testing de pagos
- [ ] Seguridad PCI compliance

### SEMANA 16-17: POLISH + SEGURIDAD

- [ ] Testing end-to-end completo
- [ ] Optimización de performance
- [ ] Manejo de errores robusto
- [ ] Logging y monitoring
- [ ] Documentación de API (Swagger)
- [ ] Security audit
- [ ] Rate limiting
- [ ] CORS configurado

### SEMANA 18: DEPLOYMENT + BETA

- [ ] Deploy backend (Vercel/Railway)
- [ ] Deploy frontend (Vercel)
- [ ] DNS configurado
- [ ] SSL certificate
- [ ] Email transaccional (SendGrid)
- [ ] Sentry para error tracking
- [ ] Beta access setup
- [ ] Documentación para usuarios

---

## 🚀 INSTRUCCIONES PARA CLAUDE CODE

### Paso 1: Clonar el Repo

```bash
# Crear estructura base
mkdir derma-copilot
cd derma-copilot

# Crear carpetas
mkdir backend frontend
```

### Paso 2: Setup Backend (Node.js)

```bash
cd backend

npm init -y

# Instalar dependencias principales
npm install express dotenv cors jwt jsonwebtoken bcrypt
npm install axios stripe nodemailer 
npm install @anthropic-ai/sdk
npm install prisma @prisma/client
npm install multer cloudinary dotenv-safe
npm install zod express-validator
npm install winston
npm install express-rate-limit

# Dev dependencies
npm install -D nodemon tsx typescript @types/express @types/node

# Crear estructura
mkdir src/routes src/controllers src/services src/middleware src/utils src/models
touch src/index.ts .env.example
```

### Paso 3: Setup Frontend (React + Next.js)

```bash
cd ../frontend

npx create-next-app@latest . --typescript --tailwind --app

# Instalar librerías adicionales
npm install zustand axios next-auth
npm install react-dropzone react-hook-form zod
npm install recharts
npm install @headlessui/react @radix-ui/react-*

# Crear estructura
mkdir src/components src/pages/api src/services src/utils src/hooks
```

### Paso 4: Estructura de Base de Datos

**Crear en Supabase:**
- Proyecto PostgreSQL
- Ejecutar script SQL completo (arriba)
- Generar Prisma schema
- Crear políticas Row Level Security

### Paso 5: Variables de Entorno

**Backend .env:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_key_here
NODE_ENV=development
PORT=3001

# Anthropic
ANTHROPIC_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Cloudinary
CLOUDINARY_NAME=...
CLOUDINARY_KEY=...
CLOUDINARY_SECRET=...

# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Meta
META_PIXEL_ID=...
META_ACCESS_TOKEN=...
```

**Frontend .env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_KEY=...
```

### Paso 6: Empezar a Codear

**Con Claude Code en VS:**
1. Abre la carpeta `derma-copilot` en VS Code
2. Abre Claude Code (Ctrl+K en VS Code)
3. Copia-pega esta spec completa
4. Pide: "Empezar con autenticación JWT en backend"
5. Claude Code generará el código
6. Revisa, ajusta, commita a Git

### Paso 7: Testing Iterativo

Después de cada módulo:
1. Test local con Postman/Insomnia (backend)
2. Test en browser (frontend)
3. Ajusta prompts de IA basado en resultado
4. Commita a main cuando funcione

---

## 📝 NOTAS IMPORTANTES

1. **IA Prompts:** Los prompts de dermatología arriba son base. Refínalos con dermatólogos reales en entrevistas.

2. **Seguridad:** 
   - Hash passwords con bcrypt
   - JWT tokens en httpOnly cookies
   - Valida input en backend siempre
   - Rate limiting en endpoints públicos

3. **Performance:**
   - Caché de análisis IA (mismo tipo lesión = mismo diagnóstico)
   - Lazy load de imágenes
   - Optimizar llamadas a API externa

4. **Errores:**
   - Si Claude API falla, mostrar error amigable al user
   - Reintentos automáticos para transacciones
   - Logs detallados para debugging

5. **Monitoreo:**
   - Usar Sentry para errores en producción
   - Google Analytics para tracking de features
   - Webhook logs para pagar confirmaciones

---

## 🎯 OBJETIVO FINAL

En 60 días:
- ✅ MVP en producción
- ✅ 5 módulos funcionales
- ✅ Integrado con Claude API + Stripe + Google Calendar
- ✅ Listo para demostración en diplomado
- ✅ Base para escalar a usuarios reales

**Let's build! 🚀**
