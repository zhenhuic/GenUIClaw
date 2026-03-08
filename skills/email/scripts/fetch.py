#!/usr/bin/env python3
# coding: utf-8
"""
Fetch/list emails via IMAP or POP3. Config from skills/email/config.json.
"""

# requires-python = ">=3.9"
# dependencies = []


import argparse
import json
import os
import sys
from email import policy
from email.parser import BytesParser
from email.utils import parsedate_to_datetime


SNIPPET_MAX_LEN = 200


def load_config():
    skill_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(skill_dir, "config.json")
    if not os.path.exists(config_path):
        error_msg = "Error: config.json not found at {}".format(config_path)
        error_msg += "\nCopy config.example.json to config.json and fill in credentials."
        print(error_msg, file=sys.stderr)
        sys.exit(2)
    with open(config_path, encoding="utf-8") as f:
        return json.load(f)


def parse_search_expr(search: str) -> str:
    """Convert friendly search syntax to IMAP search commands.

    Supported formats:
        subject:keyword   -> SUBJECT "keyword"
        from:addr         -> FROM "addr"
        to:addr           -> TO "addr"
        since:2024-01-01  -> SINCE 01-Jan-2024
        before:2024-01-01 -> BEFORE 01-Jan-2024
        raw IMAP expr     -> passed through as-is (e.g. UNSEEN, ALL)
    """
    if not search or search.upper() == "ALL":
        return "ALL"

    parts = []
    for token in search.split():
        if ":" in token and not token.startswith("("):
            key, _, value = token.partition(":")
            key_lower = key.lower()
            if key_lower == "subject":
                parts.append(f'SUBJECT "{value}"')
            elif key_lower == "from":
                parts.append(f'FROM "{value}"')
            elif key_lower == "to":
                parts.append(f'TO "{value}"')
            elif key_lower in ("since", "after"):
                parts.append(f'SINCE {_format_imap_date(value)}')
            elif key_lower in ("before",):
                parts.append(f'BEFORE {_format_imap_date(value)}')
            else:
                # Unknown prefix, pass through
                parts.append(token)
        else:
            parts.append(token)

    return " ".join(parts) if parts else "ALL"


def _format_imap_date(date_str: str) -> str:
    """Convert YYYY-MM-DD to DD-Mon-YYYY for IMAP SINCE/BEFORE."""
    import datetime
    try:
        dt = datetime.date.fromisoformat(date_str)
        return dt.strftime("%d-%b-%Y")
    except (ValueError, TypeError):
        return date_str


def get_text_body(msg) -> str:
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if ct == "text/plain":
                try:
                    body = part.get_payload(decode=True).decode("utf-8", errors="replace")
                except Exception:
                    pass
                break
            elif ct == "text/html" and not body:
                try:
                    body = part.get_payload(decode=True).decode("utf-8", errors="replace")
                except Exception:
                    pass
    else:
        try:
            body = msg.get_payload(decode=True)
            if body:
                body = body.decode("utf-8", errors="replace")
        except Exception:
            pass
    return body or ""


def _make_snippet(body: str) -> str:
    """Create a consistent snippet from body text."""
    text = body.strip()
    if len(text) > SNIPPET_MAX_LEN:
        return text[:SNIPPET_MAX_LEN] + "..."
    return text


def fetch_imap(config, limit, search_expr, read_uid, fmt, debug=False):
    import imaplib

    imap_cfg = config.get("imap", {})
    host = imap_cfg.get("host", "imap.gmail.com")
    port = imap_cfg.get("port", 993)
    use_ssl = imap_cfg.get("ssl", True)
    email_addr = config["email"]
    password = config["password"]

    klass = imaplib.IMAP4_SSL if use_ssl else imaplib.IMAP4
    with klass(host, port, timeout=30) as imap:
        imap.login(email_addr, password)

        # Some servers (e.g. 163/NetEase) require ID command; harmless for QQ/Gmail
        try:
            imaplib.Commands["ID"] = "NONAUTH"
            imap._simple_command("ID", '("name" "genuiclaw-email" "version" "1.0")')
        except Exception:
            pass

        if debug:
            try:
                list_typ, list_data = imap.list()
                if list_typ == "OK" and list_data:
                    print(f"[DEBUG] Folders: {len(list_data)}", file=sys.stderr)
            except Exception as e:
                print(f"[DEBUG] LIST: {e}", file=sys.stderr)

        select_typ, select_data = imap.select("INBOX", readonly=True)
        if debug:
            print(f"[DEBUG] SELECT: typ={select_typ} data={select_data}", file=sys.stderr)
        if select_typ != "OK":
            print(f"Error: Cannot select INBOX: {select_typ} {select_data}", file=sys.stderr)
            sys.exit(5)

        # --- Read a single email by UID ---
        if read_uid is not None:
            typ, data = imap.uid("FETCH", str(read_uid), "(RFC822)")
            if typ == "OK" and data and data[0] is None:
                # QQ/Tencent servers may return None for UID FETCH; fall back to sequence search
                typ, data = _uid_fallback_fetch(imap, read_uid)
            if typ != "OK" or not data or data[0] is None:
                print(f"Error: Email with UID {read_uid} not found.", file=sys.stderr)
                sys.exit(3)
            raw = data[0][1] if isinstance(data[0], tuple) else data[0]
            msg = BytesParser(policy=policy.default).parsebytes(raw)
            entry = _parse_email_entry(msg, uid=read_uid, full_body=True)
            print(json.dumps(entry, ensure_ascii=False, indent=2))
            return

        # --- List emails ---
        imap_search = parse_search_expr(search_expr)
        if debug:
            print(f"[DEBUG] IMAP SEARCH command: {imap_search}", file=sys.stderr)
        typ, data = imap.search(None, imap_search)
        if debug:
            raw_uids = data[0] if data else b""
            print(f"[DEBUG] SEARCH result: typ={typ} count={len(raw_uids.split()) if raw_uids else 0}", file=sys.stderr)
        if typ != "OK":
            print("Error: Search failed.", file=sys.stderr)
            sys.exit(4)

        all_uids = data[0].split() if data and data[0] else []
        # Most recent first, limited
        selected_uids = list(reversed(all_uids))[:limit] if all_uids else []

        if not selected_uids:
            if debug:
                print("[DEBUG] No UIDs from SEARCH. Inbox may be empty or server returned nothing.", file=sys.stderr)
            print(json.dumps([]))
            return

        # Build a UID -> sequence-number map for fallback
        uid_to_seq = {uid: idx + 1 for idx, uid in enumerate(all_uids)}

        results = []
        for uid in selected_uids:
            typ, data = imap.uid("FETCH", uid, "(RFC822)")
            if typ == "OK" and data and data[0] is None:
                # Fallback: use pre-computed sequence number from full UID list
                seq = uid_to_seq.get(uid)
                if seq is not None:
                    typ, data = imap.fetch(str(seq), "(RFC822)")
            if typ != "OK" or not data or data[0] is None:
                continue
            if isinstance(data[0], tuple) and len(data[0]) >= 2:
                raw = data[0][1]
            elif isinstance(data[0], (bytes, str)):
                raw = data[0] if isinstance(data[0], bytes) else data[0].encode()
            else:
                continue
            msg = BytesParser(policy=policy.default).parsebytes(raw)
            entry = _parse_email_entry(msg, uid=int(uid), full_body=False)
            results.append(entry)

        if fmt == "table":
            _print_table(results)
        else:
            print(json.dumps(results, ensure_ascii=False, indent=2))


def _uid_fallback_fetch(imap, target_uid: int):
    """Fallback for servers that don't support UID FETCH properly.
    Searches ALL to find the sequence number for the given UID."""
    styp, sdata = imap.search(None, "ALL")
    if styp == "OK" and sdata and sdata[0]:
        uids_all = sdata[0].split()
        try:
            idx = next(i for i, x in enumerate(uids_all) if int(x) == target_uid)
            seq = idx + 1
            return imap.fetch(str(seq), "(RFC822)")
        except (ValueError, IndexError, StopIteration):
            pass
    return "NO", None


def _parse_email_entry(msg, uid=None, num=None, full_body=False) -> dict:
    """Extract structured data from a parsed email message."""
    date_h = msg.get("Date", "")
    try:
        dt = parsedate_to_datetime(date_h)
        date_str = dt.isoformat()
    except Exception:
        date_str = date_h

    entry = {}
    if uid is not None:
        entry["uid"] = uid
    if num is not None:
        entry["num"] = num
    entry["from"] = msg.get("From", "")
    entry["to"] = msg.get("To", "")
    entry["subject"] = msg.get("Subject", "")
    entry["date"] = date_str

    body = get_text_body(msg)
    if full_body:
        entry["body"] = body
    else:
        entry["snippet"] = _make_snippet(body)
    return entry


def fetch_pop3(config, limit, read_num, fmt):
    import poplib

    pop_cfg = config.get("pop3", {})
    host = pop_cfg.get("host", "pop.gmail.com")
    port = pop_cfg.get("port", 995)
    use_ssl = pop_cfg.get("ssl", True)
    email_addr = config["email"]
    password = config["password"]

    klass = poplib.POP3_SSL if use_ssl else poplib.POP3
    with klass(host, port, timeout=30) as pop:
        pop.user(email_addr)
        pop.pass_(password)
        num_messages = len(pop.list()[1])

        if read_num is not None:
            if read_num < 1 or read_num > num_messages:
                print(f"Error: Message number {read_num} out of range (1-{num_messages}).", file=sys.stderr)
                sys.exit(3)
            resp, lines, _ = pop.retr(read_num)
            raw = b"\r\n".join(lines)
            msg = BytesParser(policy=policy.default).parsebytes(raw)
            entry = _parse_email_entry(msg, num=read_num, full_body=True)
            print(json.dumps(entry, ensure_ascii=False, indent=2))
            return

        start = max(1, num_messages - limit + 1)
        results = []
        for i in range(num_messages, start - 1, -1):
            # Use TOP to fetch headers + first 0 lines of body (avoids full download)
            try:
                resp, lines, _ = pop.top(i, 0)
            except Exception:
                # Fallback to RETR if server doesn't support TOP
                resp, lines, _ = pop.retr(i)
            raw = b"\r\n".join(lines)
            msg = BytesParser(policy=policy.default).parsebytes(raw)
            entry = _parse_email_entry(msg, num=i, full_body=False)
            results.append(entry)

        if fmt == "table":
            _print_table(results)
        else:
            print(json.dumps(results, ensure_ascii=False, indent=2))


def _print_table(results):
    rows = results
    if not rows:
        print("No messages.")
        return
    key = "uid" if "uid" in rows[0] else "num"
    col_names = [key, "from", "subject", "date"]
    widths = [max(len(str(c)), 4) for c in col_names]
    for r in rows:
        for i, cn in enumerate(col_names):
            val = str(r.get(cn, ""))[:50]
            widths[i] = max(widths[i], len(val))
    sep = " | "
    header = sep.join(cn.ljust(widths[i]) for i, cn in enumerate(col_names))
    print(header)
    print("-" * len(header))
    for r in rows:
        print(sep.join(str(r.get(cn, ""))[:50].ljust(widths[i]) for i, cn in enumerate(col_names)))


def main():
    ap = argparse.ArgumentParser(
        description="Fetch/list emails via IMAP or POP3. Config: skills/email/config.json."
    )
    ap.add_argument("--protocol", choices=["imap", "pop3"], default="imap", help="Protocol (default: imap)")
    ap.add_argument("--limit", type=int, default=10, help="Max emails to list (default: 10)")
    ap.add_argument("--search", type=str, help="Search expression (e.g. subject:report, from:user@ex.com, since:2024-01-01)")
    ap.add_argument("--read", type=int, metavar="UID_OR_NUM", help="Read single email by UID (IMAP) or message num (POP3)")
    ap.add_argument("--format", choices=["json", "table"], default="json", help="Output format (default: json)")
    ap.add_argument("--debug", action="store_true", help="Print debug info to stderr")
    args = ap.parse_args()

    if args.search and args.protocol == "pop3":
        print("Error: --search is only supported with IMAP.", file=sys.stderr)
        sys.exit(1)

    config = load_config()

    if args.protocol == "imap":
        search_expr = args.search if args.search else "ALL"
        fetch_imap(config, args.limit, search_expr, args.read, args.format, args.debug)
    else:
        fetch_pop3(config, args.limit, args.read, args.format)


if __name__ == "__main__":
    main()
