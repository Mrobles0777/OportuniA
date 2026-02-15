<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Oportunidades de Negocio Inteligentes (NextVentures IA 2026) 🚀

Una aplicación avanzada que utiliza Inteligencia Artificial (Google Gemini) para identificar oportunidades de negocio reales y actualizadas, basadas en inversión inicial, ubicación y tendencias actuales.

## ✨ Características Principales
- **Análisis con IA**: Integración con Google Gemini (utilizando el modelo más avanzado) para detectar nichos de mercado.
- **Seguridad**: Configuración profesional mediante Supabase Edge Functions, manteniendo las claves API protegidas y fuera del código cliente.
- **Modelos de Negocio**: Soporta análisis tanto de productos físicos/digitales como de servicios y startups.
- **Exportación**: Generación de guiones de venta y prompts de imagen para marketing.

## 🛠️ Tecnologías
- **Frontend**: React + TypeScript + Vite.
- **Backend/Base de Datos**: Supabase (Auth, Database, Edge Functions).
- **IA**: Google Gemini API.
- **Estilo**: Lucide React + Recharts.

## 🚀 Instalación y Uso Local

### Requisitos Previos
- Node.js (v18+)
- Cuenta de Supabase

### Pasos para Ejecutar
1. **Configurar el Entorno**:
   - Clona este repositorio.
   - Instala dependencias: `npm install`.
2. **Configurar Supabase**:
   - Crea un proyecto en [Supabase](https://supabase.com/).
   - Ejecuta el contenido de `schema.sql` en el SQL Editor de tu Dashboard de Supabase.
   - Configura el secreto `GEMINI_API_KEY` en tus Edge Functions:
     ```bash
     supabase secrets set GEMINI_API_KEY=tu_clave_aqui
     ```
3. **Iniciar Aplicación**:
   - Ejecuta `npm run dev`.

## 🔒 Seguridad
Este proyecto ha sido migrado para utilizar **Supabase Edge Functions**. Esto asegura que las claves de la API de Gemini nunca se expongan al navegador del cliente, cumpliendo con los mejores estándares de seguridad para aplicaciones de IA.

---
*Desarrollado con ❤️ para emprendedores inteligentes.*
