const server = Bun.serve({
  port: process.env.PORT ?? 3000,
  routes: {
    "/health": {
      GET: () =>
        Response.json({
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
    },
    "/*": () => Response.json({ error: "Not Found" }, { status: 404 }),
  },
});

console.log(`Server running at http://localhost:${server.port}`);