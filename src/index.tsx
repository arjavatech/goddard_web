import './index.css';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './AppRouter';

// Suppress Moment.js deprecation warning from @fillout/react dependency
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('Deprecation warning: use moment.updateLocale')) {
    return;
  }
  originalWarn.apply(console, args);
};

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<AppRouter />);