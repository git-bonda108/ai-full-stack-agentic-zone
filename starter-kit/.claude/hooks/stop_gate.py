"""Stop hook: a quality gate. If Python changed and tests fail, ask Claude to keep working.

Uses stop_hook_active to avoid an endless loop: it blocks at most once in a row.
"""

import shutil
import subprocess

from _common import emit, ledger, project_dir, read_event


def changed_python(root) -> bool:
    try:
        out = subprocess.run(
            ["git", "status", "--porcelain"], cwd=root, capture_output=True, text=True, timeout=5
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return any(line.strip().endswith(".py") for line in out.stdout.splitlines())


def main() -> None:
    event = read_event()
    root = project_dir(event)
    if event.get("stop_hook_active") or not (root / "tests").exists() or not changed_python(root):
        emit({})
    pytest = shutil.which("pytest")
    if not pytest:
        emit({})
    result = subprocess.run(
        [pytest, "-q", "-x", "--no-header"], cwd=root, capture_output=True, text=True, timeout=170
    )
    ledger(event, {"event": "Stop", "tests_passed": result.returncode == 0})
    if result.returncode not in (0, 5):  # 5 = no tests collected
        tail = "\n".join(result.stdout.strip().splitlines()[-15:])
        emit(
            {
                "decision": "block",
                "reason": f"Tests are failing. Fix them before you finish:\n{tail}",
            }
        )
    emit({})


if __name__ == "__main__":
    main()
