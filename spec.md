# Afterword — MVP Spec
**Version:** 1.1 (revised with spec-writing principles)
**Date:** February 2026  
**Platform:** Web (browser-first)  
**Build target:** Prototype in 2–3 hours → Functional MVP in 1–2 days

---

## What We're Building

A web app where you search for any book, and within seconds have an intelligent companion ready to discuss it with you — drawing from Goodreads reviews, Reddit threads, literary criticism, and author interviews. Instead of passively scrolling reviews after finishing a book, you have one conversation.

The core value proposition: **book discussion as dialogue, not consumption.**

Two specific needs this serves:
1. **Processing** — You finish a book and want to decompress it with someone who's read it and absorbed what others have said about it
2. **Deepening** — You want to understand the book more fully: what critics noticed, what readers argued about, what the author intended, what you might have missed

---

## Problem Being Solved

After finishing a book, people want to *process* it with someone who has read it too. Right now that means:
- Scrolling Goodreads reviews (passive, mostly plot summaries or emotional reactions)
- Opening Reddit threads (unstructured, variable quality)
- Hunting for critical essays (scattered across publications, paywalled)
- Finding author interviews (buried in podcast archives)

All fragmented, all one-directional. Goodreads has been broken as a discussion platform for 15 years. Book Companion collapses the best of all of these into a single interactive conversation.

---

## ⚡ Prototype Before You Build

> *"I can't tell you if this is going to work. I have to feel it. I have to try it. A mock-up doesn't tell you what it's going to feel like."* — Tamar Yehoshua

Before touching the scraping pipeline or the ingestion architecture, build a **throwaway chat prototype in 2–3 hours**:

- Hardcode a single book (pick one you've recently read)
- Paste in a few Goodreads reviews and a Reddit thread manually as context
- Wire up the Claude API with the system prompt
- Test the opening moment: companion says "What stayed with you?" — does it feel right on screen?

**This prototype answers the only question that matters before committing to the full build:** does the core conversation loop feel alive, or does it feel like a search engine with a chat box?

If it feels right → build the full pipeline. If it feels off → fix the companion design first. The scraping infrastructure is easy to build. The right conversational tone is not.

---

## The Moving Pieces

> *"Aim for a level of detail where the team sees the 'electricity in the walls' without prescribing UI details."* — Ryan Singer

Ten things this product does. Understand these and you understand the whole system:

1. **Search** — User types a title → live suggestions from Open Library / Google Books
2. **Ingest** — On selection, scrape sources in parallel and build a knowledge base
3. **Cache** — Store ingested knowledge by book ID; skip scraping on repeat visits
4. **Surface** — Show metadata + interpretive landscape (what critics think, where readers diverge)
5. **Open** — Companion initiates: "What stayed with you?"
6. **Retrieve** — On each message, pull relevant chunks from the knowledge base
7. **Respond** — Claude generates a response grounded in sources, conversational in tone
8. **Attribute** — Show which sources the companion drew from
9. **Manage** — Summarise older conversation turns as context grows
10. **Degrade** — When sources are thin, be transparent and fall back gracefully

Everything else is implementation detail.

---

## What's In Scope (MVP)

| Feature | Description |
|---|---|
| Book search | Search by title or author, get results from Open Library / Google Books |
| Book detail page | Cover, synopsis, author, genre, page count, aggregated ratings |
| Knowledge ingestion | On-search, fetch sources and build a knowledge base for the book |
| AI chat companion | Freeform conversation about the book using the knowledge base as context |
| Companion-initiated dialogue | Companion opens the conversation rather than waiting — "What stayed with you?" |
| Aggregated sentiment | Surface what critics, Goodreads, and Reddit broadly think — and where they diverge |
| Source attribution | Show which sources the companion is drawing from |

## What's Out of Scope (MVP)

- User accounts or authentication
- Personal reading diary or logging
- Watchlist / reading list / shelf features
- Social features (following, activity feeds)
- Mobile app
- Mid-read / spoiler-gated mode (companion assumes you've finished)
- Author filmography / body of work mode

---

## Core User Flow

```
1. User lands on homepage
   └── Search bar, minimal UI, tagline

2. User types a title or author
   └── Live search suggestions via Open Library + Google Books API

3. User selects a book
   └── Loading screen begins (knowledge ingestion in background)
   └── Show book cover, title, author during load
   └── Progress indicator: "Reading Goodreads reviews... Reddit discussions... Literary criticism..."

4. User lands on Book Detail Page
   ├── Left panel: Book metadata (cover, synopsis, author, ratings)
   ├── Center/Right: Interpretive landscape (what critics think, what readers argue about, where opinions diverge)
   └── Chat interface — companion opens with "What stayed with you?"

5. User engages in conversation
   └── Companion responds with knowledge drawn from aggregated sources
   └── Weaves in critical perspectives, reader reactions, author intent naturally
   └── Never just tells you what something means — helps you arrive there
   └── Sources cited inline or on hover
```

---

## Technical Architecture

### Stack Recommendation

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js (App Router) | Fast to build, SSR, good for SEO eventually |
| Styling | Tailwind CSS | Rapid UI development |
| Backend / API routes | Next.js API routes | Keeps it in one codebase for MVP |
| AI | Claude API (claude-sonnet-4-6) | Best conversational quality for nuanced literary discussion |
| Book metadata | Open Library API + Google Books API | Free, comprehensive between the two |
| Vector DB / Knowledge store | In-memory for MVP (or Upstash Redis) | Avoids infra overhead; upgrade later |
| Scraping | Playwright | Web scraping for Goodreads, Reddit, literary publications |
| YouTube transcripts | yt-dlp | Transcript extraction for BookTube and author interviews |
| Deployment | Vercel | Zero config, instant deploys |

---

## Data Sources & Ingestion Strategy

### Sources (in priority order)

1. **Open Library + Google Books** — metadata, synopsis, author, genre, page count (API, instant)
2. **Goodreads** — ratings, popular reviews spanning the spectrum (scrape)
3. **Reddit** — r/books, r/literature, r/bookclub, genre-specific subs (Reddit API or scrape)
4. **Literary publications** — NYT Books, The Guardian, The Paris Review, Literary Hub, LARB (scrape via URL patterns)
5. **Author interviews** — Paris Review Art of Fiction series, Goodreads Q&As, podcast transcripts where available (scrape)
6. **YouTube** — BookTube analysis, author interviews (yt-dlp for transcript extraction)

### Why These Sources

Goodreads gives volume and reader sentiment. Reddit gives genuine discussion and debate — the arguments between readers who loved and hated the same book reveal its fault lines. Literary publications give critical vocabulary and contextual framing. Author interviews are uniquely valuable for books — hearing the author discuss their choices and intentions is gold, and for popular books, authors often answer questions directly in Goodreads Q&As. This has no equivalent in the film world.

### Ingestion Pipeline (per book search)

```
Search triggered
  → Check cache: has this book been ingested before?
    → Yes: serve from cache, skip to book page
    → No: begin ingestion pipeline

Ingestion pipeline (runs async, ~20–35 seconds):
  1. Open Library + Google Books fetch (instant, parallel)
  2. Goodreads scrape (top reviews spanning rating spectrum — 5★, 3★, 1★)
  3. Reddit fetch (top 3–5 threads across r/books, r/literature, genre subs)
  4. Literary publication scrapes (2–4 reviews from major sources)
  5. Author interview search + fetch (Paris Review, Goodreads Q&A, LitHub)
  6. YouTube transcript extraction (1–2 BookTube videos or author interviews via yt-dlp)

Chunking + storage:
  → Split all text into chunks (~500 tokens)
  → Store chunks with source metadata (source name, URL, star rating if review)
  → Tag chunks by type: reader_review, critic_review, author_interview, community_discussion

Book page unlocks when metadata + at least 2 other sources are ready
Background sources continue loading and become available in chat
```

### Caching Strategy (MVP)

Store ingested book knowledge in a JSON structure keyed by Open Library book ID. If a book has been searched before, skip scraping. Write to local JSON file or Vercel KV (free tier) for persistence between restarts.

### Graceful Degradation

| Scenario | Handling |
|---|---|
| Obscure book, minimal coverage | Fall back to Claude's own training knowledge; note to user: "Limited online discussion found — drawing on what I know directly" |
| Goodreads scrape blocked | Skip; continue with other sources |
| Reddit threads thin | Fall back to Claude's training + whatever is available |
| No literary reviews found | Skip; note in source attribution |
| YouTube transcripts unavailable | Skip gracefully |
| Book not found in metadata APIs | Show empty search state, suggest alternatives |

**Design principle**: Always be transparent about source quality. The experience degrades gracefully — it doesn't fail silently.

---

## AI Companion — Design

### The Core Difference from a Film Companion

Books are more interpretively open than films. Two readers of the same novel can construct genuinely different experiences — different mental images, different relationships with the narrator, different emotional trajectories. The companion's job is to hold multiple valid interpretations simultaneously and help the user locate themselves within that landscape.

This means the companion should never just tell the user what something means. It offers readings, surfaces tensions, and asks questions that help the user arrive at their own synthesis.

### The Opening Moment

The companion initiates — it does not wait for a prompt.

```
Opening message (displayed immediately on chat load):
"What stayed with you?"
```

Three words. No preamble. Signals immediately that this is a conversation, not a lookup tool. Works whether the user loved the book, was confused by the ending, or was moved by a single paragraph.

No suggested prompt chips like "What did the ending mean?" — these signal homework-help energy. The companion's opening question, and its first response, should teach the user how to talk to it.

### System Prompt Structure

```
You are a knowledgeable book companion for [TITLE] by [AUTHOR] ([YEAR]).

You have access to the following knowledge sources:
- Metadata and synopsis from Open Library / Google Books
- Goodreads reviews (rating: [X]/5 from [N] readers; sentiment overview: [summary])
- Reddit discussions from [subreddits found]
- Critical reviews from [publication names]
- [Author interviews if available]
- [YouTube transcripts if available]

Your role is to help the user process, understand, and discuss this book — as a 
thoughtful companion who has read it and absorbed the discourse around it.

Core principles:
- Assume the user has finished the book. Discuss freely, including the ending.
- Open the conversation yourself with "What stayed with you?"
- Do not summarise the plot unless asked — the user knows it.
- Be specific. Reference actual scenes, passages, characters, structural choices.
- Surface interpretive tensions: where readers disagree, where critics diverge from 
  audiences, where the book resists easy reading.
- When drawing from sources, weave them in naturally:
  "Goodreads readers broadly felt..."
  "There's a sharp Paris Review piece that argues..."
  "The author said in an interview that..."
- Never just tell the user what something means. Offer readings. Ask questions.
  Help them arrive at their own synthesis.
- Match the user's energy: analytical, emotional, casual, whatever they bring.
- The interpretive landscape matters: help the user locate their own reading 
  relative to how others have read the book.
```

### RAG Implementation (MVP)

1. On chat message received, keyword + semantic match against stored chunks
2. Retrieve top 6–10 relevant chunks, prioritising diversity of source type
3. Inject into Claude's context window along with conversation history
4. Claude generates response

Chunk tagging (reader_review / critic_review / author_interview / community_discussion) allows the retrieval to balance perspective types — not just surfacing all Goodreads reviews when a critic perspective would be more relevant.

For day 2 scope: use Voyage AI embeddings + cosine similarity for more precise retrieval.

### Conversation Arc Design

A natural book discussion moves through layers. The companion should be able to sense where the conversation is and nudge it forward when it plateaus:

```
1. Gut reaction — What stayed with you? How did it make you feel?
2. Specific moments — Scenes, passages, characters, structural choices
3. Craft — How does the author achieve their effects?
4. Theme — What is the book about beyond its plot?
5. Interpretive landscape — Where do readers/critics diverge, and why?
6. Author context — How this fits in their body of work, stated influences
7. Personal synthesis — Has your reading evolved? Who would you recommend it to?
```

The companion doesn't enforce this sequence — it follows the user's energy. But if the conversation stalls or circles, it introduces a new angle from the next layer.

---

## UI Screens

> *"Every tap on a mobile app is a miracle. Users will turn and bounce to their next app very quickly."* — Nikita Bier
> 
> This is a web product, but the principle holds. Map every interaction in the first 60 seconds and ask: is each one earning its keep?

**First 60 seconds, tap by tap:**
1. Land on homepage → see search bar immediately, no explanation needed
2. Type a title → suggestions appear (no Enter required)
3. Select a book → loading begins instantly, cover appears in < 1 second
4. Loading screen → progress feels active, not stuck (quote from reviews fills the wait)
5. Book page loads → companion message is the first thing eyes go to
6. Read "What stayed with you?" → type naturally, no instruction needed

Every tap accounted for. If any of these feel slow or require explanation, fix before launch.

---

### Screen 1: Homepage
- Full-page, minimal
- Logo / wordmark
- Single search input, centered
- Tagline: *"Discuss any book like you read it together."*
- Subtle suggestions: recently discussed books, or curated classics

### Screen 2: Loading / Ingestion Screen
- Book cover (from API, loaded instantly) as background or prominent element
- Title + author + year
- Animated progress: steps ticking off as sources are fetched
  - "Fetching book details ✓"
  - "Reading Goodreads reviews..."
  - "Scanning Reddit discussions..."
  - "Loading critical reviews..."
  - "Searching for author interviews..."
- Estimated time: 20–35 seconds
- While loading: pull a single striking quote from scraped reviews as ambient content

### Screen 3: Book Detail Page

```
┌─────────────────────────────────────────────────────────┐
│  [Cover]   TITLE (Year)                                 │
│            Author • Genre • Pages                        │
│            ★ GR: 4.1/5  📚 [N] ratings                 │
│            Synopsis (2–3 lines, expandable)             │
├─────────────────────────────────────────────────────────┤
│  HOW THIS BOOK IS READ                                  │
│  Critics: [1-line consensus from literary press]        │
│  Readers: [Aggregated Goodreads + Reddit sentiment]     │
│  The debate: [Where opinions genuinely diverge]         │
├─────────────────────────────────────────────────────────┤
│  CHAT                                                   │
│                                                         │
│  Companion: "What stayed with you?"                     │
│                                                         │
│  [________________________] [Send]                      │
│  Sources: Goodreads • Reddit • The Guardian • LitHub   │
└─────────────────────────────────────────────────────────┘
```

**Section naming note**: "HOW THIS BOOK IS READ" rather than "WHAT PEOPLE THINK" — the framing matters. Books are read differently by different people; that plurality is the point.

**No starter prompt chips** — the companion's opening question does this job.

---

## Build Order

### Day 0 (2–3 hours) — Throwaway Prototype
> Build this first. Don't skip it.

1. **Hardcode a single book**: paste manual context (a few Goodreads reviews, a Reddit thread, a critic quote) into a static file
2. **Wire Claude API**: system prompt + that static context as RAG stand-in
3. **Minimal chat UI**: just an input, a response area, nothing else
4. **Test the opening moment**: does "What stayed with you?" feel right? Does the first companion response set the right tone?
5. **Decision gate**: if it feels alive → proceed to Day 1. If it feels off → fix the companion design first.

*This prototype is throwaway. Don't clean it up. Don't deploy it. Just feel it.*

### Day 1 — Core Pipeline
1. **Setup**: Next.js project, Tailwind, deploy to Vercel (30 min)
2. **Metadata integration**: Open Library + Google Books search + detail fetch (1 hr)
3. **Homepage + search UI**: Functional search with suggestions (1 hr)
4. **Scraping module**: Goodreads + Reddit scrapers using Playwright (2–3 hrs)
5. **Literary publications scraper**: NYT Books, Guardian, LitHub URL patterns (1 hr)
6. **yt-dlp integration**: Transcript extraction for BookTube / author interviews (1 hr)
7. **Simple knowledge store**: In-memory JSON structure per book, tagged by source type (1 hr)

### Day 2 — AI Layer + Book Page
1. **Claude API integration**: System prompt + chunk retrieval RAG (2 hrs)
2. **Book detail page**: Metadata display + "How This Book Is Read" section (2 hrs)
3. **Chat UI**: Streaming responses, companion-initiated opening, conversation history (1–2 hrs)
4. **Loading screen**: Progress indicator tied to scraping pipeline (1 hr)
5. **Context management**: Summarise older turns when conversation grows long (1 hr)
6. **Polish + deploy**: Error states, empty states, source attribution display (1 hr)

---

## Key Design Decisions

> *"Temporary design shortcuts often become permanent product legacies that persist through multiple technical rewrites."* — Tom Conrad

The decisions below will define user expectations long after the MVP. Choose carefully.

**Companion initiates. ⚠️ Permanent decision.**
"What stayed with you?" as the opening sets tone, expectation, and conversational register from the first interaction. Once users experience this, a passive chat box will feel broken. Validate this in the prototype before building around it — but know that once it ships, it's load-bearing.

**"How This Book Is Read" not "Reviews." ⚠️ Permanent decision.**
This copy frames the entire product. It signals plurality of interpretation, not consensus. If you ship "Reviews" for speed and plan to rename it later, users will have already formed the wrong mental model. Get the name right before launch.

**No prompt chips.**
These signal the wrong product category. The companion's opening and first response should teach the user how to talk to it naturally. This is lower-stakes than the above — easier to add later if needed.

**Transparent degradation.**
When source coverage is thin, say so. Users trust a tool that is honest about its limitations more than one that performs confidence it doesn't have.

**Author interviews are a priority source.**
This is the differentiator that film competitors don't have in the same way. Hearing an author discuss their own choices mid-conversation — "Ishiguro said in a Paris Review interview that Stevens was never meant to be read as tragic" — is the kind of moment that makes the product feel genuinely valuable.

**In-memory knowledge store for MVP. ⚠️ Watch this one.**
Starting with in-memory JSON is fine for MVP. But the data model you choose for chunk storage and tagging will likely persist longer than you expect. Design the schema as if it'll be in production for two years — because it probably will be.

---

## Cost Consideration

Each book conversation with a loaded knowledge base is potentially 10K–50K tokens per session depending on depth of use. Decide early: free during beta (rate-limited per session), or paywalled after N messages. For MVP, a per-session limit of 20 messages avoids runaway costs while still allowing meaningful conversations.

---

## What Success Looks Like (MVP)

A user can:
1. Search for any book with meaningful critical reception (last 30 years, most literary fiction, bestsellers)
2. Have the companion load within 35 seconds
3. Open the conversation and feel immediately understood — not lectured at
4. Walk away from a 15-minute conversation having understood the book differently than when they started
5. Feel like they talked to someone who had *actually read* what's out there about this book

If that loop works cleanly — the MVP is done.

---

## Future Directions (Post-MVP)

- **Mid-read mode**: Spoiler-aware companion that adapts to where you are in the book
- **Body of work mode**: "Discuss Ishiguro's novels" — trace an author's obsessions across their career
- **"What's contested"**: Dedicated surface for genuine interpretive disagreements between sources
- **Podcast integration**: Pull transcripts from literary podcasts (Bookworm, Between the Covers, Blank Check for film tie-ins)
- **User accounts**: Save conversations, build a read history
- **Community layer**: Share chat excerpts as "notes" — a more conversational alternative to Goodreads reviews
- **Reading group mode**: Multiple users, one book, shared conversation with the companion
- **Mobile app**: Read companion mode, discuss during the last 50 pages

---

*Spec v1.1 — revised against spec-writing principles (prototype-first, moving pieces, permanent decision flags, tap-level UX detail). Intended for Claude Code execution. Built on the same architecture as the Film Companion spec — treat as a sibling product. Start with Day 0 prototype before touching infrastructure.*