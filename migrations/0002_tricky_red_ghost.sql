CREATE TABLE `task_queue` (
	`timestamp` integer PRIMARY KEY NOT NULL,
	`cron` text NOT NULL,
	`payload` text NOT NULL
);
