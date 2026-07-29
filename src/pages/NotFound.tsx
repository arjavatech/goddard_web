import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(location.state?.notFound === true);

  useEffect(() => {
    if (!show) {
      // Replace invalid route with /404 in history, then show the page
      navigate('/404', { replace: true, state: { notFound: true } });
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold text-gray-800">404</h1>
      <p className="text-gray-500">Page not found</p>
      <Button onClick={() => navigate('/login', { replace: true })}>Back to Login</Button>
    </div>
  );
}
