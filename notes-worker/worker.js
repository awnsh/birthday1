// Tiny shared-notes API for the birthday site.
// GET  /notes           -> { "closingNote": "...", "memory:0": "...", ... }
// POST /notes {key,value} -> saves one note; key must be one of ALLOWED_KEYS
//
// Everyone who opens the site reads the same KV record, so an edit made on
// one device shows up for anyone else who (re)loads the page. There's no
// login here — the site's URL itself is the only thing gating who can
// write, same as the rest of this private gift link.

// "closingNote", or "memory:<index>" / "water:<index>" for any rose or
// watering-message index — pattern-based so adding more roses or more
// watering steps on the page doesn't require touching this worker.
const ALLOWED_KEY_PATTERN = /^(closingNote|memory:\d+|water:\d+)$/;
const MAX_LEN = 2000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (url.pathname === "/notes" && request.method === "GET") {
      const data = (await env.NOTES.get("notes", "json")) || {};
      return json(data);
    }

    if (url.pathname === "/notes" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400);
      }
      if (
        !body ||
        typeof body.key !== "string" ||
        !ALLOWED_KEY_PATTERN.test(body.key) ||
        typeof body.value !== "string" ||
        body.value.length > MAX_LEN
      ) {
        return json({ error: "invalid payload" }, 400);
      }
      const data = (await env.NOTES.get("notes", "json")) || {};
      data[body.key] = body.value;
      await env.NOTES.put("notes", JSON.stringify(data));
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
