-- Create tables for Go High Level integration
CREATE TABLE public.ghl_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  form_id TEXT NOT NULL,
  form_name TEXT NOT NULL,
  form_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ghl_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  form_id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  contact_email TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  form_data JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ghl_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghl_form_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for ghl_forms
CREATE POLICY "Users can view forms for their projects" 
ON public.ghl_forms 
FOR SELECT 
USING (user_owns_project(project_id));

CREATE POLICY "Users can create forms for their projects" 
ON public.ghl_forms 
FOR INSERT 
WITH CHECK (user_owns_project(project_id));

CREATE POLICY "Users can update forms for their projects" 
ON public.ghl_forms 
FOR UPDATE 
USING (user_owns_project(project_id));

CREATE POLICY "Users can delete forms for their projects" 
ON public.ghl_forms 
FOR DELETE 
USING (user_owns_project(project_id));

-- Create policies for ghl_form_submissions
CREATE POLICY "Users can view submissions for their projects" 
ON public.ghl_form_submissions 
FOR SELECT 
USING (user_owns_project(project_id));

CREATE POLICY "Users can create submissions for their projects" 
ON public.ghl_form_submissions 
FOR INSERT 
WITH CHECK (user_owns_project(project_id));

CREATE POLICY "System can create submissions" 
ON public.ghl_form_submissions 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_ghl_forms_project_id ON public.ghl_forms(project_id);
CREATE INDEX idx_ghl_forms_form_id ON public.ghl_forms(form_id);
CREATE INDEX idx_ghl_form_submissions_project_id ON public.ghl_form_submissions(project_id);
CREATE INDEX idx_ghl_form_submissions_form_id ON public.ghl_form_submissions(form_id);
CREATE INDEX idx_ghl_form_submissions_submitted_at ON public.ghl_form_submissions(submitted_at);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_ghl_forms_updated_at
BEFORE UPDATE ON public.ghl_forms
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_ghl_form_submissions_updated_at
BEFORE UPDATE ON public.ghl_form_submissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add foreign key constraints
ALTER TABLE public.ghl_forms 
ADD CONSTRAINT fk_ghl_forms_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.ghl_form_submissions 
ADD CONSTRAINT fk_ghl_form_submissions_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;