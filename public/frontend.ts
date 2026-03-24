// ── State ──────────────────────────────────────────────
let currentEndpoint: "health" | "chat" = "chat";
let isStreaming = false;
let abortController: AbortController | null = null;
let chatHistory: { role: string; content: string }[] = [];

// ── DOM refs ───────────────────────────────────────────
const responseArea = document.getElementById("response-area") as HTMLDivElement;
const placeholder = document.getElementById("placeholder") as HTMLDivElement;
const messageInput = document.getElementById("message-input") as HTMLTextAreaElement;
const btnSend = document.getElementById("btn-send") as HTMLButtonElement;
const inputArea = document.getElementById("input-area") as HTMLDivElement;
const panelTitle = document.getElementById("panel-title") as HTMLSpanElement;
const statusBadge = document.getElementById("status-badge") as HTMLDivElement;
const statusText = document.getElementById("status-text") as HTMLSpanElement;

// ── Health check on load ───────────────────────────────
checkHealth();

async function checkHealth() {
  try {
    const res = await fetch("/health");
    if (res.ok) {
      statusBadge.className = "status-badge online";
      statusText.textContent = "online";
    } else {
      statusBadge.className = "status-badge offline";
      statusText.textContent = "offline";
    }
  } catch {
    statusBadge.className = "status-badge offline";
    statusText.textContent = "offline";
  }
}

// ── Endpoint selection ─────────────────────────────────
function selectEndpoint(ep: "health" | "chat") {
  currentEndpoint = ep;

  document.getElementById("ep-health")!.classList.toggle("active", ep === "health");
  document.getElementById("ep-chat")!.classList.toggle("active", ep === "chat");

  if (ep === "health") {
    inputArea.style.display = "none";
    panelTitle.textContent = "GET /health";
  } else {
    inputArea.style.display = "flex";
    panelTitle.textContent = "POST /chat";
  }

  clearResponse();
}

// ── Send request ───────────────────────────────────────
async function sendRequest() {
  if (isStreaming) {
    abortController?.abort();
    return;
  }

  if (currentEndpoint === "health") {
    await sendHealthRequest();
  } else {
    await sendChatRequest();
  }
}

async function sendHealthRequest() {
  setLoading(true);
  clearResponseContent();

  try {
    const res = await fetch("/health");
    const data = await res.json();
    renderJSON(data);
  } catch (err) {
    renderError(err instanceof Error ? err.message : "Request failed");
  } finally {
    setLoading(false);
  }
}

async function sendChatRequest() {
  const message = messageInput.value.trim();
  if (!message) return;

  setLoading(true);
  
  // Hide placeholder
  placeholder.style.display = "none";
  
  // Add user message
  chatHistory.push({ role: "user", content: message });
  renderChatMessage("user", message);

  messageInput.value = "";
  autoResize(messageInput);

  abortController = new AbortController();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
      signal: abortController.signal,
    });

    if (!res.ok) {
      const err = await res.json();
      renderError(err.error || `HTTP ${res.status}`);
      chatHistory.pop();
      setLoading(false);
      return;
    }

    isStreaming = true;
    btnSend.innerHTML = `<div class="spinner"></div> Stop`;

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let usageData: any = null;

    const streamContainer = renderChatStreamContainer();
    const contentEl = streamContainer.querySelector(".stream-content") as HTMLDivElement;
    const cursorEl = document.createElement("span");
    cursorEl.className = "stream-cursor";
    contentEl.appendChild(cursorEl);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);

        if (payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          if (parsed.content) {
            accumulated += parsed.content;
            contentEl.textContent = accumulated;
            contentEl.appendChild(cursorEl);
            responseArea.scrollTop = responseArea.scrollHeight;
          }
          if (parsed.usage) {
            usageData = parsed.usage;
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    // Remove cursor, show usage
    cursorEl.remove();

    chatHistory.push({ role: "assistant", content: accumulated });

    if (usageData) {
      const usageEl = document.createElement("div");
      usageEl.className = "stream-usage";
      usageEl.textContent = `tokens → prompt: ${usageData.prompt_tokens ?? "?"} · completion: ${usageData.completion_tokens ?? "?"} · total: ${usageData.total_tokens ?? "?"}`;
      streamContainer.appendChild(usageEl);
      responseArea.scrollTop = responseArea.scrollHeight;
    }
  } catch (err: any) {
    if (err.name !== "AbortError") {
      renderError(err.message || "Stream failed");
    }
  } finally {
    isStreaming = false;
    abortController = null;
    setLoading(false);
  }
}

// ── UI helpers ─────────────────────────────────────────
function setLoading(loading: boolean) {
  if (loading && currentEndpoint === "health") {
    btnSend.innerHTML = `<div class="spinner"></div> Loading`;
    btnSend.disabled = true;
  } else if (!loading) {
    btnSend.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
      Enviar`;
    btnSend.disabled = false;
  }
}

function clearResponse() {
  chatHistory = [];
  clearResponseContent();
  placeholder.style.display = "flex";
}

function clearResponseContent() {
  responseArea.innerHTML = "";
  responseArea.appendChild(placeholder);
  placeholder.style.display = "flex";
}

function renderJSON(data: any) {
  placeholder.style.display = "none";
  const pre = document.createElement("pre");
  pre.className = "json-response";
  pre.innerHTML = syntaxHighlight(JSON.stringify(data, null, 2));
  responseArea.appendChild(pre);
}

function renderError(msg: string) {
  placeholder.style.display = "none";
  const div = document.createElement("div");
  div.className = "error-msg";
  div.textContent = `Error: ${msg}`;
  responseArea.appendChild(div);
  responseArea.scrollTop = responseArea.scrollHeight;
}

function renderChatMessage(role: "user" | "assistant", content: string) {
  const container = document.createElement("div");
  container.className = `chat-message ${role}`;
  
  if (role === "assistant") {
    const nameEl = document.createElement("div");
    nameEl.className = "chat-name";
    nameEl.textContent = "AI";
    container.appendChild(nameEl);
  }
  
  const textEl = document.createElement("div");
  textEl.textContent = content;
  container.appendChild(textEl);
  
  responseArea.appendChild(container);
  responseArea.scrollTop = responseArea.scrollHeight;
}

function renderChatStreamContainer() {
  const container = document.createElement("div");
  container.className = "chat-message assistant";
  
  const nameEl = document.createElement("div");
  nameEl.className = "chat-name";
  nameEl.textContent = "AI";
  container.appendChild(nameEl);
  
  const contentEl = document.createElement("div");
  contentEl.className = "stream-content";
  container.appendChild(contentEl);
  
  responseArea.appendChild(container);
  responseArea.scrollTop = responseArea.scrollHeight;
  return container;
}

function syntaxHighlight(json: string): string {
  return json.replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = "json-number";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "json-key";
        } else {
          cls = "json-string";
        }
      } else if (/true|false/.test(match)) {
        cls = "json-boolean";
      } else if (/null/.test(match)) {
        cls = "json-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendRequest();
  }
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

// ── Expose to inline handlers ──────────────────────────
(window as any).selectEndpoint = selectEndpoint;
(window as any).sendRequest = sendRequest;
(window as any).clearResponse = clearResponse;
(window as any).handleKeydown = handleKeydown;
(window as any).autoResize = autoResize;

// ── Init: auto-fetch health if that tab is selected ────
selectEndpoint("chat");
