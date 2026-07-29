/* Presence relay + ghost archive.
   Live: broadcasts cursor positions between connected visitors.
   Ghosts: every session's cursor timeline is recorded and saved on disconnect,
   then replayed for future visitors. Positions and timing only — no PII:
   no IPs, no user agents, no identifiers of any kind are stored. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const REGISTRY = require('./registry.json');

const PORT = 4001;
const GHOST_DIR = path.join(__dirname, 'ghosts');
const MAX_GHOSTS = REGISTRY.limits.maxGhosts;
const MIN_POINTS = REGISTRY.limits.minPoints;
const MIN_DURATION = REGISTRY.limits.minDurationMs;
const MAX_POINTS = REGISTRY.limits.maxPoints;

const STATES = REGISTRY.states;
const BIRDS = REGISTRY.birds;
const COLORS = REGISTRY.colors;

fs.mkdirSync(GHOST_DIR, { recursive: true });

/* In-memory ghost index: { file, path } */
let ghostIndex = [];
function loadGhostIndex() {
  ghostIndex = [];
  for (const f of fs.readdirSync(GHOST_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      const g = JSON.parse(fs.readFileSync(path.join(GHOST_DIR, f)));
      if (g.path && Array.isArray(g.points)) ghostIndex.push({ file: f, path: g.path });
    } catch { /* skip corrupt */ }
  }
}
loadGhostIndex();

function sanitizePath(p) {
  if (typeof p !== 'string') return '/';
  try { return new URL(p, 'http://x').pathname.slice(0, 200); } catch { return '/'; }
}

function saveGhost(session) {
  const duration = Date.now() - session.t0;
  if (session.points.length < MIN_POINTS || duration < MIN_DURATION) return;
  const file = `${Date.now()}-${session.meta.id}.json`;
  const ghost = {
    path: session.path,
    recorded: new Date().toISOString(),
    duration,
    points: session.points, // [tOffsetMs, x, y] — normalized coords, 3 decimals
    states: session.states, // [tOffsetMs, 'active'|'idle'|'away'|'typing']
  };
  fs.writeFileSync(path.join(GHOST_DIR, file), JSON.stringify(ghost));
  ghostIndex.push({ file, path: session.path });
  // prune oldest beyond cap
  while (ghostIndex.length > MAX_GHOSTS) {
    const oldest = ghostIndex.shift();
    try { fs.unlinkSync(path.join(GHOST_DIR, oldest.file)); } catch { /* already gone */ }
  }
}

/* HTTP: GET /ghost?path=/foo → one random archived session for that page */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/ghost') {
    const page = sanitizePath(u.searchParams.get('path') || '/');
    const matches = ghostIndex.filter((g) => g.path === page);
    if (!matches.length) { res.writeHead(404); res.end('{}'); return; }
    const pick = matches[Math.floor(Math.random() * matches.length)];
    try {
      const body = fs.readFileSync(path.join(GHOST_DIR, pick.file));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    } catch { res.writeHead(404); res.end('{}'); }
    return;
  }
  if (u.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ghosts: ghostIndex.length, live: peers.size }));
    return;
  }
  res.writeHead(404); res.end();
});

/* WebSocket: live relay + passive recording */
const wss = new WebSocketServer({ server });
const peers = new Map();
let seq = 0;

function broadcast(except, msg) {
  const s = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client !== except && client.readyState === 1) client.send(s);
  }
}

wss.on('connection', (ws) => {
  const id = ++seq;
  const meta = { id, name: BIRDS[id % BIRDS.length], color: COLORS[id % COLORS.length] };
  const session = { meta, pos: null, state: 'active', path: '/', t0: Date.now(), points: [], states: [] };
  peers.set(ws, session);

  ws.send(JSON.stringify({
    type: 'welcome',
    self: meta,
    peers: [...peers.values()]
      .filter((p) => p.meta.id !== id)
      .map((p) => ({ ...p.meta, pos: p.pos, state: p.state })),
  }));
  broadcast(ws, { type: 'join', peer: meta });

  ws.on('message', (buf) => {
    let m;
    try { m = JSON.parse(buf); } catch { return; }
    if (m.type === 'hello') {
      session.path = sanitizePath(m.path);
    } else if (m.type === 'state' && STATES.includes(m.s)) {
      session.state = m.s;
      if (session.states.length < 500) session.states.push([Date.now() - session.t0, m.s]);
      broadcast(ws, { type: 'state', id, s: m.s });
    } else if (m.type === 'move' && m.pos) {
      const now = Date.now();
      if (session.lastMove && now - session.lastMove < 45) return; // rate clamp
      session.lastMove = now;
      session.pos = m.pos;
      if (session.points.length < MAX_POINTS) {
        session.points.push([
          Date.now() - session.t0,
          Math.round(m.pos.x * 1000) / 1000,
          Math.round(m.pos.y * 1000) / 1000,
        ]);
      }
      broadcast(ws, { type: 'move', id, pos: m.pos });
    }
  });

  ws.on('close', () => {
    saveGhost(session);
    peers.delete(ws);
    broadcast(null, { type: 'leave', id });
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`port ${PORT} is already in use — is another relay running?`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`presence relay + ghost archive on :${PORT} (${ghostIndex.length} ghosts on file)`);
});
