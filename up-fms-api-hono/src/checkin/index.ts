import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { checkins } from '../db/schema';
import { and, gte, lte, eq } from 'drizzle-orm';

// กำหนด Types สำหรับ Bindings ให้ชัดเจน
type Bindings = {
  up_f_ms_db: D1Database;
};

const checkin = new Hono<{ Bindings: Bindings }>();

/**
 * GET: ดึงข้อมูลรายงาน (สำหรับหน้า CheckinReportPage)
 * Path: /api/checkin หรือ /api/admin/checkins
 */
checkin.get('/', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const { from, to, facility } = c.req.query();

  try {
    const filters = [];

    // ตรองข้อมูลตามช่วงวันที่ (session_date)
    if (from) filters.push(gte(checkins.session_date, from));
    if (to) filters.push(lte(checkins.session_date, to));

    // กรองตามประเภทสนาม (ถ้ามีการเลือก)
    if (facility && facility !== 'all') {
      filters.push(eq(checkins.facility, facility));
    }

    const data = await db
      .select()
      .from(checkins)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(checkins.session_date);

    return c.json(data);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST: บันทึกข้อมูลการเข้าใช้งานใหม่ (สำหรับหน้า CheckinPage)
 * Path: /api/checkin/event
 */
checkin.post('/event', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);

  try {
    const body = await c.req.json();

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!body.date || !body.facility) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }

    // บันทึกลง Database พร้อมจัดการประเภทข้อมูล (Type Casting)
    const result = await db.insert(checkins).values({
      session_date: body.date,
      facility: body.facility,
      sub_facility: body.sub_facility || "", // ป้องกันค่า null
      student_count: Number(body.students) || 0, // แปลงเป็น Number ป้องกัน Error
      staff_count: Number(body.staff) || 0,     // แปลงเป็น Number ป้องกัน Error
    }).returning();

    return c.json({
      success: true,
      data: result[0]
    });
  } catch (error: any) {
    console.error("Insert Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default checkin;
