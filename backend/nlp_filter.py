import os
import json
import re
import asyncio

AGENDA_FILTER_SYSTEM_PROMPT = """You are a strict meeting-transcript relevance classifier.

You will receive:
1. An AGENDA_TOPIC describing what the meeting output must be about.
2. A numbered list of TRANSCRIPT_SENTENCES (already translated to English).

Your job: classify EACH sentence as RELEVANT or NOT_RELEVANT to the AGENDA_TOPIC.

Rules:
- RELEVANT means the sentence directly discusses, decides, questions, or acts upon the agenda topic or a concrete sub-part of it (e.g. specific systems, deadlines, owners, or blockers tied to that topic).
- Greetings, small talk, scheduling logistics unrelated to the topic, jokes, and tangents into unrelated projects are NOT_RELEVANT, even if spoken by the same person in the same breath as a relevant point.
- Do not infer relevance from proximity to relevant sentences - judge each sentence independently on its own content.
- For each RELEVANT sentence, output a lightly polished version (fix filler words, false starts, transcription artifacts) while preserving the original meaning and speaker intent. Do not paraphrase away specifics (numbers, names, decisions).
- Never invent content that was not in the sentence.

Output STRICT JSON only, no markdown, no commentary, matching this schema:
{
  "results": [
    {"index": <int>, "relevant": <bool>, "polished_text": <string|null>}
  ]
}
polished_text is null when relevant is false.
"""

AGENDA_FILTER_USER_TEMPLATE = """AGENDA_TOPIC: {agenda_topic}

TRANSCRIPT_SENTENCES:
{numbered_sentences}
"""

def split_sentences(transcript: str) -> list[str]:
    raw = re.split(r"(?<=[.!?])\s+", transcript.strip())
    return [s.strip() for s in raw if s.strip()]

def fallback_filter(sentences: list[str], agenda_topic: str) -> str:
    """Smart heuristic fallback when LLM API key is not present."""
    topic_words = set(re.findall(r'\w+', agenda_topic.lower()))
    stop_words = {"a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "review", "discussion"}
    core_keywords = topic_words - stop_words

    kept = []
    for sentence in sentences:
        s_lower = sentence.lower()

        # Reject obvious greetings / smalltalk
        if any(greet in s_lower for greet in ["good morning", "how are you", "nice weather", "see you later", "thanks everyone", "coffee break", "happy friday"]):
            continue

        # Check if sentence contains relevant topics or key technical/business terms
        if any(kw in s_lower for kw in core_keywords) or any(action_kw in s_lower for action_kw in ["migrat", "secur", "architect", "datab", "api", "schema", "auth", "deploy", "budget", "plan", "deadline", "decid", "task", "issue", "bug", "feature", "ui", "ux", "scale", "performance"]):
            # Polished text: clean up speech fillers
            polished = re.sub(r'\b(um+|uh+|like|you know|so yeah)\b', '', sentence, flags=re.IGNORECASE)
            polished = re.sub(r'\s+', ' ', polished).strip()
            kept.append(polished)

    if not kept and sentences:
        # If strict fallback filtered out everything, keep non-greeting sentences
        kept = [s for s in sentences if not any(g in s.lower() for g in ["good morning", "how's it going", "coffee"])]

    return " ".join(kept)

async def filter_transcript_by_agenda(mistral_client, transcript: str, agenda_topic: str, batch_size: int = 40) -> str:
    sentences = split_sentences(transcript)
    if not sentences:
        return ""

    if mistral_client is None:
        return fallback_filter(sentences, agenda_topic)

    kept = []
    try:
        for start in range(0, len(sentences), batch_size):
            batch = sentences[start:start + batch_size]
            numbered = "\n".join(f"{i}. {s}" for i, s in enumerate(batch))

            user_prompt = AGENDA_FILTER_USER_TEMPLATE.format(agenda_topic=agenda_topic, numbered_sentences=numbered)

            resp = await mistral_client.chat.complete_async(
                model="mistral-large-latest",
                temperature=0,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": AGENDA_FILTER_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ]
            )

            parsed = json.loads(resp.choices[0].message.content)
            for r in parsed.get("results", []):
                if r.get("relevant") and r.get("polished_text"):
                    kept.append(r["polished_text"])
        return " ".join(kept)
    except Exception as e:
        print(f"[nlp_filter] LLM API call failed or not configured, using smart fallback: {e}")
        return fallback_filter(sentences, agenda_topic)
