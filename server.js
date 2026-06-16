const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
