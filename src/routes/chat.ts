import { cerebras, CEREBRAS_MODEL } from "../services/cerebras";
import { groq, GROQ_MODEL } from "../services/groq";

// Variable para el round robin (alternador)
let useGroqNext = true;

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

    let stream: any;
    
    // Implementación Round Robin
    if (useGroqNext) {
      stream = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: body.messages as any,
        stream: true,
      });
    } else {
      stream = await cerebras.chat.completions.create({
        model: CEREBRAS_MODEL,
        messages: body.messages as any,
        stream: true,
      });
    }
    
    // Alternamos para la próxima petición
    useGroqNext = !useGroqNext;

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
