CREATE TABLE `set_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_date` text NOT NULL,
	`exercise_id` text NOT NULL,
	`exercise_name` text NOT NULL,
	`set_number` integer NOT NULL,
	`target_reps` integer NOT NULL,
	`previous_load_kg` real NOT NULL,
	`load_kg` real NOT NULL,
	`completed_at` integer NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `set_logs_session_date_idx` ON `set_logs` (`session_date`);--> statement-breakpoint
CREATE INDEX `set_logs_exercise_completed_idx` ON `set_logs` (`exercise_id`,`completed_at`);--> statement-breakpoint
CREATE INDEX `set_logs_sync_status_idx` ON `set_logs` (`sync_status`);