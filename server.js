import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');

// Cabeceras de seguridad para todo lo que se sirve. (No se define una política de contenido completa porque el CRM incrusta Google, Cal.com
// y Supabase; el HTML ajeno se neutraliza en el origen con DOMPurify. Sí se impide que otro sitio meta el CRM en un iframe.)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'payment=(), usb=()');
  next();
});
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath, {
  index: false, // servimos index.html a mano abajo, sin caché
  setHeaders: (res, filePath) => {
    if (filePath.includes('/assets/')) {
      // Los archivos con hash en el nombre pueden cachearse largo tiempo sin riesgo
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// index.html siempre fresco: nunca en caché, para que apunte a los assets
// más recientes en cada deploy (evita quedarse pegado en una versión vieja).
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bit CRM frontend sirviendo en el puerto ${PORT}`);
});
