# AppleScript MCP - Guide

*Written by drunk-you, for sober-you. You're welcome.*

## Quick Start

1. **Restart Claude Desktop** to pick up the new MCP config
2. Look for the 🔧 tools icon in Claude Desktop - you should see 5 tools
3. Try: "What's happening on my Mac right now?"

---

## The Tools

### Core Tools
| Tool | What It Does |
|------|-------------|
| `list_scriptable_apps` | Shows all 50+ apps you can automate |
| `get_app_dictionary` | Gets the "manual" for any app with examples |
| `execute_applescript` | Runs AppleScript (with safety checks + learning) |
| `validate_applescript` | Checks syntax + safety without running |
| `get_system_state` | Shows what's happening right now |

### Learning Tools
| Tool | What It Does |
|------|-------------|
| `get_workflow_pattern` | Find patterns that worked before for similar tasks |
| `analyze_failure` | Figure out WHY a script failed + get fixes |
| `get_app_skill` | Get curated examples and gotchas for an app |
| `get_smart_suggestion` | AI-powered script suggestions |
| `get_learning_stats` | See what the system has learned |
| `discover_capabilities` | What can I automate? (context-aware) |

---

## Safety Checks (And How to YOLO)

### Default Behavior
Scripts are analyzed for danger before running:
- **Critical/High risk** = BLOCKED (needs `confirmedDangerous: true`)
- **Medium risk** = Warning shown but runs
- **Low/None** = Runs normally

### Going Full YOLO
To disable safety for a specific script, Claude needs to pass `confirmedDangerous: true`.

Just tell Claude: *"Yes, I understand the risks. Run it anyway."*

Claude will then retry with the safety override.

### What Gets Flagged

| Risk | Patterns |
|------|----------|
| 🔴 Critical | `delete every file`, `empty trash`, `delete all events` |
| 🟠 High | `do shell script`, `shutdown`, `restart`, `quit every app` |
| 🟡 Medium | `keystroke`, `key code`, `send` (email) |
| 🟢 Low/None | Everything else |

---

## The Learning System 🧠

The server gets smarter the more you use it. Here's how:

### What Gets Remembered

Every time you run a script, the server logs:
- What you were trying to do (intent)
- The script itself
- Whether it worked or failed
- The result/error message

Successful patterns get a "success count" - the more times something works, the more confident the server is about suggesting it.

### Where It Lives

```
~/.applescript-mcp/
├── learned-patterns.json   # Your execution history
├── patterns-index.json     # Fast lookup by app/action/keyword
└── skills/                 # App-specific guides (*.md)
```

### Using the Learning Tools

**Find what worked before:**
```
"Show me patterns that worked for creating playlists"
→ get_workflow_pattern with intent="create playlist"
```

**Get help when things fail:**
```
"Why did that script fail? How do I fix it?"
→ analyze_failure with the script and error
```

**Get app-specific tips:**
```
"What are the gotchas for Music.app automation?"
→ get_app_skill with app="Music"
```

**Get smart suggestions:**
```
"What's the best way to get unread email count?"
→ get_smart_suggestion with app="Mail", intent="get unread count"
```

### Apps with Skill Files

These apps have curated examples and troubleshooting guides:
- Music (lots of gotchas here!)
- Finder
- Safari
- Mail
- Calendar
- Reminders
- Notes
- Messages
- Contacts
- Photos

---

## The Coolest Apps to Automate

### Finder
```
"Move all screenshots from Desktop to a Screenshots folder"
"Find files larger than 1GB and list them"
"Get the name of whatever I have selected"
```

### Safari
```
"What tabs do I have open?"
"Open these 5 URLs in new tabs"
"Get the URL of the current page"
"Run JavaScript on the current page to extract all links"
```

### Mail
```
"Check for new mail"
"Create a new email to bob@example.com about the project"
"How many unread emails do I have?"
```

### Calendar
```
"What meetings do I have today?"
"Create a meeting for tomorrow at 2pm"
"When is my next event?"
```

### Notes
```
"Create a note with today's thoughts"
"Find notes containing 'project'"
"Add to my Ideas note"
```

### Music
```
"What's playing?"
"Pause the music"
"Play my Chill playlist"
"Skip this track"
```

### Messages
```
"Send a message to Mom saying I'll be late"
"Read my last message from [contact]"
```

### Reminders
```
"Add a reminder to buy milk tomorrow"
"What's on my reminders list?"
"Complete the 'buy milk' reminder"
```

### System Events (Power User Stuff)
```
"What app is in front?"
"List all running apps"
"Hide all apps except the frontmost"
"Click the X button on the current window"
```

---

## Killer Workflows

### 1. Daily Standup Prep
```
"Get my calendar events for today, my unread emails count,
and create a note summarizing what I need to focus on"
```

### 2. Research Mode
```
"Look at my Safari tabs and create a note summarizing
what topics I'm researching based on the URLs"
```

### 3. End of Day
```
"Pause music, close all browser tabs except pinned ones,
and create a note with what tabs I had open"
```

### 4. Context Awareness
```
"What am I working on right now?"
(Uses get_system_state to see frontmost app, clipboard, etc.)
```

### 5. Multi-App Orchestration
```
"Find any PDFs I downloaded today, move them to my
Documents/PDFs folder, and add a reminder to review them"
```

---

## Test Prompts for Claude Desktop

Copy-paste these to try:

### Basic Test
```
What apps can you control on my Mac?
```

### Context Awareness
```
What am I doing right now? What's in my clipboard? What tabs do I have open?
```

### Fun Multi-App
```
I'm researching something in Safari. Look at my open tabs and create
a note summarizing what topics I seem to be interested in. Be creative!
```

### Music Integration
```
What's my current music situation? Am I listening to anything?
What's the volume set to?
```

### Productivity
```
Help me focus. What apps are open that might be distracting me?
Suggest which ones I should close.
```

### Advanced
```
Look at my Safari tabs. For any that are GitHub repos,
tell me what they're about based on the names.
```

### Learning System
```
What have you learned about automating my Mac so far?
```

```
Show me patterns that worked for controlling Music
```

```
What are the gotchas I should know about for Safari automation?
```

### Discovery
```
What can you automate on my Mac right now?
```

```
Tell me more about what you can do with Mail
```

---

## Troubleshooting

### "Permission denied"
1. Open System Settings → Privacy & Security → Automation
2. Find Terminal/iTerm/Claude and enable the apps it needs

### "App not running"
Add `activate` to wake up the app first, or just tell Claude the app isn't open.

### Safety Check Blocked Me
Either:
- Tell Claude you understand and want to proceed anyway
- Or be thankful the safety check saved your ass

---

## Debug Mode

To see what the MCP server is doing:

```bash
cd ~/Development/asmcp/applescript-mcp
node dist/index.js
# Then interact with it via stdin (or just use Claude Desktop)
```

---

## Files of Interest

```
~/Library/Application Support/Claude/claude_desktop_config.json
  → MCP server config

~/Development/asmcp/applescript-mcp/
  → The actual server code

~/Development/asmcp/applescript-mcp/src/tools/execute.ts
  → Where safety checks live (edit DANGEROUS_PATTERNS to customize)

~/Development/asmcp/applescript-mcp/src/learning/
  → The learning system (pattern-store, analyzer, skill-loader)

~/.applescript-mcp/
  → Your learned patterns and skill files (survives reinstalls)
```

---

## Future Ideas (For When You're Sober)

- [ ] Add Shortcuts.app integration
- [ ] Voice control via say command
- [ ] Screen recording automation
- [ ] Auto-screenshot + describe workflow
- [ ] Notification center integration
- [ ] Custom quick actions ("focus mode", "meeting prep")
- [ ] More skill files for additional apps
- [ ] Cross-app workflow templates

---

*Built during a productive evening of pinot noir. 🍷*
