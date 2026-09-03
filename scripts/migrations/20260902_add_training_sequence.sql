-- Migration: Add sequence column to training_sessions for ICS SEQUENCE handling

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS sequence INTEGER DEFAULT 0;
