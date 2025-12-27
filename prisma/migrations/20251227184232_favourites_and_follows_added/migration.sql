-- CreateTable
CREATE TABLE `_FollowAuction` (
    `A` INTEGER NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_FollowAuction_AB_unique`(`A`, `B`),
    INDEX `_FollowAuction_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_FavouriteGumball` (
    `A` INTEGER NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_FavouriteGumball_AB_unique`(`A`, `B`),
    INDEX `_FavouriteGumball_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_FollowGumball` (
    `A` INTEGER NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_FollowGumball_AB_unique`(`A`, `B`),
    INDEX `_FollowGumball_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_FollowRaffle` (
    `A` INTEGER NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_FollowRaffle_AB_unique`(`A`, `B`),
    INDEX `_FollowRaffle_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_FollowAuction` ADD CONSTRAINT `_FollowAuction_A_fkey` FOREIGN KEY (`A`) REFERENCES `auctions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FollowAuction` ADD CONSTRAINT `_FollowAuction_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FavouriteGumball` ADD CONSTRAINT `_FavouriteGumball_A_fkey` FOREIGN KEY (`A`) REFERENCES `gumballs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FavouriteGumball` ADD CONSTRAINT `_FavouriteGumball_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FollowGumball` ADD CONSTRAINT `_FollowGumball_A_fkey` FOREIGN KEY (`A`) REFERENCES `gumballs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FollowGumball` ADD CONSTRAINT `_FollowGumball_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FollowRaffle` ADD CONSTRAINT `_FollowRaffle_A_fkey` FOREIGN KEY (`A`) REFERENCES `raffles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FollowRaffle` ADD CONSTRAINT `_FollowRaffle_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
