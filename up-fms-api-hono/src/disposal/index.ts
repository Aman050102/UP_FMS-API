import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { disposalRequests, equipment } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

type Bindings = {
  up_f_ms_db: D1Database;
};

const disposal = new Hono<{ Bindings: Bindings }>();

/**
 * [POST] นิสิตช่วยงานส่งคำขอแจ้งชำรุด
 * Path: /api/equipment/disposal-request
 */
disposal.post('/disposal-request', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  try {
    const body = await c.req.json();

    const result = await db.insert(disposalRequests).values({
      equipmentId: Number(body.equipment_id),
      equipmentName: body.equipment_name,
      qty: Number(body.qty),
      reason: body.reason,
      reporterName: body.reporter_name,
      imageBase64: body.image_base64 || null,
      createdAt: new Date().toISOString()
    }).run();

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/**
 * [GET] เจ้าหน้าที่ดึงรายการที่รออนุมัติ
 * Path: /api/staff/disposal-requests
 */
disposal.get('/staff/disposal-requests', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  try {
    const results = await db.select()
      .from(disposalRequests)
      .where(eq(disposalRequests.status, 'pending'))
      .orderBy(desc(disposalRequests.id))
      .all();

    return c.json({ ok: true, requests: results });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/**
 * [POST] เจ้าหน้าที่อนุมัติและตัดสต็อก (Transaction-like Batch)
 * Path: /api/staff/disposal-approve
 */
disposal.post('/staff/disposal-approve', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const { request_id, equipment_id, qty } = await c.req.json();

  try {
    // ดึงข้อมูลอุปกรณ์ปัจจุบัน
    const item = await db.select().from(equipment).where(eq(equipment.id, equipment_id)).get();

    if (!item) return c.json({ ok: false, error: "ไม่พบข้อมูลอุปกรณ์" }, 404);

    // ใช้ Batch ของ D1 เพื่อความชัวร์ว่าทำงานสำเร็จทั้งหมด (Atomicity)
    await c.env.up_f_ms_db.batch([
      // 1. อัปเดตสถานะคำขอ
      c.env.up_f_ms_db.prepare(
        "UPDATE disposal_requests SET status = 'approved', approved_at = ? WHERE id = ?"
      ).bind(new Date().toISOString(), request_id),

      // 2. ตัดสต็อก (stock) และตัดยอดรวม (total) เพราะของเสียคือหายไปจากระบบเลย
      c.env.up_f_ms_db.prepare(
        "UPDATE equipments SET stock = stock - ?, total = total - ? WHERE id = ?"
      ).bind(qty, qty, equipment_id)
    ]);

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

export default disposal;
