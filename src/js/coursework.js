// The reading lists from each PhD course syllabus, shipped with the app.
import data from '../data/coursework.json';
import { esc } from './cite.js';

export const courses = data.courses;
export const items = data.items;
const byCourse = new Map(courses.map(c => [c.id, c]));

const norm = s => String(s || '').toLowerCase().replace(/^(the|a|an)\s+/, '').split(/[:.(]/)[0].replace(/[^a-z0-9]+/g, ' ').trim();

// Titles already in the Zotero library, for the "In my Zotero" mark
let owned = new Set();
export function setOwned(books) {
  owned = new Set(books.map(b => norm(b.title)));
}
const inZotero = it => owned.has(norm(it.title));

export function findLink(it) {
  const url = (it.pub.match(/https?:\/\/\S+/) || [])[0];
  if (url) return url.replace(/\.$/, '');
  const q = `${it.title} ${it.authors[0]?.split(',')[0] || ''}`;
  if (it.type === 'book' || it.type === 'reader') return `https://openlibrary.org/search?q=${encodeURIComponent(q)}`;
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(`"${it.title}"`)}`;
}

export function filterItems({ q = '', course = '', kind = '' }) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(it => {
    if (course && !it.courses[course]) return false;
    if (kind && !Object.entries(it.courses).some(([c, k]) => (!course || c === course) && k === kind)) return false;
    return words.every(w => it.cite.toLowerCase().includes(w));
  });
}

function row(it, course) {
  const marks = Object.entries(it.courses)
    .filter(([c]) => c !== course)
    .map(([c]) => `<span class="also">also ${esc(byCourse.get(c)?.code || c)}</span>`)
    .join('');
  const kind = it.courses[course];
  return `<li class="cw-item ${kind}">
    <span class="cw-kind ${kind}">${kind === 'required' ? 'Required' : 'Recommended'}</span>
    <p class="cw-cite">${it.citeHtml}</p>
    <div class="cw-actions">
      <a href="${esc(findLink(it))}" target="_blank" rel="noopener">Find ↗</a>
      <button type="button" class="ghost copy" data-copy="${esc(it.cite)}">Copy</button>
      ${inZotero(it) ? '<span class="owned">In my Zotero ✓</span>' : ''}
      ${marks}
    </div>
  </li>`;
}

export function renderCoursework(el, opts) {
  const list = filterItems(opts);
  const shown = opts.course ? courses.filter(c => c.id === opts.course) : courses;
  let html = '';
  for (const c of shown) {
    const mine = list
      .filter(it => it.courses[c.id] && (!opts.kind || it.courses[c.id] === opts.kind))
      .sort((a, b) => (a.courses[c.id] === b.courses[c.id] ? 0 : a.courses[c.id] === 'required' ? -1 : 1));
    if (!mine.length) continue;
    const req = mine.filter(it => it.courses[c.id] === 'required').length;
    html += `<section class="cw-course">
      <h2><span class="code">${esc(c.code)}</span> ${esc(c.name)}</h2>
      <p class="cw-meta">${esc(c.professor)} · ${esc(c.year)} · ${req} required, ${mine.length - req} recommended</p>
      <ol class="cw-items">${mine.map(it => row(it, c.id)).join('')}</ol>
    </section>`;
  }
  el.innerHTML = html || '<p class="empty">Nothing in the reading lists matches that search.</p>';
  return list;
}

const RIS = { book: 'BOOK', reader: 'BOOK', article: 'JOUR', chapter: 'CHAP', dissertation: 'THES', web: 'ELEC', video: 'VIDEO' };

export function toRis(list) {
  return list
    .map(it => {
      const m = it.title.match(/^(.*?)\.\s*(\d+(?:st|nd|rd|th) ed\.|Rev\. ed\.|Updated ed\.|\d+ vols\.)(.*)$/i);
      const L = [`TY  - ${RIS[it.type] || 'GEN'}`, `TI  - ${m ? m[1] : it.title}`];
      if (m) L.push(`ET  - ${m[2]}`);
      for (const a of it.authors) L.push(`${it.role ? 'A2' : 'AU'}  - ${a}`);
      if (it.year) L.push(`PY  - ${it.year}`);
      const pub = it.pub.replace(/\s*https?:\/\/\S+/, '').trim();
      if (it.type === 'article') {
        L.push(`JO  - ${pub.split(/\s\d/)[0]}`);
      } else if (pub.includes(':') && (it.type === 'book' || it.type === 'reader')) {
        const [place, publisher] = pub.split(/:\s*/, 2);
        L.push(`CY  - ${place}`, `PB  - ${publisher}`);
      } else if (pub) {
        L.push(`N1  - ${pub}`);
      }
      const url = (it.pub.match(/https?:\/\/\S+/) || [])[0];
      if (url) L.push(`UR  - ${url.replace(/\.$/, '')}`);
      for (const c of Object.keys(it.courses)) L.push(`KW  - ${byCourse.get(c)?.code || c}`);
      L.push('ER  - ');
      return L.join('\r\n');
    })
    .join('\r\n\r\n');
}
