const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = 3000;

// Change this later to move online (Atlas URL)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'kitchenlog';

app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next(err);
});
app.use(express.static(__dirname));

let db;
MongoClient.connect(MONGODB_URI)
  .then(client => {
    db = client.db(DB_NAME);
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

function requireDb(req, res, next) {
  if (!db) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  next();
}

function validateCook(cook) {
  if (!cook || !cook.food || !cook.staff) return 'Missing required fields';
  if (cook.temp !== undefined && cook.temp !== '' && isNaN(parseFloat(cook.temp))) return 'Invalid temp';
  const traysNum = parseInt(cook.trays, 10);
  if (cook.trays !== undefined && cook.trays !== '' && (isNaN(traysNum) || traysNum < 1)) return 'Invalid trays';
  return null;
}
// Save cook data
app.post('/api/cooks', requireDb, async (req, res) => {
  try {
    const cook = req.body;
    const validationError = validateCook(cook);
    if (validationError) return res.status(400).json({ error: validationError });

    await db.collection('cooks').insertOne({
      ...cook,
      createdAt: new Date()
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Load recent cook data
app.get('/api/cooks', requireDb, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '8', 10);
    const cooks = await db.collection('cooks')
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    res.json(cooks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export full CSV
app.get('/api/cooks/export', requireDb, async (req, res) => {
  try {
    const cooks = await db.collection('cooks').find({}).sort({ createdAt: 1 }).toArray();

    const headers = [
      'Food Item','Start Date','Start Time','End Date','End Time',
      'Duration (min)','Core Temp (°C)','Staff','Trays'
    ];

    const rows = cooks.map(c => [
      c.food, c.startDate, c.startTime, c.endDate, c.endTime,
      c.duration, c.temp, c.staff, c.trays
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const bom = '\ufeff';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="kitchenlog.csv"');
    res.send(bom + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});




