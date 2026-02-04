require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');
let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch (err) {
  // PDF export will be unavailable until puppeteer is installed.
}

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Local MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
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
    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
      console.log(`Access from tablet: http://<your-computer-ip>:${PORT}`);
    });
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

function buildDateFilter(query) {
  const { year, month, startDate, endDate } = query;

  // If explicit start/end provided, use range filter
  if (startDate || endDate) {
    const filter = {};
    if (startDate && endDate) {
      filter.startDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.startDate = { $gte: startDate };
    } else if (endDate) {
      filter.startDate = { $lte: endDate };
    }
    return filter;
  }

  // Fallback to year/month filtering
  if (year && month) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    return { startDate: new RegExp(`^${ym}-`) };
  }
  return {};
}
// Save cook data
app.post('/api/cooks', requireDb, async (req, res) => {
  try {
    const cook = req.body;
    const validationError = validateCook(cook);
    if (validationError) return res.status(400).json({ error: validationError });

    await db.collection('cooks_combioven').insertOne({
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
    const filter = buildDateFilter(req.query);
    const cooks = await db.collection('cooks_combioven')
      .find(filter)
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
    const { year, month, startDate, endDate } = req.query;
    const filter = buildDateFilter(req.query);
    const cooks = await db.collection('cooks_combioven').find(filter).sort({ createdAt: 1 }).toArray();

    const headers = [
      'Food Item','Start Date','Start Time','End Time',
      'Duration (min)','Core Temp (�C)','Staff','Trays'
    ];

    const rows = cooks.map(c => [
      c.food, c.startDate, c.startTime, c.endTime,
      c.duration, c.temp, c.staff, c.trays
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const bom = '\ufeff';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    let suffix = 'all';
    if (year && month) {
      const monthNames = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
      ];
      const monthIndex = Math.max(1, Math.min(12, parseInt(month, 10))) - 1;
      suffix = `${monthNames[monthIndex]}-${year}`;
    }
    res.setHeader('Content-Disposition', `attachment; filename="kitchenlog-${suffix}.csv"`);
    res.send(bom + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export PDF report (HTML -> PDF)
app.get('/api/cooks/report.pdf', requireDb, async (req, res) => {
  try {
    if (!puppeteer) {
      return res.status(500).json({ error: 'PDF export requires puppeteer. Install it with: npm install puppeteer' });
    }

    const { year, month, startDate, endDate } = req.query;
    const qs = [];
    if (startDate) qs.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) qs.push(`endDate=${encodeURIComponent(endDate)}`);
    if (!startDate && !endDate && year && month) {
      qs.push(`year=${encodeURIComponent(year)}`, `month=${encodeURIComponent(month)}`);
    }
    qs.push('print=1');
    const queryString = qs.length ? `?${qs.join('&')}` : '';
    const url = `http://localhost:${PORT}/departments/combioven-report.html${queryString}`;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.__reportReady === true');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    let suffix = 'all';
    if (year && month) {
      const monthNames = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
      ];
      const monthIndex = Math.max(1, Math.min(12, parseInt(month, 10))) - 1;
      suffix = `${monthNames[monthIndex]}-${year}`;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kitchenlog-${suffix}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF export failed' });
  }
});




