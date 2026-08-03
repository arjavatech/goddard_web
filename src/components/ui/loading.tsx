import React from 'react';

interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ message = 'Loading...', size = 'md' }: LoadingProps) {
  const sizeMap = {
    sm: { ring: 'h-5 w-5 border-2', text: 'text-xs' },
    md: { ring: 'h-8 w-8 border-2', text: 'text-sm' },
    lg: { ring: 'h-12 w-12 border-[3px]', text: 'text-base' },
  };
  const s = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="relative flex items-center justify-center">
        {/* Outer ring */}
        <span className={`${s.ring} rounded-full border-slate-200`} style={{ display: 'block' }} />
        {/* Spinning arc */}
        <span
          className={`absolute ${s.ring} rounded-full border-t-[var(--amazon-teal)] animate-spin`}
          style={{ borderColor: 'transparent', borderTopColor: 'var(--amazon-teal)', display: 'block' }}
        />
      </div>
      {message && (
        <p className={`${s.text} text-slate-500 font-medium`}>{message}</p>
      )}
    </div>
  );
}
