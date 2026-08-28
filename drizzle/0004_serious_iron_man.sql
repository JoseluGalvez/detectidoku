CREATE TABLE `daily_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeDate` varchar(10) NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`elapsedSeconds` int NOT NULL,
	`hintsUsed` int NOT NULL DEFAULT 0,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_results_id` PRIMARY KEY(`id`)
);
