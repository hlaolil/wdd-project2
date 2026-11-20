# BookHub

My Zotero library (books, articles, chapters, theses and web pages) shown as a bookshelf with covers, summaries and ready-made Turabian citations, organised by my Zotero folders, subjects and reading status.

- Live: https://hlaolil.github.io/wdd130/books/

## What it does

- Loads **every** item in the Zotero library and its folders (100 at a time) and keeps a copy in the browser for 6 hours, so it opens instantly; **Refresh from Zotero** reloads it.
- **Search** across title, author, publisher, series, ISBN, subjects (Zotero tags) and summary.
- **Sort** by title, author, newest, oldest or recently added; **filter by subject**.
- **Covers** from Open Library by ISBN (no API key); books without one get a coloured spine with the title.
- **Filters**: by **folder** (01 Dissertation, 02 Comprehensive exams, 03 PhD coursework, 04 Teaching & ministry and their sub-folders), by **subject** tag, and by **status**: ★ Key source, To read, Read and Cited in dissertation. Key sources get a ★ badge on the shelf.
- **Details**: publication facts (journal, volume and pages for articles), status and subject tags, the folders it sits in, the Zotero abstract as summary, with a note when the summary is a written one rather than the publisher's, and Turabian bibliography and first-footnote entries (for books, chapters, articles, theses and web pages) with Copy buttons. Each book has its own link (`#book=KEY`).

## PhD coursework reading lists

The **PhD coursework** view lists the required and recommended readings from each PAThS course syllabus (BTH 9053, BTH 9103, BTH 9153, LDR 9053, MIS 9103, RES 9103, RES 9153, EDL 9053), grouped by course, with Turabian entries, Find and Copy buttons, an "In my Zotero" mark for books already in the library, and an export of any selection to a `.ris` file for Zotero.
The lists live in `src/data/coursework.json`.

## Settings

`src/js/config.js` holds the Zotero user ID and an optional API key.
If the library is public in Zotero (Settings → Privacy → Publish entire library) leave the key empty.
Any key placed there is visible to everyone who opens the site, so use a **read-only** key made just for this site.

## Run it

```
npm install
npm start        # local server
npm run build    # production files in dist/
```

Originally built for WDD 330 (Web Frontend Development II), BYU-Pathway Worldwide.
