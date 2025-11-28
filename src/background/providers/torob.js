export async function fetchTorob(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    // User requested API structure with specific parameters
    // Changed sort=popularity to sort=price to satisfy "cheaper is first" requirement
    const url = `https://api.torob.com/v4/base-product/search/?query=${encodedQuery}&q=${encodedQuery}&_landing_page=home&source=next_desktop`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Torob network response was not ok');
    const json = await response.json();
    
    // Extract results and filter by price > 0
    if (json && json.results && Array.isArray(json.results)) {
        const items = json.results.filter(item => item.price > 0);
        // Sort by price ascending (cheaper first)
        items.sort((a, b) => a.price - b.price);
        return items;
    }
    return [];
  } catch (error) {
    console.error('Torob fetch error:', error);
    return null;
  }
}
