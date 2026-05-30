import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'Lead Qualifier Pro API is running!',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/db-status', (req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({
      error: 'DATABASE_URL not configured',
    });
  }
  res.json({
    status: 'configured',
    database: dbUrl.includes('neon') ? 'PostgreSQL (Neon)' : 'Unknown',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/clients/me', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }
  res.json({
    message: 'Client endpoint - database integration coming soon',
    apiKey: '***',
  });
});

app.get('/api/leads', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }
  res.json({
    leads: [],
    message: 'Leads endpoint - database integration coming soon',
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

const PORT = 9999;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
