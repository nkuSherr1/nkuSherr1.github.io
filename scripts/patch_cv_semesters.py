#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import io
from typing import Tuple

ROOT = "/workspace"

CV_DIRS = [
    "cv",
    "en/cv",
    "zh/cv",
]

# Files to consider inside each CV dir
CV_FILES = [
    "index.txt",
    "__next._full.txt",
]

# __PAGE__ text payloads: pattern varies; enumerate by glob in each dir

REMOVE_EN_COURSES = [
    "Operations Research — Wei Hu",
    "Differential Geometry — Xianfeng Wang",
    "Modern Graph Theory — Zhouningxin Wang",
    "Financial Engineering — Jing Li",
]
REMOVE_EN_SEMINARS = [
    "Extremal Graph Theory — Jiangdong Ai",
    "Discrete Analysis — Jiangdong Ai",
]
REMOVE_ZH_COURSES = [
    "运筹学 — 胡威",
    "微分几何 — 王险峰",
    "现代图论 — 王周宁馨",
    "金融工程 — 李静",
]
REMOVE_ZH_SEMINARS = [
    "极值图论 — 艾江东",
    "离散分析 — 艾江东",
]


def read_text(path: str) -> str:
    with io.open(path, "r", encoding="utf-8") as f:
        return f.read()


def write_text(path: str, content: str) -> None:
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(content)


def slice_between(content: str, start_idx: int, end_marker: str) -> Tuple[int, int]:
    """Return (s, e) indices for the block starting at start_idx up to just before next '### ' heading or end."""
    s = start_idx
    # find next '### ' heading after s (excluding the one at s)
    e = content.find("### ", s + 3)
    if e == -1:
        e = len(content)
    return s, e


def remove_items_from_spring_2025(content: str, locale: str) -> Tuple[str, bool]:
    changed = False
    spring_heading = "### Spring 2025"
    pos = content.find(spring_heading)
    if pos == -1:
        return content, False
    s, e = slice_between(content, pos, "### ")
    block = content[s:e]

    if locale == "zh":
        remove_list = REMOVE_ZH_COURSES + REMOVE_ZH_SEMINARS
    else:
        remove_list = REMOVE_EN_COURSES + REMOVE_EN_SEMINARS

    new_block = block
    for item in remove_list:
        # remove only bullet lines within the block
        # Match variants: "- <item>" possibly with trailing spaces
        new_block = re.sub(rf"(?m)^\- {re.escape(item)}\s*\n?", "", new_block)
    if new_block != block:
        content = content[:s] + new_block + content[e:]
        changed = True
    return content, changed


def ensure_spring_2026_inserted(content: str, locale: str) -> Tuple[str, bool]:
    if "### Spring 2026" in content:
        return content, False
    fall_2025 = "### Fall 2025"
    idx = content.find(fall_2025)
    if idx == -1:
        return content, False
    if locale == "zh":
        courses = "\n".join([f"- {it}" for it in REMOVE_ZH_COURSES])
        seminars = "\n".join([f"- {it}" for it in REMOVE_ZH_SEMINARS])
    else:
        courses = "\n".join([f"- {it}" for it in REMOVE_EN_COURSES])
        seminars = "\n".join([f"- {it}" for it in REMOVE_EN_SEMINARS])
    spring_2026_block = (
        "### Spring 2026\n\n"
        "**Courses**\n"
        f"{courses}\n\n"
        "**Seminars**\n"
        f"{seminars}\n\n"
    )
    new_content = content[:idx] + spring_2026_block + content[idx:]
    return new_content, True


def patch_text_payload(path: str) -> Tuple[bool, str]:
    locale = "zh" if "/zh/" in path else "en"
    orig = read_text(path)
    updated, c1 = remove_items_from_spring_2025(orig, locale)
    updated, c2 = ensure_spring_2026_inserted(updated, locale)
    if updated != orig:
        write_text(path, updated)
        return True, f"Patched {path} ({'removed' if c1 else ''}{' + ' if c1 and c2 else ''}{'added Spring 2026' if c2 else ''})"
    return False, f"No change {path}"


def find_page_detail_payloads(cv_dir: str):
    dirpath = os.path.join(ROOT, cv_dir)
    for name in os.listdir(dirpath):
        if name.startswith("__next.$d$locale") and name.endswith("__PAGE__.txt"):
            yield os.path.join(dirpath, name)


def patch_shared_chunk():
    # update the shared chunk if it includes semester headings
    chunk_path = os.path.join(ROOT, "_next/static/chunks/1934-eccc223403b0cb6d.js")
    if not os.path.isfile(chunk_path):
        return False, "No chunk file"
    content = read_text(chunk_path)
    if "### Spring 2025" not in content:
        return False, "No semester markers in chunk"
    # remove EN items from Spring 2025 (shared chunk seems EN)
    content2, _ = remove_items_from_spring_2025(content, "en")
    content3, added = ensure_spring_2026_inserted(content2, "en")
    if content3 != content:
        write_text(chunk_path, content3)
        return True, "Patched shared chunk (1934)"
    return False, "No change shared chunk"


def patch_index_html(cv_dir: str) -> Tuple[bool, str]:
    # Best-effort: if headings exist in HTML, apply same operations
    html_path = os.path.join(ROOT, cv_dir, "index.html")
    if not os.path.isfile(html_path):
        return False, f"Skip (not found): {html_path}"
    locale = "zh" if "/zh/" in html_path else "en"
    html = read_text(html_path)
    changed = False
    # operate only if markers exist in plain form
    if "### Spring 2025" in html:
        html, c1 = remove_items_from_spring_2025(html, locale)
        changed = changed or c1
    if "### Fall 2025" in html:
        html, c2 = ensure_spring_2026_inserted(html, locale)
        changed = changed or c2
    if changed:
        write_text(html_path, html)
        return True, f"Patched {html_path}"
    else:
        return False, f"No change {html_path}"


def main():
    logs = []
    any_change = False
    # Patch text payloads and page-detail payloads
    for cv in CV_DIRS:
        for fname in CV_FILES:
            path = os.path.join(ROOT, cv, fname)
            if os.path.isfile(path):
                changed, note = patch_text_payload(path)
                any_change = any_change or changed
                logs.append(note)
        for p in find_page_detail_payloads(cv):
            changed, note = patch_text_payload(p)
            any_change = any_change or changed
            logs.append(note)
        # Patch index.html (best effort)
        changed, note = patch_index_html(cv)
        any_change = any_change or changed
        logs.append(note)
    # Shared chunk
    c, note = patch_shared_chunk()
    any_change = any_change or c
    logs.append(note)
    print("\n".join(logs))
    # exit code 0 regardless

if __name__ == "__main__":
    main()

