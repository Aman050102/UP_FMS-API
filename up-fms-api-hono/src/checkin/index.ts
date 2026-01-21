import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, between } from 'drizzle-orm'
import { checkinEvents } from '../db/schema'

const router = new Hono<{ Bindings: { up_fms_db: D1Database } }>()

router.post('/event', async (c) => {
  const db = drizzle(c.env.up_fms_db)
  const body = await c.req.json()

  try {
    const todayISO = new Date().toISOString().slice(0, 10)
    await db.insert(checkinEvents).values({
      facility: body.facility,
      subFacility: body.sub_facility || '',
      studentCount: body.students,
      staffCount: body.staff,
      sessionDate: todayISO,
    }).run()
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ ok: false, error: 'ไม่สามารถบันทึกข้อมูลได้' }, 500)
  }
})

router.get('/', async (c) => {
  const db = drizzle(c.env.up_fms_db)
  const { from, to, facility } = c.req.query()

  try {
    let query = db.select().from(checkinEvents)
    const conditions = []
    if (from && to) conditions.push(between(checkinEvents.sessionDate, from, to))
    if (facility && facility !== 'all') conditions.push(eq(checkinEvents.facility, facility))

    const rows = await query.where(and(...conditions)).all()
    const formattedRows = rows.map(r => ({
      ts: r.createdAt,
      session_date: r.sessionDate,
      facility: r.facility,
      sub_facility: r.subFacility,
      student_count: r.studentCount,
      staff_count: r.staffCount
    }))
    return c.json(formattedRows)
  } catch (e) {
    return c.json({ ok: false, error: 'ไม่สามารถดึงข้อมูลรายงานได้' }, 500)
  }
})

export default router
