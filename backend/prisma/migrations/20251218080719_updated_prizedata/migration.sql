/*
  Warnings:

  - A unique constraint covering the columns `[raffleId]` on the table `prize_data` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `prize_data_raffleId_key` ON `prize_data`(`raffleId`);
