-- Fix Facebook frequency calculations in existing data
-- This migration updates all existing Facebook integration data to properly calculate frequency as impressions/reach

-- Update integration_data table for Facebook platform
UPDATE integration_data 
SET data = jsonb_set(
  data,
  '{daily_insights}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN (daily_insight->>'reach')::numeric > 0 
        THEN daily_insight || jsonb_build_object(
          'frequency', 
          (daily_insight->>'impressions')::numeric / (daily_insight->>'reach')::numeric
        )
        ELSE daily_insight || jsonb_build_object('frequency', 0)
      END
    )
    FROM jsonb_array_elements(data->'daily_insights') AS daily_insight
  )
)
WHERE platform = 'facebook' 
AND data ? 'daily_insights'
AND jsonb_array_length(data->'daily_insights') > 0;

-- Update the main insights object to recalculate frequency
UPDATE integration_data 
SET data = jsonb_set(
  data,
  '{insights,frequency}',
  CASE 
    WHEN (data->'insights'->>'reach')::numeric > 0 
    THEN to_jsonb((data->'insights'->>'impressions')::numeric / (data->'insights'->>'reach')::numeric)
    ELSE to_jsonb(0::numeric)
  END
)
WHERE platform = 'facebook' 
AND data ? 'insights'
AND data->'insights' ? 'reach'
AND data->'insights' ? 'impressions';

-- Update campaign_insights if they exist
UPDATE integration_data 
SET data = jsonb_set(
  data,
  '{campaign_insights}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN (campaign_insight->>'reach')::numeric > 0 
        THEN campaign_insight || jsonb_build_object(
          'frequency', 
          (campaign_insight->>'impressions')::numeric / (campaign_insight->>'reach')::numeric
        )
        ELSE campaign_insight || jsonb_build_object('frequency', 0)
      END
    )
    FROM jsonb_array_elements(data->'campaign_insights') AS campaign_insight
  )
)
WHERE platform = 'facebook' 
AND data ? 'campaign_insights'
AND jsonb_array_length(data->'campaign_insights') > 0;