### Lesson 2026-07-02: Ground product framing in concrete use cases before implementation

- Context: The Task and Product Framing Skill (`product-framing-review`) may already be invoked before planning, but deeper Product Framing can still drift when it remains abstract or does not test concrete user scenarios, invalid states, and expected interpretation.
- Problem: Agents can produce technically coherent plans and code that satisfy the written mechanism while missing the user's actual intended use case. This often appears late, after implementation, when reviewing UI behavior, defaults, legends, empty states, or workflow semantics.
- Root cause: The framing step was treated as a checklist output instead of a validation exercise. It identified product concepts but did not walk through concrete examples, representative user paths, edge cases, and expected user interpretation before authorizing implementation.
- Resolution: Before implementation, pair the Product Framing Check with a small number of concrete use-case probes. For each user-facing behavior, confirm at least one normal path, one empty/invalid path, and one edge case where ambiguity could change the implementation. If the examples reveal a mismatch, update the framing or plan before coding.
- Reuse guidance: For end-user behavior, pair the Product Framing Check with concrete normal, empty/invalid, and ambiguity-sensitive edge cases before `plan-with-context` or `execute-plan`.

### Related files
Task and Product Framing Skill (`product-framing-review`); plan-with-context workflow; execute-plan workflow; project-memory workflow

```txt
.codex/skills/meta/product-framing-review/SKILL.md
.codex/skills/meta/plan-with-context/SKILL.md
.codex/skills/core/execute-plan/SKILL.md
.codex/skills/meta/project-memory/SKILL.md
```
