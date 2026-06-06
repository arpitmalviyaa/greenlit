-- Session 2: add raw_text column to contracts
-- Run in Supabase SQL editor after 001_initial_schema.sql

alter table contracts
  add column if not exists raw_text text,
  add column if not exists file_name text,
  add column if not exists file_size_bytes integer;
