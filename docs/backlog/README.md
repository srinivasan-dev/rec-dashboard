# Backlog — Epics, User Stories, Tasks

This role owns a customer-facing surface end-to-end: UX, frontend, API, and explaining it to a
non-technical stakeholder (see `docs/assessment-brief.pdf`, "Before you start"). That's a
domain-owner + senior full-stack responsibility, not "hand off a ticket and wait." This backlog
exists to make that ownership visible and trackable — the same artifact a domain owner would
keep in Jira/Linear, kept here as plain files so it travels with the repo and the review.

## Hierarchy

```text
Epic          A phase-sized outcome for the merchant or the business.
  User Story    A specific capability, in "as a ... I want ... so that ..." form,
                with acceptance criteria that are actually testable.
    Task          An engineering unit of work that implements one story.
```

- **Epics** map 1:1 to the phases in `docs/prompts/MASTER_PROMPT.md`, plus one cross-cutting
  epic (EPIC-EX) for engineering standards/tooling that spans phases. See
  [`epics.md`](epics.md).
- **User stories** live in [`user-stories.md`](user-stories.md), grouped by epic. Acceptance
  criteria are pulled from `docs/product-spec.md` and the assessment brief where possible,
  rather than invented — this backlog tracks _decided_ requirements, it doesn't create new ones.
- **Tasks** live in [`tasks.md`](tasks.md). Epics already in progress or done are broken down to
  real task granularity. Epics not yet started are listed at a coarser grain and refined when
  that phase actually begins — planning every task for unbuilt phases in detail now would be
  speculative, not ownership.

## Status conventions

| Symbol         | Meaning                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ✅ Done        | Shipped and verified (tests pass, matches acceptance criteria)                                                                 |
| 🔄 In Progress | Actively being worked                                                                                                          |
| ⬜ Not Started | Planned, not yet begun                                                                                                         |
| 🧊 Deferred    | Explicitly out of scope for this build — see `docs/product-spec.md` §6 Non-Goals or `docs/architecture.md` assumptions for why |

## Keeping this current

Update `epics.md`'s status column and `docs/project-plan.md` together — they should never
disagree about what phase we're on. When a task's scope changes mid-implementation, update the
task rather than silently diverging from what's written here; if the divergence reveals the
original story/acceptance-criteria was wrong, say so in the story rather than quietly reworking
it.
