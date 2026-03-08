---
name: email
description: Read and send emails via IMAP/POP3 and SMTP. Use when the user wants to check inbox, read emails, search messages, or send emails. Requires config.json with email credentials in the skill directory.
compatibility: Requires Python 3.9+, network access. Credentials stored in skills/email/config.json.
---

# Email Skill

Read and send emails using IMAP (recommended) or POP3 for receiving, and SMTP for sending. Configuration is stored in `config.json`; never commit credentials to version control.

## Configuration

email config file is `skills/email/config.json`

config file content:

| Field | Description |
|-------|-------------|
| `email` | Your full email address |
| `password` | App password or OAuth token (not regular password for Gmail) |
| `imap` | IMAP server (host, port, ssl) |
| `pop3` | POP3 server (host, port, ssl) |
| `smtp` | SMTP server (host, port, ssl) |

**Common providers:**
- Gmail: imap.gmail.com:993, smtp.gmail.com:465 — use [App Password](https://support.google.com/accounts/answer/185833)
- Outlook: imap.outlook.com:993, smtp.office365.com:587 — set `smtp.starttls: true`
- QQ邮箱: imap.qq.com:993, smtp.qq.com:465 — use 授权码

## Available Scripts

- **`scripts/fetch.py`** — Fetch/list emails via IMAP or POP3
- **`scripts/send.py`** — Send email via SMTP

## 执行说明

**重要**：脚本通过 `__file__` 自动定位 `config.json`，可从任意目录执行。推荐使用绝对路径或从工程根目录运行：

```bash
python skills/email/scripts/fetch.py --limit 10
python skills/email/scripts/send.py --to "..." --subject "..." --body "..."
```

## Fetching Emails

Use IMAP (default) or POP3:

```bash
# List recent emails (IMAP, default last 10)
python3 scripts/fetch.py --limit 10

# Use POP3 instead of IMAP
python3 scripts/fetch.py --protocol pop3 --limit 20

# Search by subject (converted to IMAP SUBJECT command)
python3 scripts/fetch.py --search "subject:report"

# Search by sender
python3 scripts/fetch.py --search "from:boss@example.com"

# Search by date range
python3 scripts/fetch.py --search "since:2024-01-01"
python3 scripts/fetch.py --search "before:2024-06-01"

# Combined search
python3 scripts/fetch.py --search "from:boss@example.com subject:report since:2024-01-01"

# Output as JSON (default) or table
python3 scripts/fetch.py --limit 5 --format table

# Read full content of a single email by UID (IMAP) or number (POP3)
python3 scripts/fetch.py --read 42
python3 scripts/fetch.py --protocol pop3 --read 3
```

Output fields: `uid`/`num`, `from`, `to`, `subject`, `date`, `snippet` (or `body` when `--read`).

## Sending Emails

```bash
python3 scripts/send.py --to "recipient@example.com" --subject "Hello" --body "Email body text"

# With CC and BCC
python3 scripts/send.py --to "a@ex.com" --cc "b@ex.com" --bcc "c@ex.com" --subject "..." --body "..."

# HTML body
python3 scripts/send.py --to "user@ex.com" --subject "Report" --body "<h1>Report</h1><p>Content</p>" --html
```

## Workflow

1. **Check if config exists**: `[ -f skills/email/config.json ] || echo "Config missing"`
2. **Fetch emails**: Run `python skills/email/scripts/fetch.py` with `--limit` and optional `--search`
3. **Read specific email**: Use `--read <uid>` with the UID from list output
4. **Send email**: Run `python skills/email/scripts/send.py` with `--to`, `--subject`, `--body`

## Error Handling

- **Config missing**: Ensure `skills/email/config.json` exists and is valid JSON
- **Auth failed**: Verify app password/授权码 (not regular password)
- **Connection refused**: Check host, port, firewall, and SSL setting
- Scripts exit with non-zero on failure; stderr contains diagnostic messages
