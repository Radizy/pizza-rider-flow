import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EVOLUTION_URL = 'https://dom-evolution-api.adhwpy.easypanel.host';
const EVOLUTION_API_KEY = 'E7BCA4BB4535-4C3C-8C97-744315F4DECE';
const EVOLUTION_INSTANCE = 'pizzaria';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telefone, message } = await req.json();

    if (!telefone || !message) {
      return new Response(
        JSON.stringify({ error: 'telefone and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number (remove non-digits and ensure country code)
    let formattedNumber = telefone.replace(/\D/g, '');
    if (!formattedNumber.startsWith('55')) {
      formattedNumber = '55' + formattedNumber;
    }

    const response = await fetch(
      `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: formattedNumber,
          text: message,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to send message', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
