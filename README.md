# FEPY Frontend - Sistema de Facturación Electrónica SIFEN

Proyecto frontend del sistema de facturación electrónica para Paraguay (SIFEN) construido con Vue.js 3 y Vuetify 3.

## 📋 Descripción

Interfaz de usuario moderna y responsiva para gestionar facturas electrónicas, empresas, y monitorear el procesamiento en tiempo real.

**Características principales:**
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión multi-empresa
- ✅ Monitoreo de cola de procesos
- ✅ Historial de facturas con filtros
- ✅ Generación y gestión de API Keys
- ✅ Diseño Material Design con Vuetify 3

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│           Frontend (Vue.js 3)           │
│  ┌───────────┐  ┌──────────────────┐   │
│  │ Dashboard │  │ Gestión Empresas │   │
│  ├───────────┤  ├──────────────────┤   │
│  │ Facturas  │  │ Cola de Procesos │   │
│  ├───────────┤  ├──────────────────┤   │
│  │ API Keys  │  │ Logs/Auditoría   │   │
│  └───────────┘  └──────────────────┘   │
└─────────────────────────────────────────┘
                    │
                    │ HTTP/REST
                    ▼
         ┌─────────────────────┐
         │   Backend (API)     │
         │   Puerto: 8081      │
         └─────────────────────┘
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 14+
- Backend corriendo en puerto 8081

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/jaranetwork/fepy-frontend.git
cd fepy-frontend

# Instalar dependencias
npm install
```

### Ejecución

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción (build)
npm run build
npm run preview
```

## 📁 Estructura del Proyecto

```
fepy-frontend/
├── src/
│   ├── components/
│   │   ├── DashboardView.vue       # Panel principal
│   │   ├── InvoiceListView.vue     # Lista de facturas
│   │   ├── InvoiceDetailView.vue   # Detalle de factura
│   │   ├── EmpresasView.vue        # Gestión de empresas
│   │   ├── EmpresaSelector.vue     # Selector de empresa
│   │   ├── QueueStatusView.vue     # Monitor de cola
│   │   ├── ApiKeysView.vue         # API Keys
│   │   ├── LogsView.vue            # Logs de operaciones
│   │   └── LoginView.vue           # Login
│   ├── App.vue                     # Componente principal
│   ├── main.js                     # Punto de entrada
│   └── auth.js                     # Autenticación
├── public/
├── package.json
├── vite.config.js
└── README.md
```

## 🎯 Componentes Principales

### DashboardView

Panel principal con:
- Estadísticas generales
- Gráficos de facturas por estado
- Últimas facturas procesadas
- Accesos rápidos

### QueueStatusView

Monitor de cola en tiempo real:
- Jobs en espera
- Jobs procesando
- Jobs completados
- Jobs fallidos
- Actualización cada 5 segundos

### EmpresasView

Gestión multi-empresa:
- Alta, baja y modificación de empresas
- Carga de certificados .p12
- Configuración de CSC, ID CSC, Timbrado
- Activación/desactivación de empresas

### InvoiceListView

Lista de facturas con:
- Filtros por estado, fecha, empresa
- Búsqueda por CDC, correlativo
- Exportación a CSV
- Paginación

## 🔐 Autenticación

El sistema usa **JWT Tokens**:

```javascript
// Login
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

// Respuesta
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {...}
}

// Uso en peticiones
Authorization: Bearer <TOKEN>
```

## 🎨 Personalización

### Tema (Vuetify)

Editar `src/main.js`:

```javascript
const vuetify = createVuetify({
  theme: {
    themes: {
      light: {
        colors: {
          primary: '#1976D2',    // Azul
          secondary: '#424242',  // Gris
          accent: '#82B1FF',     // Celeste
          error: '#FF5252',      // Rojo
          success: '#4CAF50',    // Verde
          warning: '#FFC107'     // Amarillo
        }
      }
    }
  }
})
```

### Logo y Branding

Reemplazar en `src/App.vue`:
```vue
<v-toolbar-title>Sistema de Facturación Electrónica SIFEN</v-toolbar-title>
```

## 📡 Comunicación con el Backend

El frontend usa **Axios** con interceptores:

```javascript
// src/main.js
axios.defaults.baseURL = 'http://localhost:8081';

// Interceptor para agregar token
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para errores
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## 🔧 Build para Producción

```bash
# Generar build optimizado
npm run build

# El output va a dist/
# Los archivos están listos para servir con nginx, Apache, etc.

# Vista previa local
npm run preview
```

### Ejemplo con Nginx

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /var/www/fepy-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para API
    location /api/ {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 Testing

```bash
# No hay tests configurados actualmente
# Para agregar Vitest:
npm install -D vitest @vue/test-utils

# Ejecutar tests
npm run test
```

## 📦 Dependencias Principales

| Dependencia | Versión | Propósito |
|-------------|---------|-----------|
| vue | 3.2.13 | Framework principal |
| vuetify | 3.3.0 | UI Framework |
| vue-router | 4.0.3 | Enrutamiento |
| axios | 1.4.0 | HTTP Client |
| chart.js | 4.3.0 | Gráficos |
| vue-chartjs | 5.x | Gráficos para Vue |

## 🌐 Rutas Disponibles

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | DashboardView | Panel principal |
| `/login` | LoginView | Login de usuario |
| `/invoices` | InvoiceListView | Lista de facturas |
| `/invoices/:id` | InvoiceDetailView | Detalle de factura |
| `/empresas` | EmpresasView | Gestión de empresas |
| `/queue-status` | QueueStatusView | Monitor de cola |
| `/api-keys` | ApiKeysView | API Keys |
| `/logs` | LogsView | Logs de operaciones |


## 📚 Recursos

- [Vue.js Documentation](https://vuejs.org/)
- [Vuetify Documentation](https://vuetifyjs.com/)
- [Chart.js Documentation](https://www.chartjs.org/)

## 📄 Licencia

MIT

## 👥 Autores

Jara Network
