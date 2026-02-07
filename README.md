# session-forge

**Never start from zero.** Persistent session intelligence for AI coding assistants.

Session-forge gives your AI coding assistant memory that survives across sessions. It tracks decisions, dead ends, user preferences, and session state — so every conversation builds on the last one instead of starting from scratch.

Works with **Claude Code**, **Cursor**, **Windsurf**, and any MCP-compatible client.

---

## What it does

- **Session crash recovery** — checkpoint your work, pick up where you left off
- **Decision logging** — record why you chose X over Y, search it later
- **Dead end tracking** — never repeat the same debugging mistake twice
- **User profile** — AI remembers your name, preferences, and projects
- **Session journal** — capture the journey, not just the task
- **Full context recall** — bootstrap a new session with everything in one call

## Quick start

### Claude Code

```bash
claude mcp add session-forge -- npx session-forge
```

### Cursor / Windsurf

Add to your MCP settings:

```json
{
  "mcpServers": {
    "session-forge": {
      "command": "npx",
      "args": ["-y", "session-forge"]
    }
  }
}
```

That's it. No database, no Docker, no config files.

---

## The 12 tools

### Sessions

| Tool | Description | Required |
|------|-------------|----------|
| `session_checkpoint` | Save work-in-progress state for crash recovery | task, intent, next_steps |
| `session_restore` | Check for interrupted work from a previous session | — |
| `session_complete` | Archive session and mark complete | — |

### Profile

| Tool | Description | Required |
|------|-------------|----------|
| `profile_get` | Get the current user profile | — |
| `profile_update` | Update name, preferences, projects, or notes | — |

### Journal

| Tool | Description | Required |
|------|-------------|----------|
| `journal_entry` | Record session summary with breakthroughs and frustrations | summary |
| `journal_recall` | Retrieve recent session journals | — |

### Decisions

| Tool | Description | Required |
|------|-------------|----------|
| `decision_record` | Log a significant decision with alternatives and reasoning | choice, reasoning |
| `decision_search` | Search past decisions by keyword | query |

### Dead Ends

| Tool | Description | Required |
|------|-------------|----------|
| `dead_end_record` | Log a failed approach and the lesson learned | attempted, why_failed |
| `dead_end_search` | Search past dead ends to avoid repeating mistakes | query |

### Context

| Tool | Description | Required |
|------|-------------|----------|
| `full_context_recall` | Get everything — profile, journals, decisions, dead ends | — |

---

## Why session-forge?

| | session-forge | Basic memory MCPs | Enterprise tools |
|---|---|---|---|
| Setup | `npx session-forge` | Varies | Docker + databases |
| Dead end tracking | Yes | No | No |
| Decision logging | Yes | No | Some |
| Session crash recovery | Yes | Some | Yes |
| User profile | Yes | Some | No |
| Dependencies | 2 (SDK + zod) | Varies | 5-10+ |
| Infrastructure | Zero (plain JSON) | SQLite/ONNX/Vector DB | PostgreSQL + Redis |
| Tools | 12 focused | 4-9 | 37+ |

---

## Storage

All data is stored locally as plain JSON files:

| Platform | Location |
|----------|----------|
| Linux / macOS | `~/.session-forge/` |
| Windows | `%APPDATA%\session-forge\` |

Override with the `SESSION_FORGE_DIR` environment variable:

```bash
SESSION_FORGE_DIR=/custom/path npx session-forge
```

Files:
```
~/.session-forge/
  profile.json        # User preferences and projects
  journal.json        # Session summaries (last 100)
  decisions.json      # Decision log (last 200)
  dead-ends.json      # Failed approaches (last 100)
  sessions/
    active.json       # Current checkpoint
    history/          # Archived sessions
```

---

## CLAUDE.md template

Add this to your project's `CLAUDE.md` to teach the AI when to call each tool:

```markdown
## Session Flow

### Fresh session
1. Call `full_context_recall` — get profile, journals, decisions, dead ends
2. Call `session_restore` — check for interrupted work

### During work
- `decision_record` — when making a significant architectural choice
- `dead_end_record` — when something fails and we learn why
- `session_checkpoint` — every 10-15 tool calls during long sessions

### Session end
1. Call `journal_entry` — record what happened
2. Call `session_complete` — archive the checkpoint
```

---

## License

MIT

---

Built by [Jacob Terrell](https://github.com/420247jake)
