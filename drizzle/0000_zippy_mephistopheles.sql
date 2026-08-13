CREATE TABLE `trades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`ticker` text NOT NULL,
	`side` text NOT NULL,
	`entry` real NOT NULL,
	`exit` real,
	`stop` real NOT NULL,
	`target` real NOT NULL,
	`size` real NOT NULL,
	`leverage` real NOT NULL,
	`pnl` real NOT NULL,
	`ratio` real NOT NULL,
	`strategy` text NOT NULL,
	`status` text NOT NULL
);
