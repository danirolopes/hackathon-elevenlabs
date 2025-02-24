// index.ts
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HfInference } from "https://esm.sh/@huggingface/inference";

// Load environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const HF_API_KEY = Deno.env.get("HF_API_KEY")!;

console.log("Environment variables loaded:", {
  SUPABASE_URL,
  HF_API_KEY_LENGTH: HF_API_KEY?.length
});

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const hfClient = new HfInference(HF_API_KEY);

console.log("Clients initialized");

serve(async (req) => {
  console.log("Received request:", req.method);
  
  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    // Parse the incoming JSON body
    const body = await req.json();
    const { ingredients, query_text } = body;
    
    console.log("Request body:", { ingredients, query_text });

    // Validate input
    if (!Array.isArray(ingredients) || !query_text) {
      console.log("Invalid input:", { ingredients, query_text });
      return new Response("Invalid input: requires ingredients array and query_text", { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log("Generating embedding for query:", query_text);
    // Generate embedding for the query text
    const query_embedding = await hfClient.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: query_text,
    });
    console.log("Generated embedding length:", query_embedding.length);

    console.log("Calling search_recipes with ingredients:", ingredients);
    // Call the Postgres function "search_recipes" via RPC
    const { data, error } = await supabase.rpc("search_recipes", {
      query_embedding,
      user_ingredients: ingredients,
    });

    if (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Search successful, found recipes:", data?.length);
    // Return the full recipe data including all columns and similarity score
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});