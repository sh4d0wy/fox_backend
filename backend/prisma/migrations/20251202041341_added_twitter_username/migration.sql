/*
  Warnings:

  - A unique constraint covering the columns `[twitterId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `twitterConnected` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `twitterId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_twitterId_key` ON `users`(`twitterId`);
