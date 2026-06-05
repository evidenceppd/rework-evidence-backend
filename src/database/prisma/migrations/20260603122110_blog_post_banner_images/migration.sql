ALTER TABLE `BlogPost`
  MODIFY `blogImage` TEXT NOT NULL,
  ADD COLUMN `blogBannerImage` TEXT NULL,
  ADD COLUMN `blogBannerMobileImage` TEXT NULL;
