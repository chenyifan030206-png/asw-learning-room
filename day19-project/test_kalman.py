"""独立手算、缺测、接口边界及协方差数值测试。"""
import unittest
import numpy as np
from kalman import KalmanCV
from scenarios import estimate, run_scenario


class TestKalman(unittest.TestCase):
    def test_manual(self):
        # 独立例子：dt=1,Q=0,R=1，初始x=[0,0]、P=diag(1,4)。
        kf = KalmanCV(1., 0., 1., 0.)
        kf.predict()
        # np.testing.assert_allclose比较每个元素，允许小浮点误差。
        np.testing.assert_allclose(kf.P, [[5,4],[4,4]], atol=1e-12)
        innovation, gain = kf.update(6.)
        self.assertAlmostEqual(innovation, 6.)
        np.testing.assert_allclose(gain, [5/6, 4/6], atol=1e-12)
        np.testing.assert_allclose(kf.x, [5,4], atol=1e-12)
        np.testing.assert_allclose(kf.P, [[5/6,2/3],[2/3,4/3]], atol=1e-12)

    def test_q(self):
        kf = KalmanCV(1., 2., 1., 0.)
        np.testing.assert_allclose(kf.Q, [[.5,1],[1,2]])

    def test_dropout(self):
        r = run_scenario(1)
        self.assertEqual(r["predict_only_count"], 5)
        self.assertEqual(r["update_count"], 75)
        self.assertEqual(r["z"][20:25], [None]*5)
        self.assertEqual(r["gains"][20:25], [None]*5)
        self.assertGreater(r["pp"][24], r["pp"][19])
        self.assertLess(r["pp"][25], r["pp"][24])

    def test_covariance(self):
        kf = KalmanCV(.1, .25, 1/3, 0.)
        for k in range(80):
            kf.step(None if 20 <= k < 25 else .2*k)
            np.testing.assert_allclose(kf.P, kf.P.T, atol=1e-12)
            # eigvalsh返回实对称矩阵的特征值；非负是半正定检查。
            self.assertGreaterEqual(float(np.linalg.eigvalsh(kf.P).min()), -1e-12)

    def test_comparison(self):
        a, b = run_scenario(0), run_scenario(2)
        self.assertEqual(a["z"], b["z"])
        self.assertLess(a["estimated_position_rmse_available_m"], a["raw_position_rmse_m"])
        c, d, e = [run_scenario(k) for k in (3,4,5)]
        self.assertEqual(c["z"], d["z"])
        self.assertEqual(c["z"], e["z"])
        self.assertLess(d["speed_rmse_mps"], e["speed_rmse_mps"])

    def test_invalid(self):
        with self.assertRaises(ValueError):
            KalmanCV(.1, .25, 0., 0.)
        kf = KalmanCV(.1, .25, 1., 0.)
        old = kf.x.copy()  # copy创建独立数组副本，以便比较异常前后。
        with self.assertRaises(ValueError):
            kf.step(float("nan"))
        np.testing.assert_array_equal(kf.x, old)
        with self.assertRaises(ValueError):
            estimate([None, 1.], .1, .25, 1.)
        self.assertEqual(run_scenario(6)["valid"], 0)


if __name__ == "__main__":
    unittest.main()
