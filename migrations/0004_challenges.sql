CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`aesthetic` text,
	`creator_id` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `challenges_type_idx` ON `challenges` (`type`);
--> statement-breakpoint
CREATE TABLE `challenge_entries` (
	`id` text NOT NULL,
	`challenge_id` text NOT NULL,
	`outfit_id` text NOT NULL,
	`user_id` text NOT NULL,
	`elo` real DEFAULT 1200 NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`challenge_id`, `outfit_id`),
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`outfit_id`) REFERENCES `outfits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entries_challenge_idx` ON `challenge_entries` (`challenge_id`);
