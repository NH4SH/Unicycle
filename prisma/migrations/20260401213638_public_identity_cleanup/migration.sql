-- AlterTable
ALTER TABLE "User" ADD COLUMN     "usernameConfirmed" BOOLEAN NOT NULL DEFAULT true;

-- Legacy UVA accounts often got a public username straight from the email
-- local-part (the computing ID). Keep the account intact, but mark those
-- handles as unconfirmed so public UI can hide them until the user picks a
-- proper marketplace identity.
UPDATE "User"
SET "usernameConfirmed" = false
WHERE lower(split_part("email", '@', 2)) IN ('virginia.edu', 'mail.virginia.edu')
  AND lower("username") = lower(split_part("email", '@', 1));
