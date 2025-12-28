/*
  Warnings:

  - You are about to drop the `_FavouriteGumball` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FollowAuction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FollowGumball` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FollowRaffle` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_FavouriteGumball` DROP FOREIGN KEY `_FavouriteGumball_A_fkey`;

-- DropForeignKey
ALTER TABLE `_FavouriteGumball` DROP FOREIGN KEY `_FavouriteGumball_B_fkey`;

-- DropForeignKey
ALTER TABLE `_FollowAuction` DROP FOREIGN KEY `_FollowAuction_A_fkey`;

-- DropForeignKey
ALTER TABLE `_FollowAuction` DROP FOREIGN KEY `_FollowAuction_B_fkey`;

-- DropForeignKey
ALTER TABLE `_FollowGumball` DROP FOREIGN KEY `_FollowGumball_A_fkey`;

-- DropForeignKey
ALTER TABLE `_FollowGumball` DROP FOREIGN KEY `_FollowGumball_B_fkey`;

-- DropForeignKey
ALTER TABLE `_FollowRaffle` DROP FOREIGN KEY `_FollowRaffle_A_fkey`;

-- DropForeignKey
ALTER TABLE `_FollowRaffle` DROP FOREIGN KEY `_FollowRaffle_B_fkey`;

-- DropTable
DROP TABLE `_FavouriteGumball`;

-- DropTable
DROP TABLE `_FollowAuction`;

-- DropTable
DROP TABLE `_FollowGumball`;

-- DropTable
DROP TABLE `_FollowRaffle`;
