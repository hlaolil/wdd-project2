import './css/styles.css';
import { fetchBooks } from './js/api.js';
import { formatAuthors, renderBooks } from './js/render.js';

async function init() {
  const searchInput = document.getElementById('search');
  const loadingElement = document.getElementById('loading');
  const errorElement = document.getElementById('error');

  async function loadBooks(search = '') {
    loadingElement.classList.remove('hidden');
    errorElement.classList.add('hidden');
    try {
      let books = await fetchBooks(search);
      books = books.map(book => ({
        ...book,
        data: {
          ...book.data,
          author: formatAuthors(book.data.creators),
        },
      }));
      renderBooks(books);
    } catch (err) {
      errorElement.textContent = `Error: ${err.message}`;
      errorElement.classList.remove('hidden');
    } finally {
      loadingElement.classList.add('hidden');
    }
  }

  // Initial load
  await loadBooks();

  // Search
  searchInput.addEventListener('input', e => {
    loadBooks(e.target.value);
  });
}

init();
