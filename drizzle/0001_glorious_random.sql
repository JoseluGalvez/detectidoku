CREATE TABLE `game_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`caseId` int NOT NULL,
	`progressJson` json NOT NULL,
	`completedAt` timestamp,
	`lastPlayedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generated_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`templateId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`preferencesJson` json NOT NULL,
	`logicSnapshotJson` json NOT NULL,
	`narrativeJson` json NOT NULL,
	`validationJson` json NOT NULL,
	`status` enum('draft','validated','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generated_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `murdoku_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`size` int NOT NULL,
	`logicJson` json NOT NULL,
	`narrativeJson` json NOT NULL,
	`metadataJson` json NOT NULL,
	`validationStatus` enum('pending','valid','invalid') NOT NULL DEFAULT 'pending',
	`sourceDocumentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `murdoku_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `murdoku_templates_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `source_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`origin` varchar(512) NOT NULL,
	`storageKey` varchar(512),
	`notes` text,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `source_documents_id` PRIMARY KEY(`id`)
);
