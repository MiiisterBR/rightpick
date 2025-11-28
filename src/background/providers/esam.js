export async function fetchEsam(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const fullQueryParam = encodeURIComponent(`https://esam.ir/search?kw=${encodedQuery}&so=10`);
    const url = `https://api2.esam.ir/api/items/query?page=1&pageSize=200&searchPhrase=${encodedQuery}&order=10&fullquery=${fullQueryParam}`;
    
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    
    if (!response.ok) throw new Error('Esam network response was not ok');
    const json = await response.json();
    
    // New JSON structure: { data: { items: [...] } }
    if (json && json.data && Array.isArray(json.data.items)) {
        const items = json.data.items.map(item => ({
            title: item.item_name,
            url: item.item_link ? `https://esam.ir${item.item_link}` : '#',
            image: item.item_big_thumb_url || item.item_small_thumb_url,
            price: item.price, // Integer price
            is_auction: item.is_auction
        }));

        // Sort by price ascending (cheaper first) as requested
        items.sort((a, b) => a.price - b.price);
        
        return items;
    }
    return [];
  } catch (error) {
    console.error('Esam fetch error:', error);
    return [];
  }
}
