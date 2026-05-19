CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`handle` text NOT NULL,
	`display_name` text NOT NULL,
	`bio` text,
	`avatar_key` text,
	`is_private` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_unique` ON `users` (`handle`);
--> statement-breakpoint
CREATE INDEX `users_handle_idx` ON `users` (`handle`);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collections_user_idx` ON `collections` (`user_id`);
--> statement-breakpoint
CREATE TABLE `outfits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`collection_id` text,
	`photo_key` text NOT NULL,
	`cutout_key` text,
	`caption` text,
	`aesthetic` text,
	`occasion` text,
	`elo_overall` real DEFAULT 1200 NOT NULL,
	`elo_aesthetic` real DEFAULT 1200 NOT NULL,
	`elo_occasion` real DEFAULT 1200 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `outfits_user_idx` ON `outfits` (`user_id`);
--> statement-breakpoint
CREATE INDEX `outfits_aesthetic_idx` ON `outfits` (`aesthetic`);
--> statement-breakpoint
CREATE INDEX `outfits_occasion_idx` ON `outfits` (`occasion`);
--> statement-breakpoint
CREATE TABLE `garments` (
	`id` text PRIMARY KEY NOT NULL,
	`outfit_id` text NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`store` text,
	`price_cents` integer,
	`size` text,
	`pin_x` real,
	`pin_y` real,
	FOREIGN KEY (`outfit_id`) REFERENCES `outfits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `garments_outfit_idx` ON `garments` (`outfit_id`);
