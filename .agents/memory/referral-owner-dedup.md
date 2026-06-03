---
name: Referral credit dedups by owner, not account
description: Why referral milestone/network counts collapse alt-accounts to one owner, and where the dedicated invite landing lives.
---

Referral credit (milestone counts, network/downline counts, badge thresholds) must count distinct **owners**, not distinct accounts. One real person (one Replit login) can own up to ~10 accounts (`users.owner_id` set on alts, null on root). The owner identity of any account = `COALESCE(owner_id, id)`.

**Why:** Without this, one person signs up 10 alt-accounts under an inviter's code and inflates that inviter's referral badges. The rule the founder asked for: "one unique email/person = 1 credit."

**How to apply:**
- Counting an inviter's direct invites or downline: `COUNT(DISTINCT COALESCE(u.owner_id, u.id))` after joining `referral_uses.referee_id → users u`.
- Redemption guard in `POST /referrals/use`: reject when referrer and referee resolve to the same owner (same-owner self-referral), in addition to the existing `referrerId === userId` and ancestor/cycle guards.

**Invite flow:** Invite links point to a dedicated `/join?ref=CODE` landing page (`InviteLanding.tsx`), NOT the root. Root previously dumped the visitor on the feed/their profile ("the link gets lost"). The landing resolves the inviter via public `GET /api/referrals/code/:code` (public-safe fields only — name/handle/avatar/medium, never ids/email/counts), and handles three states: new visitor, already-a-member, and own-link-opener. `/join` is in `SETUP_EXEMPT` so new visitors see it before the setup redirect fires.
