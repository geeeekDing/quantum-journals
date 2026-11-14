"""Archive changes to the site's paper snapshot by Beijing date."""

import json
import subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


SNAPSHOT = Path("data/papers.json")
SHANGHAI = ZoneInfo("Asia/Shanghai")


def identity(paper):
    return paper.get("doi") or paper["url"]


def changes(before, after):
    for key, paper in after.items():
        previous = before.get(key)
        kinds = []
        if previous is None:
            kinds.append("added")
        else:
            if previous["status"] != "published" and paper["status"] == "published":
                kinds.append("published")
            if paper.get("abstract_zh") and previous.get("abstract_zh") != paper["abstract_zh"]:
                kinds.append("translated")
            if paper.get("abstract") and previous.get("abstract") != paper["abstract"]:
                kinds.append("abstract_updated")
        if kinds:
            yield key, {"changes": kinds, "paper": paper}


def export(before, after, directory, day):
    before = {identity(paper): paper for paper in before["papers"]}
    after = {identity(paper): paper for paper in after["papers"]}
    updates = dict(changes(before, after))
    if not updates:
        print(f"{day}: 无论文变更")
        return

    target = directory / f"{day}.json"
    report = json.loads(target.read_text(encoding="utf-8")) if target.is_file() else {"papers": []}
    items = {identity(item["paper"]): item for item in report["papers"]}
    for key, change in updates.items():
        if key in items:
            change["changes"] = list(dict.fromkeys(items[key]["changes"] + change["changes"]))
        items[key] = change
    report = {"date": day, "timezone": "Asia/Shanghai", "papers": [items[key] for key in sorted(items)]}
    directory.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(target)
    print(f"{day}: 本次 {len(updates)} 条论文变更，当天共 {len(items)} 条")


if __name__ == "__main__":
    before = json.loads(subprocess.check_output(["git", "show", f"HEAD:{SNAPSHOT.as_posix()}"]))
    after = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    export(before, after, SNAPSHOT.parent / "daily", datetime.now(SHANGHAI).date().isoformat())
