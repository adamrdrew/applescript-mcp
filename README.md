# 🍎 AppleScript MCP Server

Give Claude the power to control your Mac. This MCP server lets Claude automate applications, manage files, control music, send messages, and much more through AppleScript.

## What Can You Do With It?

Once installed, just ask Claude things like:

- **"What's playing right now?"** — Claude checks Music.app and tells you
- **"Create a reminder to call Mom tomorrow at 3pm"** — Creates it in Reminders
- **"Add a new note called 'Meeting Notes' with today's date"** — Creates it in Notes
- **"Open my Downloads folder"** — Opens it in Finder
- **"What apps are running?"** — Lists your active applications
- **"Play my Chill playlist"** — Starts playback in Music
- **"Get the URL of my current Safari tab"** — Returns the URL
- **"Create a new Calendar event for Friday at 2pm"** — Adds it to Calendar
- **"Show me what's on my clipboard"** — Displays clipboard contents
- **"Send a message to John saying I'm running late"** — Sends via Messages

Claude discovers what's possible, learns what works, and handles errors gracefully.

## Requirements

- **macOS** (AppleScript is macOS-only)
- **Node.js 18+** — [Download here](https://nodejs.org/)
- **Xcode** — Install from the App Store (required for AppleScript dictionaries)

After installing Xcode, run this to verify it's set up correctly:
```bash
sdef /System/Applications/Notes.app | head -5
```

If you see XML output, you're good. If you get an error, run:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

## Installation

### Claude Code

Install via the plugin marketplace:

```
/plugin marketplace add adamrdrew@marketplace
/plugin install applescript-mcp@adamrdrew
```

Restart Claude Code or run `/mcp` to verify it's connected.

### Claude Desktop

Add this to your config file at `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "applescript-mcp": {
      "command": "npx",
      "args": ["-y", "applescript-mcp"]
    }
  }
}
```

Restart Claude Desktop.

## Permissions

The first time Claude tries to control an app, macOS will ask for permission. Grant these in **System Settings → Privacy & Security**:

| Permission | When It's Needed |
|------------|------------------|
| **Automation** | Controlling any app (Finder, Music, Safari, etc.) |
| **Accessibility** | Keyboard simulation, UI automation |
| **Full Disk Access** | Some file operations |

When prompted, allow your terminal app (Terminal, iTerm, Warp, etc.) or Claude Desktop to control the requested application.

## What Apps Work?

Claude can control any "scriptable" macOS application. Most built-in apps are scriptable:

- **Finder** — File and folder operations
- **Music** — Playback, playlists, library access
- **Safari** — Tabs, URLs, reading lists
- **Mail** — Send, read, organize emails
- **Calendar** — Events and reminders
- **Notes** — Create and manage notes
- **Reminders** — Tasks and lists
- **Messages** — Send messages
- **Photos** — Albums and organization
- **Contacts** — Address book access
- **Keynote/Pages/Numbers** — Document automation
- **Terminal** — Script execution

Many third-party apps are also scriptable (Adobe apps, BBEdit, OmniFocus, etc.).

## Safety Features

The server protects you from accidental damage:

| Risk Level | What Happens | Examples |
|------------|--------------|----------|
| **Low** | Runs normally | Get info, read data |
| **Medium** | Warning shown | Sending emails, keystrokes |
| **High** | Blocked until you confirm | Shell commands, quit all apps |
| **Critical** | Blocked until you confirm | Delete all files, empty trash |

If Claude tries something risky, you'll see a warning and can decide whether to proceed.

## Learning System

The server gets smarter over time:

- **Remembers what works** — Successful scripts are saved for future reference
- **Suggests fixes** — When something fails, it offers specific solutions
- **Skill files** — Curated examples for popular apps live in `~/.applescript-mcp/skills/`

## Helpful Error Messages

When something goes wrong, you get actionable fixes:

```
❌ Automation permission denied for Safari.

HOW TO FIX:
1. Open System Settings
2. Go to Privacy & Security → Automation
3. Find your terminal app
4. Enable the toggle for "Safari"
5. Restart your terminal
```

## Troubleshooting

**"Xcode is not installed"**
Install Xcode from the App Store, then run:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

**"Permission denied" errors**
Open System Settings → Privacy & Security → Automation and enable the app.

**Commands don't work on an app**
Not all apps are scriptable. Ask Claude to run `list_scriptable_apps` to see what's available.

**Server not connecting**
- For Claude Code: Run `/mcp` to check status
- For Claude Desktop: Restart the app after editing config

## Contributing

Want to contribute, run from source, or understand the codebase? See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
