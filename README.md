# 🏖️ Dolphin Beach — Sistema de Gestión Operativa v2.0

PWA completa de gestión para Dolphin Beach.  
Sin dependencias. Sin instalación. Solo abre `index.html`.

---

## 🚀 INSTALACIÓN Y EJECUCIÓN

### Opción 1 — Abrir directamente (más fácil)
1. Extrae el ZIP en cualquier carpeta
2. Abre `index.html` en Chrome, Edge o Firefox
3. ¡Listo!

### Opción 2 — Servidor local (recomendado para PWA completa)

```bash
# Con Python 3 (incluido en macOS/Linux)
cd dolphin-beach-v2
python3 -m http.server 8080
# Abrir: http://localhost:8080

# Con Node.js (npx)
npx serve .
# Abrir: http://localhost:3000
```

---

## 🔐 CREDENCIALES DE ACCESO

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| `admin` | `admin123` | Administrador | Todo el sistema |
| `registrador` | `reg123` | Registrador | Registro de entrada + reportes |
| `op_playa` | `playa123` | Operador Playa | Vista churuatas playa (solo lectura) |
| `op_isla` | `isla123` | Operador Isla | Gestión Isla El Rey |

---

## 🗺️ MÓDULOS DEL SISTEMA

### 📊 Dashboard (Admin)
- KPIs en tiempo real: total, ocupadas, disponibles, ingresos
- Barras de ocupación por sección
- Accesos rápidos a módulos

### 🏖️ Churuatas Playa (Admin / Op. Playa)
- 81 churuatas totales: 27 Islote + 40 Orilla Playa + 11 Área Verde + 3 Premium
- Vista de mapa visual interactivo por sección
- Alquiler con datos del cliente y tipo de pago
- Soporte: Pago Móvil, Divisa (USD/EUR/COP), Mixto
- Edición de alquiler activo
- Liberación de churuata
- Intercambio / movimiento entre churuatas
- Op. Playa solo tiene lectura

### 🏝️ Isla El Rey (Admin / Op. Isla)
- 25 churuatas a $20 USD c/u
- Transporte: $5 USD por persona — ilimitado el día
- Grid visual de 5x5
- Registro de cliente con cédula
- Control de transporte pagado por cliente

### 📋 Registro de Entrada — Alcabala (Admin / Registrador)
- Registro rápido por nombre + cédula
- Escaneo con cámara del dispositivo
- Detección de duplicados del día
- Tabla filtrable por fecha
- Generación de PDF profesional con:
  - Encabezado corporativo con fecha
  - Tabla de registros completa
  - Total de visitantes
  - Número de páginas
- Descarga PDF + Impresión directa
- Contador de visitantes del día

### ⚙️ Administración (Admin)
- Gestión completa de usuarios (CRUD)
- 4 roles configurables
- Exportación de datos (JSON)
- Importación/restauración de datos
- Reinicio del sistema
- Configuración de precios y tasas de cambio

### ℹ️ Acerca de
- Información del desarrollador y sistema
- Tecnologías utilizadas

---

## 🔒 SEGURIDAD DE ROLES

El sistema impide el acceso a secciones no autorizadas:
- La navegación solo muestra ítems permitidos para el rol
- El router verifica el rol antes de renderizar cada página
- Los botones de edición/alquiler no aparecen para roles de solo lectura
- La sesión se mantiene en sessionStorage (se limpia al cerrar el navegador)

---

## 💾 PERSISTENCIA

Todos los datos se guardan en `localStorage` del navegador:
- Estado de churuatas playa
- Estado de churuatas Isla El Rey
- Registros de entrada (Alcabala)
- Usuarios y configuración
- Preferencia de modo oscuro

---

## 📱 PWA — Progressive Web App

- ✅ Instalable en Android/iOS/Desktop
- ✅ Funciona offline (datos locales)
- ✅ Service Worker con caché
- ✅ Manifest completo
- ✅ Mobile-first, 100% responsive

**Para instalar en móvil:**
- Android: Menú ⋮ → "Agregar a pantalla de inicio"
- iOS Safari: Compartir → "Añadir a pantalla de inicio"
- Chrome Desktop: Icono de instalar en barra de direcciones

---

## ✅ CHECKLIST DE FUNCIONALIDADES

- [x] Sistema de autenticación con 4 roles
- [x] Protección de rutas por rol
- [x] Renderizado condicional por rol
- [x] Header fijo (sticky)
- [x] Sidebar colapsable (mobile)
- [x] Modo oscuro
- [x] Dashboard con KPIs y barras de ocupación
- [x] Mapa visual de churuatas playa (81 unidades)
- [x] Alquiler / Edición / Liberación de churuatas
- [x] Intercambio / movimiento entre churuatas
- [x] Tipos de pago: Pago Móvil, Divisa, Mixto
- [x] Isla El Rey (25 churuatas, $20 USD, transporte $5 USD)
- [x] Registro de entrada con cámara
- [x] Generación de PDF profesional
- [x] Filtro de registros por fecha
- [x] Gestión de usuarios (CRUD)
- [x] Exportación/importación de datos JSON
- [x] Configuración de precios
- [x] Sección "Acerca de"
- [x] PWA con Service Worker y offline support
- [x] Arquitectura modular por carpetas
- [x] Tipografía profesional (Inter)
- [x] UI mobile-first responsive

---

## 🛠️ TECNOLOGÍAS

- HTML5, CSS3, JavaScript ES6+ (Vanilla, sin frameworks)
- jsPDF + jsPDF-AutoTable (generación de PDF)
- Font Awesome 6 (íconos)
- Google Fonts — Inter (tipografía)
- Service Worker API (offline)
- MediaDevices API (cámara)
- LocalStorage / SessionStorage (persistencia)

---

**Desarrollado por:** Cesar Alejandro Lamper Rodriguez  
**Versión:** 2.0.0 | **Año:** 2026
