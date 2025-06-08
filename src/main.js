import { fetchBooks } from './js/api.js';
import { formatAuthors, renderBooks } from './js/render.js';

async function init() {
  const searchInput = document.getElementById('search');
  const loadingElement = document.getElementById('loading');
  const errorElement = document.getElementById('error');
  const modal = document.getElementById('summaryModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalSummary = document.getElementById('modalSummary');
  const bookList = document.getElementById('books');

  // Ensure modal is hidden on load
  modal.classList.add('hidden');

  // Attach click listener outside loadBooks to persist
  if (bookList) {
    bookList.addEventListener('click', e => {
      console.log('Click event on bookList, target:', e.target); // Debug log
      const card = e.target.closest('.book-card');
      if (card) {
        console.log('Card clicked, data:', card.dataset); // Debug log
        modalTitle.textContent = card.dataset.title;
        modalSummary.innerHTML = `
          <img src="${card.dataset.cover}" alt="${card.dataset.title} cover">
          <p><strong>Author:</strong> ${card.dataset.author}</p>
          <p><strong>Place:</strong> ${card.dataset.place}</p>
          <p><strong>Publisher:</strong> ${card.dataset.publisher}</p>
          <p><strong>Date:</strong> ${card.dataset.date}</p>
          <p><strong>Summary:</strong> ${card.dataset.summary}</p>
        `;
        console.log('Modal class before show:', modal.classList); // Debug log
        modal.classList.remove('hidden');
        console.log('Modal class after show:', modal.classList); // Debug log
      } else {
        console.log('No .book-card found in click target');
      }
    });
  } else {
    console.error('Book list element not found');
  }

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
      console.log(
        'Rendered cards count:',
        document.querySelectorAll('.book-card').length
      ); // Debug log
    } catch (err) {
      errorElement.textContent = `Error: ${err.message}`;
      errorElement.classList.remove('hidden');
    } finally {
      loadingElement.classList.add('hidden');
    }
  }

  // Close modal when clicking outside the modal content
  modal.addEventListener('click', e => {
    console.log('Modal click target:', e.target); // Debug log
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  // Initial load (modal remains hidden)
  if (bookList) {
    await loadBooks();
  } else {
    console.error('Book list not found on init');
  }

  // Search
  searchInput.addEventListener('input', e => {
    loadBooks(e.target.value);
  });
}

init();
