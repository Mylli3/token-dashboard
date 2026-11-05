# Keep the dashboard running

By default the dashboard runs only while its terminal window is open. Follow the steps for your computer below and it starts by itself every time you log in. After that, open it any time from a browser bookmark.

| What you want | How |
|---|---|
| Open it | Bookmark **http://127.0.0.1:8080** |
| It starts on its own | One-time setup below (about 2 minutes) |
| It stays current | It rescans every 30 seconds while running. Nothing to do. |

> Only run one copy. Once auto-start is set up, don't also run `python3 cli.py dashboard` by hand. Two copies fight over the same database file.

## macOS

**Before you start:** keep the `token-dashboard` folder **outside** Desktop, Documents, and Downloads (your home folder is fine, for example `~/token-dashboard`). macOS blocks background programs from reading those three folders, and the dashboard would silently fail to start.

**Set it up.** Open Terminal, go to the folder, and paste this whole block:

```bash
cd ~/token-dashboard          # change this if your folder is somewhere else
PY="$(command -v python3)"
DIR="$(pwd)"
mkdir -p ~/Library/LaunchAgents
cat > ~/Library/LaunchAgents/com.tokendashboard.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.tokendashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PY</string>
    <string>$DIR/cli.py</string>
    <string>dashboard</string>
    <string>--no-open</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/token-dashboard.log</string>
  <key>StandardErrorPath</key><string>/tmp/token-dashboard.log</string>
</dict>
</plist>
EOF
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.tokendashboard.plist
```

Open http://127.0.0.1:8080 to check it works, then bookmark it.

| Task | Command |
|---|---|
| Stop it (until next login) | `launchctl bootout gui/$(id -u)/com.tokendashboard` |
| Remove auto-start for good | Run the stop command, then `rm ~/Library/LaunchAgents/com.tokendashboard.plist` |
| See why it isn't starting | `cat /tmp/token-dashboard.log` |

## Windows

Open **PowerShell**, go to the folder, and paste this block:

```powershell
cd $HOME\token-dashboard      # change this if your folder is somewhere else
$dir = (Get-Location).Path
$startup = [Environment]::GetFolderPath('Startup')
Set-Content "$startup\token-dashboard.cmd" "@echo off`r`ncd /d `"$dir`"`r`nstart `"`" pyw -3 cli.py dashboard --no-open"
& "$startup\token-dashboard.cmd"
```

This puts a small starter file in your Startup folder. `pyw` runs Python without a window, so nothing stays open on your screen. Open http://127.0.0.1:8080 to check, then bookmark it.

| Task | How |
|---|---|
| Stop it (until next login) | Task Manager, Details tab, end `pythonw.exe` |
| Remove auto-start for good | Press Win+R, type `shell:startup`, delete `token-dashboard.cmd` |
| `pyw` not found | Reinstall Python from python.org with "py launcher" ticked, or `winget install Python.Python.3.12` |

## Linux

```bash
cd ~/token-dashboard          # change this if your folder is somewhere else
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/token-dashboard.service <<EOF
[Unit]
Description=Token Dashboard

[Service]
WorkingDirectory=$(pwd)
ExecStart=$(command -v python3) $(pwd)/cli.py dashboard --no-open
Restart=on-failure

[Install]
WantedBy=default.target
EOF
systemctl --user enable --now token-dashboard
```

Stop with `systemctl --user stop token-dashboard`. Remove with `systemctl --user disable --now token-dashboard`. Logs: `journalctl --user -u token-dashboard`.
