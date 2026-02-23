import { Hono } from "hono";

type Bindings = {
  up_f_ms_db: D1Database;
};

const report = new Hono<{ Bindings: Bindings }>();

report.get("/checkin-summary", async (c) => {
  try {
    const from = c.req.query("from");
    const to = c.req.query("to");

    if (!from || !to) {
      return c.json({ error: "from and to required" }, 400);
    }

    const { results } = await c.env.up_f_ms_db
      .prepare(`
        SELECT 
          session_date as date,
          facility,
          SUM(student_count + staff_count) as total
        FROM checkins
        WHERE session_date BETWEEN ? AND ?
        GROUP BY session_date, facility
        ORDER BY session_date ASC
      `)
      .bind(from, to)
      .all();

    return c.json(results);

  } catch (err) {
    console.error("REPORT ERROR:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default report;