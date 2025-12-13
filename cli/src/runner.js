import { spawn } from "child_process";
import {
  startSession,
  storeUserInput,
  storeRawOutput,
  endSession,
} from "./logger.js";
import { detectTool } from "./detect.js";

export function runTracked(cmd, args = []) {
  const tool = detectTool(cmd) || "unknown";

  const sessionId = startSession(tool, cmd, args);

  const child = spawn(cmd, args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  });

  let inputBuffer = "";
  let outputBuffer = "";
  const userInputs = [];

  // Pass through stdin and capture user input
  process.stdin.on("data", (data) => {
    // Send to child immediately
    child.stdin.write(data);

    const text = data.toString();
    inputBuffer += text;

    // When user hits enter, log the input with timestamp
    if (text.includes("\n")) {
      const lines = inputBuffer.split("\n");

      // Log all complete lines except the last (incomplete) one
      for (let i = 0; i < lines.length - 1; i++) {
        const line = stripAnsi(lines[i]).trim();
        if (
          line &&
          !isCommandPrefix(line) &&
          line !== "exit" &&
          line !== "quit"
        ) {
          const timestamp = Date.now();
          userInputs.push({ text: line, timestamp });
          storeUserInput(sessionId, line, timestamp);
        }
      }

      inputBuffer = lines[lines.length - 1];
    }
  });

  // Capture stdout - pass through and accumulate
  child.stdout.on("data", (data) => {
    // Show to user immediately (with colors and formatting)
    process.stdout.write(data);

    // Accumulate for parsing later
    outputBuffer += data.toString();
  });

  // Capture stderr
  child.stderr.on("data", (data) => {
    process.stderr.write(data);
  });

  child.on("exit", (code) => {
    // Store the raw output and user inputs for parsing
    if (outputBuffer.trim() || userInputs.length > 0) {
      storeRawOutput(sessionId, tool, outputBuffer, userInputs);
    }

    endSession(sessionId, code);
    process.exit(code || 0);
  });

  child.on("error", (err) => {
    console.error("Error:", err.message);
    endSession(sessionId, 1);
    process.exit(1);
  });

  // Handle Ctrl+C gracefully
  process.on("SIGINT", () => {
    if (outputBuffer.trim() || userInputs.length > 0) {
      storeRawOutput(sessionId, tool, outputBuffer, userInputs);
    }
    child.kill("SIGINT");
  });

  process.on("SIGTERM", () => {
    if (outputBuffer.trim() || userInputs.length > 0) {
      storeRawOutput(sessionId, tool, outputBuffer, userInputs);
    }
    child.kill("SIGTERM");
  });
}

// Strip ANSI color codes
function stripAnsi(str) {
  return str.replace(/\u001b\[[0-9;]*m/g, "");
}

// Check if line is a command prefix like >, $, etc
function isCommandPrefix(line) {
  const prefixes = [">", "✦", "$", ">>>", "λ", "❯", ">>"];
  return prefixes.some((p) => line === p || line.startsWith(p + " "));
}
