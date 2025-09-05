-- Create facebook_daily_insights table for better performance and structured data
CREATE TABLE public.facebook_daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  date DATE NOT NULL,
  -- Core metrics
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  reach BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  conversion_values DECIMAL(10,2) DEFAULT 0,
  -- Calculated metrics (stored for performance)
  ctr DECIMAL(5,4) DEFAULT 0, -- Click-through rate
  cpc DECIMAL(10,2) DEFAULT 0, -- Cost per click
  cpm DECIMAL(10,2) DEFAULT 0, -- Cost per mille
  frequency DECIMAL(5,4) DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_facebook_insight UNIQUE (project_id, campaign_id, date)
);

-- Enable RLS
ALTER TABLE public.facebook_daily_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view Facebook insights for their projects" 
ON public.facebook_daily_insights 
FOR SELECT 
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can create Facebook insights for their projects" 
ON public.facebook_daily_insights 
FOR INSERT 
WITH CHECK (public.user_owns_project(project_id));

CREATE POLICY "Users can update Facebook insights for their projects" 
ON public.facebook_daily_insights 
FOR UPDATE 
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can delete Facebook insights for their projects" 
ON public.facebook_daily_insights 
FOR DELETE 
USING (public.user_owns_project(project_id));

-- Service role can manage all insights for sync operations
CREATE POLICY "Service role can manage all Facebook insights" 
ON public.facebook_daily_insights 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_facebook_insights_project_date ON public.facebook_daily_insights (project_id, date);
CREATE INDEX idx_facebook_insights_campaign ON public.facebook_daily_insights (campaign_id);
CREATE INDEX idx_facebook_insights_project_campaign ON public.facebook_daily_insights (project_id, campaign_id);

-- Create updated_at trigger
CREATE TRIGGER update_facebook_insights_updated_at
  BEFORE UPDATE ON public.facebook_daily_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();