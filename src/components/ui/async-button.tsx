import React, { useState } from 'react';
import { Button } from './button';
import { Loader2, Check, X } from 'lucide-react';

interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => Promise<void>;
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function AsyncButton({ 
  onClick, 
  children, 
  variant = 'default',
  size = 'default',
  className,
  disabled,
  ...props 
}: AsyncButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    if (state === 'loading') return;
    
    setState('loading');
    try {
      await onClick();
      setState('success');
      setTimeout(() => setState('idle'), 2000);
    } catch (error) {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const getButtonContent = () => {
    switch (state) {
      case 'loading':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </>
        );
      case 'success':
        return (
          <>
            <Check className="h-4 w-4 mr-2" />
            Success!
          </>
        );
      case 'error':
        return (
          <>
            <X className="h-4 w-4 mr-2" />
            Error
          </>
        );
      default:
        return children;
    }
  };

  const getVariant = () => {
    if (state === 'success') return 'default';
    if (state === 'error') return 'destructive';
    return variant;
  };

  return (
    <Button
      {...props}
      variant={getVariant()}
      size={size}
      className={className}
      disabled={disabled || state === 'loading'}
      onClick={handleClick}
    >
      {getButtonContent()}
    </Button>
  );
}