CREATE TABLE `match_results` (
	`id` text PRIMARY KEY NOT NULL,
	`voter_id` text NOT NULL,
	`dimension` text NOT NULL,
	`winner_id` text NOT NULL,
	`loser_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`voter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`winner_id`) REFERENCES `outfits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`loser_id`) REFERENCES `outfits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `match_voter_idx` ON `match_results` (`voter_id`);
--> statement-breakpoint
CREATE INDEX `match_dimension_idx` ON `match_results` (`dimension`);
