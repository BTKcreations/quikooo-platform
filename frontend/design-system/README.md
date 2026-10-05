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

## Testing
Run unit tests verifying design tokens:
```bash
npm test
```
