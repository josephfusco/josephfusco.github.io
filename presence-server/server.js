/* Presence relay.
   Broadcasts cursor positions between connected visitors, in the moment.
   Nothing is stored: no paths, no IPs, no user agents, no identifiers. */
const http = require('http');
const { WebSocketServer } = require('ws');

const REGISTRY = require('./registry.json');

const PORT = 4001;
const STATES = REGISTRY.states;
const BIRDS = REGISTRY.birds;
const COLORS = REGISTRY.colors;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ live: peers.size }));
    return;
  }
  res.writeHead(404); res.end();
});

/* WebSocket: live relay, nothing else */
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
  const session = { meta, pos: null, state: 'active' };
  peers.set(ws, session);

  ws.send(JSON.stringify({
    type: 'welcome',
    self: meta,
    peers: [...peers.values()]
      .filter((p) => p.meta.id !== id)
      .map((p) => ({ ...p.meta, pos: p.pos, state: p.state })),
  }));
  broadcast(ws, { type: 'join', peer: meta });
  broadcast(null, { type: 'census', total: peers.size });

  ws.on('message', (buf) => {
    let m;
    try { m = JSON.parse(buf); } catch { return; }
    if (m.type === 'state' && STATES.includes(m.s)) {
      session.state = m.s;
      broadcast(ws, { type: 'state', id, s: m.s });
    } else if (m.type === 'move' && m.pos) {
      const now = Date.now();
      if (session.lastMove && now - session.lastMove < 45) return; // rate clamp
      session.lastMove = now;
      session.pos = m.pos;
      broadcast(ws, { type: 'move', id, pos: m.pos });
    }
  });

  ws.on('close', () => {
    peers.delete(ws);
    broadcast(null, { type: 'leave', id });
    broadcast(null, { type: 'census', total: peers.size });
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
  console.log(`presence relay on :${PORT}`);
});
