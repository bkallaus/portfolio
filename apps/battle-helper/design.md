---
name: battle-helper
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#43474b'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#73777b'
  outline-variant: '#c3c7cb'
  surface-tint: '#52606b'
  primary: '#4f5e68'
  on-primary: '#ffffff'
  primary-container: '#687781'
  on-primary-container: '#fcfcff'
  inverse-primary: '#b9c9d4'
  secondary: '#566342'
  on-secondary: '#ffffff'
  secondary-container: '#d7e5bb'
  on-secondary-container: '#5a6745'
  tertiary: '#4c5e6b'
  on-tertiary: '#ffffff'
  tertiary-container: '#657784'
  on-tertiary-container: '#fcfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e5f1'
  primary-fixed-dim: '#b9c9d4'
  on-primary-fixed: '#0f1d26'
  on-primary-fixed-variant: '#3a4952'
  secondary-fixed: '#dae8be'
  secondary-fixed-dim: '#becca3'
  on-secondary-fixed: '#141f05'
  on-secondary-fixed-variant: '#3f4b2c'
  tertiary-fixed: '#d2e5f4'
  tertiary-fixed-dim: '#b6c9d8'
  on-tertiary-fixed: '#0a1e28'
  on-tertiary-fixed-variant: '#374955'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display:
    fontFamily: Lexend
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Lexend
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-rg:
    fontFamily: Lexend
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-sm:
    fontFamily: Lexend
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  stats-num:
    fontFamily: Lexend
    fontSize: 14px
    fontWeight: '300'
    lineHeight: '1'
    letterSpacing: '0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1200px
  gutter: 24px
  margin-page: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is built for a sophisticated competitive environment, moving away from the high-energy, saturated aesthetics typical of the genre toward a calm, focused, and professional atmosphere. The personality is intellectual and serene, prioritizing clarity of information over visual noise.

The style is a blend of **Soft Minimalism** and **Tonal Layering**. It relies on a high-end editorial feel with ample whitespace and a restrained use of color. By replacing harsh outlines with soft depth and subtle light-grey strokes, the interface feels lightweight and breathable, reducing cognitive load during complex strategic decision-making.

## Colors

The palette is anchored by a neutral base of off-whites and cool greys to ensure the interface feels expansive. 

- **Base Surfaces:** Use `#F8F9FA` for the primary background and `#FFFFFF` for elevated cards.
- **Accents:** Instead of the traditional vibrant type colors, this system utilizes a "dusty" or "sage" spectrum. These muted tones are used sparingly—primarily for status indicators, type badges, and health bars—to keep the focus on the data.
- **Stroke & Contrast:** Functional strokes use `#E9ECEF` rather than black, maintaining structure without fragmenting the layout.

## Typography

The system utilizes **Lexend** for its exceptional readability and geometric clarity. To maintain the "refined" aesthetic, we avoid the ultra-bold weights often associated with this typeface in athletic contexts.

- **Headlines:** Use Regular (400) or Medium (500) weights. Tighten letter-spacing slightly on larger displays to maintain a premium feel.
- **Body Text:** Use Regular (400) for all descriptions and logs. The increased line height (1.6) ensures long battle logs remain legible.
- **Labels:** Use Medium (500) in all-caps for technical data points (e.g., EVs, IVs, or Category names) to create a clear visual distinction from narrative text.

## Layout & Spacing

This design system uses a **Fixed Grid** for the central battle arena and a **Fluid Sidebar** for move selection and team data.

- **Rhythm:** An 8px-based spacing system governs the layout. 
- **Margins:** Generous page margins (40px) ensure the UI feels like a professional dashboard rather than a cramped mobile game.
- **Grouping:** Use logical "stacks" (8px for related items, 16px for distinct sections) to group Pokémon stats and move-sets without the need for heavy dividing lines.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows**. 

- **Surface 0 (Background):** `#F8F9FA`.
- **Surface 1 (Cards/Containers):** White background with a 1px stroke in `#E9ECEF`. Apply a very soft, diffused shadow: `0 4px 20px rgba(0, 0, 0, 0.04)`.
- **Surface 2 (Active Elements/Popovers):** White background with a slightly more pronounced shadow: `0 10px 30px rgba(0, 0, 0, 0.08)`.

Interactive elements do not "pop" off the screen; they lift subtly, suggesting a tactile but light-as-air feel.

## Shapes

The shape language is consistently **Rounded**, using a 0.5rem (8px) base radius. This softens the mathematical nature of a battle simulator.

- **Cards & Major Containers:** 1rem (16px) for a modern, approachable feel.
- **Buttons & Input Fields:** 0.5rem (8px).
- **Badges/Types:** 1.5rem (24px) or full pill-shape to distinguish them from functional UI buttons.

## Components

- **Buttons:** Primary buttons use a soft-tinted background (e.g., a light wash of the primary color) with dark-grey text. No heavy gradients. Hover states should involve a subtle shift in background saturation rather than brightness.
- **Type Chips:** Small, pill-shaped badges using the muted "dusty" palette. Text should be high-contrast against the muted background for accessibility.
- **Health Bars:** Replace the high-contrast green/yellow/red with a more sophisticated transition (e.g., Sage to Ochre to Dusty Rose). The bar container should have a slight inner shadow for a "recessed" look.
- **Input Fields:** Minimalist design with a 1px light-grey bottom border or full light-grey stroke. Focus states are indicated by a slightly darker stroke rather than a thick glow.
- **Battle Log:** Use a clean, monospaced-adjacent look by staying with Lexend but reducing size and increasing line-height. Subtle alternating row highlights in `#F1F3F5`.
- **Move Cards:** Use subtle icons for move categories (Physical, Special, Status) instead of bold text, keeping the interface uncluttered.