CREATE TABLE `borrow_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`equipment_id` integer,
	`qty` integer DEFAULT 1 NOT NULL,
	`action` text NOT NULL,
	`student_id` text NOT NULL,
	`faculty` text DEFAULT '',
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `checkin_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`facility` text NOT NULL,
	`sub_facility` text DEFAULT '',
	`action` text DEFAULT 'in',
	`students` integer DEFAULT 0,
	`staff` integer DEFAULT 0,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `equipments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`total` integer DEFAULT 0,
	`stock` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipments_name_unique` ON `equipments` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'person',
	`student_id` text DEFAULT '',
	`faculty` text DEFAULT '',
	`user_code` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`); --> statement-breakpoint
CREATE UNIQUE INDEX `users_user_code_unique` ON `users` (`user_code`);
