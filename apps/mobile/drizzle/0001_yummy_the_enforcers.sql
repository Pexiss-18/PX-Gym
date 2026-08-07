CREATE TABLE `progress_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`local_uri` text NOT NULL,
	`remote_path` text,
	`taken_at` integer NOT NULL,
	`note` text,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `progress_photos_user_taken_idx` ON `progress_photos` (`user_id`,`taken_at`);--> statement-breakpoint
CREATE INDEX `progress_photos_sync_status_idx` ON `progress_photos` (`sync_status`);