import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '../db/schema';
import { eq, or, like, and, ne } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { sign } from 'hono/jwt';

// 1. กำหนด Bindings ให้ตรงกับ wrangler.jsonc
type Bindings = {
  up_f_ms_db: D1Database;
  MY_BUCKET: R2Bucket;
  BREVO_API_KEY: string;
  GMAIL_USER: string;
};

const auth = new Hono<{ Bindings: Bindings }>();
const JWT_SECRET = 'UP_FMS_SECRET_KEY';

/** [POST] upload-avatar: อัปโหลดรูปภาพไปยัง R2 และบันทึก URL ลง D1 */
auth.post('/upload-avatar', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const bucket = c.env.MY_BUCKET;

  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    const userId = body.userId as string;

    if (!file || !userId) {
      return c.json({ ok: false, error: "ข้อมูลไม่ครบถ้วน" }, 400);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;

    // 1. อัปโหลดไฟล์ไปยัง Cloudflare R2
    await bucket.put(fileName, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    // 2. ใช้ URL จริงที่เปิดใช้งานสำเร็จแล้ว
    const imageUrl = `https://pub-d97ddaf9b95249cfa6d12aa49402855b.r2.dev/${fileName}`;

    // 3. บันทึก URL ลงฐานข้อมูล D1
    await db.update(users)
      .set({ avatar_url: imageUrl })
      .where(eq(users.id, Number(userId)))
      .run();

    return c.json({ ok: true, imageUrl });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

/** [GET] ดึงรายชื่อคนที่มีสิทธิ์ Staff หรือ Assistant */
auth.get('/collaborators', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const result = await db.select({
    id: users.id,
    name: users.full_name,
    username: users.username,
    role: users.role,
    email: users.email
  })
    .from(users)
    .where(or(eq(users.role, 'staff'), eq(users.role, 'assistant')))
    .all();

  return c.json(result);
});

/** [GET] ค้นหาผู้ใช้ทั่วไป */
auth.get('/search-users', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const q = c.req.query('q') || '';

  const result = await db.select({
    id: users.id,
    name: users.full_name,
    username: users.username,
    avatar: users.full_name
  })
    .from(users)
    .where(
      and(
        eq(users.role, 'user'),
        or(like(users.full_name, `%${q}%`), like(users.username, `%${q}%`))
      )
    )
    .limit(10)
    .all();

  return c.json(result);
});

/** [POST] อัปเดตสิทธิ์ผู้ใช้งาน */
auth.post('/update-role', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const { userId, newRole } = await c.req.json();

  try {
    await db.update(users)
      .set({ role: newRole })
      .where(eq(users.id, Number(userId)))
      .run();
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: "Database error" }, 500);
  }
});

/** [POST] Login: เข้าสู่ระบบ (แก้ไขให้ส่ง avatar กลับไปให้ Frontend เก็บใน localStorage) */
auth.post('/login', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const { username, password } = await c.req.json();

  // ดึงข้อมูล User ทั้งหมดรวมถึง avatar_url จากฐานข้อมูล
  const user = await db.select().from(users).where(eq(users.username, username)).get();

  if (!user || !(await compare(password, user.password_hash))) {
    return c.json({ ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, 401);
  }

  const token = await sign({ id: user.id, role: user.role }, JWT_SECRET);

  return c.json({
    ok: true,
    token,
    userId: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    username: user.username,
    avatar: user.avatar_url, // ส่ง URL รูปภาพกลับไป
    assigned_facility: user.assigned_facility || 'none'
  });
});

/** [POST] Register: ส่ง OTP */
auth.post('/register', async (c) => {
  const { full_name, email, username, password } = await c.req.json();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const isSent = await (c.env as any).sendOTPEmail?.(c.env, email, otp, full_name) || true;

  if (!isSent) return c.json({ ok: false, error: "ระบบส่งอีเมลขัดข้อง" }, 500);
  return c.json({ ok: true, step: "verify_otp" });
});

/** [POST] Confirm Register */
auth.post('/register/confirm', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const { full_name, email, username, password, otp } = await c.req.json();

  if (!otp || otp.length !== 6) return c.json({ ok: false, error: "รหัส OTP ไม่ถูกต้อง" }, 400);

  try {
    const hashedPassword = await hash(password, 10);
    await db.insert(users).values({
      full_name, email, username,
      password_hash: hashedPassword,
      role: 'user',
      assigned_facility: 'none'
    }).run();
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: "Username หรือ Email ซ้ำในระบบ" }, 400);
  }
});

/** [POST] Update Profile */
auth.post('/update-profile', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const { userId, full_name, email } = await c.req.json();

  try {
    await db.update(users)
      .set({ full_name, email })
      .where(eq(users.id, Number(userId)))
      .run();
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: "ไม่สามารถอัปเดตข้อมูลได้" }, 500);
  }
});

/** [POST] Change Password */
auth.post('/change-password', async (c) => {
  const db = drizzle(c.env.up_f_ms_db);
  const { userId, newPassword } = await c.req.json();

  try {
    const hashedPassword = await hash(newPassword, 10);
    await db.update(users)
      .set({ password_hash: hashedPassword })
      .where(eq(users.id, Number(userId)))
      .run();
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: "ระบบขัดข้อง" }, 500);
  }
});

export default auth;
