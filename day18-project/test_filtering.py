"""用独立手算值检查滤波、方差、阶跃、偏差与异常路径。"""
import unittest
import numpy as np
from filtering import seeded_noise, lowpass, statistics, step_metrics
from scenarios import run_scenario


class TestFilter(unittest.TestCase):
    def test_manual_recursion(self):
        # assert_allclose比较数组数值，atol为绝对误差容限，rtol为相对容限。
        np.testing.assert_allclose(lowpass([0, 1, 1, 1], .1),
                                   [0, .1, .19, .271], atol=1e-12, rtol=0)

    def test_stats(self):
        a = statistics([9, 10, 11], 10)
        # assertAlmostEqual检查近似相等；这里的精确方差是2/3。
        self.assertAlmostEqual(a["variance"], 2/3)
        self.assertAlmostEqual(a["std"], np.sqrt(2/3))
        self.assertAlmostEqual(a["bias"], 0)
        b = statistics([10, 11, 12], 10)
        self.assertAlmostEqual(b["variance"], 2/3)
        self.assertAlmostEqual(b["rmse"] ** 2, b["variance"] + b["bias"] ** 2)

    def test_seed(self):
        # assert_array_equal要求元素严格相等，验证相同种子可复现。
        np.testing.assert_array_equal(seeded_noise(18), seeded_noise(18))
        self.assertTrue(np.all(seeded_noise(18) >= -1))
        self.assertTrue(np.all(seeded_noise(18) < 1))

    def test_tradeoff(self):
        a, b = run_scenario(0), run_scenario(1)
        self.assertEqual(a["raw"], b["raw"])
        self.assertLess(a["filtered_variance"], b["filtered_variance"])
        self.assertLess(b["filtered_variance"], b["raw_variance"])
        self.assertAlmostEqual(a["rise_s"], 2.1)
        self.assertAlmostEqual(b["rise_s"], .1)

    def test_bypass_and_bias(self):
        a = run_scenario(5)
        np.testing.assert_allclose(a["raw"], a["filtered"], atol=1e-12)
        b = run_scenario(4)
        c = run_scenario(0)
        self.assertAlmostEqual(b["filtered_bias"] - c["filtered_bias"], .4)
        self.assertAlmostEqual(b["filtered_variance"], c["filtered_variance"])

    def test_reject(self):
        # with assertRaises(...)要求代码块抛指定异常，否则测试失败。
        with self.assertRaises(ValueError):
            lowpass([1, 2], 0)
        with self.assertRaises(ValueError):
            lowpass([1, np.nan], .1)
        with self.assertRaises(ValueError):
            lowpass([1, 2], 1.1)
        self.assertEqual(run_scenario(6)["valid"], 0)
        self.assertNotIn("filtered", run_scenario(6))


if __name__ == "__main__":
    # unittest.main查找并执行test_开头的方法。
    unittest.main()
