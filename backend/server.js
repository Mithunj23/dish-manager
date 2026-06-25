const express  = require('express');
const cors     = require('cors');
const http     = require('http');
const { WebSocketServer } = require('ws');
const { initDB, getAllDishes, getDishById, toggleDish } = require('./database');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'PATCH', 'OPTIONS'],
}));
app.use(express.json());

// ── WebSocket broadcast helper ────────────────────────────────────────────────
function broadcast(payload) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

wss.on('connection', ws => {
  console.log('[WS] Client connected  — total:', wss.clients.size);
  // Send full snapshot on connect so client syncs immediately
  ws.send(JSON.stringify({ type: 'snapshot', dishes: getAllDishes() }));
  ws.on('close', () => console.log('[WS] Client disconnected — total:', wss.clients.size));
});

// ── REST API ──────────────────────────────────────────────────────────────────

// GET /api/dishes — fetch all dishes
app.get('/api/dishes', (_req, res) => {
  try {
    res.json({ success: true, data: getAllDishes() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dishes/:id — fetch single dish
app.get('/api/dishes/:id', (req, res) => {
  const dish = getDishById(req.params.id);
  if (!dish) return res.status(404).json({ success: false, error: 'Dish not found' });
  res.json({ success: true, data: dish });
});

// PATCH /api/dishes/:id/toggle — toggle isPublished
app.patch('/api/dishes/:id/toggle', async (req, res) => {
  try {
    const dish = await toggleDish(req.params.id);
    if (!dish) return res.status(404).json({ success: false, error: 'Dish not found' });

    // Broadcast to all connected WebSocket clients (real-time bonus ✓)
    broadcast({ type: 'dish_updated', dish });

    res.json({ success: true, data: dish });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /health
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', dishes: getAllDishes().length, timestamp: new Date().toISOString() })
);

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

initDB().then(() => {
  server.listen(PORT, () => {
    console.log('\n🍽  Dish Manager API is running');
    console.log(`   REST → http://localhost:${PORT}/api/dishes`);
    console.log(`   WS   → ws://localhost:${PORT}`);
    console.log('\nSimulate a backend change (real-time test):');
    console.log(`   curl -X PATCH http://localhost:${PORT}/api/dishes/d-001/toggle\n`);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});
