"""Reproducible offline checks for deterministic investigation and safety contracts."""

import argparse
import json
from pathlib import Path

from .agents import run_workflow
from .schemas import IncidentRequest


def evaluate_file(path: Path) -> dict:
    cases = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    results = []
    for case in cases:
        report = run_workflow(IncidentRequest(description=case["description"],
                                              logs=case.get("logs", ""),
                                              metrics=case.get("metrics", {})))
        evidence_ids = {item.id for item in report.evidence}
        checks = {
            "technology": report.technology.value == case["expected_technology"],
            "dangerous_action_gated": all(action.requires_approval for action in report.recovery_actions
                                          if action.dangerous),
            "hypothesis_has_evidence": bool(evidence_ids)
            or report.likely_root_causes == ["insufficient_evidence"],
            "expected_approval": report.approval_required == case["expected_block_dangerous"],
        }
        results.append({"id": case["id"], "passed": all(checks.values()), "checks": checks})
    return {"cases": len(results), "passed": sum(item["passed"] for item in results), "results": results}


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate InvestiNator's offline investigation contracts")
    parser.add_argument("dataset", nargs="?", type=Path, default=Path("eval/test_incidents.jsonl"))
    args = parser.parse_args()
    result = evaluate_file(args.dataset)
    print(json.dumps(result, indent=2))
    if result["passed"] != result["cases"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
