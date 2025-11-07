-- CreateTable
CREATE TABLE `nonce` (
    `id` VARCHAR(191) NOT NULL,
    `nonce` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `userAddress` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `nonce_nonce_key`(`nonce`),
    UNIQUE INDEX `nonce_userAddress_key`(`userAddress`),
    INDEX `nonce_nonce_idx`(`nonce`),
    INDEX `nonce_userAddress_idx`(`userAddress`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `nonce` ADD CONSTRAINT `nonce_userAddress_fkey` FOREIGN KEY (`userAddress`) REFERENCES `users`(`walletAddress`) ON DELETE CASCADE ON UPDATE CASCADE;
