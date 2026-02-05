DROP TABLE IF EXISTS checkins;
CREATE TABLE checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_date DATE NOT NULL,
    facility TEXT NOT NULL,
    sub_facility TEXT,
    student_count INTEGER DEFAULT 0,
    staff_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง Index เพื่อให้การค้นหาตามช่วงวันที่รวดเร็วขึ้น
CREATE INDEX idx_session_date ON checkins(session_date);
