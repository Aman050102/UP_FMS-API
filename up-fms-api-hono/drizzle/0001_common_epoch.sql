CREATE TABLE `checkins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_date` text NOT NULL,
	`facility` text NOT NULL,
	`sub_facility` text,
	`student_count` integer DEFAULT 0,
	`staff_count` integer DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`stock` integer DEFAULT 0
);
--> statement-breakpoint
DROP TABLE `checkin_events`;--> statement-breakpoint
DROP TABLE `equipments`;--> statement-breakpoint
DROP TABLE `feedbacks`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_borrow_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer,
	`user_name` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
INSERT INTO `__new_borrow_records`("id", "item_id", "user_name", "created_at") SELECT "id", "item_id", "user_name", "created_at" FROM `borrow_records`;--> statement-breakpoint
DROP TABLE `borrow_records`;--> statement-breakpoint
ALTER TABLE `__new_borrow_records` RENAME TO `borrow_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;