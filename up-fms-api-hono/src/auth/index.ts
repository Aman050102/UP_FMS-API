import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { sign } from 'hono/jwt';

type Bindings = { up_fms_db: D1Database; RESEND_API_KEY: string; };
const auth = new Hono<{ Bindings: Bindings }>();
const JWT_SECRET = 'UP_FMS_SECRET_KEY';

// --- ฟังก์ชันส่ง OTP (คงเดิมจากที่ทำไว้) ---
const sendOTPEmail = async (apiKey: string, toEmail: string, otp: string, userName: string) => {
  // ... (โค้ดส่ง Resend API ที่เราทำไว้ก่อนหน้า) ...
  return true;
};

/** [POST] Register: ส่ง OTP */
auth.post('/register', async (c) => {
  const { full_name, email, username, password } = await c.req.json();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await sendOTPEmail(c.env.RESEND_API_KEY, email, otp, full_name);
  console.log(`[REGISTRATION OTP]: ${otp}`);
  return c.json({ ok: true, step: "verify_otp" });
});

/** [POST] Confirm Register: บันทึก User ใหม่ (Role: user เสมอ) */
auth.post('/register/confirm', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const { full_name, email, username, password, otp } = await c.req.json();
  try {
    const hashedPassword = await hash(password, 10);
    await db.insert(users).values({
      full_name, email, username,
      password_hash: hashedPassword,
      role: 'user', // <--- สิทธิ์เริ่มต้น
      assigned_facility: 'none'
    }).run();
    return c.json({ ok: true });
  } catch (e) { return c.json({ ok: false, error: "Username/Email ซ้ำ" }, 400); }
});

/** [POST] Login: ตรวจสอบและส่ง Role กลับไป */
auth.post('/login', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const { username, password } = await c.req.json();
  const user = await db.select().from(users).where(eq(users.username, username)).get();

  if (!user || !(await compare(password, user.password_hash))) {
    return c.json({ ok: false, error: "รหัสผ่านไม่ถูกต้อง" }, 401);
  }

  // Admin เข้าได้เลย ส่วนคนอื่นไป 2FA
  if (user.role === 'admin') {
    const token = await sign({ id: user.id, role: user.role }, JWT_SECRET);
    return c.json({ ok: true, step: "complete", token, full_name: user.full_name, role: user.role });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await sendOTPEmail(c.env.RESEND_API_KEY, user.email, otp, user.full_name);
  return c.json({ ok: true, step: "2fa", userId: user.id });
});

/** [POST] Verify OTP: ส่ง Role กลับไปหลังยืนยัน OTP */
auth.post('/verify-otp', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const { userId, otp } = await c.req.json();
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ ok: false, error: "ไม่พบผู้ใช้" }, 404);

  const token = await sign({ id: user.id, role: user.role }, JWT_SECRET);
  return c.json({ ok: true, token, full_name: user.full_name, role: user.role });
});

export default auth;
