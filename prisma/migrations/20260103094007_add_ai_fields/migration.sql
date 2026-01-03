-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "interview_result" TEXT,
ADD COLUMN     "interview_status" TEXT DEFAULT 'pending',
ADD COLUMN     "jd_match_score" DOUBLE PRECISION,
ADD COLUMN     "resume_text" TEXT;
