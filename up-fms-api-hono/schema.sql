PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS borrow_records;
DROP TABLE IF EXISTS checkin_events;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS equipments;

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
    user_code TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    total INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE borrow_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER REFERENCES equipments(id),
    student_id TEXT NOT NULL,
    student_name TEXT,
    faculty TEXT NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    action TEXT NOT NULL,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE checkin_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility TEXT NOT NULL,
    sub_facility TEXT DEFAULT '',
    action TEXT DEFAULT 'in',
    students INTEGER DEFAULT 0,
    staff INTEGER DEFAULT 0,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- บัญชีแอดมินหลัก (อนุมัติแล้ว)
INSERT INTO users (id, full_name, email, username, password, role, is_approved)
VALUES (1, 'ผู้ดูแลระบบหลัก', 'admin@up.ac.th', 'admin_main', 'UPFMS@2026', 'staff', 1);

PRAGMA foreign_keys = ON;
