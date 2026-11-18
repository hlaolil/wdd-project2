# BookHub

The books in my Zotero library, shown as a bookshelf with covers, summaries and ready-made Turabian citations.

- Live: https://hlaolil.github.io/wdd130/books/

## What it does

- Loads **every** book in the Zotero library (100 at a time) and keeps a copy in the browser for 6 hours, so it opens instantly; **Refresh from Zotero** reloads it.
- **Search** across title, author, publisher, series, ISBN, subjects (Zotero tags) and summary.
- **Sort** by title, author, newest, oldest or recently added; **filter by subject**.
- **Covers** from Open Library by ISBN (no API key); books without one get a coloured spine with the title.
- **Book details**: publication facts, subjects, the Zotero abstract as summary, and Turabian bibliography and first-footnote entries with Copy buttons. Each book has its own link (`#book=KEY`).

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
