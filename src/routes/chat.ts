import { openrouter } from "../services/openrouter";

interface ChatRequestBody {
  messages: { role: string; content: string }[];
}

export async function handleChat(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as ChatRequestBody;

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return Response.json(
        { error: "Field 'messages' array is required" },
        { status: 400 }
      );
    }

    const stream = await openrouter.chat.send({
      chatGenerationParams: {
        model: "openrouter/free",
        messages: body.messages as any,
        stream: true,
      },
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;

          if (content) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
            );
          }

          if (chunk.usage) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ usage: chunk.usage })}\n\n`
              )
            );
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
