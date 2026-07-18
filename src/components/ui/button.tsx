import React, { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold',
    'transition-all duration-200 select-none cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2D52]/20 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white shadow-xs',
        destructive:
          'bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md',
        outline:
          'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-xs',
        secondary:
          'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900',
        ghost:
          'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        link:
          'text-[#1a6fc4] underline-offset-4 hover:underline p-0 h-auto shadow-none',
        primary:
          'bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white shadow-xs',
        soft:
          'bg-[#EFF5FB] text-[#0F2D52] hover:bg-[#dceaf7] hover:text-[#0F2D52]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm:      'h-8 rounded-xl px-3 text-xs',
        lg:      'h-11 rounded-xl px-6 text-base',
        xl:      'h-12 rounded-xl px-8 text-base',
        icon:    'h-9 w-9 rounded-xl',
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

export { Button, buttonVariants };
