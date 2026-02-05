CREATE TABLE `borrow_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` text NOT NULL,
	`name` text,
	`faculty` text NOT NULL,
	`equipment` text NOT NULL,
	`qty` integer NOT NULL,
	`action` text NOT NULL,
	`status` text DEFAULT 'pending',
	`created_at` text NOT NULL
);
