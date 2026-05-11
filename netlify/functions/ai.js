exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, history, systemPrompt } = JSON.parse(event.body);
    const GEMINI_KEY = process.env.GEMINI_KEY;

    if (!GEMINI_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_KEY not configured' }) };
    }

    const contents = [];
    if (history && history.length > 0) {
      history.slice(-6).forEach(m => {
        contents.push({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        });
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: (systemPrompt || '') + '\n\n---\nคำถาม: ' + message }]
    });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2500
          }
        })
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: err.error?.message || 'Gemini error' })
      };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'ขอโทษ ตอบไม่ได้ตอนนี้';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ text })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
