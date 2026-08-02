/* Presence relay on Cloudflare Durable Objects.
   One PresenceRoom per page path. Live cursors relay over hibernating
   WebSockets, in the moment. Nothing is stored: no paths, no IPs,
   no user agents, no identifiers. */
import { DurableObject } from "cloudflare:workers";
import REGISTRY from "../../presence-server/registry.json";

const BIRDS = REGISTRY.birds;
const COLORS = REGISTRY.colors;

/* TODO: site-wide census ("N elsewhere on the site") needs a small lobby DO
   that rooms report their counts to; the client already handles the message. */
export class PresenceRoom extends DurableObject {
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
    server.serializeAttachment({ meta });
    this.ctx.acceptWebSocket(server);

    const others = this.ctx.getWebSockets()
      .filter((ws) => ws !== server)
      .map((ws) => { try { const a = ws.deserializeAttachment(); return { ...a.meta, state: a.state || 'active' }; } catch { return null; } })
      .filter(Boolean);
    server.send(JSON.stringify({ type: "welcome", self: meta, peers: others }));
    this.broadcast(server, { type: "join", peer: meta });

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, raw) {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    if (m.type === "state" && REGISTRY.states.includes(m.s)) {
      const a = ws.deserializeAttachment();
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
    ws.serializeAttachment(att);
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
    this.broadcast(ws, { type: "leave", id: att.meta.id });
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

    return new Response("presence.josephfus.co — live cursors, nothing stored.", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};
