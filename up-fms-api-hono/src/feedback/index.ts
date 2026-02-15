import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { feedbacks } from '../db/schema';
import { desc } from 'drizzle-orm';

// กำหนดประเภท Bindings ให้ตรงกับที่ Cloudflare มีให้
type Bindings = {
  up_f_ms_db: D1Database;
  MY_BUCKET: R2Bucket;
};

const feedbackRoutes = new Hono<{ Bindings: Bindings }>();

feedbackRoutes.post('/submit', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const bucket = c.env.MY_BUCKET;

  // 🔴 จุดเช็ค Error: ถ้า Bucket ไม่เชื่อมต่อจะฟ้องทันที
  if (!bucket) {
    return c.json({ ok: false, error: "ระบบจัดเก็บไฟล์ (R2) ไม่ได้รับการติดตั้ง" }, 500);
  }

  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    const facility = body.facility as string;
    const problems = body.problems as string;

    if (!file || !facility) {
      return c.json({ ok: false, error: "กรุณาระบุสถานที่และเลือกรูปภาพถ่าย" }, 400);
    }

    // 1. อัปโหลดรูปภาพไปยัง Cloudflare R2
    const fileName = `feedbacks/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

    // ลอง Put ไฟล์
    const uploadResult = await bucket.put(fileName, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    if (!uploadResult) {
      throw new Error("อัปโหลดไฟล์ไปยัง R2 ไม่สำเร็จ");
    }

    // 2. ใช้ Public URL
    const imageUrl = `https://pub-d97ddaf9b95249cfa6d12aa49402855b.r2.dev/${fileName}`;

    // 3. บันทึกลง D1
    await db.insert(feedbacks).values({
      facility,
      problems: problems || "",
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    }).run();

    return c.json({ ok: true });
  } catch (error: any) {
    console.error("Feedback Error Detail:", error);
    return c.json({ ok: false, error: "เกิดข้อผิดพลาดภายใน: " + error.message }, 500);
  }
});


/**
 * 2. GET: ดึงรายการฟีดแบคทั้งหมดสำหรับเจ้าหน้าที่
 */
feedbackRoutes.get('/', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
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
