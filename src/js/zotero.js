// Loads every item in the Zotero library (100 at a time) and its folders,
// and keeps a copy in localStorage so the page opens instantly next time.

import { ZOTERO_USER_ID, ZOTERO_API_KEY } from './config.js';

const CACHE_KEY = `bookhub.library.v2.${ZOTERO_USER_ID}`;
const CACHE_HOURS = 6;
const PAGE = 100;

export function cachedBooks() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && Date.now() - c.savedAt < CACHE_HOURS * 3600e3) {
      return c;
    }
  } catch {
    /* ignore a broken cache */
  }
  return null;
}

export async function fetchAllBooks(onProgress = () => {}) {
  const headers = { 'Zotero-API-Version': '3' };
  if (ZOTERO_API_KEY) {
    headers['Zotero-API-Key'] = ZOTERO_API_KEY;
  }

  const getAll = async (path, each) => {
    const out = [];
    for (let start = 0; ; start += PAGE) {
      const res = await fetch(
        `https://api.zotero.org/users/${ZOTERO_USER_ID}/${path}&format=json&limit=${PAGE}&start=${start}`,
        { headers }
      );
      if (res.status === 403) {
        throw new Error(
          'Zotero refused access. Make the library public or check the API key.'
        );
      }
      if (!res.ok) {
        throw new Error(`Zotero answered with an error (${res.status}).`);
      }
      const page = await res.json();
      out.push(...page);
      each(out.length);
      if (page.length < PAGE) {
        return out;
      }
    }
  };

  const items = await getAll(
    'items/top?itemType=-attachment&sort=title',
    onProgress
  );
  const books = items.filter(it => it.data?.itemType !== 'note').map(toBook);
  const cols = await getAll('collections?sort=title', () => {});
  const folders = cols.map(c => ({
    key: c.key,
    name: c.data.name,
    parent: c.data.parentCollection || '',
  }));

  const library = { savedAt: Date.now(), books, folders };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(library));
  } catch {
    /* storage full: fine, just no cache */
  }
  return library;
}

function toBook(item) {
  const d = item.data || {};
  const creators = (d.creators || []).map(c => ({
    role: c.creatorType || 'author',
    first: c.firstName || '',
    last: c.lastName || c.name || '',
  }));
  const isbn = cleanIsbn(
    d.ISBN ||
      (d.extra || '').match(/ISBN(?:-1[03])?:?\s*([\dXx-]{10,17})/)?.[1] ||
      ''
  );
  return {
    key: item.key,
    type: d.itemType || 'book',
    title: d.title || 'Untitled',
    shortTitle: d.shortTitle || '',
    creators,
    year: (d.date || '').match(/\d{4}/)?.[0] || '',
    date: d.date || '',
    publisher: d.publisher || d.university || d.institution || '',
    place: d.place || '',
    edition: d.edition || '',
    series: d.series || '',
    seriesNumber: d.seriesNumber || '',
    pages: d.numPages || '',
    pageRange: d.pages || '',
    container: d.publicationTitle || d.bookTitle || d.websiteTitle || '',
    volume: d.volume || '',
    issue: d.issue || '',
    university: d.university || d.institution || '',
    thesisType: d.thesisType || d.reportType || '',
    isbn,
    language: d.language || '',
    abstract: d.abstractNote || '',
    summarySource:
      (d.extra || '').match(/^Summary source:\s*(.+)$/m)?.[1] || '',
    cover: (d.extra || '').match(/^Cover:\s*(\S+)/m)?.[1] || '',
    url: d.url || '',
    tags: (d.tags || []).map(t => t.tag).filter(Boolean),
    folders: d.collections || [],
    added: d.dateAdded || '',
    zoteroLink: item.links?.alternate?.href || '',
  };
}

// First ISBN in the field, digits and X only (Zotero allows several, space-separated)
function cleanIsbn(raw) {
  const first =
    String(raw)
      .trim()
      .split(/[\s,;]+/)[0] || '';
  return first.replace(/[^\dXx]/g, '').toUpperCase();
}
