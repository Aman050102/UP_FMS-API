import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authRoutes from './auth/index'
import bookingRoutes from './bookings/index'
import equipmentRoutes from './equipment/index';

type Bindings = { up_fms_db: D1Database }
const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', cors())

// Routing แยกตามโมดูล
app.route('/api/auth', authRoutes)
app.route('/api/staff/booking', bookingRoutes)

// 3. ระบบจัดการคลังอุปกรณ์ 
app.route("/api/staff/equipment", equipmentRoutes);

export default app
