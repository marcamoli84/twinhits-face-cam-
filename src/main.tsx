import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filter out benign TensorFlow Lite / WebAssembly runtime INFO logs that Emscripten routes to console.error
if (typeof window !== 'undefined') {
  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (
      first.includes('Created TensorFlow Lite XNNPACK delegate') ||
      first.startsWith('INFO:') ||
      first.includes('XNNPACK delegate for CPU')
    ) {
      console.info(...args);
      return;
    }
    originalError(...args);
  };
}

createRoot(document.getElementById('root')!).render(<App />);
