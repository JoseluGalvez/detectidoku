CREATE TABLE `seed_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`seed` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`snapshotJson` json NOT NULL,
	`favorite` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seed_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `style_unlocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`styleKey` varchar(64) NOT NULL,
	`unlockedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `style_unlocks_id` PRIMARY KEY(`id`)
);
