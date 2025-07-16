-- Add unique constraints to prevent duplicate GHL forms and submissions
ALTER TABLE ghl_forms ADD CONSTRAINT ghl_forms_project_form_unique UNIQUE (project_id, form_id);
ALTER TABLE ghl_form_submissions ADD CONSTRAINT ghl_form_submissions_project_submission_unique UNIQUE (project_id, submission_id);