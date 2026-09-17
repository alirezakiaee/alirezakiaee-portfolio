-- CreateEnum
CREATE TYPE "AiFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "AiPublishMode" AS ENUM ('DRAFT', 'PUBLISH');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- DropTable
DROP TABLE "legacy_admin_users";

-- DropTable
DROP TABLE "legacy_auth_attempts";

-- DropTable
DROP TABLE "legacy_content_blocks";

-- DropTable
DROP TABLE "legacy_pages";

-- DropTable
DROP TABLE "legacy_posts";

-- CreateTable
CREATE TABLE "ai_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "topics" TEXT[],
    "topic_index" INTEGER NOT NULL DEFAULT 0,
    "frequency" "AiFrequency" NOT NULL DEFAULT 'WEEKLY',
    "run_hour" INTEGER NOT NULL DEFAULT 9,
    "run_weekday" INTEGER NOT NULL DEFAULT 1,
    "run_month_day" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT,
    "publish_mode" "AiPublishMode" NOT NULL DEFAULT 'DRAFT',
    "category_id" TEXT,
    "tags_csv" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "next_run_at" TIMESTAMP(3) NOT NULL,
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generation_logs" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "status" "AiRunStatus" NOT NULL,
    "post_id" TEXT,
    "model" TEXT,
    "topic" TEXT,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "error" TEXT,
    "duration_ms" INTEGER,
    "trigger" TEXT NOT NULL DEFAULT 'cron',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_schedules_enabled_next_run_at_idx" ON "ai_schedules"("enabled", "next_run_at");

-- CreateIndex
CREATE INDEX "ai_generation_logs_created_at_idx" ON "ai_generation_logs"("created_at");

-- CreateIndex
CREATE INDEX "ai_generation_logs_schedule_id_created_at_idx" ON "ai_generation_logs"("schedule_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_schedules" ADD CONSTRAINT "ai_schedules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generation_logs" ADD CONSTRAINT "ai_generation_logs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "ai_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generation_logs" ADD CONSTRAINT "ai_generation_logs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
