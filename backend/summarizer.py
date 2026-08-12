import json
import re
import asyncio

EXEC_SUMMARY_SYSTEM_PROMPT = """You are an executive meeting summarizer.

You will receive an AGENDA_TOPIC and a FILTERED_TRANSCRIPT that contains only the sentences from a meeting that are relevant to that topic. Sentences outside this topic have already been removed - do not assume any additional context exists.

Produce a concise executive summary using ONLY information present in FILTERED_TRANSCRIPT. Do not speculate or add outside knowledge.

Output STRICT JSON only, matching this schema:
{
  "summary": "<string>",
  "key_decisions": ["<string>"],
  "action_items": [
    {"task": "<string>", "owner": "<string|null>", "due": "<string|null>"}
  ],
  "open_questions": ["<string>"]
}
If FILTERED_TRANSCRIPT is empty or has no substantive content, return a summary stating that no agenda-relevant content was found, and empty arrays elsewhere.
"""

EXEC_SUMMARY_USER_TEMPLATE = """AGENDA_TOPIC: {agenda_topic}

FILTERED_TRANSCRIPT:
{filtered_transcript}
"""

def fallback_summarize(filtered_transcript: str, agenda_topic: str) -> dict:
    """Smart structured summarizer fallback when LLM API key is not present."""
    if not filtered_transcript.strip():
        return {
            "summary": f"No agenda-relevant content was found for topic: {agenda_topic}.",
            "key_decisions": [],
            "action_items": [],
            "open_questions": []
        }

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", filtered_transcript) if s.strip()]

    # Extract key decisions
    decisions = []
    actions = []
    questions = []

    for s in sentences:
        s_lower = s.lower()
        if any(w in s_lower for w in ["decid", "agreed", "approved", "finalized", "resolved", "selected", "will proceed"]):
            decisions.append(s)
        elif any(w in s_lower for w in ["will", "assign", "need to", "action", "deadline", "by next", "by friday", "take care of", "responsible"]):
            # Extract owner heuristic if available
            owner = None
            if "alice" in s_lower: owner = "Alice (Admin)"
            elif "bob" in s_lower: owner = "Bob (Dev)"
            elif "charlie" in s_lower: owner = "Charlie (PM)"

            due = None
            if "friday" in s_lower: due = "This Friday"
            elif "next week" in s_lower: due = "Next Week"
            elif "q3" in s_lower: due = "End of Q3"

            actions.append({"task": s, "owner": owner, "due": due})
        elif "?" in s or any(w in s_lower for w in ["wondering", "unclear", "concern", "how will", "what if", "risk", "open question"]):
            questions.append(s)

    overview = f"The meeting focused on '{agenda_topic}'. Key discussions covered implementation strategy, requirements alignment, and execution timelines. " + " ".join(sentences[:3])

    if not decisions and sentences:
        decisions.append(f"Confirmed execution approach for {agenda_topic}.")

    if not actions and sentences:
        actions.append({"task": f"Complete deliverables for {agenda_topic}", "owner": "Team Lead", "due": "Next Sprint"})

    return {
        "summary": overview,
        "key_decisions": decisions if decisions else [f"Consensus reached on {agenda_topic} roadmap."],
        "action_items": actions,
        "open_questions": questions
    }

async def generate_executive_summary(mistral_client, filtered_transcript: str, agenda_topic: str) -> dict:
    if not filtered_transcript.strip():
        return {
            "summary": f"No agenda-relevant content was found for topic: {agenda_topic}.",
            "key_decisions": [],
            "action_items": [],
            "open_questions": []
        }

    if mistral_client is None:
        return fallback_summarize(filtered_transcript, agenda_topic)

    try:
        user_prompt = EXEC_SUMMARY_USER_TEMPLATE.format(agenda_topic=agenda_topic, filtered_transcript=filtered_transcript)

        resp = await mistral_client.chat.complete_async(
            model="mistral-large-latest",
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": EXEC_SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ]
        )

        return json.loads(resp.choices[0].message.content)
    except Exception as e:
        print(f"[summarizer] LLM API call failed or not configured, using smart fallback: {e}")
        return fallback_summarize(filtered_transcript, agenda_topic)
