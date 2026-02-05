import { Hono } from "hono";
import { cors } from "hono/cors";

// Import Sub-Routers
import checkinRoutes from "./checkin/index";
import equipmentRoutes from "./equipment/index";

type Bindings = {
  up_fms_db: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware - ปรับจูน CORS ให้รองรับการแก้ไขข้อมูล (PATCH, DELETE)
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// --- [Route Management] ---

// 1. ระบบบันทึกการเข้าใช้งานสนาม
app.route('/api/checkin', checkinRoutes);
app.route('/api/admin/checkins', checkinRoutes);

// 2. ระบบจัดการคลังอุปกรณ์กีฬา
app.route("/api/staff/equipment", equipmentRoutes);

// Default Route
app.get("/", (c) => c.text("UP-FMS API (Hono) is running at Mae Ka, Phayao"));

export default app;
