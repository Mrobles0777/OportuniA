# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-15

### Added
- **Security**: Migration of Gemini API calls to Supabase Edge Functions to protect API keys.
- **Reliability**: Implementation of `Deno.serve` (and fallback `serve`) for stable Edge Function execution.
- **Data Validation**: Automated JSON cleaning and validation in Edge Functions to avoid frontend hangs.
- **Frontend Errors**: Enhanced error reporting for better diagnosis of connection and API issues.
- **Documentation**: Comprehensive updates to README.md and installation guides.

### Changed
- Improved CORS handling across all function response paths.
- Optimizations for Gemini 1.5 Flash model for balance between performance and quota.

## [0.9.0] - 2026-02-14

### Added
- AI-driven image generation using Pollinations AI.
- Marketing script generation and social media copy tools.
- Advanced PDF export with cleaning of non-ASCII characters (emojis).
- User profile view and logout confirmation modal.
- Support for both product-based and service-based business analysis.

### Changed
- Significant UI/UX improvements with Lucide icons and better layout.
- Upgraded AI logic to handle complex investment contexts and specific locations.

## [0.1.0] - 2024-XX-XX
- Initial prototype focused on basic business opportunity detection.
