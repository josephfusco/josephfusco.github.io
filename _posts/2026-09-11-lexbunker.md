---
layout: post
title: LexBunker, private case software for family-law litigators
permalink: lexbunker
---

I built [LexBunker](https://lexbunker.com) for my own contested matter.

The record never arrives in one form. Court PDFs, email, OFW threads, transcripts, receipts: mine runs to 450 papers, 3,000 messages and 10 transcripts, and answering one question usually means crossing all of them at once.

LexBunker puts all of it on one timeline. Papers are grouped by the motion they argue, expenses keep their receipts, and the calendar marks whose day each one was.

It also checks the record against itself. `lexbunker lint-motions` will tell you a motion still shows as pending with no order on file, while a transcript has the court granting it from the bench, cited to the page and line.

There is no AI in it. It hands the case to whatever assistant you already use, as MCP tools, and every answer comes back with a citation. A quote is returned only if it matches the source exactly. Paraphrase returns nothing, so there is nothing to hallucinate.

It runs with the network off. No account, no server, no telemetry, and no copy of the case on anyone else's hardware.

There is no hosted version. If you want it in your practice, [email me](mailto:hello@josephfus.co) with your firm and roughly how many active matters you carry.
