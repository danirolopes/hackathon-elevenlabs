// index.ts
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Load environment variables (these should be set in the Edge Function's environment)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!; // Use your service role key for RPC calls

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    // Parse the incoming JSON body
    const body = await req.json();
    const ingredients = body.ingredients;
    const query_embedding = body.query_embedding;

    // Validate input
    if (
      !Array.isArray(ingredients) ||
      !Array.isArray(query_embedding) ||
      query_embedding.length !== 384
    ) {
      return new Response("Invalid input", { status: 400 });
    }

    // Call the Postgres function "search_recipes" via RPC
    const { data, error } = await supabase.rpc("search_recipes", {
      query_embedding: query_embedding,
      user_ingredients: ingredients,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return the full recipe data including all columns and similarity score
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});