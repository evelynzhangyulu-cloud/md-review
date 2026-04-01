const express = require('express');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// --- DB helpers ---
function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ documents: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// --- File upload ---
const upload = multer({ dest: path.join(DATA_DIR, 'tmp') });

app.post('/api/documents/upload', upload.array('files'), (req, res) => {
  const db = getDb();
  const results = [];

  for (const file of req.files) {
    const content = fs.readFileSync(file.path, 'utf-8');
    const id = crypto.randomUUID();
    const shareToken = crypto.randomBytes(6).toString('hex');

    // Decode Chinese filename from multer
    let originalName = file.originalname;
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (_) {}

    const docDir = path.join(UPLOADS_DIR, id);
    fs.mkdirSync(docDir, { recursive: true });
    fs.writeFileSync(path.join(docDir, 'original.md'), content);
    fs.writeFileSync(path.join(docDir, 'current.md'), content);

    // Clean up temp file
    fs.unlinkSync(file.path);

    const doc = {
      id,
      title: originalName.replace(/\.md$/i, ''),
      filename: originalName,
      shareToken,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.documents.push(doc);
    results.push(doc);
  }

  saveDb(db);
  res.json(results);
});

// --- List documents ---
app.get('/api/documents', (_req, res) => {
  const db = getDb();
  res.json(db.documents);
});

// --- Get document (admin, with both versions) ---
app.get('/api/documents/:id', (req, res) => {
  const db = getDb();
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const docDir = path.join(UPLOADS_DIR, doc.id);
  const originalContent = fs.readFileSync(path.join(docDir, 'original.md'), 'utf-8');
  const currentContent = fs.readFileSync(path.join(docDir, 'current.md'), 'utf-8');

  res.json({ ...doc, originalContent, currentContent });
});

// --- Get document by share token (reviewer) ---
app.get('/api/review/:token', (req, res) => {
  const db = getDb();
  const doc = db.documents.find(d => d.shareToken === req.params.token);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const docDir = path.join(UPLOADS_DIR, doc.id);
  const currentContent = fs.readFileSync(path.join(docDir, 'current.md'), 'utf-8');

  res.json({
    id: doc.id,
    title: doc.title,
    filename: doc.filename,
    status: doc.status,
    currentContent,
  });
});

// --- Save edited content (reviewer) ---
app.put('/api/documents/:id/content', (req, res) => {
  const db = getDb();
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const docDir = path.join(UPLOADS_DIR, doc.id);
  fs.writeFileSync(path.join(docDir, 'current.md'), req.body.content);

  doc.updatedAt = new Date().toISOString();
  if (req.body.status) {
    doc.status = req.body.status;
  }
  saveDb(db);

  res.json({ success: true });
});

// --- Download current version ---
app.get('/api/documents/:id/download', (req, res) => {
  const db = getDb();
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const docDir = path.join(UPLOADS_DIR, doc.id);
  const content = fs.readFileSync(path.join(docDir, 'current.md'), 'utf-8');

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(doc.filename)}`);
  res.send(content);
});

// --- Download original ---
app.get('/api/documents/:id/download-original', (req, res) => {
  const db = getDb();
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const docDir = path.join(UPLOADS_DIR, doc.id);
  const content = fs.readFileSync(path.join(docDir, 'original.md'), 'utf-8');

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('原始_' + doc.filename)}`);
  res.send(content);
});

// --- Delete document ---
app.delete('/api/documents/:id', (req, res) => {
  const db = getDb();
  const index = db.documents.findIndex(d => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const doc = db.documents[index];
  const docDir = path.join(UPLOADS_DIR, doc.id);
  fs.rmSync(docDir, { recursive: true, force: true });

  db.documents.splice(index, 1);
  saveDb(db);

  res.json({ success: true });
});

// --- Serve frontend in production ---
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    res.sendFile(path.join(clientDist, 'index.html'));
  } else {
    res.status(404).send('Not found - run npm run build first');
  }
});

app.listen(PORT, () => {
  console.log(`✓ MD评审平台已启动: http://localhost:${PORT}`);
});
