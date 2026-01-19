import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql, desc, and } from "drizzle-orm";
import { jsPDF } from "jspdf";
import {
  users,
  equipments,
  borrowRecords,
  checkinEvents,
  feedbacks,
  fieldBookings
} from "./db/schema";

type Bindings = { up_fms_db: D1Database };
const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// --- [1] AUTH & USER ---
app.post("/api/auth/register", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const body = await c.req.json();
  try {
    await db.insert(users).values({ ...body, isApproved: 0 });
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: "Username หรือ Email ซ้ำ" }, 400);
  }
});

app.post("/api/auth/login/", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const { username, password } = await c.req.json();
  const user = await db.select().from(users).where(eq(users.username, username)).get();
  if (!user || user.password !== password) return c.json({ ok: false, error: "รหัสผ่านผิด" }, 401);
  if (user.isApproved === 0) return c.json({ ok: false, error: "รออนุมัติ" }, 403);
  return c.json({ ok: true, account_role: user.role, username: user.username, fullName: user.fullName });
});

// --- [2] FIELD BOOKING API ---
app.post("/api/staff/booking/create", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  try {
    const b = await c.req.json();
    await db.insert(fieldBookings).values({ ...b, status: "pending" }).run();
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: "บันทึกไม่สำเร็จ" }, 500);
  }
});

app.get("/api/staff/bookings/all", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  try {
    const rows = await db.select().from(fieldBookings).orderBy(desc(fieldBookings.id)).all();
    return c.json({ ok: true, rows });
  } catch (e) {
    return c.json({ ok: false, error: "ดึงข้อมูลผิดพลาด" }, 500);
  }
});

// --- [3] PDF GENERATOR (TH SARABUN 13PT) ---
app.get("/api/staff/booking/pdf/:id", async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const id = parseInt(c.req.param("id"));

  try {
    const data = await db.select().from(fieldBookings).where(eq(fieldBookings.id, id)).get();
    if (!data) return c.json({ ok: false, error: "ไม่พบข้อมูล" }, 404);

    const doc = new jsPDF();
    // หมายเหตุ: อย่าลืมเพิ่มการตั้งค่าฟอนต์ TH Sarabun New (Base64) เพื่อให้ภาษาไทยไม่เป็นตัวอ่านไม่ออก
    doc.setFontSize(13); // ขนาด 13pt ตามระเบียบมหาวิทยาลัย

    // วางตำแหน่งตามฟอร์มทางการ [cite: 57, 58]
    doc.text("แบบฟอร์มการขออนุมัติใช้สนามกีฬา", 105, 20, { align: "center" });
    doc.text("เรียน  อธิการบดี", 30, 40);
    doc.text(`ด้วยข้าพเจ้า ${data.requesterName}`, 30, 50);
    doc.text(`สังกัดคณะ/วิทยาลัย/กอง/ศูนย์ ${data.department} โทร ${data.phone}`, 30, 60);
    doc.text(`ขออนุมัติใช้ ( / ) สนาม ${data.fieldName} อาคาร ${data.building || "-"}`, 30, 70);
    doc.text(`ในวันที่ ${data.startDate} ถึงวันที่ ${data.endDate}`, 30, 80);
    doc.text(`ตั้งแต่เวลา ${data.startTime} น. ถึงเวลา ${data.endTime} น.`, 30, 90);
    doc.text(`โดยมีวัตถุประสงค์เพื่อ: ${data.purposeDetail || "-"}`, 30, 100);

    doc.text("จึงเรียนมาเพื่อโปรดพิจารณา", 105, 125, { align: "center" });

    // ส่วนลงนามผู้ขอใช้สนาม [cite: 41, 67]
    doc.text("(ลงนาม)..........................................................", 130, 145);
    doc.text(`( ${data.requesterName} )`, 130, 155, { maxWidth: 60, align: "center" });
    doc.text("ผู้ขอใช้สนาม", 145, 165);

    // ส่วนความเห็นเจ้าหน้าที่ (ตามฟอร์ม) [cite: 53, 55, 92]
    doc.text("ความเห็นของผู้อำนวยการกองกิจการนิสิต", 30, 185);
    doc.text("( นายพิเชษฐ ถูกจิตร )", 30, 205);
    doc.text("ตำแหน่ง ผู้อำนวยการกองกิจการนิสิต", 30, 215);

    // ส่วนคำสั่งมหาวิทยาลัย [cite: 35, 108]
    doc.text("คำสั่งมหาวิทยาลัย", 130, 185);
    doc.text("(  ) อนุมัติ    (  ) ไม่อนุมัติ", 130, 195);

    const pdfOutput = doc.output("arraybuffer");
    return new Response(pdfOutput, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="booking_${id}.pdf"`
      },
    });
  } catch (e) {
    return c.json({ ok: false, error: "สร้าง PDF ล้มเหลว" }, 500);
  }
});

export default app;
