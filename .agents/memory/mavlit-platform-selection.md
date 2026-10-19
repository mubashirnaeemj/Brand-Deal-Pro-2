---
name: MAVLIT multi-platform profile
description: Why platform selection uses a combined value until the external backend provides a multi-platform field
---

Use a comma-separated platform list in the current single text field when both Instagram and YouTube are selected. Do not treat this as evidence that the external matching service understands the combined value; no real authenticated API write or downstream matching check was performed.

**Why:** The onboarding selector already allowed choosing both, but saving only the first silently discarded the second. The external API schema exposes only a nullable string for platform selection, with no separate list or documented "both" value.

**How to apply:** Keep GET parsing, profile editing, and onboarding submission consistent. Before adding platform-dependent backend behavior, confirm the external API accepts and interprets combined values; ideally replace this convention with an explicit platform list in the API contract.

Only show profile sections for currently selected primary platforms. Selecting Instagram alone hides YouTube, selecting YouTube alone hides Instagram, and selecting both shows both. Hiding a section must not erase its data.

**Why:** The user explicitly requested that the profile show only data for the platforms selected by the user.

**How to apply:** Base section visibility on the current form selection so it updates immediately, while retaining hidden values in the form and preserving saved data.