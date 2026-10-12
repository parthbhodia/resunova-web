"""Status rows are recorded on a change, and a repeat check stays quiet."""
import unittest

from ops_history import apply_ops_checks


def _check(**overrides):
    base = {
        "now": "2026-10-12T15:00:00Z",
        "api_up": True,
        "api_detail": "",
        "scoring": "ok",
        "scoring_detail": "",
        "crashes": [],
    }
    base.update(overrides)
    return base


class OpsHistoryTest(unittest.TestCase):
    def test_first_healthy_check_records_api_and_scoring(self):
        result = apply_ops_checks({"updated": None, "events": []}, _check())
        self.assertTrue(result["changed"])
        states = {event["kind"]: event["state"] for event in result["events"]}
        self.assertEqual(states, {"api": "up", "scoring": "ok"})

    def test_a_repeat_check_adds_nothing(self):
        first = apply_ops_checks({"updated": None, "events": []}, _check())
        again = apply_ops_checks(first, _check(now="2026-10-12T15:15:00Z"))
        self.assertFalse(again["changed"])
        self.assertEqual(len(again["events"]), 2)

    def test_api_down_then_back_is_two_rows(self):
        up = apply_ops_checks({"events": []}, _check())
        down = apply_ops_checks(up, _check(now="2026-10-12T16:00:00Z", api_up=False, api_detail="HTTP 502", scoring="unknown"))
        self.assertEqual(down["events"][0]["state"], "down")
        self.assertEqual(down["events"][0]["detail"], "HTTP 502")
        back = apply_ops_checks(down, _check(now="2026-10-12T16:15:00Z"))
        self.assertEqual(back["events"][0]["kind"], "api")
        self.assertEqual(back["events"][0]["state"], "up")

    def test_scoring_pause_records_the_reason_once(self):
        up = apply_ops_checks({"events": []}, _check())
        paused = apply_ops_checks(up, _check(now="2026-10-12T16:00:00Z", scoring="paused", scoring_detail="rate_limit"))
        self.assertEqual(paused["events"][0]["detail"], "rate_limit")
        again = apply_ops_checks(paused, _check(now="2026-10-12T16:15:00Z", scoring="paused", scoring_detail="rate_limit"))
        self.assertFalse(again["changed"])

    def test_a_crash_keeps_the_path_and_is_not_repeated(self):
        crash = {"at": "2026-10-12T16:05:00Z", "path": "/analyze/?analysis=secret", "detail": "Minified React error #185"}
        first = apply_ops_checks({"events": []}, _check(crashes=[crash]))
        ui = next(event for event in first["events"] if event["kind"] == "ui")
        self.assertEqual(ui["detail"], "/analyze/ Minified React error #185")
        self.assertNotIn("secret", ui["detail"])
        again = apply_ops_checks(first, _check(now="2026-10-12T16:15:00Z", crashes=[crash]))
        self.assertEqual(sum(1 for event in again["events"] if event["kind"] == "ui"), 1)

    def test_unknown_scoring_does_not_invent_a_row(self):
        result = apply_ops_checks({"events": []}, _check(scoring="unknown"))
        self.assertEqual([event["kind"] for event in result["events"]], ["api"])

    def test_tailor_and_interview_are_recorded_on_their_own(self):
        result = apply_ops_checks({"events": []}, _check(tailor_up=True, interview_up=False, interview_detail="HTTP 502"))
        states = {event["kind"]: event["state"] for event in result["events"]}
        self.assertEqual(states["tailor"], "up")
        self.assertEqual(states["interview"], "down")
        interview = next(event for event in result["events"] if event["kind"] == "interview")
        self.assertEqual(interview["detail"], "HTTP 502")
        again = apply_ops_checks(result, _check(now="2026-10-12T15:15:00Z", tailor_up=True, interview_up=False, interview_detail="HTTP 502"))
        self.assertFalse(again["changed"])

    def test_a_missing_route_check_does_not_count_as_down(self):
        result = apply_ops_checks({"events": []}, _check())
        self.assertNotIn("tailor", {event["kind"] for event in result["events"]})
        self.assertNotIn("interview", {event["kind"] for event in result["events"]})


if __name__ == "__main__":
    unittest.main()
