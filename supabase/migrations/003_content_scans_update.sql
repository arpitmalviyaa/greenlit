-- Add podcast and carousel to content_type enum
alter type content_type add value if not exists 'podcast';
alter type content_type add value if not exists 'carousel';

-- Add columns to content_scans (idempotent via IF NOT EXISTS)
alter table content_scans
  add column if not exists checker_ids_run  text[]    default '{}',
  add column if not exists top_issues_json  jsonb     default '[]',
  add column if not exists requires_lawyer  boolean   not null default false;
