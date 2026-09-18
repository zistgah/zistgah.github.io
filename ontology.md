# Zistgah / Project ILM estate ontology

A scaffold, not a finished ontology. The classes and relations are stable; the instances are seeded from a walk of the forge and are incomplete on purpose. Extend it.

## How to use this

1. Fetch [`ontology.json`](https://zistgah.org/ontology.json) for the classes and relations.
2. Fetch [`catalog.json`](https://zistgah.org/catalog.json) for the instances the forge knows.
3. Fetch [`index.json`](https://zistgah.org/index.json) for the raw walk behind both.
4. Populate the unpopulated classes from the repositories themselves. Every repository's entry files are linked by raw URL in the catalogue, so nothing has to be guessed.
5. Open a pull request against the repository your additions came from, not against this index. The index is regenerated from the forge on every walk; edits made here are lost.

## Rules

- Retrieve before asserting. The live state is in the repository.
- If the corpus does not establish a relationship, do not infer it.
- A relation of kind shares_primitive must be declared at both ends.
- Where a value is unknown write 'not established'. Do not estimate.
- An ontology position is not a domain, and a projection is not a stage.
- Nothing here is a claim about the world; it is a claim about this estate.

## Classes

| class | definition |
|---|---|
| `Organisation` | A forge account that holds repositories. |
| `Repository` | One sovereign component. Carries its own contract and runs without the rest. |
| `Component` | What a repository IS, independent of where it is hosted. The repository is the container; the component is the thing. |
| `Domain` | A field of practice a component serves, placed on the ISIC x ISCO x ISCED lattice crossed with AGI layers. |
| `Lab` | A reproducible environment for one domain, hardware through applications. |
| `DepositedWork` | A DOI record. A concept DOI and a version DOI are different nodes. |
| `Page` | A published surface readable without cloning. |
| `Contract` | The rules a repository declares and can be judged against. |
| `Cycler` | A configured prompt cycle. Classified by OUTPUT, never by input. |
| `Poster` | A plate. Belongs to a corpus; a new plate for an existing corpus is a VERSION, never a new deposit. |
| `Claim` | An assertion about the estate, with its source and date. Not a fact until checked against the forge. |

## Relations

| relation | from | to | where it comes from |
|---|---|---|---|
| `contains` | Organisation | Repository | the forge listing |
| `publishes` | Repository | Page | has_pages on the forge |
| `deposited_as` | Repository | DepositedWork | CITATION.cff, MANIFEST.yaml or the README |
| `version_of` | DepositedWork | DepositedWork | declared, never inferred |
| `realised_by` | Component | Repository | declared by the component |
| `conforms_to` | Repository | Contract | declared in the repository |
| `consumes` | Repository | Repository | declared at the consuming end |
| `supplies` | Repository | Repository | declared at the supplying end |
| `shares_primitive` | Repository | Repository | must be declared at BOTH ends, or it is a proposal and not a relation |
| `enabled_by` | Domain | Lab | declared |
| `same_lattice_point` | Repository | Domain | declared in descriptor.json |
| `governs` | Contract | Repository | declared |
| `run_by` | Cycler | Component | declared in the registry, never in code |
| `belongs_to_corpus` | Poster | DepositedWork | declared |
| `serves` | Lab | Domain | declared |
| `priced_by` | Lab | DepositedWork | a bill of materials whose prices carry a source |

## What the walk populated

- organisation: 2
- repository: 85
- page: 47
- deposited_work: 34

Only four classes are populated by the walk: the forge knows about organisations, repositories, pages and deposited works and nothing else. Component, Domain, Lab, Contract, Cycler and Poster are UNPOPULATED, and filling them is the work.

## The worklist

| class | how to populate it |
|---|---|
| `Component` | read each repository's CONTEXT.md and CONTRACT.md; one component per repository unless the repository says otherwise |
| `Domain` | read descriptor.json where it exists; it already carries the ISIC, ISCO, ISCED and AGI-layer placement |
| `Lab` | the domain registry in the spine repository lists the enablement per domain; a lab kit is generated from it |
| `Contract` | every CONTRACT.md in the estate, and the master one in the governance repository that the rest inherit |
| `Cycler` | the .pni configuration files; classified by OUTPUT |
| `Poster` | the poster repositories; a corpus is one concept DOI with versions beneath it |
| `Claim` | https://zistgah.org/memory-reconciliation.json is a worked example: assertions with sources, checked against the forge |
