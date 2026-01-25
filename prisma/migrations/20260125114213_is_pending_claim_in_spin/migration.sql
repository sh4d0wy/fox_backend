/*
  Warnings:

  - You are about to drop the column `claimed` on the `gumball_spins` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `gumball_spins` DROP FOREIGN KEY `gumball_spins_prizeId_fkey`;

-- AlterTable
ALTER TABLE `gumball_spins` DROP COLUMN `claimed`,
    ADD COLUMN `isPendingClaim` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `prizeId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `gumball_spins` ADD CONSTRAINT `gumball_spins_prizeId_fkey` FOREIGN KEY (`prizeId`) REFERENCES `gumball_prizes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
