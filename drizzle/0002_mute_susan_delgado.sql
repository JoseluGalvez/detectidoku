CREATE TABLE `daily_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeDate` varchar(10) NOT NULL,
	`seed` varchar(128) NOT NULL,
	`caseSnapshotJson` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_challenges_challengeDate_unique` UNIQUE(`challengeDate`)
);
--> statement-breakpoint
CREATE TABLE `event_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`progressJson` json NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `murdoku_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviteCode` varchar(32) NOT NULL,
	`hostUserId` int NOT NULL,
	`caseSnapshotJson` json NOT NULL,
	`durationSeconds` int NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`status` enum('waiting','live','finished') NOT NULL DEFAULT 'waiting',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `murdoku_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `murdoku_events_inviteCode_unique` UNIQUE(`inviteCode`)
);
