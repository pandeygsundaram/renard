import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { parseOutput } from "./parser.js";

const DIR = path.join(os.homedir(), ".renard");
const FILE = path.join(DIR, "logs.jsonl");
fs.mkdirSync(DIR, { recursive: true });

export function startSession(tool, cmd, args) {
  const id = crypto.randomUUID();
  write({
    type: "session_start",
    sessionId: id,
    tool,
    cmd,
    args,
    fullCommand: `${cmd} ${args.join(" ")}`,
  });
  return id;
}

export function storeUserInput(sessionId, text, timestamp) {
  if (!text || !text.trim()) return;

  write({
    type: "user_input",
    sessionId,
    text: text.trim(),
    inputTimestamp: timestamp,
  });
}

export function storeRawOutput(sessionId, tool, rawOutput, userInputs) {
  // Parse the output based on the tool
  const parsedMessages = parseOutput(
    tool,
    rawOutput,
    userInputs.map((u) => u.text)
  );

  // Log each parsed message
  for (const msg of parsedMessages) {
    write({
      type: msg.role === "user" ? "message_user" : "message_assistant",
      sessionId,
      role: msg.role,
      text: msg.text,
      charCount: msg.text.length,
    });
  }

  // Also store the raw output for debugging
  write({
    type: "raw_output",
    sessionId,
    text: rawOutput,
    charCount: rawOutput.length,
  });
}

export function endSession(sessionId, code) {
  write({
    type: "session_end",
    sessionId,
    exitCode: code,
    success: code === 0,
  });
}

export function readLogs(options = {}) {
  if (!fs.existsSync(FILE)) {
    return [];
  }

  const lines = fs.readFileSync(FILE, "utf8").trim().split("\n");
  let logs = lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // Apply filters
  if (options.tool) {
    logs = logs.filter((log) => log.tool === options.tool);
  }

  if (options.sessionId) {
    logs = logs.filter((log) => log.sessionId === options.sessionId);
  }

  if (options.last) {
    logs = logs.slice(-options.last);
  }

  return logs;
}

export function getSessionMessages(sessionId) {
  const logs = readLogs({ sessionId });
  return logs.filter(
    (log) => log.type === "message_user" || log.type === "message_assistant"
  );
}

export function clearLogs() {
  if (fs.existsSync(FILE)) {
    fs.unlinkSync(FILE);
    return true;
  }
  return false;
}

function write(obj) {
  fs.appendFileSync(
    FILE,
    JSON.stringify({
      timestamp: Date.now(),
      date: new Date().toISOString(),
      ...obj,
    }) + "\n"
  );
}
