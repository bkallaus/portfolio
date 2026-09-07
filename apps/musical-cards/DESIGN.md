# Design System Specification

## 1. Overview & Creative North Star: "The Resonant Gallery"

This design system is built upon the concept of **The Resonant Gallery**. Music is an art form that requires both disciplined structure and ethereal expression; the UI must reflect this duality. Moving away from the "worksheet" aesthetic seen in legacy educational tools, this system adopts a high-end editorial approach.

The "Resonant Gallery" uses intentional white space (the "silence" between notes) and a sophisticated layering of surfaces to guide the student’s focus. We break the rigid, flat grid by utilizing **tonal depth** and **asymmetric compositions**. Elements don't just sit on a page; they inhabit a space, overlapping with purposeful elegance to create a tactile, premium environment for learning.

---

## 2. Colors

The palette is anchored in deep, authoritative blues, balanced by clean "Gallery White" surfaces and vibrant, melodic accents.

### Core Palette
* **Primary (`#00254d`)**: The "Ink" of the system. Used for high-level branding and deep narrative elements.
* **Secondary (`#006a62`)**: A soft teal for progress-related interactive elements, providing a calm, focused energy.
* **Tertiary (`#3d1e00`) / Accent Container (`#f68a00`)**: A vibrant orange used sparingly for critical CTAs and celebratory feedback (e.g., a correct note selection).
* **Background (`#f7f9fb`)**: A cool, professional off-white that prevents eye fatigue during long practice sessions.

### The "No-Line" Rule
To achieve a high-end editorial feel, **1px solid borders are prohibited for sectioning.** Structural boundaries must be defined solely through background color shifts. For example, a lesson module (`surface-container-low`) should sit on the main `background` without a stroke. Separation is achieved through the contrast of tones, not the friction of lines.

### Signature Textures & Glassmorphism
* **The Gradient Soul:** For primary CTAs and Hero sections, use a subtle linear gradient (135°) transitioning from `primary` (`#00254d`) to `primary_container` (`#003b73`). This adds a "weighted" feel that flat color cannot replicate.
* **Glass Layers:** Floating navigation bars or modal overlays must utilize **Glassmorphism**. Use a semi-transparent `surface` color with a `20px` backdrop-blur. This allows the staff and notes to subtly bleed through, keeping the student connected to the music at all times.

---

## 3. Typography: The Geometric Harmony

We use **Plus Jakarta Sans** for its contemporary, geometric rhythm. It bridges the gap between technical clarity and friendly approachability.

* **Display (Display-LG: 3.5rem)**: Used for major milestone celebrations or landing headers. Set with tight tracking (-0.02em) to feel authoritative.
* **Headlines (Headline-MD: 1.75rem)**: Used for lesson titles and musical concepts. These should feel like headers in a premium art magazine.
* **Body (Body-LG: 1rem)**: Optimized for legibility. The generous x-height ensures that complex musical explanations are easy to digest.
* **Labels (Label-MD: 0.75rem)**: Used for musical notations and metadata.

**Hierarchy Note:** Use `on_surface_variant` (`#434750`) for secondary body text to create a clear visual distinction from the high-contrast `on_surface` titles.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are often messy. In this design system, we convey hierarchy through **Tonal Layering** and **Ambient Light**.

* **The Layering Principle:** Depth is achieved by "stacking" surface tiers. Place a `surface_container_lowest` (#ffffff) card on a `surface_container_low` (#f2f4f6) section. This creates a soft, natural lift that mimics fine stationery.
* **Ambient Shadows:** For floating elements like a "Active Note" card, use an extra-diffused shadow: `box-shadow: 0 12px 40px rgba(25, 28, 30, 0.06);`. The shadow color is a tint of our `on_surface` color, not a neutral grey.
* **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., input fields), use the `outline_variant` at **20% opacity**. Never use 100% opaque, high-contrast borders.

---

## 5. Components

### The Musical Staff (Custom Component)
The staff and notes are the hero. Lines should be rendered using `outline` (`#737781`) for a softer look than pure black. The active note should utilize the `tertiary` orange to pop against the blue-white environment.

### Buttons & Interaction
* **Primary Button:** Rounded-XL (`1.5rem`). Uses the Gradient Soul (Primary to Primary-Container). High-contrast white text.
* **Selection Chips (Notes):** Unlike the square, thin-lined boxes in traditional software, our note selection chips use `md` (`0.75rem`) roundedness and a `surface_container_high` background. On hover, they transition to `secondary_container` with a subtle `2px` "Ghost Border."
* **Cards:** No dividers. Use `Spacing-10` (2.5rem) to separate content blocks. Use a background shift to `surface_container_highest` for "Active" states.

### Inputs & Progress
* **Text Inputs:** Use `surface_container_low` for the field background. Labels should be in `Label-MD` sitting just above the field, never inside as placeholder text.
* **Progress Bars:** A thick, `full` rounded track using `surface_container_highest` with a `secondary` teal fill.

---

## 6. Do's and Don'ts

### Do
* **Do** use asymmetrical layouts. For example, offset the musical staff to the left and place instructional text in a narrower column to the right.
* **Do** use large, "breathable" white space. If an element feels cramped, increase padding using the `Spacing-12` or `Spacing-16` tokens.
* **Do** layer cards. Overlap a floating "Tip" card slightly over a lesson container to create three-dimensional interest.

### Don't
* **Don't** use 1px black borders to separate "Treble" from "Bass" sections. Use a `surface_variant` background for one and `surface` for the other.
* **Don't** use standard "Drop Shadows." If a shadow is visible as a "dark line," it is too heavy. It should feel like a soft glow.
* **Don't** use default system fonts. Always use the specified geometric sans-serif to maintain the high-end editorial identity.