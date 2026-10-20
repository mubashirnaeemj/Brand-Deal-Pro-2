---
name: MAVLIT Instagram profile scope
description: Instagram-only profile flow and preservation of legacy platform data
---

The profile is now Instagram-only for everyone, by default; do not show a primary-platform selector. Preserve existing YouTube data rather than clearing it when it is hidden.

**Why:** The user explicitly replaced the multi-platform profile flow with Instagram as the fixed default.

**How to apply:** Save the primary platform as Instagram for both onboarding and profile editing. Legacy combined values can still arrive from GET; parsing those values is compatibility behavior, not permission to restore the selector.

The profile has three pages: (1) creator information only, (2) description-method choice only, (3) fields, Generate, and Save. Include Back and Exit navigation and Continue on the first two pages.

**Why:** The user chose this layout rather than putting fields on page two and review on page three.

**How to apply:** Manual mode makes all Instagram fields editable. Generate mode permits editing only username, primary niches, brand categories to avoid, and brand preferences. All generated outputs stay read-only, including after completion.

Page three includes a separate Instagram audience description and one age-range input displayed as `25-44`, not separate visible minimum/maximum inputs. Do not show the line “MAVLIT builds your profile around Instagram.”

**Why:** The user explicitly requested this profile presentation.

**How to apply:** Treat the audience description as distinct from the creator's content description. The single range is a frontend presentation; retain the backend's numeric age bounds when saving and reconstruct the range after loading.