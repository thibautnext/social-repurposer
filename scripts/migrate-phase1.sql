-- Phase 1 Migration: Audio/Video Support
-- Run this on the Supabase Cloud database

-- Add new columns to sr_articles table
ALTER TABLE sr_articles 
ADD COLUMN IF NOT EXISTS audio_transcript TEXT,
ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) DEFAULT 'blog',
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'ready';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sr_articles_content_type 
ON sr_articles(content_type);

CREATE INDEX IF NOT EXISTS idx_sr_articles_processing_status 
ON sr_articles(processing_status);

-- Add constraint for content_type values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sr_articles_content_type_check'
    ) THEN
        ALTER TABLE sr_articles 
        ADD CONSTRAINT sr_articles_content_type_check 
        CHECK (content_type IN ('blog', 'podcast', 'youtube', 'video'));
    END IF;
END $$;

-- Add constraint for processing_status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sr_articles_processing_status_check'
    ) THEN
        ALTER TABLE sr_articles 
        ADD CONSTRAINT sr_articles_processing_status_check 
        CHECK (processing_status IN ('pending', 'transcribing', 'ready', 'error'));
    END IF;
END $$;

-- Update existing articles to have default values
UPDATE sr_articles 
SET content_type = 'blog', processing_status = 'ready'
WHERE content_type IS NULL OR processing_status IS NULL;

-- Show table structure
\d sr_articles;
