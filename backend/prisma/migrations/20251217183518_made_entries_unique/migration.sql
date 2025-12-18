/*
  Warnings:

  - A unique constraint covering the columns `[userAddress,raffleId]` on the table `entries` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `entries_userAddress_raffleId_key` ON `entries`(`userAddress`, `raffleId`);
