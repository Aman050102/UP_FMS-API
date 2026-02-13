import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { equipment } from '../db/schema';
import { eq } from 'drizzle-orm';

// กำหนด Bindings ให้ตรงกับ wrangler.json
type Bindings = {
  up_fms_db: D1Database;
};

const equipmentApp = new Hono<{ Bindings: Bindings }>();

/**
 * GET: ดึงรายการอุปกรณ์ทั้งหมด
 * Path: /api/staff/equipment/stock
 */
equipmentApp.get('/stock', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  try {
    const data = await db.select().from(equipment).all();
    return c.json({
      ok: true,
      equipments: data
    });
  } catch (error: any) {
    console.error("Fetch Stock Error:", error);
    return c.json({ ok: false, error: "ไม่สามารถดึงข้อมูลคลังอุปกรณ์ได้" }, 500);
  }
});

/**
 * POST: เพิ่มอุปกรณ์ใหม่ (หากชื่อซ้ำจะเพิ่มยอดในรายการเดิม)
 * Path: /api/staff/equipment
 */
equipmentApp.post('/', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  try {
    const body = await c.req.json();
    const inputName = body.name?.trim();
    const inputStock = Number(body.stock) || 0;

    if (!inputName) {
      return c.json({ ok: false, error: "กรุณาระบุชื่ออุปกรณ์" }, 400);
    }

    // ตรวจสอบว่ามีอุปกรณ์ชื่อนี้อยู่แล้วหรือไม่
    const existing = await db.select().from(equipment).where(eq(equipment.name, inputName)).get();

    if (existing) {
      // ถ้ามีอยู่แล้ว ให้บวกยอดเพิ่มเข้าไปใน ID เดิม
      const result = await db.update(equipment)
        .set({
          stock: existing.stock + inputStock,
          total: existing.total + inputStock,
        })
        .where(eq(equipment.id, existing.id))
        .returning();

      return c.json({
        ok: true,
        message: `เพิ่มจำนวน ${inputName} เข้าสู่คลังเดิมเรียบร้อยแล้ว`,
        data: result[0]
      });
    }

    // หากไม่มีชื่อซ้ำ ให้เพิ่มใหม่ตามปกติ
    const result = await db.insert(equipment).values({
      name: inputName,
      stock: inputStock,
      total: inputStock,
    }).returning();

    return c.json({
      ok: true,
      data: result[0]
    });
  } catch (error: any) {
    console.error("Insert Error:", error);
    return c.json({ ok: false, error: "บันทึกข้อมูลลงฐานข้อมูลไม่สำเร็จ" }, 500);
  }
});

/**
 * PATCH: แก้ไขข้อมูลอุปกรณ์
 * Path: /api/staff/equipment/:id
 */
equipmentApp.patch('/:id', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json();

    const result = await db.update(equipment)
      .set({
        name: body.name,
        stock: Number(body.stock),
        total: Number(body.total),
      })
      .where(eq(equipment.id, id))
      .returning();

    if (result.length === 0) {
      return c.json({ ok: false, error: "ไม่พบข้อมูลอุปกรณ์ที่ต้องการแก้ไข" }, 404);
    }

    return c.json({
      ok: true,
      data: result[0]
    });
  } catch (error: any) {
    console.error("Update Error:", error);
    return c.json({ ok: false, error: "แก้ไขข้อมูลไม่สำเร็จ" }, 500);
  }
});

/**
 * DELETE: ลบอุปกรณ์
 * Path: /api/staff/equipment/:id
 */
equipmentApp.delete('/:id', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const id = Number(c.req.param('id'));

  try {
    await db.delete(equipment).where(eq(equipment.id, id)).run();
    return c.json({ ok: true });
  } catch (error: any) {
    console.error("Delete Error:", error);
    return c.json({ ok: false, error: "ลบข้อมูลไม่สำเร็จ" }, 500);
  }
});

export default equipmentApp;
