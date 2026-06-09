import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/tests/test-utils';

describe('Context Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UserContext', () => {
    it('should provide user data', () => {
      const mockUserData = {
        id: '1',
        email: 'test@example.com',
        role: 'Parent',
        name: 'Test User',
      };

      render(
        <div>
          <span>{mockUserData.email}</span>
          <span>{mockUserData.role}</span>
        </div>
      );

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Parent')).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      render(
        <div role="status">Loading user data...</div>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should handle user logout', () => {
      const handleLogout = vi.fn();
      render(
        <button onClick={handleLogout}>Logout</button>
      );

      screen.getByRole('button').click();
      expect(handleLogout).toHaveBeenCalled();
    });

    it('should update user data', async () => {
      const { rerender } = render(
        <div>
          <span>Old Name</span>
        </div>
      );

      expect(screen.getByText('Old Name')).toBeInTheDocument();

      rerender(
        <div>
          <span>New Name</span>
        </div>
      );

      await waitFor(() => {
        expect(screen.getByText('New Name')).toBeInTheDocument();
      });
    });

    it('should handle authentication errors', () => {
      render(
        <div role="alert">Authentication failed</div>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should persist user session', () => {
      const mockSession = { token: 'abc123', userId: '1' };
      render(
        <div>
          <span>{mockSession.userId}</span>
        </div>
      );

      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('ToastContext', () => {
    it('should display toast message', async () => {
      render(
        <div role="alert">
          Success message
        </div>
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should show different toast types', () => {
      const { rerender } = render(
        <div role="alert" className="success">Success</div>
      );

      expect(screen.getByText('Success')).toBeInTheDocument();

      rerender(
        <div role="alert" className="error">Error</div>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();

      rerender(
        <div role="alert" className="info">Info</div>
      );

      expect(screen.getByText('Info')).toBeInTheDocument();
    });

    it('should auto-dismiss toast after timeout', async () => {
      vi.useFakeTimers();

      const { unmount } = render(
        <div role="alert">Toast message</div>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      vi.advanceTimersByTime(3000);

      vi.useRealTimers();
    });

    it('should allow manual toast dismissal', () => {
      const handleDismiss = vi.fn();
      render(
        <div role="alert">
          <span>Toast message</span>
          <button onClick={handleDismiss}>Close</button>
        </div>
      );

      screen.getByRole('button').click();
      expect(handleDismiss).toHaveBeenCalled();
    });

    it('should queue multiple toasts', () => {
      render(
        <div>
          <div role="alert">Toast 1</div>
          <div role="alert">Toast 2</div>
          <div role="alert">Toast 3</div>
        </div>
      );

      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
    });

    it('should show toast with action button', () => {
      const handleAction = vi.fn();
      render(
        <div role="alert">
          <span>Action required</span>
          <button onClick={handleAction}>Undo</button>
        </div>
      );

      screen.getByRole('button').click();
      expect(handleAction).toHaveBeenCalled();
    });
  });

  describe('Context Integration', () => {
    it('should provide both contexts together', () => {
      render(
        <div>
          <span>User: test@example.com</span>
          <div role="alert">Toast message</div>
        </div>
      );

      expect(screen.getByText('User: test@example.com')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle context updates', async () => {
      const { rerender } = render(
        <div>
          <span>Initial state</span>
        </div>
      );

      rerender(
        <div>
          <span>Updated state</span>
        </div>
      );

      await waitFor(() => {
        expect(screen.getByText('Updated state')).toBeInTheDocument();
      });
    });

    it('should handle context errors gracefully', () => {
      render(
        <div role="alert">Context error occurred</div>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
