export async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['openaiApiKey'], (result) => {
            resolve(result.openaiApiKey || null);
        });
    });
}

async function callOpenAI(apiKey, messages) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // Fast and capable
                messages: messages,
                response_format: { type: "json_object" },
                temperature: 0.1 // Deterministic
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return JSON.parse(data.choices[0].message.content);
    } catch (e) {
        console.error("OpenAI Call Failed:", e);
        return null;
    }
}

export async function aiSelectProduct(apiKey, targetName, candidates) {
    // Simplify candidates to save tokens
    const simplified = candidates.map(p => ({
        id: p.id,
        title_fa: p.title_fa || p.title,
        title_en: p.title_en || "", // Crucial for model numbers
    }));

    const messages = [
        {
            role: "system",
            content: "You are an expert product matcher. Your task is to find the product in the 'Candidates' list that best matches the 'Target Product'. \n\nRules:\n1. Prioritize matching Brand and specific Model Number (e.g. 'A6140C', 'iPhone 13').\n2. Ignore minor differences like color, warranty, or word order.\n3. If the target specifies a key spec (e.g. '140W'), the candidate MUST have it.\n4. If multiple candidates match, choose the one with the most similar title.\n5. If NO candidate is a good match, return null.\n\nReturn JSON: {\"matchId\": <id> or null}."
        },
        {
            role: "user",
            content: JSON.stringify({
                target: targetName,
                candidates: simplified
            })
        }
    ];

    const result = await callOpenAI(apiKey, messages);
    return result ? result.matchId : null;
}

export async function aiFilterProducts(apiKey, targetName, data) {
    // Simplify
    const torobSimple = (data.torob || []).map((p, i) => ({ index: i, source: 'torob', title: p.name1 || p.title, price: p.price }));
    const esamSimple = (data.esam || []).map((p, i) => ({ index: i, source: 'esam', title: p.title, price: p.price }));

    if (torobSimple.length === 0 && esamSimple.length === 0) return data;

    const messages = [
        {
            role: "system",
            content: "You are a shopping filter. Filter the candidates list to keep ONLY products that match the 'Target Product' (same model, specs). Exclude accessories, parts, or different models. Return JSON: {\"torobIndices\": [indices to keep], \"esamIndices\": [indices to keep]}."
        },
        {
            role: "user",
            content: JSON.stringify({
                target: targetName,
                candidates: [...torobSimple, ...esamSimple]
            })
        }
    ];

    const result = await callOpenAI(apiKey, messages);
    
    if (!result) return data; // Fallback if AI fails

    const filteredTorob = (data.torob || []).filter((_, i) => result.torobIndices?.includes(i));
    const filteredEsam = (data.esam || []).filter((_, i) => result.esamIndices?.includes(i));

    return { torob: filteredTorob, esam: filteredEsam };
}

export async function generateSimplifiedQuery(apiKey, originalName) {
    const messages = [
        {
            role: "system",
            content: "You are a search query optimizer. Your task is to simplify a product name to improve search results. Remove colors, warranties, specific model numbers if they are too long, or extra adjectives. Keep the core brand and model. Return JSON: {\"newQuery\": \"...\"}."
        },
        {
            role: "user",
            content: `Original: ${originalName}`
        }
    ];

    const result = await callOpenAI(apiKey, messages);
    return result ? result.newQuery : null;
}
