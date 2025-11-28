import { fetchTorob } from '../providers/torob.js';
import { fetchEsam } from '../providers/esam.js';
import { getApiKey, aiFilterProducts, generateSimplifiedQuery } from '../services/openaiService.js';

export async function handleFetchPrices(port, query) {
    try {
        port.postMessage({ status: "progress", message: "در حال دریافت قیمت‌ها..." });

        // Step 1: Initial Search
        let [torobData, esamData] = await Promise.all([fetchTorob(query), fetchEsam(query)]);
        const apiKey = await getApiKey();
        
        // Logic to check if we found good results
        let needsRetry = false;
        let filtered = { torob: torobData, esam: esamData };

        if (apiKey) {
            if (torobData?.length > 0 || esamData?.length > 0) {
                port.postMessage({ status: "progress", message: "بررسی هوشمند محتوا توسط هوش مصنوعی..." });
                filtered = await aiFilterProducts(apiKey, query, { torob: torobData, esam: esamData });
                
                // If everything was filtered out, we might need to retry with a broader query
                if ((!filtered.torob || filtered.torob.length === 0) && (!filtered.esam || filtered.esam.length === 0)) {
                     needsRetry = true;
                }
            } else {
                // Initial search returned nothing
                needsRetry = true;
            }

            // Step 2: Retry with Simplified Query if needed
            if (needsRetry) {
                port.postMessage({ status: "progress", message: "تلاش مجدد با نام ساده‌تر..." });
                const simplifiedName = await generateSimplifiedQuery(apiKey, query);
                
                if (simplifiedName && simplifiedName !== query) {
                    console.log("Retrying with simplified name:", simplifiedName);
                    const [tData, eData] = await Promise.all([fetchTorob(simplifiedName), fetchEsam(simplifiedName)]);
                    
                    if (tData?.length > 0 || eData?.length > 0) {
                        port.postMessage({ status: "progress", message: "بررسی مجدد نتایج جدید..." });
                        // We use the ORIGINAL query for filtering to ensure strictness, 
                        // OR we could use the simplified one? The user said "Target Product" matching.
                        // If we matched strictly against original name and failed, maybe we should filter against simplified name?
                        // User said: "send new data to GPT" -> implied filtering again.
                        // Let's filter against the *original* name first to see if we found the *correct* product just with a better search term.
                        // If that fails, the product might just not be there.
                        filtered = await aiFilterProducts(apiKey, query, { torob: tData, esam: eData });
                    } else {
                        filtered = { torob: [], esam: [] };
                    }
                }
            }
        }

        port.postMessage({ status: "complete", data: filtered });

    } catch (error) {
        console.error("Error fetching prices:", error);
        port.postMessage({ status: "error", error: error.message });
    }
}
