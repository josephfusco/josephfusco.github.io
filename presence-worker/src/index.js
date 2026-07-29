/* Presence relay + ghost archive on Cloudflare Durable Objects.
   One PresenceRoom per page path. Live cursors relay over hibernating
   WebSockets; every session's cursor timeline is archived (positions and
   timing only — no IPs, no user agents, no identifiers) and replayed
   for future visitors as ghosts. */
import { DurableObject } from "cloudflare:workers";
import REGISTRY from "../../presence-server/registry.json";

const BIRDS = REGISTRY.birds;
const COLORS = REGISTRY.colors;
const MIN_POINTS = REGISTRY.limits.minPoints;
const MIN_DURATION = REGISTRY.limits.minDurationMs;
const MAX_POINTS = REGISTRY.limits.maxPoints;
const MAX_GHOSTS = REGISTRY.limits.maxGhosts;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export class PresenceRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS ghosts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recorded TEXT NOT NULL,
          duration INTEGER NOT NULL,
          points TEXT NOT NULL,
          states TEXT NOT NULL DEFAULT '[]'
        )
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS trace_points (
          conn TEXT NOT NULL,
          t INTEGER NOT NULL,
          x REAL NOT NULL,
          y REAL NOT NULL
        )
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS trace_states (
          conn TEXT NOT NULL,
          t INTEGER NOT NULL,
          s TEXT NOT NULL
        )
      `);
    });
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const id = crypto.randomUUID().slice(0, 8);
    const meta = {
      id,
      name: BIRDS[Math.floor(Math.random() * BIRDS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    server.serializeAttachment({ meta, t0: Date.now(), count: 0 });
    this.ctx.acceptWebSocket(server);

    const others = this.ctx.getWebSockets()
      .filter((ws) => ws !== server)
      .map((ws) => { try { const a = ws.deserializeAttachment(); return { ...a.meta, state: a.state || 'active' }; } catch { return null; } })
      .filter(Boolean);
    server.send(JSON.stringify({ type: "welcome", self: meta, peers: others }));
    this.broadcast(server, { type: "join", peer: meta });

    // Sweep orphaned traces hourly while the room is active
    if (!(await this.ctx.storage.getAlarm())) {
      await this.ctx.storage.setAlarm(Date.now() + 3600_000);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, raw) {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    if (m.type === "state" && REGISTRY.states.includes(m.s)) {
      const a = ws.deserializeAttachment();
      this.ctx.storage.sql.exec(
        "INSERT INTO trace_states (conn, t, s) VALUES (?, ?, ?)",
        a.meta.id, Date.now() - a.t0, m.s,
      );
      a.state = m.s;
      ws.serializeAttachment(a);
      this.broadcast(ws, { type: "state", id: a.meta.id, s: m.s });
      return;
    }

    if (m.type !== "move" || !m.pos) return;

    const att = ws.deserializeAttachment();
    const now = Date.now();
    if (att.lastMove && now - att.lastMove < 45) return; // rate clamp
    att.lastMove = now;
    if (att.count < MAX_POINTS) {
      this.ctx.storage.sql.exec(
        "INSERT INTO trace_points (conn, t, x, y) VALUES (?, ?, ?, ?)",
        att.meta.id,
        Date.now() - att.t0,
        Math.round(m.pos.x * 1000) / 1000,
        Math.round(m.pos.y * 1000) / 1000,
      );
      att.count++;
      ws.serializeAttachment(att);
    }
    this.broadcast(ws, { type: "move", id: att.meta.id, pos: m.pos });
  }

  webSocketClose(ws) {
    this.finishSession(ws);
  }

  webSocketError(ws) {
    this.finishSession(ws);
  }

  finishSession(ws) {
    let att;
    try { att = ws.deserializeAttachment(); } catch { return; }
    const duration = Date.now() - att.t0;

    const rows = this.ctx.storage.sql
      .exec("SELECT t, x, y FROM trace_points WHERE conn = ? ORDER BY t", att.meta.id)
      .toArray();
    const stateRows = this.ctx.storage.sql
      .exec("SELECT t, s FROM trace_states WHERE conn = ? ORDER BY t", att.meta.id)
      .toArray();
    this.ctx.storage.sql.exec("DELETE FROM trace_points WHERE conn = ?", att.meta.id);
    this.ctx.storage.sql.exec("DELETE FROM trace_states WHERE conn = ?", att.meta.id);

    if (rows.length >= MIN_POINTS && duration >= MIN_DURATION) {
      const points = rows.map((r) => [r.t, r.x, r.y]);
      const states = stateRows.map((r) => [r.t, r.s]);
      this.ctx.storage.sql.exec(
        "INSERT INTO ghosts (recorded, duration, points, states) VALUES (?, ?, ?, ?)",
        new Date().toISOString(),
        duration,
        JSON.stringify(points),
        JSON.stringify(states),
      );
      this.ctx.storage.sql.exec(
        "DELETE FROM ghosts WHERE id NOT IN (SELECT id FROM ghosts ORDER BY id DESC LIMIT ?)",
        MAX_GHOSTS,
      );
    }
    this.broadcast(ws, { type: "leave", id: att.meta.id });
  }

  async alarm() {
    // Purge trace rows from sessions that died without a close event
    this.ctx.storage.sql.exec("DELETE FROM trace_points WHERE t < ?", Date.now() - 3600_000);
    this.ctx.storage.sql.exec("DELETE FROM trace_states WHERE t < ?", Date.now() - 3600_000);
    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(Date.now() + 3600_000);
    }
  }

  randomGhost() {
    const row = this.ctx.storage.sql
      .exec("SELECT recorded, duration, points, states FROM ghosts ORDER BY RANDOM() LIMIT 1")
      .toArray()[0];
    if (!row) return null;
    return { recorded: row.recorded, duration: row.duration, points: JSON.parse(row.points), states: JSON.parse(row.states || '[]') };
  }

  broadcast(except, msg) {
    const s = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== except) {
        try { ws.send(s); } catch { /* closing */ }
      }
    }
  }
}

function roomFor(env, pathParam) {
  let page = "/";
  try { page = new URL(pathParam || "/", "http://x").pathname.slice(0, 200); } catch { /* default */ }
  return env.PRESENCE.getByName(page);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      return roomFor(env, url.searchParams.get("path")).fetch(request);
    }

    if (url.pathname === "/ghost") {
      const ghost = await roomFor(env, url.searchParams.get("path")).randomGhost();
      if (!ghost) return new Response("{}", { status: 404, headers: CORS });
      return new Response(JSON.stringify(ghost), { headers: CORS });
    }

    return new Response("presence.josephfus.co — live cursors + ghost archive. No PII stored.", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};
