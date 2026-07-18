import React, { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold',
    'ring-offset-background transition-all duration-150 select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-[var(--amazon-teal)] text-white shadow-sm hover:brightness-110 hover:shadow-md',
        destructive:
          'bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md',
        outline:
          'border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300',
        secondary:
          'bg-slate-100 text-slate-800 hover:bg-slate-200',
        ghost:
          'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        link:
          'text-[var(--amazon-teal)] underline-offset-4 hover:underline p-0 h-auto',
        primary:
          'bg-[var(--amazon-teal)] text-white shadow-sm hover:brightness-110',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm:      'h-8 rounded-lg px-3 text-xs',
        lg:      'h-11 rounded-xl px-6 text-base',
        icon:    'h-9 w-9 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size:    'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
