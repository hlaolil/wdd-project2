export function formatAuthors(creators) {
  if (!creators || creators.length === 0) {
    return 'Unknown Author';
  }
  return creators.map(c => `${c.lastName}, ${c.firstName || ''}`).join(' and ');
}

export function getTurabianReference(book) {
  const author = formatAuthors(book.creators);
  const year = book.date || 'N/A';
  const title = book.title ? `*${book.title}*.` : 'Untitled.';
  const place = book.place ? `${book.place}: ` : '';
  const publisher = book.publisher || 'N/A';
  return `${author}. ${year}. ${title} ${place}${publisher}.`;
}

export function renderBooks(books) {
  const bookList = document.getElementById('books');
  bookList.innerHTML = '';
  if (books.length === 0) {
    bookList.innerHTML =
      '<p class="text-center">No books found. Add books to your Zotero library.</p>';
    return;
  }

  books.forEach(book => {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    const turabianRef = getTurabianReference(book.data);
    bookCard.innerHTML = `
      <img src="${book.cover || 'https://via.placeholder.com/80x120'}" alt="${book.data.title || 'Book'} cover">
      <div class="turabian-reference">${turabianRef}</div>
    `;
    // Store all book data for modal with fallback values
    bookCard.dataset.title = book.data.title || 'Untitled';
    bookCard.dataset.author = book.data.author || 'Unknown Author';
    bookCard.dataset.place = book.data.place || '';
    bookCard.dataset.publisher = book.data.publisher || 'N/A';
    bookCard.dataset.date = book.data.date || 'N/A';
    bookCard.dataset.cover =
      book.cover || 'https://via.placeholder.com/100x150';
    bookCard.dataset.summary =
      book.data.abstractNote ||
      'No summary available. Add an abstract in Zotero.';
    bookList.appendChild(bookCard);
  });
}
