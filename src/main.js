import { cachedBooks, fetchAllBooks } from './js/zotero.js';
import { esc, authorLine, mainNames, bibliography, footnote } from './js/cite.js';
import * as cw from './js/coursework.js';

const $ = sel => document.querySelector(sel);
let books = [];
const view = { q: '', sort: 'title', tag: '' };

// ---------- loading ----------
async function load({ force = false } = {}) {
  const cache = force ? null : cachedBooks();
  if (cache) {
    setBooks(cache.books, cache.savedAt);
    return;
  }
  $('#refresh').disabled = true;
  if (!books.length) $('#books').innerHTML = skeletons(8);
  setStatus('Loading your books from Zotero…');
  try {
    const fresh = await fetchAllBooks(n => setStatus(`Loading your books from Zotero… ${n}`));
    setBooks(fresh.books, fresh.savedAt);
  } catch (err) {
    setStatus(`Could not load the library: ${err.message}`, true);
    if (!books.length) $('#books').innerHTML = '';
  } finally {
    $('#refresh').disabled = false;
  }
}

function setBooks(list, savedAt) {
  books = list;
  cw.setOwned(books);
  $('#shelf-count').textContent = `(${books.length})`;
  if (!$('#view-coursework').hidden) renderCw();
  fillTags();
  render();
  $('#refresh').title = `Last loaded ${new Date(savedAt).toLocaleString()}`;
  openFromHash();
}

function fillTags() {
  const counts = new Map();
  for (const b of books) for (const t of b.tags) counts.set(t, (counts.get(t) || 0) + 1);
  const tags = [...counts].sort((a, b) => a[0].localeCompare(b[0]));
  $('#tag').innerHTML =
    '<option value="">All subjects</option>' +
    tags.map(([t, n]) => `<option value="${esc(t)}" ${t === view.tag ? 'selected' : ''}>${esc(t)} (${n})</option>`).join('');
  $('#tag').parentElement.hidden = !tags.length;
}

// ---------- filtering & sorting ----------
const lastName = b => (mainNames(b).list[0]?.last || '~').toLowerCase();
const plainTitle = b => b.title.replace(/^(the|a|an)\s+/i, '').toLowerCase();

const SORTS = {
  title: (a, b) => plainTitle(a).localeCompare(plainTitle(b), undefined, { numeric: true }),
  author: (a, b) => lastName(a).localeCompare(lastName(b)) || plainTitle(a).localeCompare(plainTitle(b), undefined, { numeric: true }),
  newest: (a, b) => (b.year || 0) - (a.year || 0),
  oldest: (a, b) => (a.year || 9999) - (b.year || 9999),
  added: (a, b) => b.added.localeCompare(a.added),
};

function visible() {
  const words = view.q.toLowerCase().split(/\s+/).filter(Boolean);
  return books
    .filter(b => !view.tag || b.tags.includes(view.tag))
    .filter(b => {
      if (!words.length) return true;
      const hay = [b.title, authorLine(b), b.publisher, b.place, b.series, b.isbn, b.tags.join(' '), b.abstract].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    })
    .sort(SORTS[view.sort]);
}

// ---------- rendering ----------
function coverUrl(b) {
  return b.isbn ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-M.jpg?default=false` : '';
}

// A coloured "book spine" when there is no cover
function tile(b) {
  let h = 0;
  for (const ch of b.title) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `<div class="cover tile" style="--h:${h}"><span>${esc(b.shortTitle || b.title)}</span></div>`;
}

function coverHtml(b) {
  const url = coverUrl(b);
  return url ? `<img class="cover" src="${url}" alt="" loading="lazy" data-key="${esc(b.key)}">` : tile(b);
}

function render() {
  const list = visible();
  $('#books').innerHTML = list.length
    ? list
        .map(
          b => `
      <button type="button" class="book" data-key="${esc(b.key)}" aria-label="${esc(b.title)}, details">
        ${coverHtml(b)}
        <span class="b-title">${esc(b.title)}</span>
        <span class="b-author">${esc(authorLine(b))}${b.year ? ` · ${esc(b.year)}` : ''}</span>
      </button>`,
        )
        .join('')
    : `<p class="empty">${books.length ? 'No books match your search.' : 'No books yet. Add books to the Zotero library and press Refresh.'}</p>`;
  const filtered = list.length !== books.length;
  setStatus(filtered ? `${list.length} of ${books.length} books` : `${books.length} books`);
}

function setStatus(text, isError = false) {
  $('#status').textContent = text;
  $('#status').classList.toggle('error', isError);
}

function skeletons(n) {
  return Array.from({ length: n }, () => '<div class="book skeleton" aria-hidden="true"><div class="cover"></div></div>').join('');
}

// ---------- detail ----------
function showDetail(key) {
  const b = books.find(x => x.key === key);
  if (!b) return;
  const bib = bibliography(b);
  const note = footnote(b);
  const row = (label, value) => (value ? `<dt>${label}</dt><dd>${esc(value)}</dd>` : '');
  $('#detail-body').innerHTML = `
    <div class="d-top">
      ${coverHtml(b)}
      <div>
        <h2 id="d-title">${esc(b.title)}</h2>
        <p class="d-author">${esc(authorLine(b))}</p>
        <dl>
          ${row('Published', [b.place, b.publisher].filter(Boolean).join(': '))}
          ${row('Year', b.date || b.year)}
          ${row('Edition', b.edition)}
          ${row('Series', [b.series, b.seriesNumber].filter(Boolean).join(' '))}
          ${row('Pages', b.pages)}
          ${row('ISBN', b.isbn)}
          ${row('Language', b.language)}
        </dl>
      </div>
    </div>
    ${b.tags.length ? `<div class="tags">${b.tags.map(t => `<button type="button" class="tag" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    <h3>Summary</h3>
    <p class="${b.abstract ? '' : 'muted'}">${b.abstract ? esc(b.abstract) : 'No summary yet. Add one in the Abstract field in Zotero.'}</p>
    <h3>Turabian</h3>
    <p class="cite-label">Bibliography</p>
    <div class="cite"><p>${bib.html}</p><button type="button" class="ghost copy" data-copy="${esc(bib.text)}">Copy</button></div>
    <p class="cite-label">First footnote <span class="muted">(replace 00 with the page)</span></p>
    <div class="cite"><p>${note.html}</p><button type="button" class="ghost copy" data-copy="${esc(note.text)}">Copy</button></div>
    <div class="d-links">
      ${b.zoteroLink ? `<a href="${esc(b.zoteroLink)}" target="_blank" rel="noopener">View in Zotero ↗</a>` : ''}
      ${b.isbn ? `<a href="https://openlibrary.org/isbn/${esc(b.isbn)}" target="_blank" rel="noopener">Open Library ↗</a>` : ''}
      ${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">Web page ↗</a>` : ''}
    </div>`;
  if (!$('#detail').open) $('#detail').showModal();
  history.replaceState(null, '', `#book=${encodeURIComponent(key)}`);
}

function openFromHash() {
  const m = location.hash.match(/^#book=(.+)$/);
  if (m) showDetail(decodeURIComponent(m[1]));
}

// ---------- events ----------
let typing;
$('#search').addEventListener('input', e => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    view.q = e.target.value;
    render();
  }, 150);
});
$('#sort').addEventListener('change', e => {
  view.sort = e.target.value;
  render();
});
$('#tag').addEventListener('change', e => {
  view.tag = e.target.value;
  render();
});
$('#refresh').addEventListener('click', () => load({ force: true }));

$('#books').addEventListener('click', e => {
  const card = e.target.closest('.book[data-key]');
  if (card) showDetail(card.dataset.key);
});

$('#detail').addEventListener('click', async e => {
  if (e.target === $('#detail')) $('#detail').close(); // click on the backdrop
  const copy = e.target.closest('.copy');
  if (copy) {
    try {
      await navigator.clipboard.writeText(copy.dataset.copy);
      copy.textContent = 'Copied ✓';
    } catch {
      copy.textContent = 'Select and copy';
    }
  }
  const tag = e.target.closest('.tag');
  if (tag) {
    view.tag = tag.dataset.tag;
    $('#tag').value = view.tag;
    $('#detail').close();
    render();
  }
});

$('#detail').addEventListener('close', () => history.replaceState(null, '', location.pathname + location.search));

// Covers that Open Library does not have become a coloured tile
document.addEventListener(
  'error',
  e => {
    const img = e.target;
    if (img.tagName !== 'IMG' || !img.dataset.key) return;
    const b = books.find(x => x.key === img.dataset.key);
    if (!b) return;
    const t = document.createElement('template');
    t.innerHTML = tile(b);
    img.replaceWith(t.content.firstChild);
  },
  true,
);

// ---------- views: Zotero shelf / PhD coursework ----------
const cwState = { q: '', course: '', kind: '' };
let cwShown = [];

function showView() {
  const view = location.hash.startsWith('#coursework') ? 'coursework' : 'shelf';
  $('#view-shelf').hidden = view !== 'shelf';
  $('#shelf-toolbar').hidden = view !== 'shelf';
  $('#view-coursework').hidden = view !== 'coursework';
  document.querySelectorAll('.switch a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  if (view === 'coursework') renderCw();
}

function renderCw() {
  cwShown = cw.renderCoursework($('#cw-list'), cwState);
  const n = cwShown.length;
  $('#cw-status').textContent = n === cw.items.length ? `${n} readings across ${cw.courses.length} courses` : `${n} of ${cw.items.length} readings`;
  $('#cw-export').disabled = !n;
}

$('#cw-count').textContent = `(${cw.items.length})`;
$('#cw-course').innerHTML += cw.courses
  .map(c => `<option value="${esc(c.id)}">${esc(c.code)} ${esc(c.name)}</option>`)
  .join('');

let cwTyping;
$('#cw-q').addEventListener('input', e => {
  clearTimeout(cwTyping);
  cwTyping = setTimeout(() => {
    cwState.q = e.target.value;
    renderCw();
  }, 150);
});
$('#cw-course').addEventListener('change', e => {
  cwState.course = e.target.value;
  renderCw();
});
$('#cw-kind').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  cwState.kind = b.dataset.kind;
  document.querySelectorAll('#cw-kind button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  renderCw();
});
$('#cw-list').addEventListener('click', async e => {
  const copy = e.target.closest('.copy');
  if (!copy) return;
  try {
    await navigator.clipboard.writeText(copy.dataset.copy);
    copy.textContent = 'Copied ✓';
  } catch {
    copy.textContent = 'Select and copy';
  }
});
$('#cw-export').addEventListener('click', () => {
  const course = cw.courses.find(c => c.id === cwState.course);
  const name = course ? course.code.replace(/\s+/g, '') : 'PhD-coursework';
  const blob = new Blob([cw.toRis(cwShown)], { type: 'application/x-research-info-systems' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${name}-reading-list.ris` });
  a.click();
  URL.revokeObjectURL(a.href);
});
window.addEventListener('hashchange', () => {
  if (!location.hash.startsWith('#book=')) showView();
});

showView();
load();
