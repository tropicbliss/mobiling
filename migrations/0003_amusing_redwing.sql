PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_task_queue` (
	`id` integer PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`cron` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_task_queue`("id", "timestamp", "cron", "payload") SELECT "id", "timestamp", "cron", "payload" FROM `task_queue`;--> statement-breakpoint
DROP TABLE `task_queue`;--> statement-breakpoint
ALTER TABLE `__new_task_queue` RENAME TO `task_queue`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `task_queue` (`timestamp`);