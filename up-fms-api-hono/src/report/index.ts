import { Hono } from "hono";

type Bindings = {
  up_fms_db: D1Database;
};

const report = new Hono<{ Bindings: Bindings }>();

report.get("/checkin-summary", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  if (!from || !to) {
    return c.json({ error: "from and to required" }, 400);
  }

  const rows = await c.env.up_fms_db
    .prepare(`
      SELECT facility,
      SUM(student_count + staff_count) as total
      FROM checkins
      WHERE date(session_date) BETWEEN date(?) AND date(?)
      GROUP BY facility
    `)
    .bind(from, to)
    .all();

  return c.json(rows.results);
});

export default report;
