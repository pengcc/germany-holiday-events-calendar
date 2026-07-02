### Lesson 2026-07-02: Ground product framing in concrete use cases before implementation

- Context: A Product Framing Review Skill may already exist and may be invoked before planning, but the implementation can still drift when the framing stays too abstract or does not test concrete user scenarios, invalid states, and interaction outcomes.
- Problem: Agents can produce technically coherent plans and code that satisfy the written mechanism while missing the user's actual intended use case. This often appears late, after implementation, when reviewing UI behavior, defaults, legends, empty states, or workflow semantics.
- Root cause: The framing step was treated as a checklist output instead of a validation exercise. It identified product concepts but did not walk through concrete examples, representative user paths, edge cases, and expected user interpretation before authorizing implementation.
- Resolution: Before implementation, pair the Product Framing Check with a small number of concrete use-case probes. For each user-facing behavior, confirm at least one normal path, one empty/invalid path, and one edge case where ambiguity could change the implementation. If the examples reveal a mismatch, update the framing or plan before coding.
- Reuse guidance: For Foundation Kit workflows, Product Framing Review should not only ask “what is the purpose?” but also “which concrete user scenarios prove this interpretation is correct?” Add reusable prompts or checklist items that force agents to validate framing against examples before `plan-with-context` or `execute-plan` begins.

### Related files
Product Framing Review Skill; plan-with-context workflow; execute-plan workflow; project-memory workflow

```txt
.codex/skills/meta/plan-with-context/SKILL.md
.codex/skills/meta/agent-roles-and-capabilities/SKILL.md
.codex/skills/meta/plan-with-context/SKILL.md
```
