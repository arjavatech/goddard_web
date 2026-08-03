import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  [
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
    'whitespace-nowrap tracking-wide transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[#0F2D52] text-white',
        secondary:
          'border-slate-200/60 bg-slate-100 text-slate-600',
        destructive:
          'border-red-200/60 bg-red-50 text-red-600',
        outline:
          'border-slate-200 text-slate-600 bg-transparent',
        success:
          'border-emerald-200/60 bg-emerald-50 text-emerald-700',
        warning:
          'border-amber-200/60 bg-amber-50 text-amber-700',
        info:
          'border-blue-200/60 bg-blue-50 text-blue-700',
        navy:
          'border-transparent bg-[#EFF5FB] text-[#0F2D52]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        'overflow-hidden text-ellipsis max-w-full',
        className
      )}
      {...props}
    />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
