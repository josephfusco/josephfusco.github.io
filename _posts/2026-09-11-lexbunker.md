---
layout: post
title: LexBunker, a contested matter as a WordPress site
permalink: lexbunker
---

I built LexBunker for my own contested matter. It is a WordPress plugin. Each case is a site in a multisite network, and every paper in the case is a post.

Documents, email, transcripts and receipts are four post types — `lexbunker_document`, `lexbunker_email`, `lexbunker_transcript`, `lexbunker_receipt` — carrying the case id, the document number, the filed date and the side that filed it in post meta. The canvas is a query across all four.

<figure>
  <img src="/assets/images/lexbunker-canvas.png" alt="A case on one timeline: pending motions, decided motions, court dates and other papers as rows across two years, with each side's counsel marked along the top." width="2880" height="830">
  <ul class="figure-key" aria-label="How to read the canvas">
    <li><span class="key key-diamond" aria-hidden="true"></span>court date</li>
    <li><span class="key key-square" aria-hidden="true"></span>the order that decided it</li>
    <li><span class="key key-dot key-p" aria-hidden="true"></span>filed by the plaintiff</li>
    <li><span class="key key-dot key-d" aria-hidden="true"></span>filed by the defendant</li>
    <li><span class="key key-line" aria-hidden="true"></span>a motion, from filing onward</li>
  </ul>
  <figcaption>A generated demo case. No real matter appears here.</figcaption>
</figure>

The interface is WP-CLI. `wp lexbunker import` walks a folder of PDFs and takes the text layer where there is one; `wp lexbunker ocr-backfill` does the rest. Mail arrives as mbox or `.eml`, the OurFamilyWizard report arrives as the PDF the parent downloads, and `wp lexbunker set-address` decides whom an address writes for.

Twenty tools are registered on the Abilities API — `lexbunker/list-documents`, `lexbunker/canvas`, `lexbunker/document` among them — and served over MCP to whatever assistant is already running. Every reply is bounded by a size cap per tool. A quote comes back only when it matches the source exactly; paraphrase returns nothing, which is the whole of the hallucination story.

`wp lexbunker lint-motions` reads the motion list against the transcripts and prints what disagrees: a motion still showing pending with no order on file, where a transcript has the court granting it from the bench, cited to the page and the line. It changes nothing.

The rest of it is commands.

- `wp lexbunker scan-citations` links case-law citations in a filing to CourtListener.
- `wp lexbunker produce-emails` writes a Bates-numbered production, every page carrying the hash of the message as collected.
- `wp lexbunker scan-deadlines` flags the dates in a document and refuses to calculate the deadline, because a relative one usually runs from service, not from filing.
- `wp lexbunker scan-pii` flags what should be redacted before anything is shared; `redact-add`, `redact-apply` do it.

It runs with the network off. No account, no server, no telemetry, and no copy of the case on hardware that is not the firm's own.
