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
- **Data management** — prune old entries, export all data, view stats

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

## The 15 tools

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
| `decision_search` | Search past decisions by keyword (supports `limit` param) | query |

### Dead Ends

| Tool | Description | Required |
|------|-------------|----------|
| `dead_end_record` | Log a failed approach and the lesson learned | attempted, why_failed |
| `dead_end_search` | Search past dead ends to avoid repeating mistakes (supports `limit` param) | query |

### Context

| Tool | Description | Required |
|------|-------------|----------|
| `full_context_recall` | Get everything — profile, journals, decisions, dead ends. Supports optional `project` filter. | — |

### Data Management

| Tool | Description | Required |
|------|-------------|----------|
| `data_manage` | Prune old entries, export all data, clear stores, or view stats | action |
| `data_list` | Browse stored entries with numbered summaries. Supports search filter. | store |
| `data_delete` | Delete a specific entry by index from `data_list` output | store, entry_index |

**`data_manage` actions:**
- `stats` — entry counts and schema versions for all stores
- `export` — dump all data as JSON
- `prune` — remove entries older than N days (default: 90)
- `clear` — wipe a specific store (journal, decisions, dead_ends, profile, or all)

**`data_list` + `data_delete` workflow:**
1. `data_list` with store="decisions" — see numbered list of all decisions
2. `data_list` with store="decisions", query="minecraft" — filter by keyword
3. `data_delete` with store="decisions", entry_index=3 — remove entry #3 from the list

---

## Why session-forge?

| | session-forge | Basic memory MCPs | Enterprise tools |
|---|---|---|---|
| Setup | `npx session-forge` | Varies | Docker + databases |
| Dead end tracking | Yes | No | No |
| Decision logging | Yes | No | Some |
| Session crash recovery | Yes | Some | Yes |
| Data management | Yes | No | Some |
| User profile | Yes | Some | No |
| Dependencies | 2 (SDK + zod) | Varies | 5-10+ |
| Infrastructure | Zero (plain JSON) | SQLite/ONNX/Vector DB | PostgreSQL + Redis |
| Tools | 15 focused | 4-9 | 37+ |

---

## Configuration

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_FORGE_DIR` | `~/.session-forge` or `%APPDATA%\session-forge` | Override data storage location |
| `SESSION_FORGE_STALE_HOURS` | `24` | Hours before an inactive session is auto-archived |

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

Data files include a `schema_version` field for future migration support.

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

## Changelog

### v1.2.0
- Added `data_list` tool — browse stored entries with numbered summaries, optional search filter
- Added `data_delete` tool — surgically remove individual entries by index
- Users can now see exactly what's stored and delete anything they want

### v1.1.0
- Added `data_manage` tool (stats, export, prune by age, clear per-store)
- Added `project` filter to `full_context_recall`
- Added `limit` param to `decision_search` and `dead_end_search`
- Added error logging to JSON reads (was silently swallowing parse failures)
- Added configurable stale session timeout via `SESSION_FORGE_STALE_HOURS`
- Added `schema_version` to data files for future migration support
- Fixed version mismatch between code and package.json

### v1.0.2
- Initial public release

---

## License

MIT

---

Built by [Jacob Terrell](https://github.com/420247jake)
