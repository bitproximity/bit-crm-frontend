import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

// Cualquier ruta que no sea un archivo estático devuelve index.html
// (necesario para que /deals, /tasks, etc. funcionen al refrescar la página)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bit CRM frontend sirviendo en el puerto ${PORT}`);
});
