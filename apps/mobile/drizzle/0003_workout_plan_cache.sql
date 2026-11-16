CREATE TABLE `workout_plan_cache` (
	`user_id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL
);
