import { handleHealth } from "./src/routes/health";
import { handleChat } from "./src/routes/chat";
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser 
} from "./src/routes/users";
import { initDb } from "./src/db/setup";
import homepage from "./public/index.html";

// Inicializar la base de datos (crear tabla si no existe)
await initDb();

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
    "/api/users": {
      GET: getUsers,
      POST: createUser,
    },
    "/api/users/:id": {
      GET: getUserById,
      PUT: updateUser,
      DELETE: deleteUser,
    },
    "/*": () => Response.json({ error: "Not Found" }, { status: 404 }),
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at http://localhost:${server.port}`);