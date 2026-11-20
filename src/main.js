import { cachedBooks, fetchAllBooks } from './js/zotero.js';
import {
  esc,
  authorLine,
  mainNames,
  bibliography,
  footnote,
} from './js/cite.js';

const $ = sel => document.querySelector(sel);
let books = [];
let folders = [];
const view = { q: '', sort: 'title', tag: '', folder: '', status: '', req: '' };

// Tags that record where a reading is in my work, rather than its subject
const STATUS = ['★ Key source', 'To read', 'Read', 'Cited in dissertation'];
const isStatus = t => STATUS.includes(t);
// Course tags from the imported syllabi: "RES 9103", plus "RES 9103 required" or "RES 9103 recommended"
const COURSE_TAG = /^[A-Z]{3} \d{4}( required| recommended)?$/;
const subjects = b => b.tags.filter(t => !isStatus(t) && !COURSE_TAG.test(t));
const courseOf = name => (String(name).match(/^[A-Z]{3} \d{4}/) || [''])[0];
const TYPE_LABEL = {
  journalArticle: 'Article',
  bookSection: 'Chapter',
  thesis: 'Thesis',
  webpage: 'Web page',
  report: 'Report',
  videoRecording: 'Video',
  magazineArticle: 'Article',
  blogPost: 'Web page',
};
const isWritten = b => /claude/i.test(b.summarySource);

// ---------- loading ----------
async function load({ force = false } = {}) {
  const cache = force ? null : cachedBooks();
  if (cache) {
    setBooks(cache.books, cache.savedAt, cache.folders);
    return;
  }
  $('#refresh').disabled = true;
  if (!books.length) {
    $('#books').innerHTML = skeletons(8);
  }
  setStatus('Loading your library from Zotero…');
  try {
    const fresh = await fetchAllBooks(n =>
      setStatus(`Loading your library from Zotero… ${n}`)
    );
    setBooks(fresh.books, fresh.savedAt, fresh.folders);
  } catch (err) {
    setStatus(`Could not load the library: ${err.message}`, true);
    if (!books.length) {
      $('#books').innerHTML = '';
    }
  } finally {
    $('#refresh').disabled = false;
  }
}

function setBooks(list, savedAt, folderList = []) {
  books = list;
  folders = folderList;
  fillTags();
  fillFolders();
  render();
  $('#refresh').title = `Last loaded ${new Date(savedAt).toLocaleString()}`;
  openFromHash();
}

function fillTags() {
  const counts = new Map();
  for (const b of books) {
    for (const t of subjects(b)) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  const tags = [...counts].sort((a, b) => a[0].localeCompare(b[0]));
  $('#tag').innerHTML =
    '<option value="">All subjects</option>' +
    tags
      .map(
        ([t, n]) =>
          `<option value="${esc(t)}" ${t === view.tag ? 'selected' : ''}>${esc(t)} (${n})</option>`
      )
      .join('');
  $('#tag').parentElement.hidden = !tags.length;
}

// ---------- folders ----------
const children = key =>
  folders
    .filter(f => f.parent === key)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
function withDescendants(key) {
  const keys = new Set([key]);
  for (const c of children(key)) {
    for (const k of withDescendants(c.key)) {
      keys.add(k);
    }
  }
  return keys;
}
function folderPath(key) {
  const names = [];
  for (
    let f = folders.find(x => x.key === key);
    f;
    f = folders.find(x => x.key === f.parent)
  ) {
    names.unshift(f.name);
  }
  return names.join(' › ');
}
function fillFolders() {
  const count = key => {
    const keys = withDescendants(key);
    return books.filter(b => b.folders.some(k => keys.has(k))).length;
  };
  const options = (parent, depth) =>
    children(parent)
      .map(
        f =>
          `<option value="${esc(f.key)}" ${f.key === view.folder ? 'selected' : ''}>${'\u2003'.repeat(depth)}${esc(f.name)} (${count(f.key)})</option>` +
          (depth < 2 ? options(f.key, depth + 1) : '')
      )
      .join('');
  $('#folder').innerHTML =
    '<option value="">Whole library</option>' + options('', 0);
  $('#folder').parentElement.hidden = !folders.length;
}

// ---------- required / recommended (coursework folders only) ----------
// The courses the chosen folder covers: one course, all of them, or none.
function coursesInView() {
  if (!view.folder) {return null;}
  const path = folderPath(view.folder);
  const code = path.split(' › ').map(courseOf).find(Boolean);
  if (code) {return [code];}
  return /PhD coursework/i.test(path) ? 'all' : null;
}
function readingKind(b) {
  const courses = coursesInView();
  if (!courses) {return '';}
  const tags = b.tags.filter(t => COURSE_TAG.test(t) && (courses === 'all' || courses.includes(courseOf(t))));
  if (tags.some(t => t.endsWith(' required'))) {
    return 'required';
  }
  return tags.some(t => t.endsWith(' recommended')) ? 'recommended' : '';
}
function updateReqChips() {
  const show = !!coursesInView();
  $('#req-chips').hidden = !show;
  if (!show && view.req) {setReq('');}
}
function setReq(req) {
  view.req = req;
  document.querySelectorAll('#req-chips button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.req === req)));
}

// ---------- filtering & sorting ----------
const lastName = b => (mainNames(b).list[0]?.last || '~').toLowerCase();
const plainTitle = b => b.title.replace(/^(the|a|an)\s+/i, '').toLowerCase();

const SORTS = {
  title: (a, b) =>
    plainTitle(a).localeCompare(plainTitle(b), undefined, { numeric: true }),
  author: (a, b) =>
    lastName(a).localeCompare(lastName(b)) ||
    plainTitle(a).localeCompare(plainTitle(b), undefined, { numeric: true }),
  newest: (a, b) => (b.year || 0) - (a.year || 0),
  oldest: (a, b) => (a.year || 9999) - (b.year || 9999),
  added: (a, b) => b.added.localeCompare(a.added),
};

function visible() {
  const words = view.q.toLowerCase().split(/\s+/).filter(Boolean);
  const inFolder = view.folder ? withDescendants(view.folder) : null;
  return books
    .filter(b => !inFolder || b.folders.some(k => inFolder.has(k)))
    .filter(b => !view.tag || b.tags.includes(view.tag))
    .filter(b => !view.status || b.tags.includes(view.status))
    .filter(b => !view.req || readingKind(b) === view.req)
    .filter(b => {
      if (!words.length) {
        return true;
      }
      const hay = [
        b.title,
        authorLine(b),
        b.publisher,
        b.place,
        b.series,
        b.container,
        b.isbn,
        b.tags.join(' '),
        b.abstract,
      ]
        .join(' ')
        .toLowerCase();
      return words.every(w => hay.includes(w));
    })
    .sort(SORTS[view.sort]);
}

// ---------- rendering ----------
function coverUrl(b) {
  if (b.cover) {
    return b.cover;
  }
  return b.isbn
    ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-M.jpg?default=false`
    : '';
}

// A coloured "book spine" when there is no cover
function tile(b) {
  let h = 0;
  for (const ch of b.title) {
    h = (h * 31 + ch.charCodeAt(0)) % 360;
  }
  return `<div class="cover tile" style="--h:${h}"><span>${esc(b.shortTitle || b.title)}</span></div>`;
}

function coverHtml(b) {
  const url = coverUrl(b);
  return url
    ? `<img class="cover" src="${url}" alt="" loading="lazy" data-key="${esc(b.key)}">`
    : tile(b);
}

function render() {
  const list = visible();
  $('#books').innerHTML = list.length
    ? list
        .map(
          b => `
      <button type="button" class="book" data-key="${esc(b.key)}" aria-label="${esc(b.title)}, details">
        ${coverHtml(b)}
        ${b.tags.includes('★ Key source') ? '<span class="badge key" title="Key source">★</span>' : ''}
        ${TYPE_LABEL[b.type] ? `<span class="b-type">${TYPE_LABEL[b.type]}</span>` : ''}
        <span class="b-title">${esc(b.title)}</span>
        <span class="b-author">${esc(authorLine(b))}${b.year ? ` · ${esc(b.year)}` : ''}</span>
      </button>`
        )
        .join('')
    : `<p class="empty">${books.length ? 'Nothing matches. Try another folder, subject or status.' : 'Nothing here yet. Add items to the Zotero library and press Refresh.'}</p>`;
  const filtered = list.length !== books.length;
  const where = view.folder ? ` in ${folderPath(view.folder)}` : '';
  setStatus(
    filtered
      ? `${list.length} of ${books.length} items${where}`
      : `${books.length} items`
  );
}

function setStatus(text, isError = false) {
  $('#status').textContent = text;
  $('#status').classList.toggle('error', isError);
}

function skeletons(n) {
  return Array.from(
    { length: n },
    () =>
      '<div class="book skeleton" aria-hidden="true"><div class="cover"></div></div>'
  ).join('');
}

// ---------- detail ----------
function showDetail(key) {
  const b = books.find(x => x.key === key);
  if (!b) {
    return;
  }
  const bib = bibliography(b);
  const note = footnote(b);
  const row = (label, value) =>
    value ? `<dt>${label}</dt><dd>${esc(value)}</dd>` : '';
  $('#detail-body').innerHTML = `
    <div class="d-top">
      ${coverHtml(b)}
      <div>
        <h2 id="d-title">${esc(b.title)}</h2>
        <p class="d-author">${esc(authorLine(b))}</p>
        <dl>
          ${row('Type', TYPE_LABEL[b.type] || '')}
          ${row(b.type === 'bookSection' ? 'In' : b.type === 'webpage' ? 'Website' : 'Journal', b.container)}
          ${row('Volume', [b.volume, b.issue ? `no. ${b.issue}` : ''].filter(Boolean).join(', '))}
          ${row('Pages', b.pageRange)}
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
    ${
      b.tags.filter(isStatus).length
        ? `<div class="tags">${b.tags
            .filter(isStatus)
            .map(
              t =>
                `<button type="button" class="tag status" data-status="${esc(t)}">${esc(t)}</button>`
            )
            .join('')}</div>`
        : ''
    }
    ${
      subjects(b).length
        ? `<div class="tags">${subjects(b)
            .map(
              t =>
                `<button type="button" class="tag" data-tag="${esc(t)}">${esc(t)}</button>`
            )
            .join('')}</div>`
        : ''
    }
    ${b.tags.some(t => / (required|recommended)$/.test(t)) ? `<p class="muted small">Coursework: ${b.tags.filter(t => COURSE_TAG.test(t) && / (required|recommended)$/.test(t)).map(t => `${esc(courseOf(t))} (${t.endsWith('recommended') ? 'recommended' : 'required'})`).join(' · ')}</p>` : ''}
    ${b.folders.length ? `<p class="folders muted small">In ${b.folders.map(k => `<button type="button" class="folder-link" data-folder="${esc(k)}">${esc(folderPath(k))}</button>`).join(' · ')}</p>` : ''}
    <h3>Summary</h3>
    <p class="summary ${b.abstract ? '' : 'muted'}">${b.abstract ? esc(b.abstract) : 'No summary yet. Add one in the Abstract field in Zotero.'}</p>
    ${isWritten(b) ? '<p class="muted small">Written summary, not the publisher\'s description. Check it before relying on it.</p>' : b.summarySource ? `<p class="muted small">Summary from ${esc(b.summarySource)}</p>` : ''}
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
  if (!$('#detail').open) {
    $('#detail').showModal();
  }
  history.replaceState(null, '', `#book=${encodeURIComponent(key)}`);
}

function openFromHash() {
  const m = location.hash.match(/^#book=(.+)$/);
  if (m) {
    showDetail(decodeURIComponent(m[1]));
  }
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
$('#folder').addEventListener('change', e => {
  view.folder = e.target.value;
  updateReqChips();
  render();
});
$('#req-chips').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) {
    return;
  }
  setReq(b.dataset.req);
  render();
});
function setStatusFilter(status) {
  view.status = status;
  document
    .querySelectorAll('#status-chips button')
    .forEach(x =>
      x.setAttribute('aria-pressed', String(x.dataset.status === status))
    );
  render();
}
$('#status-chips').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) {
    setStatusFilter(b.dataset.status);
  }
});
$('#refresh').addEventListener('click', () => load({ force: true }));

$('#books').addEventListener('click', e => {
  const card = e.target.closest('.book[data-key]');
  if (card) {
    showDetail(card.dataset.key);
  }
});

$('#detail').addEventListener('click', async e => {
  if (e.target === $('#detail')) {
    $('#detail').close();
  } // click on the backdrop
  const copy = e.target.closest('.copy');
  if (copy) {
    try {
      await navigator.clipboard.writeText(copy.dataset.copy);
      copy.textContent = 'Copied ✓';
    } catch {
      copy.textContent = 'Select and copy';
    }
  }
  const st = e.target.closest('.tag.status');
  if (st) {
    $('#detail').close();
    setStatusFilter(st.dataset.status);
    return;
  }
  const fl = e.target.closest('.folder-link');
  if (fl) {
    view.folder = fl.dataset.folder;
    $('#folder').value = view.folder;
    updateReqChips();
    $('#detail').close();
    render();
    return;
  }
  const tag = e.target.closest('.tag');
  if (tag) {
    view.tag = tag.dataset.tag;
    $('#tag').value = view.tag;
    $('#detail').close();
    render();
  }
});

$('#detail').addEventListener('close', () =>
  history.replaceState(null, '', location.pathname + location.search)
);

// Covers that Open Library does not have become a coloured tile
document.addEventListener(
  'error',
  e => {
    const img = e.target;
    if (img.tagName !== 'IMG' || !img.dataset.key) {
      return;
    }
    const b = books.find(x => x.key === img.dataset.key);
    if (!b) {
      return;
    }
    const t = document.createElement('template');
    t.innerHTML = tile(b);
    img.replaceWith(t.content.firstChild);
  },
  true
);

load();
