import { handleHealth } from "./src/routes/health";
import { handleChat } from "./src/routes/chat";
import homepage from "./public/index.html";

const server = Bun.serve({
  port: process.env.PORT ?? 3000,
  routes: {
    "/": homepage,
    "/health": {
      GET: handleHealth,
    },
    "/chat": {
      POST: handleChat,
    },
    "/*": () => Response.json({ error: "Not Found" }, { status: 404 }),
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at http://localhost:${server.port}`);