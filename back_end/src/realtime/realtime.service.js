const clients = new Set();

const HEARTBEAT_INTERVAL_MS = 25_000;

const serialize = (value) => JSON.stringify(value);

const writeEvent = (client, event, payload) => {
  try {
    client.res.write(`event: ${event}\n`);
    client.res.write(`data: ${serialize(payload)}\n\n`);
  } catch (_error) {
    clients.delete(client);
  }
};

const broadcast = (event, payload) => {
  for (const client of clients) {
    writeEvent(client, event, payload);
  }
};

const subscribe = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const client = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    res,
  };

  clients.add(client);
  writeEvent(client, "connected", {
    connected: true,
    clientId: client.id,
    timestamp: new Date().toISOString(),
  });

  req.on("close", () => {
    clients.delete(client);
  });
};

setInterval(() => {
  broadcast("heartbeat", {
    timestamp: new Date().toISOString(),
  });
}, HEARTBEAT_INTERVAL_MS).unref();

const emitMutation = (details = {}) => {
  broadcast("mutation", {
    timestamp: new Date().toISOString(),
    ...details,
  });
};

module.exports = {
  emitMutation,
  subscribe,
};
