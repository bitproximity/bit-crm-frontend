import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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
