import { Hono } from "hono";

type Bindings = {
  up_f_ms_db: D1Database;
};

const report = new Hono<{ Bindings: Bindings }>();

report.get("/checkin-summary", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  if (!from || !to) {
    return c.json({ error: "from and to required" }, 400);
  }

  const result = await c.env.up_f_ms_db
    .prepare(`
      SELECT 
        session_date as date,
        facility,
        SUM(student_count + staff_count) as total
      FROM checkins
      WHERE date(session_date) BETWEEN date(?) AND date(?)
      GROUP BY session_date, facility
      ORDER BY session_date
    `)
    .bind(from, to)
    .all();

  return c.json(result.results);
});

export default report;
