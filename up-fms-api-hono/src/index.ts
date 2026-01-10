import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql } from "drizzle-orm";
import { users, equipments, borrowRecords } from "./db/schema";

type Bindings = { up_fms_db: D1Database };
const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "https://up-fms-api-hono.aman02012548.workers.dev",
    ],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// --- Auth & Admin ---
app.post("/auth/login/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const { username, password } = await c.req.json();
  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .get();
  if (!user || user.password !== password)
    return c.json(
      { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
      401,
    );
  if (user.isApproved === 0)
    return c.json(
      { ok: false, pending: true, error: "บัญชีรอการอนุมัติ" },
      403,
    );
  return c.json({
    ok: true,
    account_role: user.role,
    username: user.username,
    fullName: user.fullName,
  });
});

// --- Equipment Management ---
app.get("/api/equipment/stock/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const rows = await db.select().from(equipments).all();
  return c.json({ ok: true, equipments: rows });
});

app.post("/api/staff/equipment/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const body = await c.req.json();
  try {
    await db
      .insert(equipments)
      .values({ name: body.name, total: body.total, stock: body.total });
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: "มีชื่ออุปกรณ์นี้แล้ว" }, 400);
  }
});

app.patch("/api/staff/equipment/:id/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  await db.update(equipments).set(body).where(eq(equipments.id, id)).run();
  return c.json({ ok: true });
});

app.delete("/api/staff/equipment/:id/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const id = parseInt(c.req.param("id"));
  await db.delete(equipments).where(eq(equipments.id, id)).run();
  return c.json({ ok: true });
});

export default app;
