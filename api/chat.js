export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const { messages, location, topic } = await req.json();

    const country = location?.country || 'Ghana';
    const detail = location?.detail || 'Accra, Ghana';

    const systemPrompt = `You are LexAI, a global legal rights assistant. The user is located in ${detail}.

CRITICAL INSTRUCTIONS:
1. ALWAYS prioritize laws specific to ${country}
2. Cite specific laws by name (e.g. Ghana's Labour Act 2003, Rent Control Act)
3. Explain in simple, plain language — no legal jargon
4. Use **bold** for key terms and important points
5. Structure with numbered points for clarity
6. Always mention free legal aid resources in ${country}
7. End with practical next steps the user can take TODAY
8. Be empathetic — many users are in stressful situations

Current topic: ${topic || 'General legal rights'}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages,
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || 'Sorry, I could not generate a response.';

    return new Response(JSON.stringify({ response: text }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
