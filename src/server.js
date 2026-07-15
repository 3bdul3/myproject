const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'crm.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // 1. Leads Table
    db.run(`CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      status TEXT DEFAULT 'Lead', -- Lead, Contact, Customer
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Deals Table
    db.run(`CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      stage TEXT DEFAULT 'Proposal', -- Proposal, Negotiation, Won, Lost
      lead_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE SET NULL
    )`);

    // 3. Tasks Table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      due_date TEXT,
      status TEXT DEFAULT 'Pending', -- Pending, Completed
      lead_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE SET NULL
    )`);

    // Check if we need to seed the database
    db.get("SELECT COUNT(*) as count FROM leads", (err, row) => {
      if (row && row.count === 0) {
        seedData();
      }
    });
  });
}

function seedData() {
  console.log('Seeding demo CRM data...');
  const leads = [
    { name: 'أحمد العتيبي', email: 'ahmed@example.com', phone: '0501234567', company: 'شركة الرياض للتقنية', status: 'Customer', notes: 'عميل مميز مهتم بالحلول السحابية' },
    { name: 'سارة الشمري', email: 'sara@example.com', phone: '0559876543', company: 'مؤسسة الابتكار الرقمي', status: 'Contact', notes: 'تم التواصل معها لتقديم عرض تجريبي' },
    { name: 'John Doe', email: 'john@example.com', phone: '0543210987', company: 'Global Tech Solutions', status: 'Lead', notes: 'Interested in ERP implementation' },
    { name: 'خالد المطيري', email: 'khaled@example.com', phone: '0562223334', company: 'الخليج للاستشارات', status: 'Customer', notes: 'تم توقيع العقد السنوي للخدمات الدورية' },
    { name: 'فاطمة الحربي', email: 'fatima@example.com', phone: '0598887776', company: 'مجموعة المجد للتجارة', status: 'Lead', notes: 'تحتاج إلى اتصال لمناقشة التفاصيل التقنية' }
  ];

  const stmtLead = db.prepare(`INSERT INTO leads (name, email, phone, company, status, notes) VALUES (?, ?, ?, ?, ?, ?)`);
  leads.forEach((l, index) => {
    stmtLead.run(l.name, l.email, l.phone, l.company, l.status, l.notes, function(err) {
      if (err) return console.error(err);

      const leadId = this.lastID;
      // Add a deal for some of the leads
      if (index === 0) {
        db.run(`INSERT INTO deals (title, amount, stage, lead_id) VALUES (?, ?, ?, ?)`, 'نظام سحابي متكامل', 45000, 'Won', leadId);
        db.run(`INSERT INTO tasks (title, due_date, status, lead_id) VALUES (?, ?, ?, ?)`, 'متابعة الدعم الفني بعد التركيب', '2025-05-10', 'Pending', leadId);
      } else if (index === 1) {
        db.run(`INSERT INTO deals (title, amount, stage, lead_id) VALUES (?, ?, ?, ?)`, 'تطوير تطبيق جوال', 28000, 'Proposal', leadId);
        db.run(`INSERT INTO tasks (title, due_date, status, lead_id) VALUES (?, ?, ?, ?)`, 'إرسال العرض المالي الفني المعدل', '2025-04-20', 'Pending', leadId);
      } else if (index === 2) {
        db.run(`INSERT INTO deals (title, amount, stage, lead_id) VALUES (?, ?, ?, ?)`, 'ERP Solution Consultation', 120000, 'Negotiation', leadId);
      } else if (index === 3) {
        db.run(`INSERT INTO deals (title, amount, stage, lead_id) VALUES (?, ?, ?, ?)`, 'تطوير موقع ويب تعريفي', 15000, 'Won', leadId);
      } else if (index === 4) {
        db.run(`INSERT INTO tasks (title, due_date, status, lead_id) VALUES (?, ?, ?, ?)`, 'مكالمة هاتفية أولية للتعارف', '2025-04-18', 'Pending', leadId);
      }
    });
  });
  stmtLead.finalize();
}

// ---------------- REST APIs ----------------

// Dashboard Analytics
app.get('/api/analytics', (req, res) => {
  const stats = {
    totalLeads: 0,
    activeDeals: 0,
    pipelineValue: 0,
    wonValue: 0,
    pendingTasks: 0,
    recentLeads: []
  };

  db.get(`SELECT COUNT(*) as count FROM leads`, (err, row) => {
    if (row) stats.totalLeads = row.count;

    db.get(`SELECT COUNT(*) as count, SUM(amount) as total FROM deals WHERE stage != 'Lost'`, (err, row2) => {
      if (row2) {
        stats.activeDeals = row2.count || 0;
        stats.pipelineValue = row2.total || 0;
      }

      db.get(`SELECT SUM(amount) as total FROM deals WHERE stage = 'Won'`, (err, rowWon) => {
        if (rowWon) stats.wonValue = rowWon.total || 0;

        db.get(`SELECT COUNT(*) as count FROM tasks WHERE status = 'Pending'`, (err, row3) => {
          if (row3) stats.pendingTasks = row3.count;

          db.all(`SELECT * FROM leads ORDER BY id DESC LIMIT 5`, (err, rows) => {
            if (rows) stats.recentLeads = rows;
            res.json({ success: true, data: stats });
          });
        });
      });
    });
  });
});

// Leads Endpoints
app.get('/api/leads', (req, res) => {
  db.all("SELECT * FROM leads ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, data: rows });
  });
});

app.post('/api/leads', (req, res) => {
  const { name, email, phone, company, status, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  db.run(`INSERT INTO leads (name, email, phone, company, status, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email || '', phone || '', company || '', status || 'Lead', notes || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, data: { id: this.lastID, name, email, phone, company, status, notes } });
    }
  );
});

app.put('/api/leads/:id', (req, res) => {
  const { name, email, phone, company, status, notes } = req.body;
  const { id } = req.params;

  db.run(`UPDATE leads SET name = ?, email = ?, phone = ?, company = ?, status = ?, notes = ? WHERE id = ?`,
    [name, email, phone, company, status, notes, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Lead updated successfully' });
    }
  );
});

app.delete('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM leads WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Lead deleted successfully' });
  });
});


// Deals Endpoints
app.get('/api/deals', (req, res) => {
  db.all(`
    SELECT deals.*, leads.name as lead_name, leads.company as lead_company
    FROM deals
    LEFT JOIN leads ON deals.lead_id = leads.id
    ORDER BY deals.id DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, data: rows });
  });
});

app.post('/api/deals', (req, res) => {
  const { title, amount, stage, lead_id } = req.body;
  if (!title || !amount) return res.status(400).json({ error: 'Title and amount are required' });

  db.run(`INSERT INTO deals (title, amount, stage, lead_id) VALUES (?, ?, ?, ?)`,
    [title, amount, stage || 'Proposal', lead_id || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, data: { id: this.lastID, title, amount, stage, lead_id } });
    }
  );
});

app.put('/api/deals/:id', (req, res) => {
  const { title, amount, stage, lead_id } = req.body;
  const { id } = req.params;

  db.run(`UPDATE deals SET title = ?, amount = ?, stage = ?, lead_id = ? WHERE id = ?`,
    [title, amount, stage, lead_id, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Deal updated successfully' });
    }
  );
});

app.put('/api/deals/:id/stage', (req, res) => {
  const { stage } = req.body;
  const { id } = req.params;

  db.run(`UPDATE deals SET stage = ? WHERE id = ?`, [stage, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Deal stage updated successfully' });
  });
});

app.delete('/api/deals/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM deals WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Deal deleted successfully' });
  });
});


// Tasks Endpoints
app.get('/api/tasks', (req, res) => {
  db.all(`
    SELECT tasks.*, leads.name as lead_name
    FROM tasks
    LEFT JOIN leads ON tasks.lead_id = leads.id
    ORDER BY tasks.due_date ASC, tasks.id DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, data: rows });
  });
});

app.post('/api/tasks', (req, res) => {
  const { title, due_date, status, lead_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  db.run(`INSERT INTO tasks (title, due_date, status, lead_id) VALUES (?, ?, ?, ?)`,
    [title, due_date || '', status || 'Pending', lead_id || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, data: { id: this.lastID, title, due_date, status, lead_id } });
    }
  );
});

app.put('/api/tasks/:id/toggle', (req, res) => {
  const { id } = req.params;

  db.get(`SELECT status FROM tasks WHERE id = ?`, [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Task not found' });
    const newStatus = row.status === 'Completed' ? 'Pending' : 'Completed';

    db.run(`UPDATE tasks SET status = ? WHERE id = ?`, [newStatus, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, status: newStatus });
    });
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM tasks WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Task deleted successfully' });
  });
});

app.listen(PORT, () => {
  console.log(`CRM Backend running at http://localhost:${PORT}`);
});
