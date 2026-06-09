import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/test-utils';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  it('should render input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should handle text input', () => {
    const { container } = render(<Input type="text" />);
    const input = container.querySelector('input') as HTMLInputElement;
    
    input.value = 'test value';
    expect(input.value).toBe('test value');
  });

  it('should handle different input types', () => {
    const { container: emailContainer } = render(<Input type="email" />);
    expect(emailContainer.querySelector('input[type="email"]')).toBeInTheDocument();

    const { container: passwordContainer } = render(<Input type="password" />);
    expect(passwordContainer.querySelector('input[type="password"]')).toBeInTheDocument();

    const { container: numberContainer } = render(<Input type="number" />);
    expect(numberContainer.querySelector('input[type="number"]')).toBeInTheDocument();
  });

  it('should handle change events', () => {
    const handleChange = vi.fn();
    const { container } = render(<Input onChange={handleChange} />);
    const input = container.querySelector('input') as HTMLInputElement;
    
    input.value = 'new value';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    const { container } = render(<Input disabled />);
    expect(container.querySelector('input')).toBeDisabled();
  });

  it('should have correct placeholder', () => {
    render(<Input placeholder="Enter your email" />);
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('should support value prop', () => {
    const { container } = render(<Input value="test" readOnly />);
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('test');
  });

  it('should handle focus and blur events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    const { container } = render(
      <Input onFocus={handleFocus} onBlur={handleBlur} />
    );
    const input = container.querySelector('input') as HTMLInputElement;
    
    input.focus();
    expect(handleFocus).toHaveBeenCalled();
    
    input.blur();
    expect(handleBlur).toHaveBeenCalled();
  });
});
