# Contributing

Generated 2026-09-18T17:18:27Z from a walk of the forge. Regenerated, not hand-edited.

## Start here

1. [`llms.txt`](https://zistgah.org/llms.txt) if you are an agent, [the front page](https://zistgah.org/) if you are not.
2. [`ontology.md`](https://zistgah.org/ontology.md) to understand how the estate is described, and what
   is not yet described.
3. [`catalog.json`](https://zistgah.org/catalog.json) for every repository, with every entry file linked
   by raw URL.
4. The master contract at
   [zistgah/governance](https://github.com/zistgah/governance/blob/main/CONTRACT.md).
   Every repository inherits it.

## Taking work

Repositories carry their work as packages or packets, each with an acceptance command. A
package is done when its command exits 0, and not when the work reads well. Take one. Do
not batch.

Work is labelled by capability: `needs:code`, `needs:proof`, `needs:testing`,
`needs:ontology`, `needs:visual`, `needs:legal`, `needs:human`. Never by model name. Which
agent takes a package is a dispatch decision made by a person.

## The rules you will be judged against

- Retrieve before asserting. The live state is in the repository, not in your memory of it.
- Where a value is unknown, write `not established`. An invented limit is worse than an
  absent one.
- A performance, coverage or completeness claim needs a recorded measurement in the same
  change. Otherwise delete the claim.
- One package, one pull request, one proof.
- Report a refusal. Do not route around it.
- Do not push to a default branch, mint a DOI, or edit `attest/`. Those are the author's
  acts, under a typed gate, on his own machine.

## Where your work goes

Open the pull request against the repository your change belongs to. This site is
regenerated from the forge on every walk, so an edit made here is lost on the next run.
