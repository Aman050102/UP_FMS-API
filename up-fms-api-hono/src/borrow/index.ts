import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { equipment, borrowRecords } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const borrow = new Hono<{ Bindings: { up_fms_db: D1Database } }>();

/**
 * 1. POST: ยืมอุปกรณ์ / บันทึกสถิติย้อนหลัง
 */
borrow.post('/borrow', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const body = await c.req.json();
  const isBackdate = body.skip_stock_update === true; // เช็ค flag ว่าเป็นสถิติหรือไม่

  try {
    // โหมดปกติ: ต้องเช็คและตัดสต็อก
    if (!isBackdate) {
      const item = await db.select().from(equipment).where(eq(equipment.name, body.equipment)).get();
      if (!item || item.stock < body.qty) {
        return c.json({ ok: false, error: "อุปกรณ์ในคลังไม่เพียงพอ" }, 400);
      }

      // ตัดสต็อกอุปกรณ์จริง
      await db.update(equipment)
        .set({ stock: item.stock - body.qty })
        .where(eq(equipment.name, body.equipment))
        .run();
    }

    // บันทึกรายการลง Ledger (ทั้งแบบปกติ และ สถิติย้อนหลัง)
    await db.insert(borrowRecords).values({
      student_id: body.student_id,
      name: body.name || "",
      faculty: body.faculty,
      equipment: body.equipment,
      qty: body.qty,
      action: isBackdate ? 'stat' : 'borrow', // ถ้าเป็นสถิติให้ใช้ action 'stat' เพื่อแยกประเภท
      status: isBackdate ? 'completed' : 'pending', // สถิติไม่ต้องรอคืน
      created_at: body.borrow_date ? new Date(body.borrow_date).toISOString() : new Date().toISOString()
    }).run();

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/**
 * 2. GET: สรุปสถิติสำหรับรายงาน (ดึงทั้ง borrow และ stat)
 */
borrow.get('/stats', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const from = c.req.query('from');
  const to = c.req.query('to');

  if (!from || !to) return c.json({ ok: false, error: "กรุณาระบุช่วงวันที่" }, 400);

  try {
    // ดึงสถิติแยกตามชื่ออุปกรณ์ (รวมทั้งรายการยืมจริงและรายการสถิติ)
    const rows = await db.select({
      equipment: borrowRecords.equipment,
      qty: sql<number>`CAST(SUM(${borrowRecords.qty}) AS INT)`
    })
      .from(borrowRecords)
      .where(and(
        sql`substr(${borrowRecords.created_at}, 1, 10) >= ${from}`,
        sql`substr(${borrowRecords.created_at}, 1, 10) <= ${to}`,
        sql`${borrowRecords.action} IN ('borrow', 'stat')`
      ))
      .groupBy(borrowRecords.equipment)
      .orderBy(sql`SUM(${borrowRecords.qty}) DESC`)
      .all();

    const totalResult = await db.select({
      total: sql<number>`CAST(SUM(${borrowRecords.qty}) AS INT)`
    })
      .from(borrowRecords)
      .where(and(
        sql`substr(${borrowRecords.created_at}, 1, 10) >= ${from}`,
        sql`substr(${borrowRecords.created_at}, 1, 10) <= ${to}`,
        sql`${borrowRecords.action} IN ('borrow', 'stat')`
      ))
      .get();

    return c.json({ ok: true, rows: rows || [], total: totalResult?.total || 0 });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/**
 * 3. GET: ดึงประวัติรายการตามช่วงเวลา (สำหรับตารางในหน้า Report)
 */
borrow.get('/history-range', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const from = c.req.query('from');
  const to = c.req.query('to');

  try {
    const rows = await db.select().from(borrowRecords)
      .where(and(
        sql`substr(${borrowRecords.created_at}, 1, 10) >= ${from}`,
        sql`substr(${borrowRecords.created_at}, 1, 10) <= ${to}`
      ))
      .orderBy(desc(borrowRecords.created_at))
      .all();
    return c.json({ ok: true, rows });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});


export default borrow;
