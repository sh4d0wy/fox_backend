-- AlterTable
ALTER TABLE `gumball_prizes` ADD COLUMN `creatorClaimed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `creatorClaimedAt` DATETIME(3) NULL;
