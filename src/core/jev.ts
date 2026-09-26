/* ==========================================================================
   Jev
   Calls OpenRouter's Decisions router (model "~typesafe/jev-latest") once
   per party-chat turn to decide which player character(s), if any, should
   naturally jump into the conversation given the latest message. This is a
   different endpoint from chat/completions (POST /api/alpha/decisions),
   using the same OpenRouter API key — see openRouterService.decisions().
   ========================================================================== */

import { openRouterService, choice, noul } from "./openrouter-service";
import type { ActorSkill } from "./tool-system";

export interface JevResponderResult {
  /** The single best-fit character name, or "none" if nobody has strong reason to respond. */
  topChoice: string;
  /** Confidence in `topChoice`, 0-1. */
  confidence: number;
  /** Probability per roster member (and "none") that they're the one to respond. */
  probabilities: Record<string, number>;
}

const NONE_LABEL = "none";

/**
 * Ask jev which party member (if any) should respond to the latest chat
 * message. One Decisions call, one "choice" question — the roster's names
 * are the options, plus an explicit "none" so jev can say nobody fits
 * instead of picking the closest wrong character.
 */
export async function pickPartyResponder(params: {
  model: string;
  roster: Array<{ id: string; name: string }>;
  latestMessage: string;
  signal?: AbortSignal;
}): Promise<JevResponderResult> {
  const criteria: Record<string, string> = {
    [NONE_LABEL]: "No character can speak. There is an awkward silence",
  };
  for (const actor of params.roster) {
    criteria[actor.name] = `${actor.name} would naturally speak up next`;
  }

  const result = await openRouterService.decisions(
    {
      model: params.model,
      state: {
        latestMessage: params.latestMessage,
        roster: params.roster.map((a) => a.name),
      },
      questions: {
        responder: choice(
          "In this tabletop RPG party chat, given the latest message, which player character would most naturally jump in and respond right now? Goal: be entertaining and move the action forward.",
          criteria,
        ),
      },
    },
    params.signal,
  );

  const answer = result.answers.responder;
  if (!answer || answer.type !== "choice") {
    return { topChoice: NONE_LABEL, confidence: 0, probabilities: {} };
  }

  return {
    topChoice: answer.choice,
    confidence: answer.confidence ?? 0,
    probabilities: answer.probabilities ?? {},
  };
}

export interface RankedSkill extends ActorSkill {
  /** Probability (0-1) that this skill is useful right now, from jev. */
  relevance: number;
}

/**
 * Ask jev which of an actor's skills are relevant to the GM's latest
 * message — one `noul` (yes/no probability) question per skill, all in a
 * single Decisions call. Higher `relevance` = more useful. Callers filter
 * on a threshold (e.g. >= 0.6) before folding results into the actor's
 * system prompt.
 */
export async function rankSkillsForMessage(params: {
  model: string;
  actorName: string;
  skills: ActorSkill[];
  latestMessage: string;
  signal?: AbortSignal;
}): Promise<RankedSkill[]> {
  if (params.skills.length === 0) return [];

  const questions: Record<string, ReturnType<typeof noul>> = {};
  for (const skill of params.skills) {
    questions[skill.name] = noul(
      `Given the GM's latest message, would ${params.actorName}'s "${skill.name}" skill be useful or relevant to bring up or check right now?`,
    );
  }

  const result = await openRouterService.decisions(
    {
      model: params.model,
      state: {
        actorName: params.actorName,
        latestMessage: params.latestMessage,
        skills: params.skills,
      },
      questions,
    },
    params.signal,
  );

  return params.skills
    .map((skill) => {
      const answer = result.answers[skill.name];
      const relevance = answer?.type === "noul" ? answer.noul : 0;
      return { ...skill, relevance };
    })
    .sort((a, b) => b.relevance - a.relevance);
}
