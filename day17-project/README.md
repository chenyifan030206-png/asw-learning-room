# D17｜微积分与离散时间：从速度求位移、从速度变化求加速度

## 先理解为什么，再写代码

- 速度v描述每秒走多远，单位m/s；位移s的单位m；加速度a描述速度每秒变化多少，单位m/s²。
- 不需要先会高等数学证明。先画速度随时间的图：矩形面积v×dt就是这一小段位移；把每段累加就是积分的离散近似。
- 加速度是速度在一段时间内的变化率：a≈(v[i+1]-v[i])/(t[i+1]-t[i])。例如0.1秒内速度从10变到10.2，平均加速度是2 m/s²。
- 点数和时间区间数不同：0–2秒每0.1秒采一次，得到21个速度点但只有20个区间。每个区间才能贡献一段位移。
- D16中理解的矩阵组合顺序正确；这里同样需要按“真实时间戳→计算dt→积分或差分→验证”执行，不能把frame索引当作时间。

## 文件与完整运行流程

```text
python demo.py --scenario 2
    ↓ demo.py main()
    ↓ scenarios.py run_scenario(2)
      → motion_samples(dt=0.1)
      → calculus.py evaluate(t,v)
          → checked_series：验证形状、有限性、dt>0
          → left_displacement：每段左端速度×dt并累加
          → trapezoid_displacement：每段两端均速×dt并累加
          → interval_acceleration：相邻速度差÷对应dt
    ↓ scenarios返回数值dict，main打印status和物理量
    ↓ valid=1时plot_motion.py保存三张独立中文PNG
```

## 数学推导与可复核结果

恒速10m/s从0秒至2秒：`10×2=20m`。dt=0.1s，有20段/21个样本；dt=0.05s，有40段/41个样本，两者积分都应20m。

线性速度`v(t)=10+2t`，0–2秒精确位移`∫(10+2t)dt = 24m`，精确加速度`dv/dt=2m/s²`。左矩形积分用左端速度，dt=0.1s计算23.8m（误差-0.2m），dt=0.05s计算23.9m（误差-0.1m）。梯形积分对这种直线速度图刚好算24m。

故障对比：在每个采样速度上交替加入`+0.1/-0.1m/s`，相邻差分会把这段误差变成`±0.2/dt`的加速度误差，dt=0.1得到2m/s²，dt=0.05得到4m/s²。**这是人为构造的交替误差演示，不意味着缩短dt必然使所有实际传感器噪声增加。** 研究者需要根据噪声的频谱、相关性与采样方式分析实际情况。

时间戳不等间隔时，必须用每个区间自身的`np.diff(t)`，不能强行写死一个dt。如果时间戳重复或倒退，必须拒绝，而不是除以0或输出“有效加速度”。

## 本地真实Python验收

建议Python3.11+，在下载的D17项目目录内运行：

```bash
python -m venv .venv
# Windows PowerShell：
.venv\Scripts\Activate.ps1
# Linux/WSL：source .venv/bin/activate
python -m pip install -r requirements.txt
python -m unittest -v test_calculus
python demo.py --scenario 0 --out charts/constant
python demo.py --scenario 2 --out charts/linear
python demo.py --scenario 3 --out charts/fine
python demo.py --scenario 4 --out charts/noisy
python demo.py --scenario 5 --out charts/noisy_fine
python demo.py --scenario 6 --out charts/irregular
python demo.py --scenario 7 --out charts/invalid
```

场景7应返回退出码2并提供时间戳诊断，不生成三张有效曲线。其余场景保存`speed_time.png`、`displacement_time.png`、`acceleration_time.png`。如果缺中文字体，按提示安装Noto Sans CJK即可。

## 实作题与工程边界

P1：手算恒速10m/s、2秒、dt=0.1s的积分20m；P2：换dt=0.05s仍为20m；P3：线性速度下左矩形积分两个dt分别23.8/23.9m；P4：解释梯形积分为何为24m；P5：计算0.1秒内速度变化0.2m/s所得2m/s²；P6：计算交替速度误差导致的两种差分噪声幅度；P7：发现重复时间戳时要求status=-2、valid=0。

这里的曲线与速度是教学用离线模拟数据，不是实际车辆运动测量。网页上的“运行案例”是JavaScript等价演算，本地Python与Matplotlib测试独立完成，历史真实C通关状态不因在线练习而改变。

参考：
- https://numpy.org/doc/stable/reference/generated/numpy.gradient.html
- https://numpy.org/doc/stable/reference/generated/numpy.trapezoid.html
