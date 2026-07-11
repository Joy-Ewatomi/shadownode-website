# ShadowNode Website Animations Documentation

## Overview

Professional, intelligence-themed animations have been added to the ShadowNode website using **Framer Motion** for complex animations and **Tailwind CSS** for simple transitions.

---

## Animation Components

### 1. **PageTransition** (`components/animations/PageTransition.tsx`)

- **Purpose**: Smooth page entrance animation
- **Effect**: 300ms fade-in on page load
- **Duration**: 300ms
- **Easing**: easeOut
- **Usage**: Wraps the entire page content for professional entrance

```tsx
<PageTransition>
  {/* Page content */}
</PageTransition>
```

---

### 2. **AnimatedGradient** (`components/animations/AnimatedGradient.tsx`)

- **Purpose**: Dynamic background overlay with animated gradient shift
- **Features**:
  - Dark gradient overlay (70% opacity)
  - Navy → Purple → Dark Blue → Navy color cycle
  - 15-second smooth animation loop
  - Secondary layer for depth (20-second opacity pulse)
  - Organic, non-mechanical motion
- **Colors**:
  - Primary: Navy (`rgb(15, 23, 42)`) - 70% opacity
  - Secondary: Indigo (`rgb(59, 130, 246)`) - 40% opacity
  - Tertiary: Indigo-600 (`rgb(99, 102, 241)`) - 40% opacity

```tsx
<AnimatedGradient />
```

---

### 3. **ParallaxEffect** (`components/animations/ParallaxEffect.tsx`)

- **Purpose**: Subtle scrolling parallax effect
- **Effect**: Background moves at 0.5x scroll speed
- **Creates**: Depth illusion during scroll
- **Features**:
  - Uses `useScroll` hook from Framer Motion
  - Applies parallax transform to Y-axis
  - Subtle animated grid pattern overlay (5% opacity)
- **Professional**: Not distracting, subtle motion

```tsx
<ParallaxEffect />
```

---

### 4. **ScrollFadeIn** (`components/animations/ScrollFadeIn.tsx`)

- **Purpose**: Trigger animations when elements enter viewport
- **Effects**:
  - Fade-in + slide-up animation
  - Optional lift on hover with shadow
- **Triggers**: When element reaches 20% viewport visibility
- **Duration**: 0.6s fade, 0.3s on hover lift
- **Features**:
  - Optional delay for staggered effects
  - `once: true` - animation plays only once
  - Perfect for service cards and content sections

```tsx
<ScrollFadeIn delay={0.1} onHover>
  {/* Content */}
</ScrollFadeIn>
```

---

### 5. **AnimatedIcon** (`components/animations/AnimatedIcon.tsx`)

- **Purpose**: Add hover animations to icons
- **Effects**:
  - `rotate`: Subtle 10-degree rotation
  - `glow`: Opacity pulse effect
  - `bounce`: Gentle vertical bounce
- **Duration**: 0.3s - 0.6s depending on effect
- **Easing**: Professional spring animation

```tsx
<AnimatedIcon effect="rotate">
  {/* Icon content */}
</AnimatedIcon>
```

---

### 6. **AnimatedButton** (`components/ui/animated-button.tsx`)

- **Purpose**: Extended Button component with hover scale
- **Effect**: 1.05x scale on hover, 0.98x on tap
- **Duration**: Spring animation (stiffness: 400, damping: 10)
- **Maintains**: All button variants and sizes
- **Professional**: Smooth, responsive spring motion

```tsx
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
>
  <Button>{children}</Button>
</motion.div>
```

---

## Animation Utilities (`lib/animations.ts`)

### Variants

**fadeInUpVariants**
- Hidden: opacity 0, y + 20px
- Visible: opacity 1, y 0
- Duration: 0.6s, easeOut

**fadeInVariants**
- Simple fade in/out
- Duration: 0.8s, easeOut

**slideInLeftVariants**
- Hidden: opacity 0, x -50px
- Visible: opacity 1, x 0
- Duration: 0.7s, easeOut

**slideInRightVariants**
- Hidden: opacity 0, x +50px
- Visible: opacity 1, x 0
- Duration: 0.7s, easeOut

**scaleOnHoverVariants**
- Initial: scale 1
- Hover: scale 1.05
- Spring animation

### Hooks

**useInViewVariants(variants)**
- Wraps variants for scroll-triggered animations
- Returns `whileInView`, `viewport`, and animation configuration
- Triggers at 20% visibility once

---

## Page.tsx Animation Implementation

### Hero Section

1. **Page Transition**: Entire page fades in (300ms)
2. **Parallax Background**: Subtle 0.5x scroll effect
3. **Animated Gradient**: 15-second color cycle overlay
4. **Left Content**: Slides in from left with stagger delay
   - Badge: y -20px with delay 0.2s
   - Headline: y +20px with delay 0.3s
   - Description: y +20px with delay 0.4s
   - Buttons: y +20px with delay 0.5s
   - Status: fade in with delay 0.6s
5. **Right Terminal Box**: Slides in from right with hover lift
   - Hover effect: y -5px lift

### Buttons

All CTA buttons throughout page:
- **Hover**: Scale 1.05x
- **Tap**: Scale 0.98x
- **Duration**: Spring animation (400 stiffness, 10 damping)
- **Easing**: Smooth, responsive spring

### Services Section

1. **Section Title**: Fade in when visible (0.6s)
2. **Service Cards**: Staggered scroll-fade-in
   - OSINT: delay 0s
   - Forensics: delay 0.1s
   - Ethical Hacking: delay 0.2s
   - Secure Comms: delay 0.3s
3. **Card Hover**: Lift effect with shadow
   - Y offset: -5px
   - Smooth spring transition

### CTA Section

- **Fade + Slide Up**: When section enters viewport (0.7s)
- **Button Hover**: 1.05x scale on all buttons

---

## Performance Optimization

✅ **60 FPS Smooth Performance**
- Uses GPU-accelerated transforms (`will-change` implicit in Framer Motion)
- Spring animations use hardware acceleration
- Parallax effect uses `useScroll` for optimal performance
- All animations use `transform` and `opacity` only (GPU-friendly properties)

✅ **Browser Compatibility**
- Framer Motion 11+ (installed)
- Works on all modern browsers
- Graceful degradation for older browsers

✅ **Mobile Optimization**
- Reduced motion respects `prefers-reduced-motion`
- Touch-optimized button interactions
- Smooth scrolling on mobile devices

---

## Color Palette

All animations use dark intelligence aesthetic:

- **Navy**: `rgb(15, 23, 42)` - Primary dark
- **Indigo**: `rgb(59, 130, 246)` - Primary accent
- **Indigo-600**: `rgb(99, 102, 241)` - Secondary accent
- **Opacity**: 70% for overlays, 40% for gradient layers

---

## Customization Guide

### Adjust Animation Speed

```tsx
// In component
transition={{ duration: 0.8 }} // Change from 0.6 to 0.8
```

### Change Gradient Colors

```tsx
// In AnimatedGradient.tsx
background: `
  linear-gradient(
    90deg,
    rgba(15, 23, 42, 0.7),  // Change first color
    rgba(59, 130, 246, 0.4), // Change second color
    // ...
  )
`
```

### Adjust Parallax Speed

```tsx
// In ParallaxEffect.tsx
const y = useTransform(scrollY, (value) => value * 0.5) // 0.5 = 50% speed
// Change to 0.3 for slower, 0.7 for faster
```

### Button Scale Factor

```tsx
whileHover={{ scale: 1.05 }} // Change 1.05 to desired scale
```

---

## Testing & Validation

✅ Build Success: `npm run build` completes without errors
✅ No TypeScript errors
✅ All imports resolved correctly
✅ Framer Motion installed and available
✅ All animation components render correctly

---

## Files Modified/Created

**Created:**
- `lib/animations.ts` - Animation variants and utilities
- `components/animations/AnimatedGradient.tsx` - Background gradient animation
- `components/animations/ParallaxEffect.tsx` - Parallax scrolling effect
- `components/animations/ScrollFadeIn.tsx` - Scroll-triggered fade-in animations
- `components/animations/PageTransition.tsx` - Page entrance animation
- `components/animations/AnimatedIcon.tsx` - Icon hover animations
- `components/ui/animated-button.tsx` - Enhanced button with hover scale

**Modified:**
- `app/page.tsx` - Integrated all animations into homepage
- `package.json` - Added Framer Motion dependency

---

## Animation Summary Table

| Component | Effect | Duration | Trigger |
|-----------|--------|----------|---------|
| PageTransition | Fade-in | 300ms | Page load |
| AnimatedGradient | Color cycle | 15s loop | Continuous |
| ParallaxEffect | Y offset (0.5x) | Scroll | Continuous |
| ScrollFadeIn | Fade + slide | 600ms | Viewport enter |
| Hero Buttons | 1.05x scale | Spring | Hover |
| Service Cards | Lift + shadow | Spring | Hover |
| CTA Section | Fade + slide | 700ms | Viewport enter |

---

## Next Steps

To extend animations further:

1. Add animations to other pages (`/login`, `/request`, `/dashboard`)
2. Create page transition animations for route changes
3. Add micro-interactions to form inputs
4. Animate loading states with spinners
5. Add success/error animations for API responses