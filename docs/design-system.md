# Design System Documentation

## Overview

The Goddard School application design system is built on shadcn/ui components with custom theming that reflects Amazon's brand identity. This system prioritizes consistency, accessibility, and developer experience while maintaining design flexibility.

## Design Principles

### 1. Consistency First
- All components follow the same variant-based architecture
- Consistent spacing, colors, and typography across the application
- Unified interaction patterns and animations

### 2. Accessibility by Default
- Built on Radix UI primitives for robust accessibility
- ARIA patterns implemented automatically
- Keyboard navigation supported throughout
- Color contrast ratios meet WCAG guidelines

### 3. Developer Experience
- TypeScript-first approach with comprehensive type safety
- Composable components with predictable APIs
- Clear documentation with usage examples
- Automated tooling for consistency

## Color System

### Brand Colors

```css
/* Amazon Brand Integration */
--amazon-teal: #00A8E1;    /* Primary brand color */
--amazon-orange: #FF9900;  /* Accent and highlights */
```

### Semantic Color Tokens

Our color system uses HSL values with CSS custom properties for maximum flexibility and theme support:

```css
:root {
  /* Base Colors */
  --background: 0 0% 100%;           /* Pure white background */
  --foreground: 222 25% 15%;         /* Dark text */
  --border: 214.3 31.8% 91.4%;      /* Light borders */

  /* Interactive Colors */
  --primary: 195 85% 41%;            /* Amazon teal for primary actions */
  --primary-foreground: 210 40% 98%; /* White text on primary */
  --secondary: 210 40% 96.1%;        /* Light gray for secondary actions */
  --accent: 37 100% 50%;             /* Amazon orange for accents */

  /* Status Colors */
  --destructive: 0 84% 60%;          /* Red for errors/deletion */
  --muted: 210 40% 96.1%;           /* Subdued backgrounds */
  --muted-foreground: 215.4 16.3% 46.9%; /* Subdued text */
}

/* Dark theme variants */
.dark {
  --background: 222 25% 13%;
  --foreground: 210 40% 98%;
  /* ... additional dark theme values */
}
```

### Usage Guidelines

**Primary Colors**: Use for main actions, navigation, and key interactive elements
```tsx
<Button variant="default">Primary Action</Button>
```

**Secondary Colors**: Use for supporting actions and less prominent elements
```tsx
<Button variant="secondary">Secondary Action</Button>
```

**Accent Colors**: Use sparingly for highlights, notifications, and special states
```tsx
<Badge variant="warning">Important</Badge>
```

## Typography

### Font Family
- **Primary**: Inter (Google Fonts)
- **Weights**: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Loading**: `display=swap` for performance

### Typography Scale

```css
/* Headings */
h1, h2, h3, h4, h5, h6 {
  letter-spacing: 0.3px; /* tracking-wider-plus */
  font-feature-settings: "rlig" 1, "calt" 1;
}

/* Body text */
body {
  font-family: Inter, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
}
```

### Usage Examples

```tsx
// Card titles
<CardTitle className="text-lg font-semibold leading-none tracking-wider-plus">
  Title Text
</CardTitle>

// Body text
<CardDescription className="text-sm text-muted-foreground">
  Description text
</CardDescription>
```

## Component Architecture

### Variant System

All components use `class-variance-authority` (cva) for consistent variant management:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const componentVariants = cva(
  // Base classes applied to all variants
  "base-classes-here",
  {
    variants: {
      variant: {
        default: "default-variant-classes",
        secondary: "secondary-variant-classes",
      },
      size: {
        default: "default-size-classes",
        sm: "small-size-classes",
        lg: "large-size-classes",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
```

### Component Template

```tsx
import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const componentVariants = cva(
  // Base classes
  "base-classes",
  {
    variants: {
      variant: {
        default: "default-styles",
        // ... other variants
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface ComponentProps
  extends React.HTMLAttributes<HTMLElement>,
  VariantProps<typeof componentVariants> {
  // Additional custom props
}

const Component = forwardRef<HTMLElement, ComponentProps>(({
  className,
  variant,
  ...props
}, ref) => {
  return (
    <element
      ref={ref}
      className={cn(componentVariants({ variant }), className)}
      {...props}
    />
  );
});

Component.displayName = 'Component';

export { Component, componentVariants };
```

## Animation System

### Custom Keyframes

```css
@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}

@keyframes caret-blink {
  0%, 70%, 100% { opacity: 1; }
  20%, 50% { opacity: 0; }
}
```

### Animation Utilities

```css
.section-fade-in {
  animation: fade-in 0.5s ease-out;
}

.glass-card {
  transition: all 300ms ease-in-out;
}

.glass-card:hover {
  transform: scale(1.02);
}
```

## Spacing System

Follows Tailwind CSS spacing scale with custom container settings:

```js
// tailwind.config.js
theme: {
  container: {
    center: true,
    padding: "2rem",
    screens: {
      "2xl": "1400px",
    },
  },
  // ... other theme settings
}
```

## Accessibility Guidelines

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows logical flow
- Focus indicators are clearly visible
- Escape key closes modals and dropdowns

### Screen Readers
- Proper semantic HTML structure
- ARIA labels and descriptions where needed
- Status announcements for dynamic content
- Landmark roles for navigation

### Color and Contrast
- Minimum contrast ratio of 4.5:1 for normal text
- Minimum contrast ratio of 3:1 for large text
- Information not conveyed by color alone
- Focus indicators meet contrast requirements

## Custom Utility Classes

### Glass Morphism Effect

```css
.glass-card {
  @apply bg-card shadow-sm border border-gray-100 transition-all duration-300 ease-in-out;
}

.glass-card:hover {
  @apply scale-[1.02] shadow-md;
}
```

Usage:
```tsx
<Card className="glass-card">
  <CardContent>Content with glass effect</CardContent>
</Card>
```

### Two-Tone Icon Effect

```css
.two-tone-icon {
  @apply text-amazon-teal;
  filter: drop-shadow(1px 1px 0px theme('colors.amazon.orange'));
}
```

Usage:
```tsx
<Bell className="two-tone-icon" />
```

## Responsive Design

### Breakpoint Strategy
- **Mobile First**: Design starts with mobile and scales up
- **Progressive Enhancement**: Features added at larger breakpoints
- **Content Priority**: Most important content visible on all devices

### Grid System
```tsx
// Dashboard layout example
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2 space-y-6">
    {/* Main content */}
  </div>
  <div className="space-y-6">
    {/* Sidebar content */}
  </div>
</div>
```

### Container Usage
```tsx
<main className="container mx-auto px-4 py-8">
  {/* Content automatically centered with responsive padding */}
</main>
```

## Component Usage Patterns

### Status Indication

```tsx
// Using Badge variants for status
<Badge variant="success">Approved</Badge>
<Badge variant="warning">Needs Review</Badge>
<Badge variant="info">In Progress</Badge>
```

### Form Layouts

```tsx
// Consistent form styling
<div className="space-y-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="firstName">First Name</Label>
      <Input id="firstName" placeholder="Enter first name" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="lastName">Last Name</Label>
      <Input id="lastName" placeholder="Enter last name" />
    </div>
  </div>
</div>
```

### Loading States

```tsx
// Progress indicators
<Progress value={progress} className="h-2" />

// Button loading state
<Button disabled={isLoading}>
  {isLoading ? "Loading..." : "Submit"}
</Button>
```

## Development Workflow

### Adding New Components

1. **Create the component file** in the appropriate directory
2. **Follow the component template** with proper typing
3. **Add to the main exports** if it's a UI primitive
4. **Update documentation** with usage examples
5. **Test across themes** and screen sizes

### Quality Checklist

- [ ] TypeScript types are comprehensive
- [ ] Component works in both light and dark themes
- [ ] Responsive behavior is tested
- [ ] Accessibility requirements are met
- [ ] Documentation is updated
- [ ] Examples are provided

### Testing Themes

```tsx
// Test component in both themes
function ThemeTest() {
  return (
    <div className="space-y-4">
      <div className="light">
        <YourComponent />
      </div>
      <div className="dark">
        <YourComponent />
      </div>
    </div>
  );
}
```

## Migration Guide

### From Custom Components to Design System

1. **Identify variant patterns** in existing components
2. **Extract common styles** to the design system
3. **Replace hardcoded values** with design tokens
4. **Update TypeScript interfaces** to use standard patterns
5. **Test thoroughly** across all usage contexts

### Updating Existing Components

```tsx
// Before: Custom styling
<button className="bg-blue-500 text-white px-4 py-2 rounded">
  Click me
</button>

// After: Design system component
<Button variant="default">
  Click me
</Button>
```

## Future Considerations

### Planned Enhancements
- Additional component variants based on usage patterns
- Enhanced animation library
- Additional accessibility features
- Performance optimizations
- Theme customization tools

### Monitoring Usage
- Track component adoption across the application
- Identify patterns for new component creation
- Monitor performance impact
- Gather developer feedback

---

This design system documentation serves as the definitive guide for UI development in the Goddard School application. For questions or suggestions, please refer to the main README.md or create an issue in the project repository.