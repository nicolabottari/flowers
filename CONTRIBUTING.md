# Contributing

Thanks for looking. A few things keep this library what it is.

## Running it

```
pnpm install
pnpm test        # the contract, plus the species vectors
pnpm lint
pnpm type-check
pnpm build
```

Zero runtime dependencies is a hard rule. The engine is pure geometry and color, and it stays that way; a change that adds a dependency will be sent back. Comments say why, not what.

## Commits

Conventional commits, enforced: `commitlint` checks the message and `lefthook` runs Biome on the staged files plus the type-check before each commit (both set up on `pnpm install`). So `feat:`, `fix:`, `docs:`, and the message stays one subject line.

## Species are append-only

A species (today, the plumeria) freezes once it is declared done. Its test-vectors pin its output: a seed that grew a certain flower must grow the same flower forever, so no past seed ever changes under anyone. Improvements to the look do not edit a frozen species; they become the next version of it, for new seeds only. Conformance is decided by the vectors, automatically, not by taste.

A new flower (a passiflora, say) is a new species: its own folder under `src`, reusing `shared`, never touching `plumeria`. The right moment to factor shared geometry out of two species is after a third reveals what is actually shared, not before. A generic "any flower" engine is a non-goal: the interesting parts are specific to each species, and factoring them out too early bakes in the wrong abstraction.

## Publishing

Published by hand, with two-factor on the npm account. Running the publish on a person's machine rather than in CI keeps the one credential that matters off the build runner: [there is no workflow token to steal](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem).
