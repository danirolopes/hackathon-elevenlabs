import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference";

// Load the Hugging Face API key from environment variables.
const HF_API_KEY = Deno.env.get("HF_API_KEY")!;
const client = new HfInference(HF_API_KEY);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    // Parse the JSON body; expect a field "query_text"
    const { query_text } = await req.json();
    if (!query_text) {
      return new Response(
        JSON.stringify({ error: "Missing query_text in request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Use the feature extraction method to get the embedding for the query text.
    // The model is specified as "sentence-transformers/all-MiniLM-L6-v2"
    const embedding = await client.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: query_text,
    });
    
    // Return the embedding vector in the response.
    return new Response(
      JSON.stringify({ embedding }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.toString() }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});