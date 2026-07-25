# Free Voice Text Retention Design

## Goal

Keep the text in the standalone Video Tools free-voice composer after a successful generation submission. The user will clear or replace the text when ready.

## Current behavior and root cause

`FreeVoiceToolCard` submits a validated request, prepends the returned record to the result list, and then calls `setText('')`. That final state update clears the textarea after every successful submission.

## Chosen approach

Remove only the successful-submit textarea reset. The submitted request and generated record remain unchanged, while the controlled textarea continues to hold its current value.

## Alternatives considered

- Persist the draft in browser storage: retains text across navigation and refreshes, but expands the requested behavior and introduces lifecycle decisions.
- Add a dedicated clear button: makes clearing more explicit, but is unnecessary because the user can already edit or delete textarea content directly.

## Scope and constraints

- Change only the standalone Video Tools free-voice card.
- Preserve the existing validation, project/character selection behavior, API request, result insertion, error handling, and loading state.
- Do not alter the existing record cleanup or one-day Redis retention behavior.

## Verification

Add a regression test that fails while a successful submission clears the composer text, then make the minimal UI change and run that targeted test. Review the rendered free-voice tool state in a browser if the local application is available.
