// Turabian (Chicago notes-bibliography) entries for books, chapters, articles,
// theses and web pages.

export function esc(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[
        c
      ]
  );
}

const people = (book, role) => book.creators.filter(c => c.role === role);
const full = c => `${c.first} ${c.last}`.trim();
const inverted = c => (c.first ? `${c.last}, ${c.first}` : c.last);
const end = s => (/[.?!]$/.test(s) ? s : `${s}.`);

function joinNames(list, firstInverted) {
  const names = list.map((c, i) =>
    i === 0 && firstInverted ? inverted(c) : full(c)
  );
  if (names.length <= 1) {
    return names[0] || '';
  }
  if (names.length === 2) {
    return `${names[0]}${firstInverted ? ',' : ''} and ${names[1]}`;
  }
  if (names.length > 10) {
    return `${names.slice(0, 7).join(', ')}, et al`;
  }
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

// Main names for the entry: authors, or editors if there are no authors.
export function mainNames(book) {
  const authors = people(book, 'author');
  if (authors.length) {
    return { list: authors, editors: false };
  }
  return { list: people(book, 'editor'), editors: true };
}

export function authorLine(book) {
  const { list, editors } = mainNames(book);
  if (!list.length) {
    return 'Unknown author';
  }
  return (
    list.map(full).join(', ') +
    (editors ? (list.length > 1 ? ', eds.' : ', ed.') : '')
  );
}

function pubFacts(book) {
  const pub = [book.place, book.publisher].filter(Boolean).join(': ');
  return [pub, book.year].filter(Boolean).join(', ');
}

function edition(book) {
  if (!book.edition) {
    return '';
  }
  return /^\d+$/.test(book.edition)
    ? `${ordinal(book.edition)} ed.`
    : book.edition;
}

function ordinal(n) {
  const v = n % 100;
  return (
    n +
    (['th', 'st', 'nd', 'rd'][(v - 20) % 10] ||
      ['th', 'st', 'nd', 'rd'][v] ||
      'th')
  );
}

// Bibliography: Last, First. Title. Ed. Place: Publisher, Year.
export function bibliography(book) {
  if (book.type in OTHER) {
    return OTHER[book.type](book, 'bib');
  }
  const { list, editors } = mainNames(book);
  let who = joinNames(list, true);
  if (who && editors) {
    who += list.length > 1 ? ', eds' : ', ed';
  }
  const parts = [
    edition(book),
    book.series
      ? `${book.series}${book.seriesNumber ? ` ${book.seriesNumber}` : ''}`
      : '',
    pubFacts(book),
  ]
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
  if (book.type in OTHER) {
    return OTHER[book.type](book, 'note');
  }
  const { list, editors } = mainNames(book);
  let who = joinNames(list, false);
  if (who && editors) {
    who += list.length > 1 ? ', eds.' : ', ed.';
  }
  const facts = pubFacts(book);
  const ed = edition(book);
  const inner = [ed, facts].filter(Boolean).join('; ');
  const plain = `${who ? `${who}, ` : ''}${book.title}${inner ? ` (${inner})` : ''}, 00.`;
  const html = `${who ? `${esc(who)}, ` : ''}<i>${esc(book.title)}</i>${inner ? ` (${esc(inner)})` : ''}, 00.`;
  return { text: plain, html };
}

// ---------- other item types ----------
const q = s => `“${s}”`;
const editorsOf = book => people(book, 'editor');

function article(b, mode) {
  const who = joinNames(people(b, 'author'), mode === 'bib');
  const issue = [b.volume, b.issue ? `no. ${b.issue}` : '']
    .filter(Boolean)
    .join(', ');
  if (mode === 'bib') {
    const tail = `${issue}${b.year ? ` (${b.year})` : ''}${b.pageRange ? `: ${b.pageRange}` : ''}.`;
    return {
      text: `${who ? `${end(who)} ` : ''}${q(end(b.title))} ${b.container} ${tail}`
        .replace(/\s+/g, ' ')
        .trim(),
      html: `${who ? `${esc(end(who))} ` : ''}${esc(q(end(b.title)))} <i>${esc(b.container)}</i> ${esc(tail)}`
        .replace(/\s+/g, ' ')
        .trim(),
    };
  }
  const tail = `${issue}${b.year ? ` (${b.year})` : ''}: 00.`;
  return {
    text: `${who ? `${who}, ` : ''}${q(`${b.title},`)} ${b.container} ${tail}`
      .replace(/\s+/g, ' ')
      .trim(),
    html: `${who ? `${esc(who)}, ` : ''}${esc(q(`${b.title},`))} <i>${esc(b.container)}</i> ${esc(tail)}`
      .replace(/\s+/g, ' ')
      .trim(),
  };
}

function chapter(b, mode) {
  const who = joinNames(people(b, 'author'), mode === 'bib');
  const eds = editorsOf(b).map(full);
  const ed = eds.length ? `, edited by ${eds.join(' and ')}` : '';
  const facts = pubFacts(b);
  if (mode === 'bib') {
    const tail = `${b.pageRange ? `, ${b.pageRange}` : ''}. ${facts}.`;
    return {
      text: `${who ? `${end(who)} ` : ''}${q(end(b.title))} In ${b.container}${ed}${tail}`.trim(),
      html: `${who ? `${esc(end(who))} ` : ''}${esc(q(end(b.title)))} In <i>${esc(b.container)}</i>${esc(ed)}${esc(tail)}`.trim(),
    };
  }
  return {
    text: `${who ? `${who}, ` : ''}${q(`${b.title},`)} in ${b.container}${ed} (${facts}), 00.`,
    html: `${who ? `${esc(who)}, ` : ''}${esc(q(`${b.title},`))} in <i>${esc(b.container)}</i>${esc(ed)} (${esc(facts)}), 00.`,
  };
}

function thesis(b, mode) {
  const who = joinNames(people(b, 'author'), mode === 'bib');
  const kind = b.thesisType || 'PhD diss.';
  const facts = [kind, b.university || b.publisher, b.year]
    .filter(Boolean)
    .join(', ');
  if (mode === 'bib') {
    return {
      text: `${who ? `${end(who)} ` : ''}${q(end(b.title))} ${end(facts)}`.trim(),
      html: `${who ? `${esc(end(who))} ` : ''}${esc(q(end(b.title)))} ${esc(end(facts))}`.trim(),
    };
  }
  return {
    text: `${who ? `${who}, ` : ''}${q(b.title)} (${facts}), 00.`,
    html: `${who ? `${esc(who)}, ` : ''}${esc(q(b.title))} (${esc(facts)}), 00.`,
  };
}

function webpage(b, mode) {
  const who = joinNames(people(b, 'author'), mode === 'bib');
  const site = b.container ? `${b.container}${mode === 'bib' ? '.' : ','}` : '';
  const when = b.date || b.year;
  if (mode === 'bib') {
    const tail = [site, when ? end(when) : '', b.url].filter(Boolean).join(' ');
    return {
      text: `${who ? `${end(who)} ` : ''}${q(end(b.title))} ${tail}`.trim(),
      html: `${who ? `${esc(end(who))} ` : ''}${esc(q(end(b.title)))} ${esc(tail)}`.trim(),
    };
  }
  const tail = [site, when ? `${when},` : '', b.url].filter(Boolean).join(' ');
  return {
    text: `${who ? `${who}, ` : ''}${q(`${b.title},`)} ${tail}.`.replace(
      /,\.$/,
      '.'
    ),
    html: `${who ? `${esc(who)}, ` : ''}${esc(q(`${b.title},`))} ${esc(tail)}.`.replace(
      /,\.$/,
      '.'
    ),
  };
}

const OTHER = {
  journalArticle: article,
  magazineArticle: article,
  bookSection: chapter,
  thesis,
  webpage,
  blogPost: webpage,
};
