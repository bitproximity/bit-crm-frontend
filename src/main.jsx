import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Si llegamos hasta acá, la carga fue exitosa: limpiamos el seguro de recarga
// automática por chunk desactualizado, para que vuelva a poder dispararse
// solo si el próximo deploy causa el mismo problema.
sessionStorage.removeItem('bitcrm-chunk-reload');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
