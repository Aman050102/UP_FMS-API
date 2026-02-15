import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { equipment, borrowRecords } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const borrow = new Hono<{ Bindings: { up_f_ms_db: D1Database } }>();

/**
 * 1. GET: ดึงรายการที่ค้างคืน (สำหรับหน้าคืนอุปกรณ์ใน EquipmentPage)
 * Path: /api/equipment/pending-returns
 */
borrow.get('/pending-returns', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  try {
    const rows = await db.select().from(borrowRecords)
      .where(and(
        eq(borrowRecords.action, 'borrow'),
        eq(borrowRecords.status, 'pending')
      ))
      .orderBy(desc(borrowRecords.id))
      .all();

    return c.json({ ok: true, rows });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/**
 * 2. POST: ยืมอุปกรณ์ / บันทึกสถิติย้อนหลัง
 * Path: /api/equipment/borrow
 */
borrow.post('/borrow', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const body = await c.req.json();
  const isBackdate = body.skip_stock_update === true;

  try {
    if (!isBackdate) {
      const item = await db.select().from(equipment).where(eq(equipment.name, body.equipment)).get();
      if (!item || item.stock < body.qty) {
        return c.json({ ok: false, error: "อุปกรณ์ในคลังไม่เพียงพอ" }, 400);
      }

      await db.update(equipment)
        .set({ stock: item.stock - body.qty })
        .where(eq(equipment.name, body.equipment))
        .run();
    }

    const finalDate = body.borrow_date ? new Date(body.borrow_date).toISOString() : new Date().toISOString();

    await db.insert(borrowRecords).values({
      student_id: body.student_id,
      name: body.name || "",
      faculty: body.faculty,
      equipment: body.equipment,
      qty: body.qty,
      action: isBackdate ? 'stat' : 'borrow',
      status: isBackdate ? 'completed' : 'pending',
      created_at: finalDate
    }).run();

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/**
 * 3. POST: คืนอุปกรณ์ (อัปเดตสถานะและเพิ่มสต็อกคืน)
 * Path: /api/equipment/return
 */
borrow.post('/return', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const { student_id, faculty, equipment: itemName, qty } = await c.req.json();

  try {
    // 1. อัปเดตใบยืมเดิมเป็น returned
    await db.update(borrowRecords)
      .set({ status: 'returned' })
      .where(and(
        eq(borrowRecords.student_id, student_id),
        eq(borrowRecords.equipment, itemName),
        eq(borrowRecords.status, 'pending')
      ))
      .run();

    // 2. บันทึกประวัติการคืน (action = return)
    await db.insert(borrowRecords).values({
      student_id,
      name: "คืนอุปกรณ์",
      faculty,
      equipment: itemName,
      qty,
      action: 'return',
      status: 'completed',
      created_at: new Date().toISOString()
    }).run();

    // 3. เพิ่มจำนวนกลับเข้าคลัง
    const item = await db.select().from(equipment).where(eq(equipment.name, itemName)).get();
    if (item) {
      await db.update(equipment)
        .set({ stock: item.stock + qty })
        .where(eq(equipment.name, itemName))
        .run();
    }

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/**
 * 4. GET: สถิติสำหรับรายงาน
 */
borrow.get('/stats', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const from = c.req.query('from');
  const to = c.req.query('to');
  if (!from || !to) return c.json({ ok: false, error: "กรุณาระบุช่วงวันที่" }, 400);

  try {
    const rows = await db.select({
      equipment: borrowRecords.equipment,
      qty: sql<number>`CAST(SUM(${borrowRecords.qty}) AS INT)`
    })
      .from(borrowRecords)
      .where(and(
        sql`date(${borrowRecords.created_at}) >= date(${from})`,
        sql`date(${borrowRecords.created_at}) <= date(${to})`,
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
        sql`date(${borrowRecords.created_at}) >= date(${from})`,
        sql`date(${borrowRecords.created_at}) <= date(${to})`,
        sql`${borrowRecords.action} IN ('borrow', 'stat')`
      ))
      .get();

    return c.json({ ok: true, rows: rows || [], total: totalResult?.total || 0 });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/**
 * 5. GET: ประวัติช่วงเวลา
 */
borrow.get('/history-range', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const from = c.req.query('from');
  const to = c.req.query('to');
  try {
    const rows = await db.select().from(borrowRecords)
      .where(and(
        sql`date(${borrowRecords.created_at}) >= date(${from})`,
        sql`date(${borrowRecords.created_at}) <= date(${to})`
      ))
      .orderBy(desc(borrowRecords.created_at))
      .all();
    return c.json({ ok: true, rows });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

export default borrow;
