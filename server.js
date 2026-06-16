const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Server-side proxy for Ahrefs free DR API (avoids browser CORS issues)
app.get('/api/dr', (req, res) => {
  const target = req.query.target;
  if (!target) return res.status(400).json({ error: 'target required' });

  const url = `https://api.ahrefs.com/v3/public/domain-rating-free?target=${encodeURIComponent(target)}`;
  https.get(url, { headers: { 'Accept': 'application/json' } }, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(apiRes.statusCode).send(data);
    });
  }).on('error', err => {
    res.status(500).json({ error: err.message });
  });
});

// Serve static homepage
app.use(express.static(path.join(__dirname, 'public')));

// Serve all tool pages under /tools/
app.use('/tools', express.static(path.join(__dirname, 'tools')));

// Fallback (Express 5 wildcard syntax)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SEO Tools running → http://localhost:${PORT}`);
  console.log(`Bulk DR Checker  → http://localhost:${PORT}/tools/bulk-dr-checker/`);
});
