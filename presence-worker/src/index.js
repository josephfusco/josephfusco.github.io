/* Presence relay on Cloudflare Durable Objects.
   One PresenceRoom per page path. Live cursors relay over hibernating
   WebSockets, in the moment. Nothing is stored: no paths, no IPs,
   no user agents, no identifiers. */
import { DurableObject } from "cloudflare:workers";
import REGISTRY from "../../presence-server/registry.json";

const BIRDS = REGISTRY.birds;
const COLORS = REGISTRY.colors;

/* The lobby: rooms report their head counts here so every page can
   say "N elsewhere on the site". Counts only, nothing else. */
/* The lobby adds up the rooms, and a room only counts while it is
   still saying so. Every entry is stamped; anything that has not
   reported inside the window is dropped rather than summed, so a room
   whose object went away cannot keep a number alive forever. */
const LOBBY_STALE_MS = 180_000;

export class PresenceLobby extends DurableObject {
  async update(path, count) {
    const counts = (await this.ctx.storage.get("counts")) || {};
    const now = Date.now();
    if (count > 0) counts[path] = { n: count, at: now };
    else delete counts[path];

    let total = 0;
    for (const [key, entry] of Object.entries(counts)) {
      /* entries written before the stamp existed are treated as stale */
      const at = entry && typeof entry === "object" ? entry.at : 0;
      const n = entry && typeof entry === "object" ? entry.n : entry;
      if (!at || now - at > LOBBY_STALE_MS) { delete counts[key]; continue; }
      total += n;
    }
    await this.ctx.storage.put("counts", counts);
    return total;
  }
}

export class PresenceRoom extends DurableObject {
  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const url = new URL(request.url);
    let page = "/";
    try { page = new URL(url.searchParams.get("path") || "/", "http://x").pathname.slice(0, 200); } catch { /* default */ }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const id = crypto.randomUUID().slice(0, 8);
    const meta = {
      id,
      name: BIRDS[Math.floor(Math.random() * BIRDS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    server.serializeAttachment({ meta, page, seen: Date.now() });
    this.ctx.acceptWebSocket(server);
    this.ctx.waitUntil(this.armSweep());

    const others = this.ctx.getWebSockets()
      .filter((ws) => ws !== server)
      .map((ws) => { try { const a = ws.deserializeAttachment(); return { ...a.meta, state: a.state || 'active' }; } catch { return null; } })
      .filter(Boolean);
    server.send(JSON.stringify({ type: "welcome", self: meta, peers: others }));
    this.broadcast(server, { type: "join", peer: meta });
    this.ctx.waitUntil(this.announceCensus(page));

    return new Response(null, { status: 101, webSocket: client });
  }

  async announceCensus(page) {
    try {
      const total = await this.env.LOBBY.getByName("lobby")
        .update(page, this.ctx.getWebSockets().length);
      this.broadcast(null, { type: "census", total });
    } catch { /* census is best effort */ }
  }

  /* A room is only as honest as its membership. Sockets that stop
     answering are swept, so a laptop that slept or a tab that died
     without a close frame cannot haunt the count. */
  async armSweep() {
    if (!(await this.ctx.storage.getAlarm())) {
      await this.ctx.storage.setAlarm(Date.now() + 60_000);
    }
  }

  async alarm() {
    const cutoff = Date.now() - 150_000;
    for (const ws of this.ctx.getWebSockets()) {
      let a;
      try { a = ws.deserializeAttachment(); } catch { continue; }
      if ((a.seen || 0) < cutoff) {
        try { ws.close(1001, "quiet too long"); } catch { /* already gone */ }
        this.broadcast(ws, { type: "leave", id: a.meta.id });
      }
    }
    const left = this.ctx.getWebSockets();
    if (left.length > 0) {
      /* renew the room's claim in the lobby while anyone is still here */
      let page = "/";
      try { page = left[0].deserializeAttachment().page || "/"; } catch { /* default */ }
      await this.announceCensus(page);
      await this.ctx.storage.setAlarm(Date.now() + 60_000);
    }
  }

  touch(ws) {
    try {
      const a = ws.deserializeAttachment();
      a.seen = Date.now();
      ws.serializeAttachment(a);
    } catch { /* closing */ }
  }

  webSocketMessage(ws, raw) {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    this.touch(ws);
    if (m.type === "ping") return;

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
    this.ctx.waitUntil(this.announceCensus(att.page || "/"));
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

/* The WordPress record, read from the .org profile feed and told in
   the site's voice. Cached an hour; the site keeps a build-time copy
   for when this endpoint is unreachable. */
const WP_FEED = "https://profiles.wordpress.org/joefusco/feed/";
const WP_KEEP = 20;
const WP_PR = /^(Submitted|Merged) pull request #(\d+) (?:to|into) ([\w.-]+\/[\w.-]+): (.+)$/;
const WP_PUSH = /^Pushed (\d+) commits? to ([\w.-]+\/[\w.-]+): (.+)$/;
const WP_SVN = /^Committed \[(\d+)\] to (.+?): (.+)$/;
const WP_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600",
};

function wpPhrase(title) {
  let m = WP_PR.exec(title);
  if (m) return [(m[1] === "Submitted" ? "Opened" : "Merged") + " a pull request in " + m[3], m[4]];
  m = WP_PUSH.exec(title);
  if (m) {
    const n = parseInt(m[1], 10);
    return ["Pushed " + (n === 1 ? "a commit" : n + " commits") + " to " + m[2], m[3]];
  }
  m = WP_SVN.exec(title);
  if (m) return ["Committed to " + m[2], m[3]];
  return [title, ""];
}

function wpDecode(s) {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").trim();
}

async function wpActivity() {
  const res = await fetch(WP_FEED, {
    headers: { "User-Agent": "josephfus.co worker" },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!res.ok) return new Response("{}", { status: 502, headers: WP_HEADERS });
  const xml = await res.text();
  const items = [];
  const seen = new Set();
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) && items.length < WP_KEEP) {
    const block = m[1];
    const pick = (tag) => {
      const t = new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">").exec(block);
      return t ? t[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() : "";
    };
    const title = wpDecode(pick("title"));
    const link = wpDecode(pick("link"));
    if (!title || seen.has(link)) continue;
    seen.add(link);
    const [what, subject] = wpPhrase(title);
    let date = "";
    const d = new Date(pick("pubDate"));
    if (!isNaN(d)) date = d.toISOString().slice(0, 10);
    items.push({ what, subject: subject.replace(/\.$/, ""), url: link, date });
  }
  return new Response(JSON.stringify({ items }), { headers: WP_HEADERS });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      return roomFor(env, url.searchParams.get("path")).fetch(request);
    }

    if (url.pathname === "/wp-activity") {
      return wpActivity();
    }

    return new Response("josephfus.co/ws — live cursors, nothing stored.", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};
