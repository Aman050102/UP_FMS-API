PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_borrow_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`equipment_id` integer,
	`student_id` text NOT NULL,
	`student_name` text,
	`faculty` text NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL,
	`action` text NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_borrow_records`("id", "equipment_id", "student_id", "student_name", "faculty", "qty", "action", "occurred_at") SELECT "id", "equipment_id", "student_id", "student_name", "faculty", "qty", "action", "occurred_at" FROM `borrow_records`;--> statement-breakpoint
DROP TABLE `borrow_records`;--> statement-breakpoint
ALTER TABLE `__new_borrow_records` RENAME TO `borrow_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_equipments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_equipments`("id", "name", "total", "stock") SELECT "id", "name", "total", "stock" FROM `equipments`;--> statement-breakpoint
DROP TABLE `equipments`;--> statement-breakpoint
ALTER TABLE `__new_equipments` RENAME TO `equipments`;--> statement-breakpoint
CREATE UNIQUE INDEX `equipments_name_unique` ON `equipments` (`name`);