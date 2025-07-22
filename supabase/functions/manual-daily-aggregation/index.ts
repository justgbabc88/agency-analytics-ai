import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { project_id, start_date, end_date } = await req.json();
    
    // If no parameters provided, aggregate all projects for the past week
    if (!project_id) {
      console.log('Aggregating all projects for the past week');
      
      // Get all projects
      const { data: projects } = await supabaseClient
        .from('projects')
        .select('id, name');
      
      if (!projects) {
        throw new Error('No projects found');
      }
      
      const results = [];
      
      for (const project of projects) {
        // Generate dates for the past 7 days
        const dates = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        
        for (const date of dates) {
          try {
            console.log(`Aggregating project ${project.name} (${project.id}) for date ${date}`);
            
            const { error } = await supabaseClient.rpc('aggregate_project_daily_metrics', {
              p_project_id: project.id,
              target_date: date
            });
            
            if (error) {
              console.error(`Error aggregating ${project.name} for ${date}:`, error);
            } else {
              console.log(`✅ Successfully aggregated ${project.name} for ${date}`);
              results.push({ project: project.name, date, status: 'success' });
            }
          } catch (err) {
            console.error(`Exception aggregating ${project.name} for ${date}:`, err);
            results.push({ project: project.name, date, status: 'error', error: err.message });
          }
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Aggregation completed',
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // Single project aggregation
    const dates = [];
    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    const results = [];
    for (const date of dates) {
      try {
        const { error } = await supabaseClient.rpc('aggregate_project_daily_metrics', {
          p_project_id: project_id,
          target_date: date
        });
        
        if (error) {
          console.error(`Error aggregating for ${date}:`, error);
          results.push({ date, status: 'error', error: error.message });
        } else {
          console.log(`✅ Successfully aggregated for ${date}`);
          results.push({ date, status: 'success' });
        }
      } catch (err) {
        console.error(`Exception aggregating for ${date}:`, err);
        results.push({ date, status: 'error', error: err.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});