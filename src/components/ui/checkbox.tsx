import React, { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { indeterminate?: boolean }
>(({ className, indeterminate, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    checked={indeterminate ? 'indeterminate' : checked}
    className={cn(
      // Base
      'group relative h-[18px] w-[18px] shrink-0 rounded-[5px] border-2 transition-all duration-150 outline-none',
      // Default state
      'border-slate-300 bg-white',
      // Hover
      'hover:border-[#0F2D52]/60 hover:bg-slate-50',
      // Checked / indeterminate
      'data-[state=checked]:border-[#0F2D52] data-[state=checked]:bg-[#0F2D52]',
      'data-[state=indeterminate]:border-[#0F2D52] data-[state=indeterminate]:bg-[#0F2D52]',
      // Focus ring
      'focus-visible:ring-2 focus-visible:ring-[#013e89]/25 focus-visible:ring-offset-1',
      // Disabled
      'disabled:cursor-not-allowed disabled:opacity-40',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
      {indeterminate
        ? <Minus className="h-3 w-3 stroke-[3]" />
        : <Check className="h-3 w-3 stroke-[3]" />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
export { Checkbox };