import { sql } from "bun";

// En Bun 1.1+, las rutas parametrizadas agregan `params` al request
interface BunRequest extends Request {
  params?: Record<string, string>;
}

export async function getUsers(req: BunRequest): Promise<Response> {
  try {
    const records = await sql`
      SELECT * FROM users
      ORDER BY id ASC
    `;
    return Response.json(records);
  } catch (error) {
    console.error(`Error fetching users: ${error instanceof Error ? error.message : String(error)}`);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function getUserById(req: BunRequest): Promise<Response> {
  const idStr = req.params?.id;
  if (!idStr) return Response.json({ error: "ID required" }, { status: 400 });
  
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const user = await sql`
      SELECT * FROM users
      WHERE id = ${id}
      LIMIT 1
    `;
    
    if (user.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    
    return Response.json(user[0]);
  } catch (error) {
    console.error(`Error fetching user: ${error instanceof Error ? error.message : String(error)}`);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function createUser(req: BunRequest): Promise<Response> {
  try {
    const body = await req.json();
    const { name, email, active = true } = body;

    if (!name || !email) {
      return Response.json({ error: "Name and email are required" }, { status: 400 });
    }

    const newUser = await sql`
      INSERT INTO users (name, email, active)
      VALUES (${name}, ${email}, ${active})
      RETURNING *
    `;

    return Response.json(newUser[0], { status: 201 });
  } catch (error) {
    console.error(`Error creating user: ${error instanceof Error ? error.message : String(error)}`);
    if ((error as any).code === '23505') {
       return Response.json({ error: "Email already exists" }, { status: 409 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function updateUser(req: BunRequest): Promise<Response> {
  const idStr = req.params?.id;
  if (!idStr) return Response.json({ error: "ID required" }, { status: 400 });
  
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid ID" }, { status: 400 });
  
  try {
    const body = await req.json();
    const { name, email, active } = body;

    const updatedUser = await sql`
      UPDATE users
      SET 
        name = COALESCE(${name ?? null}, name),
        email = COALESCE(${email ?? null}, email),
        active = COALESCE(${active ?? null}, active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (updatedUser.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json(updatedUser[0]);
  } catch (error) {
    console.error(`Error updating user: ${error instanceof Error ? error.message : String(error)}`);
    if ((error as any).code === '23505') {
       return Response.json({ error: "Email already exists" }, { status: 409 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function deleteUser(req: BunRequest): Promise<Response> {
  const idStr = req.params?.id;
  if (!idStr) return Response.json({ error: "ID required" }, { status: 400 });
  
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid ID" }, { status: 400 });
  
  try {
    const deleted = await sql`
      DELETE FROM users
      WHERE id = ${id}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ message: "User deleted successfully", id: deleted[0].id });
  } catch (error) {
    console.error(`Error deleting user: ${error instanceof Error ? error.message : String(error)}`);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
