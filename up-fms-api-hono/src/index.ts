import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql, desc, and } from "drizzle-orm";
import { users, equipments, borrowRecords, checkinEvents, feedbacks } from "./db/schema";

type Bindings = { up_fms_db: D1Database };
const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// --- [1] AUTH & USER ---
app.post("/api/auth/register", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const body = await c.req.json();
  try {
    await db.insert(users).values({ ...body, isApproved: 0 });
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: "Username หรือ Email ซ้ำ" }, 400);
  }
});

app.post("/api/auth/login/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const { username, password } = await c.req.json();
  const user = await db.select().from(users).where(eq(users.username, username)).get();
  if (!user || user.password !== password) return c.json({ ok: false, error: "รหัสผ่านผิด" }, 401);
  if (user.isApproved === 0) return c.json({ ok: false, error: "รออนุมัติ" }, 403);
  return c.json({ ok: true, account_role: user.role, username: user.username, fullName: user.fullName });
});

// --- [2] EQUIPMENT CRUD (UPSERT Logic) ---
app.get("/api/equipment/stock/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const rows = await db.select().from(equipments).all();
  return c.json({ ok: true, equipments: rows });
});

app.post("/api/staff/equipment/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const body = await c.req.json();
  const name = body.name?.trim();
  const qtyToAdd = parseInt(body.stock) || parseInt(body.total) || 0;

  if (!name) return c.json({ ok: false, error: "ระบุชื่ออุปกรณ์" }, 400);

  try {
    const existing = await db.select().from(equipments).where(eq(equipments.name, name)).get();
    if (existing) {
      await db.update(equipments).set({
        total: existing.total + qtyToAdd,
        stock: existing.stock + qtyToAdd
      }).where(eq(equipments.id, existing.id)).run();
      return c.json({ ok: true, message: "Updated" });
    } else {
      await db.insert(equipments).values({ name, total: qtyToAdd, stock: qtyToAdd }).run();
      return c.json({ ok: true, message: "Created" });
    }
  } catch (e) { return c.json({ ok: false, error: "Error" }, 500); }
});

app.delete("/api/staff/equipment/:id/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const id = parseInt(c.req.param("id"));
  await db.delete(equipments).where(eq(equipments.id, id)).run();
  return c.json({ ok: true });
});

// --- [3] BORROW & RETURN ---
app.post("/api/equipment/borrow/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const b = await c.req.json();
  const item = await db.select().from(equipments).where(eq(equipments.name, b.equipment)).get();
  if (!item || item.stock < b.qty) return c.json({ ok: false, error: "ของไม่พอ" }, 400);

  await db.update(equipments).set({ stock: item.stock - b.qty }).where(eq(equipments.id, item.id)).run();
  await db.insert(borrowRecords).values({
    equipmentId: item.id, studentId: b.student_id, studentName: b.name,
    faculty: b.faculty, qty: b.qty, action: "borrow", status: "borrowed"
  }).run();
  return c.json({ ok: true });
});

app.post("/api/equipment/return/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const b = await c.req.json();
  const item = await db.select().from(equipments).where(eq(equipments.name, b.equipment)).get();
  if (item) await db.update(equipments).set({ stock: item.stock + b.qty }).where(eq(equipments.id, item.id)).run();
  await db.insert(borrowRecords).values({
    equipmentId: item?.id, studentId: b.student_id, faculty: b.faculty,
    qty: b.qty, action: "return", status: "returned"
  }).run();
  return c.json({ ok: true });
});

app.get("/api/staff/borrow-records/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const date = c.req.query("date") || new Date().toISOString().split("T")[0];
  const rows = await db.select().from(borrowRecords).where(sql`date(occurred_at) = ${date}`).orderBy(desc(borrowRecords.id)).all();
  return c.json({ ok: true, days: [{ date, rows: rows.map(r => ({
    ...r,
    equipment: "อุปกรณ์กีฬา", // ในกรณีที่ต้องการชื่ออุปกรณ์ ให้ Join ตารางเพิ่มเติม
    time: new Date(r.occurredAt).toLocaleTimeString('th-TH')
  })) }] });
});

// --- [4] STATS & FEEDBACK ---
app.post("/api/checkin/event/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const b = await c.req.json();
  await db.insert(checkinEvents).values({
    facility: b.facility + (b.sub_facility ? ` (${b.sub_facility})` : ""),
    count: (b.students || 0) + (b.staff || 0),
    action: "in"
  }).run();
  return c.json({ ok: true });
});

app.get("/api/admin/checkins/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const { from, to } = c.req.query();
  const res = await db.select().from(checkinEvents).where(and(sql`date(occurred_at) >= ${from}`, sql`date(occurred_at) <= ${to}`)).all();
  return c.json(res.map(r => ({
    ts: r.occurredAt,
    session_date: new Date(r.occurredAt).toLocaleDateString("th-TH"),
    facility: r.facility,
    student_count: r.count,
    staff_count: 0
  })));
});

app.get("/api/staff/borrow-records/stats", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const { from, to } = c.req.query();
  const stats = await db.select({
    equipment: sql<string>`'อุปกรณ์รวม'`,
    qty: sql<number>`sum(${borrowRecords.qty})`
  }).from(borrowRecords).where(and(eq(borrowRecords.action, "borrow"), sql`date(occurred_at) BETWEEN ${from} AND ${to}`)).all();
  return c.json({ ok: true, rows: stats, total: stats[0]?.qty || 0 });
});

export default app;
