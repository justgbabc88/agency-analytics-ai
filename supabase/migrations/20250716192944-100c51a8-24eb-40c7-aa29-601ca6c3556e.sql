-- Remove duplicate GHL forms, keeping only the most recent ones
DELETE FROM ghl_forms 
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id, form_id) id 
  FROM ghl_forms 
  ORDER BY project_id, form_id, created_at DESC
);

-- Remove duplicate GHL form submissions, keeping only the most recent ones
DELETE FROM ghl_form_submissions 
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id, submission_id) id 
  FROM ghl_form_submissions 
  ORDER BY project_id, submission_id, created_at DESC
);

-- Now add the unique constraints
ALTER TABLE ghl_forms ADD CONSTRAINT ghl_forms_project_form_unique UNIQUE (project_id, form_id);
ALTER TABLE ghl_form_submissions ADD CONSTRAINT ghl_form_submissions_project_submission_unique UNIQUE (project_id, submission_id);