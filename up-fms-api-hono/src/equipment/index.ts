import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { equipments } from '../db/schema'

const router = new Hono<{ Bindings: { up_fms_db: D1Database } }>()

// GET: /api/staff/equipment/stock/
router.get('/stock', async (c) => {
  const db = drizzle(c.env.up_fms_db)
  const result = await db.select().from(equipments).all()
  return c.json({ ok: true, equipments: result })
})

// POST: /api/staff/equipment/
router.post('/', async (c) => {
  const db = drizzle(c.env.up_fms_db)
  const body = await c.req.json()
  await db.insert(equipments).values({
    name: body.name,
    stock: body.stock,
    total: body.total
  }).run()
  return c.json({ ok: true })
});

// PATCH: /api/staff/equipment/:id/
router.patch('/:id', async (c) => {
  const db = drizzle(c.env.up_fms_db)
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  await db.update(equipments).set(body).where(eq(equipments.id, id)).run()
  return c.json({ ok: true })
})

// DELETE: /api/staff/equipment/:id/
router.delete('/:id', async (c) => {
  const db = drizzle(c.env.up_fms_db)
  const id = parseInt(c.req.param('id'))
  await db.delete(equipments).where(eq(equipments.id, id)).run()
  return c.json({ ok: true })
})

export default router
