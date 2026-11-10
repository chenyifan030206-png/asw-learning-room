"""独立单元测试：由python -m unittest -v test_pipeline真正执行。"""
import tempfile
import unittest
from pathlib import Path

from main import run
from models import Frame
from monitor import Monitor
from reader import load_frames


HERE = Path(__file__).resolve().parent


class TestFoundationProject(unittest.TestCase):
    def test_normal_csv_and_full_call_chain(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "results.json"
            result = run(HERE / "sample.csv", output)
            self.assertEqual(len(result), 8)
            self.assertTrue(output.is_file())
            self.assertEqual([x["alert"] for x in result],
                             [False, True, True, False, False, True, False, True])
            self.assertEqual(result[4]["status"], "INVALID")
            self.assertFalse(result[4]["valid"])

    def test_hysteresis_and_state_storage(self):
        monitor = Monitor()
        values = [45.0, 34.0, 38.0, 41.0]
        actual = []
        for i, distance in enumerate(values):
            frame = Frame(i * 20, 72.0, distance, True, True)
            result = monitor.step(frame, frame.time_ms + 20)
            actual.append(result.alert)
        self.assertEqual(actual, [False, True, True, False])

    def test_stale_input_clears_old_alert(self):
        monitor = Monitor()
        monitor.step(Frame(100, 72.0, 30.0, True, True), 120)
        stale = monitor.step(Frame(120, 72.0, 30.0, True, True), 221)
        self.assertEqual(stale.status, "INVALID")
        self.assertFalse(stale.valid)
        self.assertFalse(stale.alert)

    def test_bad_string_reports_physical_csv_line(self):
        with self.assertRaisesRegex(ValueError, "第4行"):
            load_frames(HERE / "bad_string.csv")

    def test_missing_value_reports_physical_csv_line(self):
        with self.assertRaisesRegex(ValueError, "第3行"):
            load_frames(HERE / "bad_missing.csv")


if __name__ == "__main__":
    unittest.main()
