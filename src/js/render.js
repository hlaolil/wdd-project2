export function formatAuthors(creators) {
  if (!creators || creators.length === 0) return 'Unknown Author';
  return creators.map(c => `${c.lastName}, ${c.firstName || ''}`).join(' and ');
}

export function truncateSummary(text) {
  if (!text) return 'No summary available. Add an abstract in Zotero.';
  return text.length > 200 ? text.slice(0, 197) + '...' : text;
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
    bookCard.innerHTML = `
      <img src="${book.cover}" alt="${book.data.title} cover">
      <div class="book-details">
        <h2>${book.data.title}</h2>
        <p>${book.data.author}</p>
        <p>${book.data.place ? `${book.data.place}: ` : ''}${book.data.publisher}, ${book.data.date || 'N/A'}</p>
        <p class="summary"><strong>Summary:</strong> ${truncateSummary(book.data.abstractNote)}</p>
        <a href="${book.data.url || '#'}" target="_blank">View in Zotero</a>
      </div>
    `;
    bookList.appendChild(bookCard);
  });
}
