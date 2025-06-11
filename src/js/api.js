const zoteroUserID = '14092961';
const zoteroApiKey = 'NRyTbMyr4qRqeu2wkRS2nMhE'; // Hide in production.
const googleBooksApiKey = 'AIzaSyAWYTztLiF-PB0bnLg_gOenr7g7JKWJX_U'; // Hide in production.

// Cache key for localStorage
const CACHE_KEY = 'bookCoversCache';
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // Cache for 30 days (in milliseconds)

/**
 * Fetches books from Zotero and adds cover images via Google Books API with local caching.
 * @param {string} search - Optional search query.
 * @returns {Promise<Array>} Array of book items with `data` and `cover`.
 */
export async function fetchBooks(search = '') {
  const baseUrl = `https://api.zotero.org/users/${zoteroUserID}/items?itemType=book&limit=20`;
  const url = search ? `${baseUrl}&q=${encodeURIComponent(search)}` : baseUrl;

  // Load existing cache
  const cache = loadCache();

  try {
    // Fetch from Zotero
    const zoteroResponse = await fetch(url, {
      headers: { 'Zotero-API-Key': zoteroApiKey },
    });

    if (!zoteroResponse.ok) {
      throw new Error(`Zotero API error: ${zoteroResponse.status}`);
    }

    const books = await zoteroResponse.json();

    // Add cover images
    const booksWithCovers = await Promise.all(
      books.map(async book => {
        const isbn = extractISBN(book.data);
        const cacheKey = isbn || book.data.title || book.key; // Use ISBN or title as cache key

        // Check cache first
        if (cache[cacheKey] && !isCacheExpired(cache[cacheKey].timestamp)) {
          return { ...book, cover: cache[cacheKey].cover };
        }

        try {
          const query = isbn
            ? `isbn:${isbn}`
            : `intitle:${encodeURIComponent(book.data.title || '')}`;
          const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${googleBooksApiKey}`;

          const googleResponse = await fetch(googleUrl);
          if (!googleResponse.ok) {
            throw new Error('Google Books API error');
          }

          const googleData = await googleResponse.json();
          const cover =
            googleData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail ||
            'https://via.placeholder.com/128x192?text=No+Cover';

          // Store in cache
          cache[cacheKey] = { cover, timestamp: Date.now() };
          saveCache(cache);

          return { ...book, cover };
        } catch (err) {
          // Fallback if Google Books fails
          return {
            ...book,
            cover: 'https://via.placeholder.com/128x192?text=No+Cover',
          };
        }
      })
    );

    return booksWithCovers;
  } catch (error) {
    console.error('Fetch error:', error.message);
    throw new Error(error.message);
  }
}

/**
 * Extracts ISBN from a Zotero book item.
 * Tries `ISBN` field or identifies from extra metadata.
 */
function extractISBN(data) {
  if (data.ISBN) {
    return data.ISBN;
  }

  const extra = data.extra || '';
  const isbnMatch = extra.match(/ISBN(?:-13)?:?\s*([\d\-Xx]+)/);
  return isbnMatch ? isbnMatch[1] : '';
}

/**
 * Loads cache from localStorage.
 * @returns {Object} Cache object.
 */
function loadCache() {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    return cachedData ? JSON.parse(cachedData) : {};
  } catch (err) {
    console.error('Error loading cache:', err.message);
    return {};
  }
}

/**
 * Saves cache to localStorage.
 * @param {Object} cache - Cache object to save.
 */
function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error('Error saving cache:', err.message);
  }
}

/**
 * Checks if a cache entry is expired.
 * @param {number} timestamp - Cache entry timestamp.
 * @returns {boolean} True if cache is still valid, false if expired.
 */
function isCacheExpired(timestamp) {
  return Date.now() - timestamp > CACHE_EXPIRY;
}
