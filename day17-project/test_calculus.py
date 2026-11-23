"""真实Python测试：积分的物理单位、数值误差和差分噪声。"""
import tempfile
import unittest
from pathlib import Path

import numpy as np
from calculus import (checked_series, evaluate, interval_acceleration,
                      left_displacement, trapezoid_displacement)
from plot_motion import save_motion_charts
from scenarios import motion_samples, run_scenario


class TestDiscreteCalculus(unittest.TestCase):
    def test_constant_10_mps_2_seconds_for_both_dt(self):
        for case, count in ((0, 21), (1, 41)):
            with self.subTest(case=case):
                r = run_scenario(case)
                self.assertEqual(r["sample_count"], count)
                self.assertEqual(r["interval_count"], count - 1)
                self.assertAlmostEqual(r["left_m"], 20.0, places=12)
                self.assertAlmostEqual(r["trapezoid_m"], 20.0, places=12)
                self.assertAlmostEqual(r["first_interval_accel_mps2"], 0.0)

    def test_linear_speed_left_rectangle_convergence(self):
        coarse, fine = run_scenario(2), run_scenario(3)
        self.assertAlmostEqual(coarse["left_m"], 23.8, places=10)
        self.assertAlmostEqual(fine["left_m"], 23.9, places=10)
        self.assertAlmostEqual(coarse["true_displacement_m"], 24.0)
        self.assertAlmostEqual(fine["true_displacement_m"], 24.0)
        self.assertLess(abs(fine["left_error_m"]), abs(coarse["left_error_m"]))
        self.assertAlmostEqual(coarse["trapezoid_m"], 24.0, places=10)
        self.assertAlmostEqual(fine["trapezoid_m"], 24.0, places=10)

    def test_difference_acceleration_units(self):
        r = run_scenario(2)
        np.testing.assert_allclose(r["accel_mps2"], 2.0, atol=1e-12, rtol=0)
        self.assertAlmostEqual(r["first_interval_accel_mps2"], 2.0)

    def test_noise_amplification_for_constructed_pattern(self):
        coarse, fine = run_scenario(4), run_scenario(5)
        self.assertAlmostEqual(coarse["accel_noise_rms_mps2"], 2.0, places=11)
        self.assertAlmostEqual(fine["accel_noise_rms_mps2"], 4.0, places=11)
        self.assertEqual((coarse["status"], fine["valid"]), (0, 1))
        self.assertAlmostEqual(coarse["first_interval_accel_mps2"], 0.0)
        self.assertAlmostEqual(fine["first_interval_accel_mps2"], -2.0)

    def test_irregular_sample_timestamps(self):
        r = run_scenario(6)
        self.assertEqual(r["sample_count"], 4)
        self.assertAlmostEqual(r["dt_min_s"], 0.1, places=12)
        self.assertAlmostEqual(r["dt_max_s"], 0.15, places=12)
        self.assertAlmostEqual(r["left_m"], 3.58, places=12)
        self.assertAlmostEqual(r["trapezoid_m"], 3.6225, places=12)
        np.testing.assert_allclose(r["accel_mps2"], 2.0, atol=1e-12)

    def test_timestamp_duplicate_rejected_no_valid_values(self):
        r = run_scenario(7)
        self.assertEqual((r["status"], r["valid"]), (-2, 0))
        self.assertEqual(r["chart_count"], 0)
        self.assertNotIn("left_m", r)
        self.assertNotIn("accel_mps2", r)

    def test_bad_shape_nonfinite_backward_and_zero_dt(self):
        for t, v in [
            ([0.0], [10.0]), ([0.0, 0.1], [10.0]),
            ([0.0, 0.1], [10.0, float("nan")]),
            ([0.0, 0.0], [10.0, 10.0]),
            ([0.1, 0.0], [10.0, 10.0]),
        ]:
            with self.subTest(t=t, v=v):
                with self.assertRaises(ValueError):
                    checked_series(t, v)

    def test_cumulative_output_and_no_phantom_last_interval(self):
        t = [0.0, 0.1, 0.2]
        v = [10.0, 10.0, 10.0]
        self.assertEqual(len(left_displacement(t, v)), 3)
        self.assertEqual(len(interval_acceleration(t, v)[1]), 2)
        np.testing.assert_allclose(trapezoid_displacement(t, v), [0, 1, 2],
                                   atol=1e-12)

    def test_seven_real_chart_sets(self):
        with tempfile.TemporaryDirectory() as folder:
            for case in range(7):
                r = run_scenario(case)
                pngs = save_motion_charts(r["time_s"], r["speed_mps"],
                                          Path(folder) / str(case))
                self.assertEqual(len(pngs), 3)
                self.assertTrue(all(p.stat().st_size > 8_000 for p in pngs))

    def test_scenario_identity(self):
        for case in range(8):
            r = run_scenario(case)
            self.assertEqual(r["scenario"], case)
            self.assertEqual(r["status"], -2 if case == 7 else 0)


if __name__ == "__main__":
    unittest.main()
