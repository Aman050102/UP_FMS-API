-- ลบตารางเก่า (ถ้ามี) เพื่อเริ่มใหม่แบบสะอาด
DROP TABLE IF EXISTS feedbacks;
DROP TABLE IF EXISTS checkin_events;
DROP TABLE IF EXISTS borrow_records;
DROP TABLE IF EXISTS equipments;
DROP TABLE IF EXISTS users;

-- 1. ตารางผู้ใช้งาน
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'pending',
    is_approved INTEGER DEFAULT 0,
    student_id TEXT DEFAULT '',
    faculty TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางอุปกรณ์กีฬา
CREATE TABLE equipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    total INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0
);

-- 3. ตารางการยืม-คืน
CREATE TABLE borrow_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER REFERENCES equipments(id),
    student_id TEXT NOT NULL,
    student_name TEXT,
    qty INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'borrowed', -- 'borrowed', 'returned'
    borrowed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    returned_at DATETIME
);

-- 4. ตารางบันทึกการใช้สนาม (สำหรับทำกราฟ)
CREATE TABLE checkin_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility TEXT NOT NULL,
    action TEXT DEFAULT 'in',
    count INTEGER DEFAULT 1,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. ตารางความคิดเห็น
CREATE TABLE feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    username TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- บัญชี Admin สำหรับเริ่มต้นระบบ
INSERT INTO users (full_name, email, username, password, role, is_approved)
VALUES ('Admin System', 'admin@up.ac.th', 'admin', 'password123', 'staff', 1);

ALTER TABLE borrow_records ADD COLUMN faculty TEXT;
ALTER TABLE borrow_records ADD COLUMN action TEXT;
ALTER TABLE borrow_records ADD COLUMN student_name TEXT;

CREATE TABLE IF NOT EXISTS field_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_name TEXT NOT NULL,
    department TEXT NOT NULL,
    phone TEXT NOT NULL,
    field_name TEXT NOT NULL,
    building TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    purpose_detail TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
