# Contributing

Thanks for looking. A few things keep this library what it is.

## Running it

```
pnpm install
pnpm test        # the contract, plus the species vectors
pnpm lint
pnpm typecheck
pnpm build
```

Zero runtime dependencies is a hard rule. The engine is pure geometry and
color, and it stays that way; a change that adds a dependency will be sent
back. Comments say why, not what.

## Species are append-only

A species (today, the plumeria) freezes once it is declared done. Its
test-vectors pin its output: a seed that grew a certain flower must grow
the same flower forever, so no past seed ever changes under anyone.
Improvements to the look do not edit a frozen species; they become the next
version of it, for new seeds only. Conformance is decided by the vectors,
automatically, not by taste.

A new flower (a passiflora, say) is a new species: its own folder under
`src`, reusing `shared`, never touching `plumeria`. The right moment to
factor shared geometry out of two species is after a third reveals what is
actually shared, not before. A generic "any flower" engine is a non-goal:
the beauty is in the specifics, and specifics do not generalize.

## Publishing

Published by hand, with two-factor on the npm account. Running the publish
on a person's machine rather than in CI keeps the one credential that
matters off the build runner: there is no workflow token to steal. The CI
here only lints, type-checks, tests, and builds; it never publishes, and it
runs on `pull_request`, never `pull_request_target`, so fork code never
sees a secret.
