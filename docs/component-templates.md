# Component Development Templates

This document provides templates and guidelines for creating new components that follow the Goddard School design system patterns.

## Basic UI Component Template

Use this template for primitive UI components that will be part of the design system:

```tsx
import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Define component variants using class-variance-authority
const componentVariants = cva(
  // Base classes applied to all variants
  "inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Component props interface extending HTML attributes and variant props
export interface ComponentProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof componentVariants> {
  asChild?: boolean; // Optional: for Radix UI Slot pattern
}

// Main component using forwardRef for ref forwarding
const Component = forwardRef<HTMLButtonElement, ComponentProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(componentVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Component.displayName = "Component";

export { Component, componentVariants };
```

## Radix UI Integration Template

For components that need complex accessibility features, use Radix UI primitives:

```tsx
import React, { forwardRef } from 'react';
import * as RadixPrimitive from '@radix-ui/react-primitive';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const componentVariants = cva(
  "base-classes-here",
  {
    variants: {
      variant: {
        default: "default-styles",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ComponentProps
  extends React.ComponentPropsWithoutRef<typeof RadixPrimitive.Root>,
    VariantProps<typeof componentVariants> {}

const Component = forwardRef<
  React.ElementRef<typeof RadixPrimitive.Root>,
  ComponentProps
>(({ className, variant, ...props }, ref) => (
  <RadixPrimitive.Root
    ref={ref}
    className={cn(componentVariants({ variant }), className)}
    {...props}
  />
));

Component.displayName = RadixPrimitive.Root.displayName;

export { Component };
```

## Compound Component Template

For components with multiple related parts (like Card):

```tsx
import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Main container component
const ComponentRoot = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("base-container-classes", className)}
    {...props}
  />
));
ComponentRoot.displayName = "ComponentRoot";

// Header component
const ComponentHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("header-classes", className)}
    {...props}
  />
));
ComponentHeader.displayName = "ComponentHeader";

// Content component
const ComponentContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("content-classes", className)}
    {...props}
  />
));
ComponentContent.displayName = "ComponentContent";

// Export all parts
export {
  ComponentRoot as Component,
  ComponentHeader,
  ComponentContent,
};
```

## Feature Component Template

For domain-specific components (dashboard, forms, etc.):

```tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SomeIcon } from 'lucide-react';

interface FeatureComponentProps {
  // Define specific props for your feature
  title: string;
  status: 'active' | 'inactive' | 'pending';
  onAction?: () => void;
  children?: React.ReactNode;
}

export function FeatureComponent({
  title,
  status,
  onAction,
  children,
}: FeatureComponentProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <SomeIcon className="h-5 w-5" />
            {title}
          </CardTitle>
          <Badge variant={getStatusVariant(status)}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {children}
        {onAction && (
          <Button onClick={onAction} className="mt-4">
            Take Action
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

## Hook Template

For custom hooks that manage component state:

```tsx
import { useState, useEffect, useCallback } from 'react';

interface UseComponentOptions {
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function useComponent({
  defaultValue = '',
  onChange,
}: UseComponentOptions = {}) {
  const [value, setValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  const doAction = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Perform action
      // await someAsyncOperation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    value,
    isLoading,
    error,
    handleChange,
    doAction,
  };
}
```

## Development Checklist

When creating a new component, ensure you:

### ✅ Structure & Typing
- [ ] Uses forwardRef for ref forwarding
- [ ] Has comprehensive TypeScript interfaces
- [ ] Extends appropriate HTML element props
- [ ] Uses VariantProps for variant typing
- [ ] Has proper displayName set

### ✅ Styling & Theming
- [ ] Uses class-variance-authority for variants
- [ ] Supports custom className prop
- [ ] Works in both light and dark themes
- [ ] Uses design system color tokens
- [ ] Follows responsive design patterns

### ✅ Accessibility
- [ ] Proper semantic HTML structure
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] Focus management
- [ ] ARIA attributes where needed

### ✅ Documentation
- [ ] Added to component showcase in README
- [ ] Usage examples provided
- [ ] Props interface documented
- [ ] Variant options listed

### ✅ Testing
- [ ] Works across all supported browsers
- [ ] Responsive behavior verified
- [ ] Theme switching tested
- [ ] Accessibility tested with screen reader
- [ ] Integration with existing components verified

## Common Patterns

### Status Indication
```tsx
const getStatusVariant = (status: string) => {
  const variants = {
    success: 'success',
    error: 'destructive',
    warning: 'warning',
    info: 'info',
    pending: 'secondary',
  };
  return variants[status] || 'default';
};
```

### Loading States
```tsx
{isLoading ? (
  <div className="flex items-center gap-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    Loading...
  </div>
) : (
  <YourContent />
)}
```

### Error Handling
```tsx
{error && (
  <div className="flex items-center gap-2 text-destructive text-sm">
    <AlertCircle className="h-4 w-4" />
    {error}
  </div>
)}
```

### Progressive Disclosure
```tsx
const [isExpanded, setIsExpanded] = useState(false);

return (
  <div>
    <Button
      variant="ghost"
      onClick={() => setIsExpanded(!isExpanded)}
      className="flex items-center gap-2"
    >
      <ChevronDown className={cn(
        "h-4 w-4 transition-transform",
        isExpanded && "rotate-180"
      )} />
      {isExpanded ? 'Show Less' : 'Show More'}
    </Button>
    {isExpanded && (
      <div className="mt-4 space-y-2">
        {/* Additional content */}
      </div>
    )}
  </div>
);
```

## File Organization

```
src/components/
├── ui/                     # Primitive design system components
│   ├── button.tsx
│   ├── card.tsx
│   └── badge.tsx
├── dashboard/              # Feature-specific components
│   ├── enrollment-progress.tsx
│   └── status-badge.tsx
├── layout/                 # Layout components
│   ├── header.tsx
│   └── footer.tsx
└── forms/                  # Form-related components
    ├── form-field.tsx
    └── form-section.tsx
```

## Naming Conventions

- **Components**: PascalCase (`ButtonComponent`, `CardHeader`)
- **Files**: kebab-case (`button-component.tsx`, `card-header.tsx`)
- **Props**: camelCase (`isLoading`, `onValueChange`)
- **CSS Classes**: Tailwind utilities (`flex items-center`)
- **Variants**: lowercase (`default`, `outline`, `ghost`)

## Best Practices

1. **Keep components focused**: Each component should have a single responsibility
2. **Favor composition**: Build complex components from simpler ones
3. **Use TypeScript**: Comprehensive typing improves developer experience
4. **Follow accessibility guidelines**: Ensure all users can interact with components
5. **Test across themes**: Components should work in light and dark modes
6. **Document thoroughly**: Include usage examples and prop descriptions
7. **Performance considerations**: Use React.memo for expensive components
8. **Consistent patterns**: Follow established patterns for predictability

---

These templates provide a solid foundation for creating consistent, accessible, and maintainable components in the Goddard School application.