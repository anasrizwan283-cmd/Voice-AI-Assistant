from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, inference

server = AgentServer()


class NovaAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="""
You are Nova, a friendly and intelligent Voice AI Assistant.
Your name is Nova.
Speak naturally like a helpful human.
Be friendly, confident and conversational.
Give clear and useful answers.
You are excellent at programming, technology, study help,
and general knowledge.
"""
        )


@server.rtc_session(agent_name="nova")
async def entrypoint(ctx: agents.JobContext):

    session = AgentSession(
        stt="deepgram/nova-3:en",
        llm="google/gemma-4-31b-it",
        tts=inference.TTS(
            model="inworld/inworld-tts-2",
            voice="Ashley",
        ),
    )

    await session.start(
        room=ctx.room,
        agent=NovaAgent(),
    )

    await session.generate_reply(
        instructions="Greet the user briefly and ask how you can help."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)