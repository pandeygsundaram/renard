#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// ESM __dirname / __filename fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CLINE_DATA_DIR = path.join(
  os.homedir(),
  '.config/Code/User/globalStorage/saoudrizwan.claude-dev/tasks'
);

const STATE_FILE = '.cline-backup-state.json';
const DEFAULT_OUTPUT_DIR = './cline-backups';

// Parse command line arguments
const args = process.argv.slice(2);
const forceBackup = args.includes('--force');
const outputDirIndex = args.indexOf('--output');

const OUTPUT_DIR =
  outputDirIndex >= 0 && args[outputDirIndex + 1]
    ? args[outputDirIndex + 1]
    : DEFAULT_OUTPUT_DIR;

// Utility functions
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading state file:', error.message);
  }
  return { backedUpTasks: [], lastBackupTimestamp: null };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function formatTimestamp(ts) {
  const date = new Date(ts);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function getBackupFilename() {
  return new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '-');
}

function formatMessageForMarkdown(msg) {
  const timestamp = formatTimestamp(msg.ts);
  let content = '';

  switch (msg.say) {
    case 'text':
      content = `**User**: ${msg.text}`;
      break;
    case 'user_feedback':
      content = `**User Feedback**: ${msg.text}`;
      break;
    case 'completion_result':
      content = `**Assistant**: ${msg.text}`;
      break;
    case 'reasoning':
      content = `**Assistant Reasoning**: ${msg.text}`;
      break;
    case 'api_req_started':
      content = '**[API Request Started]**';
      break;
    case 'checkpoint_created':
      content = '**[Checkpoint Created]**';
      break;
    default:
      if (msg.type === 'ask') {
        content = `**[System Ask]: ${msg.ask}**`;
      } else if (msg.text) {
        content = msg.text;
      }
  }

  return content ? `[${timestamp}] ${content}\n\n` : '';
}

function readTaskData(taskPath) {
  const readJson = (file) =>
    fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;

  return {
    metadata: readJson(path.join(taskPath, 'task_metadata.json')),
    uiMessages: readJson(path.join(taskPath, 'ui_messages.json')),
    apiHistory: readJson(path.join(taskPath, 'api_conversation_history.json'))
  };
}

function generateMarkdown(tasks) {
  let markdown = '# Cline Chat Backup\n\n';
  markdown += `Backup Date: ${new Date().toLocaleString()}\n\n`;
  markdown += `Total Tasks: ${tasks.length}\n\n---\n\n`;

  for (const task of tasks) {
    markdown += `## Task: ${task.taskId}\n\n`;
    markdown += `**Started**: ${formatTimestamp(Number(task.taskId))}\n\n`;

    const model = task.data.metadata?.model_usage?.[0];
    if (model) {
      markdown += `**Model**: ${model.model_id} (${model.mode} mode)\n\n`;
    }

    markdown += '### Conversation\n\n';

    if (Array.isArray(task.data.uiMessages)) {
      for (const msg of task.data.uiMessages) {
        markdown += formatMessageForMarkdown(msg);
      }
    } else {
      markdown += '*No messages found*\n\n';
    }

    markdown += '\n---\n\n';
  }

  return markdown;
}

async function main() {
  console.log('🔍 Cline Chat Backup Tool\n');

  if (!fs.existsSync(CLINE_DATA_DIR)) {
    console.error(`❌ Cline data directory not found: ${CLINE_DATA_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }

  const state = forceBackup
    ? { backedUpTasks: [], lastBackupTimestamp: null }
    : loadState();

  const taskDirs = fs.readdirSync(CLINE_DATA_DIR)
    .filter(d => fs.statSync(path.join(CLINE_DATA_DIR, d)).isDirectory())
    .sort();

  const newTasks = forceBackup
    ? taskDirs
    : taskDirs.filter(id => !state.backedUpTasks.includes(id));

  if (!newTasks.length) {
    console.log('✅ No new tasks to backup.');
    return;
  }

  const tasksData = newTasks.map(taskId => ({
    taskId,
    data: readTaskData(path.join(CLINE_DATA_DIR, taskId))
  }));

  const filename = getBackupFilename();

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `cline-backup-${filename}.json`),
    JSON.stringify({ backupDate: new Date().toISOString(), tasks: tasksData }, null, 2)
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `cline-backup-${filename}.md`),
    generateMarkdown(tasksData)
  );

  state.backedUpTasks.push(...newTasks);
  state.lastBackupTimestamp = Date.now();
  saveState(state);

  console.log(`✅ Backup complete. ${newTasks.length} task(s) saved.`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
