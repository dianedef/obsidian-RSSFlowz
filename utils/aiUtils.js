export async function generateSummary(content, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{
                role: "system",
                content: "Générez un sommaire concis de l'article suivant:"
            }, {
                role: "user",
                content: content
            }]
        })
    });

    const data = await response.json();
    return data.choices[0].message?.content || '';
}

export async function transcribeYoutube(url, apiKey) {
    // Implémentation de la transcription YouTube
    // Nécessite l'utilisation de l'API YouTube
    // et potentiellement Whisper API pour la transcription
} 