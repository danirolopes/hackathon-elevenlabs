import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { tasks } from "npm:@trigger.dev/sdk@3.0.0/v3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { step_id } = await req.json()

    if (!step_id) {
      throw new Error('step_id is required')
    }

    // Update the step status and start time
    const { data: updatedStep, error: updateError } = await supabaseClient
      .from('recipe_steps')
      .update({ 
        status: 'in_progress',
        actual_start_time: new Date().toISOString()
      })
      .eq('id', step_id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Calculate duration in minutes from predicted times
    const predictedStartTime = new Date(updatedStep.predicted_start_time)
    const predictedEndTime = new Date(updatedStep.predicted_end_time)
    const durationMinutes = Math.round((predictedEndTime.getTime() - predictedStartTime.getTime()) / (1000 * 60))

    // Trigger the timing task using HTTP API
    try {
      const handle = await tasks.trigger("handle-step-timing", {
        step_id: updatedStep.id,
        predicted_duration_minutes: durationMinutes
      });

      console.log("Trigger.dev task triggered:", handle.id);
    } catch (error) {
      console.error("Error triggering Trigger.dev task:", error);
    }

    return new Response(
      JSON.stringify({ success: true, data: updatedStep }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 