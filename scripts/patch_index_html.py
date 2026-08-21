#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import io
import os
import re
import sys

ROOT = "/workspace"

TARGETS = [
    "cv/index.html",
    "about/index.html",
    "en/about/index.html",
    "zh/cv/index.html",
    "zh/about/index.html",
    # check en/cv only if missing
    "en/cv/index.html",
]


def read_text(path: str) -> str:
    with io.open(path, "r", encoding="utf-8", newline="") as f:
        return f.read()


def write_text(path: str, content: str) -> None:
    with io.open(path, "w", encoding="utf-8", newline="") as f:
        f.write(content)


def insert_award(content: str, path: str) -> tuple[str, bool]:
    is_about = "/about/" in path
    is_zh = "/zh/" in path
    # Award lines by page/locale
    if is_about:
        if is_zh:
            new_line = "- 美国大学生数学建模竞赛（MCM/ICM），Meritorious Winner，*2026.05*"
            exists_probe = "美国大学生数学建模竞赛（MCM/ICM），Meritorious Winner，*2026.05*"
        else:
            new_line = "- The Mathematical Contest in Modeling (MCM/ICM), Meritorious Winner, *May 2026*"
            exists_probe = "Meritorious Winner, *May 2026*"
    else:
        if is_zh:
            new_line = "- 美国大学生数学建模竞赛（MCM/ICM），**Meritorious Winner，2026.05**"
            exists_probe = "Meritorious Winner，2026.05"
        else:
            new_line = "- The Mathematical Contest in Modeling (MCM/ICM), **Meritorious Winner, May 2026**"
            exists_probe = "Meritorious Winner, May 2026"

    if exists_probe in content or new_line in content:
        return content, False

    # Insert immediately after "## Awards"
    # We add before the first bullet after the heading when possible.
    # Try to match "## Awards" followed by optional spaces/newlines then a dash list item.
    pattern = re.compile(r"(## Awards\s*)(- )", flags=re.UNICODE)
    if pattern.search(content):
        patched = pattern.sub(rf"\1{new_line}\n- ", content, count=1)
        if patched != content:
            return patched, True

    # Fallback A: if heading exists but previous regex didn't catch bullet separation
    pattern2 = re.compile(r"(## Awards\s*\n\s*)", flags=re.UNICODE)
    if pattern2.search(content):
        patched = pattern2.sub(rf"\1{new_line}\n", content, count=1)
        if patched != content:
            return patched, True

    # Fallback B: insert immediately before the existing 2025 MCM/ICM line (keep it unchanged)
    anchor = re.compile(r"(\n- [^\n]*MCM/ICM\)[^\n]*May 2025[^\n]*\n)")
    if anchor.search(content):
        patched = anchor.sub(new_line + r"\n" + r"\1", content, count=1)
        if patched != content:
            return patched, True

    return content, False


def ensure_list_items_after_heading(content: str, heading: str, items: list[str]) -> tuple[str, bool]:
    """Insert missing items right after the specified heading line (which itself is a full line)."""
    changed = False
    # Find the heading location
    m = re.search(re.escape(heading) + r"\s*\n", content)
    if not m:
        return content, False
    insert_pos = m.end()
    # Build insertion text for items that are missing
    to_add = []
    for it in items:
        if it not in content:
            to_add.append(f"- {it}")
    if not to_add:
        return content, False
    insertion = ("\n".join(to_add) + "\n")
    new_content = content[:insert_pos] + insertion + content[insert_pos:]
    return new_content, True


def insert_spring_2025_cv(content: str, path: str) -> tuple[str, bool]:
    # Only process CV pages
    if "/cv/" not in path:
        return content, False
    is_zh = "/zh/" in path
    changed_any = False

    # Define headings used in markdown-like payload
    spring_heading = "### Spring 2025"
    courses_heading = "**Courses**"
    seminars_heading = "**Seminars**"

    # Make sure Spring 2025 section exists. If not present, skip safely.
    if spring_heading not in content:
        return content, False
    # Ensure the subsections exist; if not, bail to avoid corrupting structure
    if courses_heading not in content or seminars_heading not in content:
        return content, False

    if is_zh:
        courses = [
            "运筹学 — 胡威",
            "微分几何 — 王险峰",
            "现代图论 — 王周宁馨",
            "金融工程 — 李静",
        ]
        seminars = [
            "极值图论 — 艾江东",
            "离散分析 — 艾江东",
        ]
    else:
        courses = [
            "Operations Research — Wei Hu",
            "Differential Geometry — Xianfeng Wang",
            "Modern Graph Theory — Zhouningxin Wang",
            "Financial Engineering — Jing Li",
        ]
        seminars = [
            "Extremal Graph Theory — Jiangdong Ai",
            "Discrete Analysis — Jiangdong Ai",
        ]

    # Insert courses under the Courses heading closest after Spring 2025
    # Narrow to Spring 2025 block to avoid inserting under other semesters
    spring_start = content.find(spring_heading)
    next_semester_idx = content.find("### ", spring_start + len(spring_heading))
    spring_block = content[spring_start: next_semester_idx if next_semester_idx != -1 else len(content)]

    # Insert courses
    # Find the first occurrence of courses_heading within spring_block
    ch_idx = spring_block.find(courses_heading)
    if ch_idx != -1:
        # Compute absolute position in content
        abs_ch_pos = spring_start + ch_idx
        # Insert right after the heading line
        # Find end of line after the courses heading
        after_courses_heading = content.find("\n", abs_ch_pos + len(courses_heading))
        if after_courses_heading != -1:
            segment = content
            # Add missing items only
            to_add = []
            for it in courses:
                if it not in spring_block:
                    to_add.append(f"- {it}")
            if to_add:
                insertion = ("\n".join(to_add) + "\n")
                segment = content[:after_courses_heading + 1] + insertion + content[after_courses_heading + 1:]
                content = segment
                changed_any = True
                # recompute spring_block after modification
                spring_block = content[spring_start: next_semester_idx if next_semester_idx != -1 else len(content)]

    # Insert seminars
    sh_idx = spring_block.find(seminars_heading)
    if sh_idx != -1:
        abs_sh_pos = spring_start + sh_idx
        after_seminars_heading = content.find("\n", abs_sh_pos + len(seminars_heading))
        if after_seminars_heading != -1:
            to_add2 = []
            for it in seminars:
                if it not in spring_block:
                    to_add2.append(f"- {it}")
            if to_add2:
                insertion2 = ("\n".join(to_add2) + "\n")
                content = content[:after_seminars_heading + 1] + insertion2 + content[after_seminars_heading + 1:]
                changed_any = True

    return content, changed_any


def process_file(rel_path: str) -> tuple[bool, list[str]]:
    path = os.path.join(ROOT, rel_path)
    if not os.path.isfile(path):
        return False, [f"Skip (not found): {rel_path}"]
    original = read_text(path)
    updated = original
    notes = []

    # 1) Awards insertion
    updated, award_changed = insert_award(updated, rel_path)
    if award_changed:
        notes.append("awards+")

    # 2) Spring 2025 CV lines (only CV pages)
    updated, spring_changed = insert_spring_2025_cv(updated, rel_path)
    if spring_changed:
        notes.append("spring25+")

    changed = updated != original
    if changed:
        write_text(path, updated)
        return True, [f"Patched {rel_path} ({', '.join(notes)})"]
    else:
        return False, [f"No change {rel_path}"]


def main():
    any_change = False
    logs: list[str] = []
    for rel in TARGETS:
        changed, note = process_file(rel)
        any_change = any_change or changed
        logs.extend(note)
    print("\n".join(logs))
    if not any_change:
        sys.exit(0)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()

