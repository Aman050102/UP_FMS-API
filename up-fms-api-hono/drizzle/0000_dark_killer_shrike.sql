CREATE TABLE `borrow_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` text NOT NULL,
	`full_name` text,
	`faculty` text NOT NULL,
	`equipment` text NOT NULL,
	`qty` integer NOT NULL,
	`action` text NOT NULL,
	`status` text DEFAULT 'borrowing' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `checkin_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`facility` text NOT NULL,
	`sub_facility` text,
	`student_count` integer DEFAULT 0,
	`staff_count` integer DEFAULT 0,
	`session_date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `equipments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipments_name_unique` ON `equipments` (`name`);--> statement-breakpoint
CREATE TABLE `feedbacks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`facility` text NOT NULL,
	`problems` text,
	`image_url` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
