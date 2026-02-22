export default async function handler(req, res) {
  // Allow requests from any origin (your app)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, location, topic } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Build jurisdiction-aware system prompt
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
9. Keep responses clear and actionable

Current topic: ${topic || 'General legal rights'}`;

    // Call Claude API using the secret key stored on server
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Claude API error:', err);
      return res.status(response.status).json({ error: 'AI service error. Please try again.' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'Sorry, I could not generate a response.';

    return res.status(200).json({ response: text });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
