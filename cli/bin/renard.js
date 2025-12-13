#!/usr/bin/env node
import { Command } from "commander";
import { install, uninstall, status } from "../src/installer.js";
import { runTracked } from "../src/runner.js";
import { readLogs, clearLogs, getSessionMessages } from "../src/logger.js";

const program = new Command();

program
  .name("renard")
  .description("Track LLM CLI interactions")
  .version("0.1.0");

program
  .command("install")
  .description("Hook Claude, OpenAI and Gemini CLIs")
  .action(install);

program
  .command("uninstall")
  .description("Restore original CLIs")
  .action(uninstall);

program.command("status").description("Show tracked CLIs").action(status);

// INTERNAL: used by shims
program
  .command("run <realCmd> [args...]")
  .allowUnknownOption(true)
  .action(runTracked);

program
  .command("logs")
  .description("View collected LLM CLI logs")
  .option("--tool <name>", "Filter by tool (claude, openai, gemini)")
  .option("--last <n>", "Show last N sessions", "10")
  .option("--full", "Show full conversation details")
  .option("--session <id>", "Show specific session")
  .action(async (opts) => {
    const logs = readLogs({
      tool: opts.tool,
      last: opts.session ? undefined : Number(opts.last) * 10, // Get more entries to find N sessions
      sessionId: opts.session,
    });

    if (logs.length === 0) {
      console.log("No logs found");
      return;
    }

    // Group by session
    const sessions = {};
    for (const log of logs) {
      if (!sessions[log.sessionId]) {
        sessions[log.sessionId] = [];
      }
      sessions[log.sessionId].push(log);
    }

    // Get last N sessions
    const sessionIds = Object.keys(sessions).slice(-Number(opts.last));

    for (const sessionId of sessionIds) {
      const sessionLogs = sessions[sessionId];
      const start = sessionLogs.find((l) => l.type === "session_start");
      const end = sessionLogs.find((l) => l.type === "session_end");
      const messages = sessionLogs.filter((l) => l.type === "message");

      if (!start) continue;

      const date = new Date(start.timestamp);
      const tool = start.tool || "unknown";
      const success = end?.success ? "✓" : "✗";

      console.log(`\n${"=".repeat(80)}`);
      console.log(`${success} [${tool}] ${date.toLocaleString()}`);
      console.log(`Session: ${sessionId.slice(0, 8)}`);
      console.log(`Command: ${start.fullCommand || start.cmd}`);
      console.log(`${"=".repeat(80)}`);

      if (opts.full || opts.session) {
        for (const msg of messages) {
          const role = msg.role.toUpperCase().padEnd(10);
          const preview =
            msg.text.length > 500 && !opts.session
              ? msg.text.slice(0, 500) + "..."
              : msg.text;

          console.log(`\n${role}: ${preview}`);
        }
      } else {
        // Show summary
        const userMsgs = messages.filter((m) => m.role === "user");
        const assistantMsgs = messages.filter((m) => m.role === "assistant");

        console.log(
          `Messages: ${userMsgs.length} user, ${assistantMsgs.length} assistant`
        );

        if (userMsgs.length > 0) {
          const preview = userMsgs[0].text.slice(0, 100);
          console.log(
            `User: ${preview}${userMsgs[0].text.length > 100 ? "..." : ""}`
          );
        }
      }
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log(`Total sessions shown: ${sessionIds.length}`);
    console.log(
      `\nTip: Use --full to see complete messages, --session <id> for specific session`
    );
  });

program
  .command("clear")
  .description("Clear all collected logs")
  .option("-y, --yes", "Skip confirmation")
  .action(async (opts) => {
    const readline = await import("readline");

    if (!opts.yes) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) =>
        rl.question(
          "This will permanently delete all renard logs. Continue? (y/N) ",
          resolve
        )
      );

      rl.close();

      if (!/^y(es)?$/i.test(answer.trim())) {
        console.log("Aborted");
        return;
      }
    }

    const cleared = clearLogs();
    if (cleared) {
      console.log("✓ Logs cleared successfully");
    } else {
      console.log("No logs to clear");
    }
  });

program
  .command("export")
  .description("Export logs to JSON file")
  .option("--tool <name>", "Filter by tool")
  .option("--output <file>", "Output file", "renard-export.json")
  .action(async (opts) => {
    const fs = await import("fs");
    const logs = readLogs({ tool: opts.tool });

    if (logs.length === 0) {
      console.log("No logs to export");
      return;
    }

    fs.writeFileSync(opts.output, JSON.stringify(logs, null, 2));
    console.log(`✓ Exported ${logs.length} log entries to ${opts.output}`);
  });

function printBanner() {
  console.log(`

██████╗ ███████╗███╗   ██╗ █████╗ ██████╗ ██████╗ 
██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔══██╗██╔══██╗
██████╔╝█████╗  ██╔██╗ ██║███████║██████╔╝██║  ██║
██╔══██╗██╔══╝  ██║╚██╗██║██╔══██║██╔══██╗██║  ██║
██║  ██║███████╗██║ ╚████║██║  ██║██║  ██║██████╔╝
╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ 

🦊  Renard — understanding what work actually happened
`);
}

if (process.argv.length <= 2) {
  printBanner();
}

program.parse();
