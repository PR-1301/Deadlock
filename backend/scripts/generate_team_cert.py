#!/usr/bin/env python3
import sys
import os
import json
import re
import zipfile
import argparse
import cairo

def sanitize_filename(name):
    # Keep alphanumeric, spaces, dashes, dots, underscores
    sanitized = re.sub(r'[^\w\s\.-]', '_', name).strip()
    return sanitized

def render_certificate(template_path, member_name, out_path, font_family="Pixelon"):
    surf = cairo.ImageSurface.create_from_png(template_path)
    cr = cairo.Context(surf)

    # 1. Clear original "Participant Name _" placeholder cleanly
    cr.set_source_rgb(1.0, 1.0, 1.0)
    cr.rectangle(200, 680, 1600, 140)
    cr.fill()

    # 2. Typography configuration matching template
    cr.select_font_face(font_family, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    cr.set_font_size(80)

    xb, yb, text_w, text_h, xa, ya = cr.text_extents(member_name)
    gap = 26
    cursor_w = 38
    cursor_h = 16

    total_w = text_w + gap + cursor_w
    # Center horizontally across 2000px canvas
    x = (2000.0 - total_w) / 2.0
    y = 776.0 # exact baseline matching template

    # 3. Draw participant name in black
    cr.set_source_rgb(0.0, 0.0, 0.0)
    cr.move_to(x - xb, y)
    cr.show_text(member_name)

    # 4. Draw orange cursor block
    cur_x = x - xb + text_w + gap
    cur_y = 763.0
    cr.set_source_rgb(255.0 / 255.0, 122.0 / 255.0, 80.0 / 255.0) # #FF7A50
    cr.rectangle(cur_x, cur_y, cursor_w, cursor_h)
    cr.fill()

    # 5. Save output PNG
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    surf.write_to_png(out_path)

def main():
    parser = argparse.ArgumentParser(description="Generate team certificates zip")
    parser.add_argument("--team-name", required=True, help="Team name")
    parser.add_argument("--members", required=True, help="JSON array of member names")
    parser.add_argument("--template", required=True, help="Path to template LOC-Certificate.png")
    parser.add_argument("--output-zip", required=True, help="Path for generated zip file")
    parser.add_argument("--temp-dir", default="/tmp/loc_certs", help="Temporary working directory")

    args = parser.parse_args()

    team_name = args.team_name
    members = json.loads(args.members)
    template_path = os.path.abspath(args.template)
    output_zip = os.path.abspath(args.output_zip)

    if not os.path.exists(template_path):
        print(f"Error: Template not found at {template_path}", file=sys.stderr)
        sys.exit(1)

    clean_team = sanitize_filename(team_name)
    team_work_dir = os.path.join(args.temp_dir, clean_team)
    os.makedirs(team_work_dir, exist_ok=True)
    os.makedirs(os.path.dirname(output_zip), exist_ok=True)

    cert_files = []
    for idx, member in enumerate(members):
        member_name = str(member).strip()
        clean_member = sanitize_filename(member_name)
        filename = f"{clean_team} - Member {idx + 1} - {clean_member}.png"
        out_png = os.path.join(team_work_dir, filename)

        render_certificate(template_path, member_name, out_png)
        cert_files.append((out_png, filename))

    # Create ZIP
    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for full_path, arcname in cert_files:
            zf.write(full_path, arcname)

    # Clean up temp pngs
    for full_path, _ in cert_files:
        try:
            os.remove(full_path)
        except Exception:
            pass

    print(f"SUCCESS:{output_zip}")

if __name__ == "__main__":
    main()

