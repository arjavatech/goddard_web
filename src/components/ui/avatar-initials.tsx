interface AvatarInitialsProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-lg',
};

export function AvatarInitials({ initials, size = 'sm', className }: AvatarInitialsProps) {
  return (
    <div
      className={`rounded-full bg-[#074da1] text-white flex items-center justify-center font-bold flex-shrink-0 ${sizeClasses[size]} ${className ?? ''}`}
    >
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
}
