-- Create helper function to upsert Facebook daily insights
CREATE OR REPLACE FUNCTION public.upsert_facebook_daily_insight(
  p_project_id UUID,
  p_campaign_id TEXT,
  p_campaign_name TEXT,
  p_date DATE,
  p_impressions BIGINT DEFAULT 0,
  p_clicks BIGINT DEFAULT 0,
  p_spend DECIMAL DEFAULT 0,
  p_reach BIGINT DEFAULT 0,
  p_conversions BIGINT DEFAULT 0,
  p_conversion_values DECIMAL DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  insight_id UUID;
  calculated_ctr DECIMAL(5,4);
  calculated_cpc DECIMAL(10,2);
  calculated_cpm DECIMAL(10,2);
  calculated_frequency DECIMAL(5,4);
BEGIN
  -- Calculate derived metrics
  calculated_ctr := CASE WHEN p_impressions > 0 THEN (p_clicks::DECIMAL / p_impressions) * 100 ELSE 0 END;
  calculated_cpc := CASE WHEN p_clicks > 0 THEN p_spend / p_clicks ELSE 0 END;
  calculated_cpm := CASE WHEN p_impressions > 0 THEN (p_spend / p_impressions) * 1000 ELSE 0 END;
  calculated_frequency := CASE WHEN p_reach > 0 THEN p_impressions::DECIMAL / p_reach ELSE 0 END;

  -- Upsert the insight
  INSERT INTO public.facebook_daily_insights (
    project_id, campaign_id, campaign_name, date,
    impressions, clicks, spend, reach, conversions, conversion_values,
    ctr, cpc, cpm, frequency
  ) VALUES (
    p_project_id, p_campaign_id, p_campaign_name, p_date,
    p_impressions, p_clicks, p_spend, p_reach, p_conversions, p_conversion_values,
    calculated_ctr, calculated_cpc, calculated_cpm, calculated_frequency
  )
  ON CONFLICT (project_id, campaign_id, date)
  DO UPDATE SET
    campaign_name = EXCLUDED.campaign_name,
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    spend = EXCLUDED.spend,
    reach = EXCLUDED.reach,
    conversions = EXCLUDED.conversions,
    conversion_values = EXCLUDED.conversion_values,
    ctr = EXCLUDED.ctr,
    cpc = EXCLUDED.cpc,
    cpm = EXCLUDED.cpm,
    frequency = EXCLUDED.frequency,
    updated_at = now()
  RETURNING id INTO insight_id;

  RETURN insight_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;