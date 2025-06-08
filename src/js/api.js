const zoteroUserID = '14092961';
const zoteroApiKey = 'NRyTbMyr4qRqeu2wkRS2nMhE'; // Note: Exposed for assignment; secure in production
const googleBooksApiKey = 'AIzaSyBv43IPKG7LF8eMBy0-aLG7TLZrs4AR2hw'; // Note: Exposed for assignment; secure in production

export async function fetchBooks(search = '') {
  const baseUrl = `https://api.zotero.org/users/${zoteroUserID}/items?itemType=book&limit=10`;
  const url = search ? `${baseUrl}&q=${encodeURIComponent(search)}` : baseUrl;

  try {
    // Fetch books from Zotero
    const zoteroResponse = await fetch(url, {
      headers: { 'Zotero-API-Key': zoteroApiKey },
    });
    if (!zoteroResponse.ok) {
      throw new Error('Failed to fetch books from Zotero');
    }
    const books = await zoteroResponse.json();

    // Fetch cover images from Google Books
    const booksWithCovers = await Promise.all(
      books.map(async book => {
        try {
          const query = book.data.ISBN
            ? `isbn:${book.data.ISBN}`
            : `intitle:${encodeURIComponent(book.data.title)}`;
          const googleResponse = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${googleBooksApiKey}`
          );
          if (!googleResponse.ok) {
            throw new Error('Failed to fetch cover from Google Books');
          }
          const googleData = await googleResponse.json();
          const cover =
            googleData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail ||
            'https://via.placeholder.com/128x192?text=No+Cover';
          return { ...book, cover };
        } catch (err) {
          return {
            ...book,
            cover: 'https://via.placeholder.com/128x192?text=No+Cover',
          };
        }
      })
    );

    return booksWithCovers;
  } catch (error) {
    throw new Error(error.message);
  }
}
