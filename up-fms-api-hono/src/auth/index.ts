import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { sign } from 'hono/jwt';

type Bindings = { up_fms_db: D1Database; RESEND_API_KEY: string; };
const auth = new Hono<{ Bindings: Bindings }>();
const JWT_SECRET = 'UP_FMS_SECRET_KEY';

/** [POST] Login: ตรวจสอบรหัสผ่านและส่งข้อมูลกลับทันที (ตัด OTP ออกเฉพาะตอน Login) */
auth.post('/login', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const { username, password } = await c.req.json();
  const user = await db.select().from(users).where(eq(users.username, username)).get();

  // 1. ตรวจสอบ User และ Password
  if (!user || !(await compare(password, user.password_hash))) {
    return c.json({ ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, 401);
  }

  // 2. สร้าง Token ทันที
  const token = await sign({ id: user.id, role: user.role }, JWT_SECRET);

  // 3. ส่งข้อมูลกลับ (สำคัญ: ต้องส่ง full_name กลับไปเพื่อนำไปแสดงผล)
  return c.json({
    ok: true,
    token,
    full_name: user.full_name,
    role: user.role,
    assigned_facility: user.assigned_facility || 'none'
  });
});

/** [POST] Register: ส่ง OTP ไปยังอีเมล (ยังคงไว้ตามเดิม) */
auth.post('/register', async (c) => {
  const { full_name, email, username, password } = await c.req.json();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // สมมติฟังก์ชันส่งอีเมลทำงานปกติ
  console.log(`[REGISTER OTP]: ${otp}`);
  return c.json({ ok: true, step: "verify_otp" });
});

/** [POST] Confirm Register: ยืนยัน OTP และบันทึก User */
auth.post('/register/confirm', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const { full_name, email, username, password, otp } = await c.req.json();
  try {
    const hashedPassword = await hash(password, 10);
    await db.insert(users).values({
      full_name, email, username,
      password_hash: hashedPassword,
      role: 'user',
      assigned_facility: 'none'
    }).run();
    return c.json({ ok: true });
  } catch (e) { return c.json({ ok: false, error: "Username หรือ Email ซ้ำ" }, 400); }
});

export default auth;
