# Visión General del Sistema

**Sistema:** Plataforma Integral SaaS de Trazabilidad Agropecuaria (SaaS Agro-Trazabilidad)

| Campo    | Valor |
|----------|-------|
| Edición  | 22/07/2025 |
| Versión  | 1.0 |
| Fecha    | 22/07/2026 |
| Editor   | REAI |

> ⚠️ **Pendiente:** El documento original indica "al día de la última edición: 22/07/2025" en la bibliografía pero figura Versión 1.0 con fecha 22/07/2026 en la tabla de versionado. Verificar la versión correcta vigente.

## 1. Síntesis

> ⚠️ **Pendiente:** En el PDF original, la sección "Síntesis" figura únicamente como título, sin contenido desarrollado. El contenido de la síntesis fue relevado en el documento de entrevista citado en la bibliografía.

## 2. Visión General del Negocio y Alcance del Dominio

### 2.1. Contexto de Negocio

El sistema responde a las necesidades operativas de **contratistas rurales** y **productores agropecuarios**.

En el modelo analizado, la operación contempla una estructura **multi-entidad / multi-firma** dentro de un mismo grupo operativo:

| Firma | Actividad |
|-------|-----------|
| **Eliggi** | Transporte / flete (camión cisterna de 14.000 L de agua) y explotación de campos alquilados/propios. |
| **Eliggi Tufoni** | Servicio de fumigación y pulverización para terceros. |
| **Eliggi Néstor** | Prestación de servicios a terceros en siembra y cosecha. |

El software se comercializa bajo un modelo **SaaS B2B Multi-tenant**, ofreciendo **licenciamiento modular escalable**.

El contratista utiliza la plataforma para gestionar su operación y, simultáneamente, provee a sus clientes (productores/dueños de campos) un **dashboard exclusivo de auditoría y trazabilidad**.

### 2.2. Roles del Sistema

| # | Rol | Descripción |
|---|-----|-------------|
| 1 | **Administrador / Dueño** (Contratista) | Acceso total a finanzas, asignación de tareas, aprobación de partes, costos y márgenes de rentabilidad por firma. |
| 2 | **Operativo Administrativo / Data Entry** | Perfil dedicado a la carga rápida de facturas, recibos, remitos, conciliación de comprobantes y cheques. |
| 3 | **Operario a Campo** (Maquinista / Chofer) | Acceso mediante app móvil `offline-first` para carga de partes diarios, fotos de respaldos, estado de tareas y consumo de combustible. |
| 4 | **Ingeniero Agrónomo** | Encargado del registro de recetas fitosanitarias, dosis por hectárea y planificación de rotaciones. |
| 5 | **Cliente / Productor** (Usuario Auditor) | Visualización del avance de labores en sus lotes, trazabilidad de insumos (ingreso, uso, sobrantes) e informes de certificación. |

## 3. Definición Arquitectónica y Stack Tecnológico

### 3.1. Decisiones de Arquitectura

- **Enfoque Offline-First:** La captura de datos en lote (móvil) garantiza operatividad sin conexión a internet. La base de datos local embebida sincroniza asíncronamente con el backend una vez recuperada la señal.
- **Multi-Tenancy y Multi-Firma:** Aislamiento estricto de datos por cliente suscripto (tenant) con capacidad de subdividir operaciones en múltiples razones sociales.
- **Integración de Hardware:** Captura de datos RFID (caravanas electrónicas) mediante conexión Bluetooth/USB en dispositivos móviles.

### 3.2. Tecnologías Confirmadas

| Capa | Tecnología | Detalle |
|------|------------|---------|
| Frontend (Web & Administrador) | Next.js / Flutter Web | Renderizado dinámico, gráficos y tableros interactivos. |
| App Móvil | Flutter | Gestión local offline, cámara, GPS y soporte Bluetooth/USB para RFID. |
| Backend | Node.js | Procesamiento concurrente de sincronizaciones asíncronas. |
| Base de Datos y ORM | PostgreSQL + Prisma ORM | Garantía ACID, soporte de polígonos geoespaciales y modelado fuertemente tipado. |

## 4. Estructura Jerárquica y Módulos del Sistema

```
SISTEMA PLATAFORMA SAAS AGRO
├── Módulo Mi Campo & Mapeo SIG
├── Módulo Producción (Siembra, Aplicaciones, Cosecha)
├── Módulo Insumos y Recepción de Stock
├── Módulo Maquinaria & Combustible
├── Módulo Gestión de Personal
├── Módulo Finanzas & Contabilidad
└── Módulo Ganadero de Precisión (RFID)
```

## 5. Guía de Arquitectura para Frontend (Next.js / Flutter)

Con el fin de comenzar inmediatamente con la maquetación y desarrollo del frontend, se definen los parámetros de navegación e interfaz.

### 5.1. Vistas Principales (Dashboard Web)

1. **Dashboard General**
   - **Widgets superiores:** Clima local, Radar de Lluvia, Dirección/Velocidad del viento (Windy), Dólar Banco Nación, Pizarra AGD/Cereales.
   - **Métricas clave:** Hectáreas trabajadas en la semana/mes, litros de combustible consumidos, tareas pendientes de aprobación.
2. **Módulo Mi Campo**
   - Visor de mapa interactivo con polígonos de lotes diferenciados por color según estado (libre, sembrado, aplicado, cosechado).
3. **Gestión de Partes de Trabajo**
   - Bandeja de entrada con partes cargados por operarios desde el móvil.
   - Visualizador de imagen adjunta (foto del cuaderno) para verificación rápida y botón de aprobación.
4. **Insumos por Cliente**
   - Tabla interactiva filtrable por `Cliente > Producto > Stock Ingresado vs. Consumido vs. Sobrante`.
   - Galería con fotos de recepción de bidones.
5. **Finanzas Multi-Firma**
   - Selector de Razón Social (Eliggi / Eliggi Tufoni / Eliggi Néstor).
   - Módulo de carga de facturas y panel de control de Cheques (Físicos y eCheqs) con alertas de vencimiento.
   - Calculadora de rentabilidad por lote/campaña.

### 5.2. Vistas Móviles (App Flutter Operaria)

1. **Pantalla Principal (Estado Offline/Online)**
   - Indicador visual claro de sincronización pendiente.
2. **Formulario "Parte Diario Express"**
   - Selectores en lista desplegable: `Cliente -> Campo -> Lote -> Labor`.
   - Inputs: Hectáreas trabajadas, Horas/Jornada.
   - Botón integrado de cámara para adjuntar foto del cuaderno físico.
3. **Escáner RFID (Módulo Ganadero)**
   - Interfaz de vinculación Bluetooth con el lector.
   - Contador automático de pasadas y ficha rápida del animal detectado.

## 6. Bibliografía

- **Documento de Entrevista:** Síntesis de la Entrevista y Matriz de Requerimientos Funcionales — Proyecto Plataforma SaaS de Trazabilidad Agropecuaria (Relevamiento de campo con la firma AgroServicios de Precisión S.R.L. / Eliggi).
- **Abstract del Proyecto Final:** Plataforma Integral SaaS de Trazabilidad Agropecuaria con Arquitectura Offline-First e Identificación por Radiofrecuencia.
- **Cuestionario de Relevamiento:** Pool de preguntas y anotaciones de la jornada de trabajo.
- **Entrega Etapa 1:** Análisis Organizacional, Diagnóstico de Problemas, Matriz FODA, Objetivos y Enfoque de Solución (Plataforma Integral SaaS).
- **Entrega Etapa 2:** Análisis de Factibilidad Operativa, Técnica, Legal y Económico-Financiera.

> ⚠️ **Pendiente:** La "Síntesis" mencionada como sección 1 del documento original no fue desarrollada en el PDF. Relevar del documento de entrevista o con el cliente.