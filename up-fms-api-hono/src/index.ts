import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from 'drizzle-orm/d1';
import { borrowRecords, feedbacks } from './db/schema';
import { and, gte, lte, eq, sql, desc } from 'drizzle-orm';

// Import Sub-Routers
import checkinRoutes from "./checkin/index";
import equipmentRoutes from "./equipment/index";
import borrowRoutes from "./borrow/index";
import feedbackRoutes from './feedback/index';
import authRoutes from './auth/index';
import disposal from './disposal/index';

type Bindings = {
  up_f_ms_db: D1Database;
  MY_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

/** Helper: สร้างการแจ้งเตือน */
async function createNotification(db: D1Database, title: string, content: string, type: string) {
  try {
    await db.prepare(
      "INSERT INTO notifications (title, content, type, created_at, is_read) VALUES (?, ?, ?, ?, ?)"
    ).bind(title, content, type, new Date().toISOString(), 0).run();
  } catch (e) {
    console.error("Notification Error:", e);
  }
}

// --- [ Cron Job: 20:00 จันทร์-ศุกร์ ] ---
export const handleScheduled = async (env: Bindings) => {
  const db = drizzle(env.up_f_ms_db);
  const now = new Date();
  const day = now.getDay();
  if (day >= 1 && day <= 5) {
    const todayStr = now.toISOString().split('T')[0];
    const records = await db.select().from(borrowRecords)
      .where(sql`DATE(${borrowRecords.created_at}) = ${todayStr}`)
      .all();
    const borrows = records.filter(r => r.action === 'borrow').length;
    const returns = records.filter(r => r.action === 'return').length;

    await createNotification(
      env.up_f_ms_db,
      `สรุปยอดประจำวัน (${todayStr})`,
      `วันนี้มีการยืม ${borrows} รายการ และคืน ${returns} รายการ`,
      'summary'
    );
  }
};

// --- [ Route Management ] ---

app.route('/api/checkin', checkinRoutes);
app.route('/api/admin/checkins', checkinRoutes);
app.route("/api/staff/equipment", equipmentRoutes);

/** 🔔 Notification Endpoints */

app.get('/api/staff/notifications', async (c) => {
  const db = c.env.up_f_ms_db;
  try {
    const res = await db.prepare("SELECT * FROM notifications ORDER BY id DESC LIMIT 50").all();
    const rows = res.results.map((r: any) => ({
      ...r,
      time: new Date(r.created_at).toLocaleString('th-TH', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      }),
      isRead: r.is_read === 1
    }));
    return c.json({ ok: true, rows });
  } catch (e) {
    return c.json({ ok: true, rows: [] });
  }
});

app.patch('/api/staff/notifications/:id/read', async (c) => {
  const id = c.req.param('id');
  await c.env.up_f_ms_db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

// ✅ แก้ไข SQL DELETE ให้ถูกต้อง (ตัด SET is_read = 1 ออก)
app.delete('/api/staff/notifications/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.up_f_ms_db.prepare("DELETE FROM notifications WHERE id = ?").bind(id).run();
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

app.post('/api/staff/notifications/read-all', async (c) => {
  await c.env.up_f_ms_db.prepare("UPDATE notifications SET is_read = 1").run();
  return c.json({ ok: true });
});

app.delete('/api/staff/notifications/clear-all', async (c) => {
  await c.env.up_f_ms_db.prepare("DELETE FROM notifications").run();
  return c.json({ ok: true });
});

/** 📦 Borrow & Feedback Hooks */

app.post('/api/equipment/borrow', async (c, next) => {
  await next();
  if (c.res.status === 200) {
    await createNotification(c.env.up_f_ms_db, "มีการยืมอุปกรณ์ใหม่", `นิสิตทำรายการยืมอุปกรณ์ในระบบ`, "borrow");
  }
});

app.post('/api/equipment/return', async (c, next) => {
  await next();
  if (c.res.status === 200) {
    await createNotification(c.env.up_f_ms_db, "มีการคืนอุปกรณ์", `นิสิตทำรายการคืนอุปกรณ์เรียบร้อยแล้ว`, "return");
  }
});

app.route("/api/equipment", borrowRoutes);

app.get('/api/staff/borrow-records', async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { borrowRecords } = await import('./db/schema');
  const db = drizzle(c.env.up_f_ms_db);
  const data = await db.select().from(borrowRecords).orderBy(desc(borrowRecords.id)).limit(50).all();
  const rows = data.map(r => ({
    ...r,
    time: new Date(r.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }));
  return c.json({ ok: true, days: [{ rows }] });
});

app.post('/api/feedback/submit', async (c, next) => {
  await next();
  if (c.res.status === 200) {
    await createNotification(c.env.up_f_ms_db, "มีฟีดแบคใหม่เข้ามา", `ผู้ใช้ส่งรายงานปัญหาหรือข้อเสนอแนะใหม่`, "feedback");
  }
});

app.route('/api/feedback', feedbackRoutes);
app.route('/api/staff/feedbacks', feedbackRoutes);
app.route('/api/auth', authRoutes);

app.get("/", (c) => c.text("UP-FMS API is running"));

app.route('/api/equipment', disposal); 
app.route('/api/staff', disposal);

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: any) {
    ctx.waitUntil(handleScheduled(env));
  },
};
