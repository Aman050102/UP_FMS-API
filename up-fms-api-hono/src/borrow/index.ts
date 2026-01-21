import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, sql, desc, between } from 'drizzle-orm'
import { equipments, borrowRecords } from '../db/schema'

const router = new Hono<{ Bindings: { up_fms_db: D1Database } }>()

// --- [POST] บันทึกการยืมอุปกรณ์ (หักสต็อกอัตโนมัติ) ---
router.post('/borrow', async (c) => {
  const db = drizzle(c.env.up_fms_db)
  const body = await c.req.json()

  try {
    const item = await db.select().from(equipments).where(eq(equipments.name, body.equipment)).get()
    if (!item || item.stock < body.qty) return c.json({ ok: false, error: 'สต็อกไม่พอ' }, 400)

    await db.update(equipments)
      .set({ stock: item.stock - body.qty })
      .where(eq(equipments.name, body.equipment))
      .run()

    await db.insert(borrowRecords).values({
      student_id: body.student_id,
      fullName: body.name,
      faculty: body.faculty,
      equipment: body.equipment,
      qty: body.qty,
      action: 'borrow',
      status: 'borrowing'
    }).run()

    return c.json({ ok: true })
  } catch (e) {
    return c.json({ ok: false, error: 'Internal Error' }, 500)
  }
})

// --- [GET] ดึงสถิติการยืม (Stats) สำหรับหน้า Report ---
router.get('/stats', async (c) => {
  const db = drizzle(c.env.up_fms_db)
  const { from, to } = c.req.query()

  try {
    const rows = await db.select({
      equipment: borrowRecords.equipment,
      qty: sql<number>`sum(${borrowRecords.qty})`
    })
    .from(borrowRecords)
    .where(and(
      eq(borrowRecords.action, 'borrow'),
      between(borrowRecords.createdAt, from, to)
    ))
    .groupBy(borrowRecords.equipment)
    .orderBy(desc(sql`sum(${borrowRecords.qty})`))
    .all()

    const total = rows.reduce((acc, curr) => acc + Number(curr.qty), 0)
    return c.json({ ok: true, rows, total })
  } catch (e) {
    return c.json({ ok: false, error: 'Stats fail' }, 500)
  }
})

// --- [GET] ดึงรายการค้างคืน (Pending Returns) ---
router.get('/pending-returns', async (c) => {
  const db = drizzle(c.env.up_fms_db)
  const rows = await db.select().from(borrowRecords)
    .where(eq(borrowRecords.status, 'borrowing'))
    .all()
  return c.json({ ok: true, rows })
})

export default router
