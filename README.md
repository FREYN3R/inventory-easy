# InventoryEasy - Sistema de Gestión de Inventario

**Proyecto Formativo Final - Arquitectura de Sistemas Computacionales con Enfoque Cloud**

---

## Equipo: SoloInventory

### Integrantes y Roles

**Freyner Alexander Nazareno Cortes** | Líder del Proyecto, Desarrollador Backend | fnazareno@estudiante.uniajc.edu.co |
**Nelsy Daniela Perlaza Cuero** | Desarrolladora Frontend | ndperlaza@estudiante.uniajc.edu.co |


---

## Descripción General

**InventoryEasy** es una plataforma web de gestión de inventario diseñada para pequeños negocios y tiendas locales. Desarrollada con arquitectura de microservicios, permite:

- Registrar y gestionar productos
- Controlar stock con entradas y salidas
- Administrar proveedores
- Generar reportes y alertas
- Monitoreo en tiempo real

### Público Objetivo
- Pequeños comerciantes y tiendas de barrio
- Microempresas familiares
- Estudiantes con emprendimientos
- Negocios en digitalización básica

### Problema que Resuelve
Muchos pequeños negocios manejan su inventario manualmente (cuadernos, Excel, memoria), generando:
- Pérdidas por productos agotados sin aviso
- Compras innecesarias por falta de visibilidad
- Dificultad para identificar productos más vendidos

**InventoryEasy digitaliza este proceso de manera simple y accesible.**

---

## Arquitectura de Microservicios

### Microservicio 1: Products Service (Puerto 3001)
**Funcionalidades:**
- Crear, leer, actualizar y eliminar productos
- Búsqueda por nombre o SKU
- Filtrado por categorías
- Listado de categorías únicas

### Microservicio 2: Stock Service (Puerto 3002)
**Funcionalidades:**
- Consultar inventario completo
- Registrar entradas de stock
- Registrar salidas de stock
- Historial de movimientos
- Alertas de stock bajo

### Microservicio 3: Suppliers Service (Puerto 3003)
**Funcionalidades:**
- Gestión de proveedores
- Asociar productos con proveedores
- Consultar información de contacto
- Filtros por ciudad y estado

---

## Tecnologías Utilizadas

### Backend
- **Node.js** v18 - Entorno de ejecución
- **Express.js** - Framework web
- **MySQL** 8.0 - Base de datos relacional
- **Prometheus Client** - Métricas y monitoreo

### Frontend
- **React** 18 - Librería de interfaces
- **Vite** - Build tool y dev server
- **TailwindCSS** - Framework CSS
- **JavaScript** - Lenguaje principal

### DevOps e Infraestructura
- **Docker** & **Docker Compose** - Contenedorización
- **Prometheus** - Recolección de métricas
- **Grafana** - Visualización de datos
- **GitHub Actions** - CI/CD Pipeline
- **k6** - Pruebas de carga
- **Artillery** - Pruebas de estrés

### Despliegue (Gratuito)
- **Render** - Backend (microservicios)
- **Netlify** - Frontend estático
- **Railway/Aiven** - MySQL (alternativas gratuitas)

---

## Instrucciones de Ejecución

### Requisitos Previos
- Docker Desktop instalado
- Node.js 18+ (opcional, para desarrollo local)
- Git instalado
- 4GB RAM mínimo disponible

### Opción 1: Ejecución con Docker Compose

```bash
# 1. Clonar el repositorio
git clone https://github.com/FREYN3R/inventory-easy
cd inventory-easy

# 2. Iniciar todos los servicios
docker-compose up -d

# 3. Esperar a que los servicios inicien
docker-compose logs -f

# 4. Verificar que todos los servicios están activos
docker-compose ps
```

**Acceder a las aplicaciones:**
- Frontend: http://localhost:5173
- Products API: http://localhost:3001
- Stock API: http://localhost:3002
- Suppliers API: http://localhost:3003
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin123)

### Detener los Servicios

```bash
# Con Docker Compose
docker-compose down
```

---

## Evidencias Técnicas

### 1. Métricas de Rendimiento

#### Pruebas de Carga con k6
```bash
# Ejecutar pruebas de carga
k6 run tests/k6/load-test.js
```

**Métricas Obtenidas:**
- Tiempo de respuesta promedio: ~180ms
- P95 de latencia: ~420ms
- Tasa de error: <2%
- Throughput: 150 req/s

#### Pruebas de Estrés con Artillery
```bash
# Ejecutar pruebas de estrés
artillery run tests/artillery/stress-test.yml
```

### 2. Monitoreo con Prometheus

**Métricas Recolectadas:**
- `http_request_duration_seconds` - Duración de peticiones HTTP
- `http_requests_total` - Total de peticiones por endpoint
- `stock_level` - Nivel de stock por producto
- `nodejs_heap_size_used_bytes` - Uso de memoria
- `nodejs_eventloop_lag_seconds` - Lag del event loop

---

## Aplicación de Conceptos del Curso

### 1. Diseño de Arquitectura Cloud

**Microservicios independientes**: Cada servicio tiene su propia responsabilidad y puede escalarse de forma independiente.

**Containerización**: Uso de Docker para portabilidad y consistencia entre entornos.

**Separación de concerns**: Frontend desacoplado del backend, base de datos compartida con acceso controlado.

### 2. Monitoreo y Métricas

**Prometheus**: Recolección de métricas en tiempo real de todos los microservicios.

**Grafana**: Visualización y dashboards interactivos.

**Health checks**: Endpoints `/health` en cada servicio para verificar disponibilidad.

**Métricas personalizadas**: Tracking de stock levels, request duration, error rates.

### 3. CI/CD Pipeline

**GitHub Actions**: Automatización de pruebas y builds.

**Fases del Pipeline:**
- Lint y validación de código
- Build de imágenes Docker
- Tests de integración
- Health checks automáticos
- Pruebas de carga (k6)

**Continuous Integration**: Cada push activa el pipeline.

### 4. Pruebas de Rendimiento y Escalabilidad

**k6**: Pruebas de carga progresivas (10 → 50 → 100 usuarios).

**Artillery**: Pruebas de estrés con escenarios realistas.

**Thresholds definidos**: 
- P95 < 500ms
- Error rate < 10%
- Availability > 99%

### 5. Evaluación de Costos y Sostenibilidad

**Herramientas 100% gratuitas**:
- Docker Desktop (gratis)
- GitHub Actions (2000 min/mes gratis)
- Prometheus + Grafana (open source)
- Render free tier (backend)
- Netlify free tier (frontend)

**Estimación de Costos en Producción:**

| Recurso | Opción Gratuita | Opción Pagada | Costo Mensual |
|---------|-----------------|---------------|---------------|
| Hosting Backend | Render Free | Render Starter | $0 / $7 |
| Hosting Frontend | Netlify Free | Netlify Pro | $0 / $19 |
| Base de Datos | Aiven Free | Aiven Startup | $0 / $20 |
| Monitoring | Prometheus OSS | Grafana Cloud | $0 / $0 (hasta 10k) |
| **TOTAL** | **$0/mes** | **$46/mes** |

**Escalabilidad:**
- Cada microservicio puede escalarse horizontalmente con Docker
- Balanceador de carga: Nginx (gratis) o AWS ALB
- Autoescalado: basado en CPU/memoria con límites definidos

---

## Estructura del Repositorio

```
inventory-easy/
├── backend/
│   ├── products-service/       # Microservicio de productos
│   ├── stock-service/          # Microservicio de stock
│   └── suppliers-service/      # Microservicio de proveedores
├── frontend/                   # Aplicación React
├── database/                   # Scripts SQL
├── monitoring/
│   ├── prometheus/            # Configuración de Prometheus
│   └── grafana/               # Dashboards de Grafana
├── tests/
│   ├── k6/                    # Pruebas con k6
│   └── artillery/             # Pruebas con Artillery
├── evidencias/                # Capturas y reportes
├── .github/
│   └── workflows/             # CI/CD Pipeline
├── docker-compose.yml         # Orquestación de servicios
└── README.md                  # Este archivo
```

---

## Conclusiones y Aprendizajes

### Logros Técnicos

1. **Arquitectura Escalable**: Implementamos con éxito una arquitectura de microservicios que puede crecer según la demanda.

2. **Monitoreo Integral**: Prometheus y Grafana nos permiten observar el comportamiento del sistema en tiempo real y detectar problemas proactivamente.

3. **Automatización Completa**: El pipeline CI/CD reduce errores humanos y acelera el ciclo de desarrollo.

4. **Performance Validado**: Las pruebas de carga confirman que el sistema soporta 100+ usuarios concurrentes con tiempos de respuesta aceptables.

5. **Sostenibilidad Económica**: El proyecto puede ejecutarse completamente gratis en fase de desarrollo y con costos mínimos en producción ($0-46/mes).


## Contacto y Soporte

**Freyner Alexander Nazareno Cortes**
- Email: fnazareno@estudiante.uniajc.edu
- Programa: Ingeniería de Sistemas
- Curso: Arquitectura de Sistemas Computacionales

**Docente:**
- Gustavo Adolfo Saavedra Perdomo
- Email: gustavo.saavedra@unad.edu.co