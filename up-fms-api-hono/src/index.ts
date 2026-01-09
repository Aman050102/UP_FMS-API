import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { eq, sql, and } from 'drizzle-orm';
import { users, equipments, borrowRecords } from './db/schema';

type Bindings = {
  up_fms_db: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// --- Middlewares ---
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://your-production-url.com'], // ปรับตามจริง
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// --- Constants ---
const FACULTIES = [
  "คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ", "คณะพลังงานและสิ่งแวดล้อม",
  "คณะเทคโนโลยีสารสนเทศและการสื่อสาร", "คณะพยาบาลศาสตร์",
  "คณะแพทยศาสตร์", "คณะทันตแพทยศาสตร์", "คณะสาธารณสุขศาสตร์",
  "คณะเภสัชศาสตร์", "คณะสหเวชศาสตร์", "คณะวิศวกรรมศาสตร์",
  "คณะวิทยาศาสตร์", "คณะวิทยาศาสตร์การแพทย์", "คณะรัฐศาสตร์และสังคมศาสตร์",
  "คณะนิติศาสตร์", "คณะบริหารธุรกิจและนิเทศศาสตร์", "คณะศิลปศาสตร์",
  "คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์", "วิทยาลัยการศึกษา",
];

// ==========================================
// 1. Authentication APIs
// ==========================================

app.post('/auth/register/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  try {
    const body = await c.req.json();
    await db.insert(users).values({
      username: body.username,
      password: body.password,
      role: body.role,
      studentId: body.student_id || '',
      faculty: body.faculty || '',
      userCode: Math.random().toString(36).substring(7)
    });
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: "Username already exists" }, 400);
  }
});

app.post('/auth/login/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const { username, password } = await c.req.json();
  const user = await db.select().from(users).where(eq(users.username, username)).get();

  if (!user || user.password !== password) {
    return c.json({ ok: false, error: "Invalid credentials" }, 401);
  }

  return c.json({
    ok: true,
    account_role: user.role,
    username: user.username,
    next: user.role === 'staff' ? '/staff/menu' : '/user/menu'
  });
});

// ==========================================
// 2. Student Helper APIs (Borrow/Return)
// ==========================================

app.get('/api/faculties/', (c) => c.json({ ok: true, faculties: FACULTIES }));

app.get('/api/equipment/stock/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const rows = await db.select().from(equipments).all();
  return c.json({ ok: true, equipments: rows });
});

app.post('/api/equipment/borrow/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const body = await c.req.json();
  const equip = await db.select().from(equipments).where(eq(equipments.name, body.equipment)).get();

  if (!equip || equip.stock < body.qty) {
    return c.json({ ok: false, message: "Insufficient stock" }, 400);
  }

  await db.batch([
    db.update(equipments).set({ stock: equip.stock - body.qty }).where(eq(equipments.id, equip.id)),
    db.insert(borrowRecords).values({
      equipmentId: equip.id,
      qty: body.qty,
      action: 'borrow',
      studentId: body.student_id,
      faculty: body.faculty,
      studentName: body.name
    })
  ]);
  return c.json({ ok: true });
});

app.post('/api/equipment/return/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const body = await c.req.json();
  const equip = await db.select().from(equipments).where(eq(equipments.name, body.equipment)).get();

  if (!equip) return c.json({ ok: false, message: "Item not found" }, 404);

  await db.batch([
    db.update(equipments).set({ stock: equip.stock + body.qty }).where(eq(equipments.id, equip.id)),
    db.insert(borrowRecords).values({
      equipmentId: equip.id,
      qty: body.qty,
      action: 'return',
      studentId: body.student_id,
      faculty: body.faculty
    })
  ]);
  return c.json({ ok: true });
});

app.get('/api/equipment/pending-returns/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const rows = await db.all(sql`
    SELECT student_id, faculty, e.name as equipment,
    SUM(CASE WHEN action = 'borrow' THEN qty ELSE -qty END) as remaining
    FROM borrow_records br JOIN equipments e ON br.equipment_id = e.id
    GROUP BY student_id, equipment HAVING remaining > 0
  `);
  return c.json({ ok: true, rows });
});

// ==========================================
// 3. Staff Management APIs
// ==========================================

app.get('/api/staff/equipments/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const rows = await db.select().from(equipments).all();
  return c.json({ ok: true, rows });
});

app.post('/api/staff/equipment/:id/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const body = await c.req.json();
  await db.insert(equipments).values({
    name: body.name, stock: body.stock, total: body.total
  });
  return c.json({ ok: true });
});

app.patch('/api/staff/equipment/:id/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  await db.update(equipments).set(body).where(eq(equipments.id, id));
  return c.json({ ok: true });
});

app.delete('/api/staff/equipment/:id/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const id = parseInt(c.req.param('id'));
  await db.delete(equipments).where(eq(equipments.id, id));
  return c.json({ ok: true });
});

app.get('/api/staff/borrow-records/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const dateStr = c.req.query('date') || new Date().toISOString().split('T')[0];
  const studentId = c.req.query('student_id');

  let query = db.select({
    id: borrowRecords.id,
    time: sql<string>`strftime('%H:%M', ${borrowRecords.occurredAt}, 'localtime')`,
    student_id: borrowRecords.studentId,
    faculty: borrowRecords.faculty,
    equipment: equipments.name,
    action: borrowRecords.action,
    qty: borrowRecords.qty
  })
  .from(borrowRecords)
  .leftJoin(equipments, eq(borrowRecords.equipmentId, equipments.id));

  if (studentId) {
    query = query.where(eq(borrowRecords.studentId, studentId)) as any;
  } else {
    query = query.where(sql`date(${borrowRecords.occurredAt}, 'localtime') = ${dateStr}`) as any;
  }

  const records = await query.all();
  return c.json({ ok: true, days: [{ date: dateStr, rows: records }] });
});

export default app;
