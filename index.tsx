//
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Add a console log to confirm that index.tsx is loaded and rendered.
console.log('index.tsx loaded and rendered.');

// The explicit `export {};` is not strictly necessary as imports already make it a module.
// Removing it can prevent potential parsing issues in some environments.