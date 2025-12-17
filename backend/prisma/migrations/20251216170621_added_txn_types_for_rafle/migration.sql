/*
  Warnings:

  - The values [DEPOSIT,CLAIM,PURCHASE,REFUND] on the enum `transactions_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `transactions` MODIFY `type` ENUM('RAFFLE_CREATION', 'RAFFLE_ENTRY', 'RAFFLE_WIN', 'RAFFLE_CANCEL', 'RAFFLE_END', 'RAFFLE_CLAIM', 'RAFFLE_REFUND', 'RAFFLE_PURCHASE', 'RAFFLE_DEPOSIT') NOT NULL;
