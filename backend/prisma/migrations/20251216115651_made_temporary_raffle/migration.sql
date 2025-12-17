-- AlterTable
ALTER TABLE `raffles` ADD COLUMN `ticketTokenSymbol` VARCHAR(191) NOT NULL DEFAULT 'Sol',
    MODIFY `raffle` VARCHAR(191) NULL;
