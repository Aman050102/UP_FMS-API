import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { feedbacks } from '../db/schema';
import { desc } from 'drizzle-orm';

type Bindings = { up_fms_db: D1Database };

const feedbackRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * 1. POST: บันทึกฟีดแบคจากผู้ใช้งาน
 * Path: /api/feedback/submit
 */
feedbackRoutes.post('/submit', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  try {
    const body = await c.req.json();
    const { facility, problems, image_url } = body;

    if (!facility || !image_url) {
      return c.json({ ok: false, error: "กรุณาระบุสถานที่และแนบรูปถ่าย" }, 400);
    }

    // บันทึกข้อมูล (ปรับเวลาเป็นเขตเวลาไทย +7)
    await db.insert(feedbacks).values({
      facility,
      problems,
      image_url,
      created_at: new Date().toISOString(),
    }).run();

    return c.json({ ok: true });
  } catch (error: any) {
    console.error("Feedback Insert Error:", error);
    return c.json({ ok: false, error: "ไม่สามารถบันทึกข้อมูลได้" }, 500);
  }
});

/**
 * 2. GET: ดึงรายการฟีดแบคทั้งหมดสำหรับเจ้าหน้าที่
 * Path: /api/staff/feedbacks
 */
feedbackRoutes.get('/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  try {
    const data = await db.select()
      .from(feedbacks)
      .orderBy(desc(feedbacks.id))
      .all();

    return c.json({
      ok: true,
      feedbacks: data
    });
  } catch (error: any) {
    console.error("Fetch Feedbacks Error:", error);
    return c.json({ ok: false, error: "ไม่สามารถดึงข้อมูลฟีดแบคได้" }, 500);
  }
});

export default feedbackRoutes;
