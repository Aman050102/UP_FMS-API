import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { desc } from 'drizzle-orm'
import { feedbacks } from '../db/schema'

const router = new Hono<{ Bindings: { up_fms_db: D1Database } }>()

// --- [POST] บันทึกฟีดแบ็กและรูปภาพหลักฐาน ---
router.post('/submit', async (c) => {
  const db = drizzle(c.env.up_fms_db)
  const body = await c.req.json()
  // รับข้อมูล: { facility, problems, image_url }

  try {
    // บันทึกลงตาราง feedbacks ใน D1
    await db.insert(feedbacks).values({
      facility: body.facility,
      problems: body.problems,
      image_url: body.image_url, // เก็บเป็น Text (Base64)
    }).run()

    return c.json({ ok: true })
  } catch (e) {
    console.error('Feedback submission error:', e)
    return c.json({ ok: false, error: 'ไม่สามารถบันทึกข้อมูลได้' }, 500)
  }
})

// --- [GET] ดึงรายการฟีดแบ็กทั้งหมดสำหรับเจ้าหน้าที่ ---
router.get('/', async (c) => {
  const db = drizzle(c.env.up_fms_db)

  try {
    // ดึงข้อมูลเรียงจากล่าสุดไปเก่าสุด
    const result = await db.select()
      .from(feedbacks)
      .orderBy(desc(feedbacks.id))
      .all()

    return c.json({ ok: true, feedbacks: result })
  } catch (e) {
    return c.json({ ok: false, error: 'ไม่สามารถดึงข้อมูลได้' }, 500)
  }
})

export default router
