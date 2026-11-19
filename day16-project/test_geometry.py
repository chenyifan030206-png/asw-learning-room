"""真实Python unittest：需求、角度单位、顺序、闭环与图片文件。"""
import math
import tempfile
import unittest
from pathlib import Path

import numpy as np

from geometry2d import (inverse_rigid, rigid_transform_deg, rotation_deg,
                        roundtrip_error_m, transform_direction,
                        transform_point, transform_points)
from plot_frames import save_frame_plot
from scenarios import LANDMARKS_V, run_scenario


class TestGeometry2D(unittest.TestCase):
    def test_90deg_unit_point(self):
        r = rotation_deg(90)
        np.testing.assert_allclose(r @ [1, 0], [0, 1], atol=1e-12, rtol=0)
        self.assertEqual(r.shape, (2, 2))

    def test_translation_after_rotation(self):
        transform = rigid_transform_deg(90, 10, 5)
        self.assertEqual(transform.shape, (3, 3))
        np.testing.assert_allclose(transform_point(transform, [1, 0]), [10, 6],
                                   atol=1e-12, rtol=0)

    def test_multiplication_order_changes_position(self):
        rotate = rigid_transform_deg(90, 0, 0)
        translate = rigid_transform_deg(0, 2, 0)
        np.testing.assert_allclose(transform_point(translate @ rotate, [1, 0]),
                                   [2, 1], atol=1e-12, rtol=0)
        np.testing.assert_allclose(transform_point(rotate @ translate, [1, 0]),
                                   [0, 3], atol=1e-12, rtol=0)

    def test_inverse_roundtrip(self):
        transform = rigid_transform_deg(30, 10, 5)
        self.assertLess(roundtrip_error_m(transform, [3, -2]), 1e-9)
        identity = inverse_rigid(transform) @ transform
        np.testing.assert_allclose(identity, np.eye(3), atol=1e-12, rtol=0)

    def test_radians_vs_degrees_detected(self):
        result = run_scenario(3)
        self.assertEqual((result["status"], result["valid"]), (-3, 0))
        self.assertGreater(result["error_m"], 0.4)
        self.assertNotIn("world_point", result)

    def test_bad_angles_and_points_rejected(self):
        for angle in (float("nan"), float("inf")):
            with self.subTest(angle=angle):
                with self.assertRaises(ValueError):
                    rigid_transform_deg(angle, 10, 5)
        with self.assertRaisesRegex(ValueError, "二维点"):
            transform_point(rigid_transform_deg(0, 0, 0), [1, 2, 3])
        with self.assertRaises(ValueError):
            transform_points(rigid_transform_deg(0, 0, 0), [[1, float("nan")]])
        with self.assertRaises(ValueError):
            inverse_rigid(np.array([[1.0, 0, 0], [0, 2.0, 0], [0, 0, 1]]))

    def test_point_and_vector_distinction(self):
        transform = rigid_transform_deg(90, 10, 5)
        np.testing.assert_allclose(transform_direction(transform, [1, 0]),
                                   [0, 1], atol=1e-12, rtol=0)
        np.testing.assert_allclose(transform_point(transform, [1, 0]),
                                   [10, 6], atol=1e-12, rtol=0)

    def test_batch_points(self):
        transform = rigid_transform_deg(90, 10, 5)
        actual = transform_points(transform, LANDMARKS_V)
        expected = np.array([[10, 5], [10, 6], [9, 5], [11, 7], [8, 4]])
        self.assertEqual(actual.shape, (5, 2))
        np.testing.assert_allclose(actual, expected, atol=1e-12, rtol=0)

    def test_case_statuses_and_expected_points(self):
        for case in range(7):
            with self.subTest(case=case):
                result = run_scenario(case)
                if case in (3, 5):
                    self.assertEqual(result["valid"], 0)
                    self.assertEqual(result["status"], -3 if case == 3 else -2)
                    self.assertNotIn("world_point", result)
                else:
                    self.assertEqual((result["status"], result["valid"]), (0, 1))
        np.testing.assert_allclose(run_scenario(0)["world_point"], [0, 1],
                                   atol=1e-12, rtol=0)
        np.testing.assert_allclose(run_scenario(1)["world_point"], [10, 6],
                                   atol=1e-12, rtol=0)

    def test_must_generate_real_chinese_figure(self):
        with tempfile.TemporaryDirectory() as folder:
            path = save_frame_plot(90, 10, 5, folder)
            self.assertTrue(path.exists())
            self.assertGreater(path.stat().st_size, 10_000)
            self.assertEqual(path.name, "coordinate_frames.png")


if __name__ == "__main__":
    unittest.main()
