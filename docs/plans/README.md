# Plans

Implementation plans for work larger than a small fix, written after the ADR is approved and before code. Name them `<YYYY-MM-DD>-<topic>-plan.md`.

A plan covers:

1. **Scope:** the issue and the approved ADR it implements.
2. **Files:** what will be added, changed and removed, by package and layer.
3. **Interfaces:** contract functions, events and errors; component props; hook return types; domain types.
4. **State:** which hook manages what (see the hook table in the standards), and the action status each write goes through.
5. **Wording:** every new player-facing string, as it will appear in `copy.ts`.
6. **Tests:** what each test proves, including loading, empty and error states and every contract revert path.
7. **UI:** a sketch or screenshot of each state.
8. **Removal:** what this replaces and the packages that go with it.
