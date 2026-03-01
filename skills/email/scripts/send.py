#!/usr/bin/env python3
"""
Send emails via SMTP. Config from skills/email/config.json.
"""
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///

import argparse
import json
import os
import smtplib
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def load_config():
    skill_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(skill_dir, "config.json")
    if not os.path.exists(config_path):
        print(
            f"Error: config.json not found at {config_path}\n"
            "Copy config.example.json to config.json and fill in credentials.",
            file=sys.stderr,
        )
        sys.exit(2)
    with open(config_path, encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser(
        description="Send email via SMTP. Config: skills/email/config.json."
    )
    ap.add_argument("--to", type=str, required=True, help="Recipient email address(es), comma-separated")
    ap.add_argument("--cc", type=str, default="", help="CC addresses, comma-separated")
    ap.add_argument("--bcc", type=str, default="", help="BCC addresses, comma-separated")
    ap.add_argument("--subject", type=str, required=True, help="Email subject")
    ap.add_argument("--body", type=str, required=True, help="Email body (plain text or HTML if --html)")
    ap.add_argument("--html", action="store_true", help="Interpret body as HTML")
    args = ap.parse_args()

    config = load_config()
    smtp_cfg = config.get("smtp", {})
    host = smtp_cfg.get("host", "smtp.gmail.com")
    port = smtp_cfg.get("port", 465)
    use_ssl = smtp_cfg.get("ssl", True)
    use_starttls = smtp_cfg.get("starttls", False)
    email_addr = config["email"]
    password = config["password"]

    to_list = [a.strip() for a in args.to.split(",") if a.strip()]
    if not to_list:
        print("Error: --to must contain at least one valid address.", file=sys.stderr)
        sys.exit(1)

    msg = MIMEMultipart("alternative")
    msg["From"] = email_addr
    msg["To"] = ", ".join(to_list)
    msg["Subject"] = args.subject
    if args.cc:
        msg["Cc"] = args.cc
    if args.bcc:
        msg["Bcc"] = args.bcc

    subtype = "html" if args.html else "plain"
    msg.attach(MIMEText(args.body, subtype, "utf-8"))

    all_recipients = to_list.copy()
    if args.cc:
        all_recipients.extend(a.strip() for a in args.cc.split(",") if a.strip())
    if args.bcc:
        all_recipients.extend(a.strip() for a in args.bcc.split(",") if a.strip())

    try:
        if use_ssl and not use_starttls:
            with smtplib.SMTP_SSL(host, port, timeout=30) as smtp:
                smtp.login(email_addr, password)
                smtp.sendmail(email_addr, all_recipients, msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=30) as smtp:
                if use_starttls or not use_ssl:
                    smtp.starttls()
                smtp.login(email_addr, password)
                smtp.sendmail(email_addr, all_recipients, msg.as_string())
        print("Email sent successfully.")
    except smtplib.SMTPAuthenticationError as e:
        print(f"Error: Authentication failed. Check email and app password.\n{e}", file=sys.stderr)
        sys.exit(5)
    except smtplib.SMTPException as e:
        print(f"Error: SMTP error.\n{e}", file=sys.stderr)
        sys.exit(6)
    except OSError as e:
        print(f"Error: Connection failed (host/port/firewall).\n{e}", file=sys.stderr)
        sys.exit(7)


if __name__ == "__main__":
    main()
