---
name: MAVLIT primary niches
description: Storage decision and backend caveat for multiple Instagram and YouTube primary niches
---

Multiple primary niche choices are represented as comma-separated text in each platform's scalar API field. The creator chose this encoding after being told that the live API schema has no array fields for primary niches.

**Why:** The external profile API accepts strings for primary niches, while the creator wants multiple choices retained across saves and reloads. This is a compatibility choice, not evidence that the backend interprets comma-separated niches individually for matching.

**How to apply:** Parse and serialize consistently in every creator profile surface. Keep description generation's singular niche argument as the first selected choice. Do not promise multi-niche brand matching until the backend behavior is confirmed; if native arrays become available, revisit this encoding.