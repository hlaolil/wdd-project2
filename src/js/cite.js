// Turabian (Chicago notes-bibliography) entries for a book.

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const people = (book, role) => book.creators.filter(c => c.role === role);
const full = c => `${c.first} ${c.last}`.trim();
const inverted = c => (c.first ? `${c.last}, ${c.first}` : c.last);
const end = s => (/[.?!]$/.test(s) ? s : `${s}.`);

function joinNames(list, firstInverted) {
  const names = list.map((c, i) => (i === 0 && firstInverted ? inverted(c) : full(c)));
  if (names.length <= 1) return names[0] || '';
  if (names.length === 2) return `${names[0]}${firstInverted ? ',' : ''} and ${names[1]}`;
  if (names.length > 10) return `${names.slice(0, 7).join(', ')}, et al`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

// Main names for the entry: authors, or editors if there are no authors.
export function mainNames(book) {
  const authors = people(book, 'author');
  if (authors.length) return { list: authors, editors: false };
  return { list: people(book, 'editor'), editors: true };
}

export function authorLine(book) {
  const { list, editors } = mainNames(book);
  if (!list.length) return 'Unknown author';
  return list.map(full).join(', ') + (editors ? (list.length > 1 ? ', eds.' : ', ed.') : '');
}

function pubFacts(book) {
  const pub = [book.place, book.publisher].filter(Boolean).join(': ');
  return [pub, book.year].filter(Boolean).join(', ');
}

function edition(book) {
  if (!book.edition) return '';
  return /^\d+$/.test(book.edition) ? `${ordinal(book.edition)} ed.` : book.edition;
}

function ordinal(n) {
  const v = n % 100;
  return n + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th');
}

// Bibliography: Last, First. Title. Ed. Place: Publisher, Year.
export function bibliography(book) {
  const { list, editors } = mainNames(book);
  let who = joinNames(list, true);
  if (who && editors) who += list.length > 1 ? ', eds' : ', ed';
  const parts = [edition(book), book.series ? `${book.series}${book.seriesNumber ? ` ${book.seriesNumber}` : ''}` : '', pubFacts(book)]
    .filter(Boolean)
    .map(end);
  const tail = parts.join(' ');
  return {
    text: `${who ? `${end(who)} ` : ''}${end(book.title)} ${tail}`.trim(),
    html: `${who ? `${esc(end(who))} ` : ''}<i>${esc(end(book.title))}</i> ${esc(tail)}`.trim(),
  };
}

// First footnote: First Last, Title (Place: Publisher, Year), page.
export function footnote(book) {
  const { list, editors } = mainNames(book);
  let who = joinNames(list, false);
  if (who && editors) who += list.length > 1 ? ', eds.' : ', ed.';
  const facts = pubFacts(book);
  const ed = edition(book);
  const inner = [ed, facts].filter(Boolean).join('; ');
  const plain = `${who ? `${who}, ` : ''}${book.title}${inner ? ` (${inner})` : ''}, 00.`;
  const html = `${who ? `${esc(who)}, ` : ''}<i>${esc(book.title)}</i>${inner ? ` (${esc(inner)})` : ''}, 00.`;
  return { text: plain, html };
}
