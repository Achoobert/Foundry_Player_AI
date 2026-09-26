---
name: jev
description: What "jev" is and how this module calls it. Use when touching party-chat auto-responder logic, src/core/jev.ts, or openRouterService.decisions().
---

# Jev

Jev = decision model. Not chat model. One question in, typed answer out. No prose.

## What for

Party chat. Who talk next? Jev pick, or say "none".

## Where live

- `src/core/openrouter-service.ts` — `decisions()` method. POST to `https://openrouter.ai/api/alpha/decisions`. Diff endpoint than `/chat/completions`. Same OpenRouter key, same `this.headers`.
- `src/core/openrouter-service.ts` — also has `choice()`, `noul()`, `score()` builders. Build question shape.
- `src/core/jev.ts` — `pickPartyResponder()`. One call, one `choice` question. Roster names = options, plus `"none"`.
- `src/core/jev.ts` — `rankSkillsForMessage()`. One call, one `noul` question per skill (parallel, single round trip). Used for 1-on-1 actor roleplay (not party mode): given active character + GM's last msg, rank which skills relevant.
- `src/core/tool-system.ts` — `getActorSkills(actorId)` exported directly (not via tool-call JSON) for jev to read skills without going through `executeTool`.
- `src/ui/components/ChatWindow.svelte` — `sendPartyMessage()` calls `pickPartyResponder`, use `.probabilities[name] >= 0.4` to pick responders. `sendMessage()` (actor roleplay branch) calls `getRelevantSkillsContext()` → `rankSkillsForMessage()`, keep only skills scoring >= 0.6, fold into system prompt as "# Potentially Useful Skills" block before the chat/completions call.

## Model string

Setting `jevModel`, default `~typesafe/jev-latest`. Looks weird, is right. Prefix `~typesafe/` = OpenRouter routing to TypeSafe's decision model. NOT a normal chat model. Do NOT send to `chatCompletion()` — errors 400, wrong endpoint.

## Wire shape (confirmed from @openrouter/sdk source, not guessed)

Request:
```
POST https://openrouter.ai/api/alpha/decisions
{
  model: "~typesafe/jev-latest",
  state: <string | object | array>,   // context to judge
  questions: {
    <name>: { type: "choice", instructions: "...", criteria: { label: "desc", ... } }
    // or type: "noul" (yes/no prob), or type: "score" (ordered rubric, array criteria)
  }
}
```

Response:
```
{
  answers: {
    <name>: { type: "choice", choice: "label", confidence?: 0.8, probabilities?: {label: 0.9, ...} }
  },
  usage: { inputTokens, outputTokens, cost? }
}
```

Three question types only:
- `choice` — pick one label from set. Up to 255 options. Add explicit "none"/"other" option or model forced to pick wrong thing.
- `score` — position on ordered rubric, array of >=2 descriptions, index from 0.
- `noul` — yes/no as probability 0-1.

All in one call, run parallel, one round trip. Fields optional per type — `confidence` and `probabilities` may be undefined, guard with `??`.

## Common mistake (already happened once)

Do NOT think jev is separate provider needing own API key. It IS OpenRouter, just diff endpoint. If you see error "cannot be used with chat/completions endpoint, use /api/alpha/decisions" — means code called `chatCompletion()` with jev model instead of `decisions()`.

## Not yet done

Tree-walk (`src/core/jev-tree.ts`, GM-authored decision tree) not wired to new decisions call. Old approach used freeform chat completion to walk tree in one shot. Decisions API needs fixed question set upfront — no conditional branching mid-call. Multi-step tree walk = multiple round trips, not done yet.
