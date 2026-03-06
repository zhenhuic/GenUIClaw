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


def load_config():
    skill_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(skill_dir, "config.json")
    if not os.path.exists(config_path):
        print(
            f"Error: config.json not found at {config_path}\nCopy config.example.json to config.json and fill in credentials.",
            file=sys.stderr,
        )
        sys.exit(2)
    with open(config_path, encoding="utf-8") as f:
        return json.load(f)


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

        # 网易邮箱需 ID 命令，QQ/Gmail 无影响，统一发送以兼容
        try:
            imaplib.Commands["ID"] = "NONAUTH"
            imap._simple_command("ID", '("name" "genuiclaw-email" "version" "1.0")')
        except (KeyError, Exception):
            pass

        if debug:
            try:
                list_typ, list_data = imap.list()
                if list_typ == "OK" and list_data:
                    print(f"[DEBUG] Folders: {len(list_data)}", file=sys.stderr)
            except Exception as e:
                print(f"[DEBUG] LIST: {e}", file=sys.stderr)

        # 使用 INBOX（RFC 标准名），避免部分服务器对 "inbox" 大小写敏感
        select_typ, select_data = imap.select("INBOX", readonly=True)
        if debug:
            print(f"[DEBUG] SELECT: typ={select_typ} data={select_data}", file=sys.stderr)
        if select_typ != "OK":
            print(f"Error: Cannot select INBOX: {select_typ} {select_data}", file=sys.stderr)
            sys.exit(5)

        if read_uid is not None:
            typ, data = imap.uid("FETCH", str(read_uid), "(RFC822)")
            if typ == "OK" and data and data[0] is None:
                # QQ 等服务器 UID FETCH 返回 None，改用 sequence-number FETCH
                styp, sdata = imap.search(None, "ALL")
                if styp == "OK" and sdata and sdata[0]:
                    uids_all = sdata[0].split()
                    try:
                        idx = next(i for i, x in enumerate(uids_all) if int(x) == read_uid)
                        seq = idx + 1
                        typ, data = imap.fetch(str(seq), "(RFC822)")
                    except (ValueError, IndexError, StopIteration):
                        pass
            if typ != "OK" or not data or data[0] is None:
                print(f"Error: Email with UID {read_uid} not found.", file=sys.stderr)
                sys.exit(3)
            raw = data[0][1] if isinstance(data[0], tuple) else data[0]
            msg = BytesParser(policy=policy.default).parsebytes(raw)
            date_h = msg.get("Date", "")
            try:
                dt = parsedate_to_datetime(date_h)
                date_str = dt.isoformat()
            except Exception:
                date_str = date_h

            entry = {
                "uid": read_uid,
                "from": msg.get("From", ""),
                "to": msg.get("To", ""),
                "subject": msg.get("Subject", ""),
                "date": date_str,
                "body": get_text_body(msg),
            }
            print(json.dumps(entry, ensure_ascii=False, indent=2))
            return

        if search_expr:
            typ, data = imap.search(None, search_expr)
        else:
            typ, data = imap.search(None, "ALL")
        if debug:
            raw_uids = data[0] if data else b""
            print(f"[DEBUG] SEARCH {search_expr!r}: typ={typ} raw_uids={raw_uids!r} len={len(data)}", file=sys.stderr)
        if typ != "OK":
            print("Error: Search failed.", file=sys.stderr)
            sys.exit(4)
        uids = (data[0].split() if data and data[0] else [])
        uids = list(reversed(uids))[:limit] if uids else []

        if not uids:
            if debug:
                print("[DEBUG] No UIDs from SEARCH. Inbox may be empty or server returned nothing.", file=sys.stderr)
            print(json.dumps([]))
            return

        results = []
        for uid in uids:
            # QQ/腾讯等服务器对 UID FETCH 返回 data[0]=None，需回退到 sequence-number FETCH
            typ, data = imap.uid("FETCH", uid, "(RFC822)")
            if typ == "OK" and data and data[0] is None:
                seq = uids.index(uid) + 1
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
            date_h = msg.get("Date", "")
            try:
                dt = parsedate_to_datetime(date_h)
                date_str = dt.isoformat()
            except Exception:
                date_str = date_h
            body = get_text_body(msg)
            snippet = (body[:200] + "...") if len(body) > 200 else body
            results.append(
                {
                    "uid": int(uid),
                    "from": msg.get("From", ""),
                    "to": msg.get("To", ""),
                    "subject": msg.get("Subject", ""),
                    "date": date_str,
                    "snippet": snippet.strip()[:150],
                }
            )

        if fmt == "table":
            _print_table(results)
        else:
            print(json.dumps(results, ensure_ascii=False, indent=2))


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
            if resp.decode() != "+OK":
                print("Error: Failed to retrieve message.", file=sys.stderr)
                sys.exit(4)
            raw = b"\r\n".join(lines)
            msg = BytesParser(policy=policy.default).parsebytes(raw)
            date_h = msg.get("Date", "")
            try:
                dt = parsedate_to_datetime(date_h)
                date_str = dt.isoformat()
            except Exception:
                date_str = date_h
            entry = {
                "num": read_num,
                "from": msg.get("From", ""),
                "to": msg.get("To", ""),
                "subject": msg.get("Subject", ""),
                "date": date_str,
                "body": get_text_body(msg),
            }
            print(json.dumps(entry, ensure_ascii=False, indent=2))
            return

        start = max(1, num_messages - limit + 1)
        results = []
        for i in range(num_messages, start - 1, -1):
            resp, lines, _ = pop.retr(i)
            if resp.decode() != "+OK":
                continue
            raw = b"\r\n".join(lines)
            msg = BytesParser(policy=policy.default).parsebytes(raw)
            date_h = msg.get("Date", "")
            try:
                dt = parsedate_to_datetime(date_h)
                date_str = dt.isoformat()
            except Exception:
                date_str = date_h
            body = get_text_body(msg)
            snippet = (body[:200] + "...") if len(body) > 200 else body
            results.append(
                {
                    "num": i,
                    "from": msg.get("From", ""),
                    "to": msg.get("To", ""),
                    "subject": msg.get("Subject", ""),
                    "date": date_str,
                    "snippet": snippet.strip()[:150],
                }
            )

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
    ap.add_argument("--search", type=str, help="IMAP search expression (e.g. subject:report, from:user@ex.com)")
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
