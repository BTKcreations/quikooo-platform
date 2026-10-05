# QUIKOOO Shared Design System

Shared theme tokens, typography, and component styling primitives for all QUIKOOO portal applications.

## Color Discipline
- **Primary Brand Color**: `#059669` (Tailwind Emerald-600)
- **Primary Brand Hover**: `#047857` (Tailwind Emerald-700)
- **Canvas Background**: `#FBFBF9` (Warm neutral ivory/cream) - Never use pure white for page background
- **Surface Cards**: `#FFFFFF` (Pure white reserved for cards, sheets, inputs)
- **Borders & Separators**: `#F3F4F0` and `#a7f3d0`

## Typography
- **Headings & Display**: `Outfit`, sans-serif (weights: 500, 600, 700, 800)
- **Body & Controls**: `Plus Jakarta Sans`, sans-serif (weights: 400, 500, 600, 700)

## Component Classes
- `.btn-primary`: Emerald CTA button with interactive active/hover states
- `.card`: Surface card with subtle border and elevation
- `.badge`: Status and category chips
- `.input`: Accessible form input with emerald focus ring

## CSS Files
- `tokens.css`: Root CSS custom properties (`--color-brand-primary`, `--color-canvas-bg`, etc.)
- `typography.css`: Font imports and utility classes (`.font-display`, `.font-body`)
- `components.css`: Reusable UI classes (`.btn-primary`, `.card`, `.badge`, `.input`)
- `map.css`: Leaflet map container styles (`.quikooo-map-container`), responsive heights (mobile 220px, desktop 380px, mini 160px), z-index safety containment, and brand `#059669` popups.

## Real Maps Integration (OpenStreetMap + Leaflet)
All portal apps use OpenStreetMap + Leaflet for interactive maps (free, zero API keys required) with provider abstraction for future Google Maps swaps:
- **Container**: `.quikooo-map-container` (z-index safe, rounded `0.75rem`, 220px mobile / 380px desktop)
- **Mini Preview**: `.quikooo-map-container.map-mini` (160px height for location pickers)
- **Brand Colors**: Popups styled with `#059669` emerald borders and shadows
- **Dynamic Import**: Leaflet is dynamically imported on client mount only (`import('leaflet')`) to keep the initial page bundle lean.

## Testing
Run unit tests verifying design tokens:
```bash
npm test
```
