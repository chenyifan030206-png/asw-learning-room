# D19 一维卡尔曼滤波：工程实作
理论与架构设计推导由对话讲授；本项目用于源码学习与本地真实测试。
执行链：demo.main → scenarios.run_scenario → simulation.generate → estimate → KalmanCV初始化 → 每帧step → predict → 有测量才update → 估计结果 → RMSE评价 → save_charts。
真值只用于生成教学测量与计算误差，不作为估计器输入。单位：位置m，速度m/s，dt秒，q为每步加速度方差(m/s²)²，r为测量位置方差m²。P的对角分量分别为位置和速度方差，不能直接相加比较。首帧用位置测量初始化、速度先验0，首帧不重复更新。None是缺测，不是0。缺测5帧索引20–24，25恢复。
安装：python -m pip install -r requirements.txt
测试：python -m unittest -v test_kalman
案例：python demo.py --scenario 0 --out charts/normal；编号0–6分别为正常、缺测、增大R、加速Q=.25、加速Q=4、加速Q=0、非法R=0。
正常输出position.png、velocity.png、covariance.png；非法R退出2、不输出有效图。查看FUNCTION_GUIDE.md了解外部函数。网页仅JS等价计算，本地Python和历史C验收仍独立。
