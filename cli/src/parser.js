// Parse LLM CLI outputs into structured conversations

export function parseOutput(tool, rawOutput, userInputs) {
  switch (tool) {
    case "claude":
      return parseClaudeCode(rawOutput, userInputs);
    case "gemini":
      return parseGemini(rawOutput, userInputs);
    case "openai":
      return parseOpenAI(rawOutput, userInputs);
    default:
      return parseGeneric(rawOutput, userInputs);
  }
}

// Parse Claude Code output
function parseClaudeCode(rawOutput, userInputs) {
  const messages = [];
  const clean = stripAnsi(rawOutput);

  // Claude Code typically has clear user/assistant exchanges
  // Look for patterns like:
  // "You: [user input]"
  // "Claude: [response]"

  const lines = clean.split("\n");
  let currentRole = null;
  let currentText = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect role switches
    if (trimmed.match(/^(You|User):/i)) {
      if (currentRole && currentText.length > 0) {
        messages.push({
          role: currentRole,
          text: currentText.join("\n").trim(),
        });
      }
      currentRole = "user";
      currentText = [trimmed.replace(/^(You|User):/i, "").trim()];
    } else if (trimmed.match(/^(Claude|Assistant):/i)) {
      if (currentRole && currentText.length > 0) {
        messages.push({
          role: currentRole,
          text: currentText.join("\n").trim(),
        });
      }
      currentRole = "assistant";
      currentText = [trimmed.replace(/^(Claude|Assistant):/i, "").trim()];
    } else if (currentRole && trimmed) {
      currentText.push(trimmed);
    }
  }

  // Add final message
  if (currentRole && currentText.length > 0) {
    messages.push({
      role: currentRole,
      text: currentText.join("\n").trim(),
    });
  }

  // Combine with captured user inputs
  return combineWithUserInputs(messages, userInputs);
}

// Parse Gemini output
function parseGemini(rawOutput, userInputs) {
  const messages = [];
  const clean = stripAnsi(rawOutput);

  // Split by the sparkle symbol (✦) which indicates assistant responses
  const parts = rawOutput.split("✦");

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const cleaned = stripAnsi(part)
      .split("\n")
      .filter((line) => {
        const l = line.trim();
        // Remove UI elements
        return (
          l &&
          !l.match(/^[╭╮│╰╯─┬┴├┤┼═║╔╗╚╝]+$/) &&
          !l.includes("Type your message") &&
          !l.startsWith(">")
        );
      })
      .join("\n")
      .trim();

    if (cleaned && cleaned.length > 10) {
      messages.push({
        role: "assistant",
        text: cleaned,
      });
    }
  }

  return combineWithUserInputs(messages, userInputs);
}

// Parse OpenAI CLI output
function parseOpenAI(rawOutput, userInputs) {
  const messages = [];
  const clean = stripAnsi(rawOutput);

  // OpenAI CLI format varies, try to detect patterns
  const lines = clean.split("\n");
  let assistantText = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith(">") && !trimmed.startsWith("$")) {
      assistantText.push(trimmed);
    }
  }

  if (assistantText.length > 0) {
    messages.push({
      role: "assistant",
      text: assistantText.join("\n").trim(),
    });
  }

  return combineWithUserInputs(messages, userInputs);
}

// Generic parser for unknown tools
function parseGeneric(rawOutput, userInputs) {
  const messages = [];
  const clean = stripAnsi(rawOutput);

  // Just capture the output as a single assistant message
  if (clean.trim()) {
    messages.push({
      role: "assistant",
      text: clean.trim(),
    });
  }

  return combineWithUserInputs(messages, userInputs);
}

// Combine parsed messages with captured user inputs
function combineWithUserInputs(parsedMessages, userInputs) {
  const result = [];

  // Add user inputs
  for (const input of userInputs) {
    result.push({
      role: "user",
      text: input,
      timestamp: Date.now(),
    });
  }

  // Add assistant messages
  for (const msg of parsedMessages) {
    result.push({
      role: msg.role,
      text: msg.text,
      timestamp: Date.now(),
    });
  }

  // Sort by timestamp if available
  result.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  return result;
}

// Strip ANSI escape codes
function stripAnsi(str) {
  return str
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\u001b\][0-9;]*\u0007/g, "")
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");
}
