import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { equipment, borrowRecords } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const borrow = new Hono<{ Bindings: { up_fms_db: D1Database } }>();

/**
 * 1. POST: ยืมอุปกรณ์ (รองรับการบันทึกวันที่ย้อนหลัง)
 * ใช้สำหรับหน้า EquipmentPage ทั้งการยืมปกติและ Backdate
 */
borrow.post('/borrow', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const body = await c.req.json();

  try {
    // 1. ตรวจสอบสต็อกจริงในฐานข้อมูล
    const item = await db.select().from(equipment).where(eq(equipment.name, body.equipment)).get();
    if (!item || item.stock < body.qty) {
      return c.json({ ok: false, error: "อุปกรณ์ในคลังไม่เพียงพอ" }, 400);
    }

    // 2. ตัดสต็อกอุปกรณ์
    await db.update(equipment)
      .set({ stock: item.stock - body.qty })
      .where(eq(equipment.name, body.equipment))
      .run();

    // 3. บันทึกรายการยืม
    // หาก body.borrow_date มีค่า (จากโหมด backdate) จะใช้ค่านั้นเป็น ISO String
    await db.insert(borrowRecords).values({
      student_id: body.student_id,
      name: body.name || "",
      faculty: body.faculty,
      equipment: body.equipment,
      qty: body.qty,
      action: 'borrow',
      status: 'pending',
      created_at: body.borrow_date ? new Date(body.borrow_date).toISOString() : new Date().toISOString()
    }).run();

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/**
 * 2. GET: สรุปสถิติสำหรับหน้า Report (Stats)
 * แก้ไข: ใช้ substr เพื่อเปรียบเทียบวันที่จาก ISO String ให้ถูกต้อง กราฟจะแสดงผลทันที
 */
borrow.get('/stats', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const from = c.req.query('from'); // รับค่า YYYY-MM-DD
  const to = c.req.query('to');     // รับค่า YYYY-MM-DD

  if (!from || !to) {
    return c.json({ ok: false, error: "กรุณาระบุช่วงวันที่" }, 400);
  }

  try {
    // ✅ ปรับปรุง SQL: ใช้ substr ตัดเอาเฉพาะ 10 หลักแรก (YYYY-MM-DD) มาเทียบ
    const rows = await db.select({
      equipment: borrowRecords.equipment,
      qty: sql<number>`CAST(SUM(${borrowRecords.qty}) AS INT)`
    })
      .from(borrowRecords)
      .where(and(
        eq(borrowRecords.action, 'borrow'),
        sql`substr(${borrowRecords.created_at}, 1, 10) >= ${from}`,
        sql`substr(${borrowRecords.created_at}, 1, 10) <= ${to}`
      ))
      .groupBy(borrowRecords.equipment)
      .all();

    // ✅ ปรับปรุง SQL: ใช้ substr สำหรับยอดรวมทั้งหมด
    const totalResult = await db.select({
      total: sql<number>`CAST(SUM(${borrowRecords.qty}) AS INT)`
    })
      .from(borrowRecords)
      .where(and(
        eq(borrowRecords.action, 'borrow'),
        sql`substr(${borrowRecords.created_at}, 1, 10) >= ${from}`,
        sql`substr(${borrowRecords.created_at}, 1, 10) <= ${to}`
      ))
      .get();

    return c.json({
      ok: true,
      rows: rows || [],
      total: totalResult?.total || 0
    });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/**
 * 3. GET: ดึงรายการค้างคืน (Pending Returns)
 */
borrow.get('/pending-returns', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  try {
    const data = await db.select().from(borrowRecords)
      .where(eq(borrowRecords.status, 'pending'))
      .orderBy(desc(borrowRecords.id))
      .all();

    const rows = data.map(r => ({ ...r, remaining: r.qty }));
    return c.json({ ok: true, rows });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/**
 * 4. POST: คืนอุปกรณ์
 */
borrow.post('/return', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const body = await c.req.json();

  try {
    // 1. คืนสต็อกกลับเข้าคลัง
    const item = await db.select().from(equipment).where(eq(equipment.name, body.equipment)).get();
    if (item) {
      await db.update(equipment)
        .set({ stock: item.stock + body.qty })
        .where(eq(equipment.name, body.equipment))
        .run();
    }

    // 2. อัปเดตสถานะการยืมเป็น returned
    await db.update(borrowRecords)
      .set({ status: 'returned', action: 'return' })
      .where(and(
        eq(borrowRecords.student_id, body.student_id),
        eq(borrowRecords.equipment, body.equipment),
        eq(borrowRecords.status, 'pending')
      ))
      .run();

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

export default borrow;
