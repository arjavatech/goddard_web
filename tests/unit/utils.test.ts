import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn() utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('should handle conditional classes', () => {
    expect(cn('px-2', true && 'py-1')).toBe('px-2 py-1');
    expect(cn('px-2', false && 'py-1')).toBe('px-2');
  });

  it('should resolve tailwind conflicts', () => {
    const result = cn('px-2 px-4');
    expect(result).toContain('px-4');
  });

  it('should handle undefined and null values', () => {
    expect(cn('px-2', undefined, null, 'py-1')).toBe('px-2 py-1');
  });

  it('should handle empty strings', () => {
    expect(cn('px-2', '', 'py-1')).toBe('px-2 py-1');
  });

  it('should handle arrays and objects', () => {
    expect(cn(['px-2', 'py-1'])).toBe('px-2 py-1');
    expect(cn({ 'px-2': true, 'py-1': false })).toBe('px-2');
  });

  it('should handle complex scenarios', () => {
    const result = cn(
      'base-class',
      true && 'conditional-class',
      { 'object-class': true },
      ['array-class'],
      undefined,
      null
    );
    expect(result).toContain('base-class');
    expect(result).toContain('conditional-class');
    expect(result).toContain('object-class');
    expect(result).toContain('array-class');
  });
});
