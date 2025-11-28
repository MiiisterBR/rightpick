import { fetchTorob } from './providers/torob.js';
import { fetchEsam } from './providers/esam.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchPrices") {
    const query = request.query;
    
    Promise.all([fetchTorob(query), fetchEsam(query)])
      .then(([torobData, esamData]) => {
        sendResponse({ torob: torobData, esam: esamData });
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        sendResponse({ error: error.message });
      });

    return true; // Will respond asynchronously
  }
  
  if (request.action === "searchDigikalaAndGetReviews") {
    const query = request.query;
    handleDigikalaSearchAndReviews(query).then(sendResponse);
    return true;
  }
});

async function handleDigikalaSearchAndReviews(query) {
  try {
    // 1. Search in Digikala
    const searchUrl = `https://api.digikala.com/v1/search/?page=1&q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl);
    const searchJson = await searchRes.json();
    
    if (!searchJson.data || !searchJson.data.products || searchJson.data.products.length === 0) {
      return { error: "محصولی در دیجی‌کالا یافت نشد." };
    }
    
    const product = searchJson.data.products[0];
    const productId = product.id;
    
    // 2. Get Reviews
    const reviewsUrl = `https://api.digikala.com/v1/rate-review/products/${productId}/?page=1`;
    const reviewsRes = await fetch(reviewsUrl);
    const reviewsJson = await reviewsRes.json();
    
    return {
      product: {
        id: productId,
        title: product.title_fa || product.title,
        image: product.images && product.images.main ? product.images.main.url : null,
        url: `https://www.digikala.com/product/dkp-${productId}/`
      },
      reviews: reviewsJson.data ? (reviewsJson.data.items || reviewsJson.data.comments || []) : []
    };
    
  } catch (error) {
    console.error("Digikala API Error:", error);
    return { error: error.message };
  }
}
