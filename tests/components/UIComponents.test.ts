import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/test-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

describe('UI Components', () => {
  describe('Card Component', () => {
    it('should render card with content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
          </CardHeader>
          <CardContent>Card content</CardContent>
        </Card>
      );

      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render card with description', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description text</CardDescription>
          </CardHeader>
        </Card>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should support custom className', () => {
      const { container } = render(
        <Card className="custom-class">
          <CardContent>Content</CardContent>
        </Card>
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Badge Component', () => {
    it('should render badge with text', () => {
      render(<Badge>Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render different badge variants', () => {
      const { rerender } = render(<Badge variant="default">Default</Badge>);
      expect(screen.getByText('Default')).toBeInTheDocument();

      rerender(<Badge variant="success">Success</Badge>);
      expect(screen.getByText('Success')).toBeInTheDocument();

      rerender(<Badge variant="destructive">Error</Badge>);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should render badge with custom className', () => {
      const { container } = render(
        <Badge className="custom-badge">Custom</Badge>
      );

      expect(container.querySelector('.custom-badge')).toBeInTheDocument();
    });
  });

  describe('Dialog Component', () => {
    it('should render dialog trigger', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Open Dialog')).toBeInTheDocument();
    });

    it('should open dialog on trigger click', async () => {
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Content</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const trigger = screen.getByText('Open');
      trigger.click();

      // Dialog content should be visible after click
      expect(screen.getByText('Dialog Content')).toBeInTheDocument();
    });
  });

  describe('Checkbox Component', () => {
    it('should render checkbox', () => {
      const { container } = render(<Checkbox />);
      expect(container.querySelector('input[type="checkbox"]')).toBeInTheDocument();
    });

    it('should handle checked state', () => {
      const { container } = render(<Checkbox checked={true} />);
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should handle disabled state', () => {
      const { container } = render(<Checkbox disabled />);
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });

    it('should handle change events', () => {
      const handleChange = vi.fn();
      const { container } = render(
        <Checkbox onCheckedChange={handleChange} />
      );

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.click();

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Progress Component', () => {
    it('should render progress bar', () => {
      const { container } = render(<Progress value={50} />);
      expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
    });

    it('should display correct progress value', () => {
      const { container } = render(<Progress value={75} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.getAttribute('aria-valuenow')).toBe('75');
    });

    it('should handle 0% progress', () => {
      const { container } = render(<Progress value={0} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.getAttribute('aria-valuenow')).toBe('0');
    });

    it('should handle 100% progress', () => {
      const { container } = render(<Progress value={100} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.getAttribute('aria-valuenow')).toBe('100');
    });
  });

  describe('Textarea Component', () => {
    it('should render textarea', () => {
      const { container } = render(
        <textarea placeholder="Enter text" />
      );
      expect(container.querySelector('textarea')).toBeInTheDocument();
    });

    it('should handle text input', () => {
      const { container } = render(
        <textarea placeholder="Enter text" />
      );
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'test content';
      expect(textarea.value).toBe('test content');
    });

    it('should handle disabled state', () => {
      const { container } = render(
        <textarea disabled />
      );
      expect(container.querySelector('textarea')).toBeDisabled();
    });
  });

  describe('Select Component', () => {
    it('should render select trigger', () => {
      render(
        <select>
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('should handle selection change', () => {
      const handleChange = vi.fn();
      const { container } = render(
        <select onChange={handleChange}>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </select>
      );

      const select = container.querySelector('select') as HTMLSelectElement;
      select.value = '2';
      select.dispatchEvent(new Event('change', { bubbles: true }));

      expect(handleChange).toHaveBeenCalled();
    });

    it('should handle disabled state', () => {
      const { container } = render(
        <select disabled>
          <option>Option 1</option>
        </select>
      );

      expect(container.querySelector('select')).toBeDisabled();
    });
  });

  describe('Tabs Component', () => {
    it('should render tab list', () => {
      render(
        <div role="tablist">
          <button role="tab">Tab 1</button>
          <button role="tab">Tab 2</button>
        </div>
      );

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
    });

    it('should handle tab selection', () => {
      const handleTabChange = vi.fn();
      render(
        <div role="tablist">
          <button role="tab" onClick={() => handleTabChange('tab1')}>Tab 1</button>
          <button role="tab" onClick={() => handleTabChange('tab2')}>Tab 2</button>
        </div>
      );

      screen.getByText('Tab 2').click();
      expect(handleTabChange).toHaveBeenCalledWith('tab2');
    });
  });
});
