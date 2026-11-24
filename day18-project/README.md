# D18 概率与低通滤波

先学FUNCTION_GUIDE.md中未见过的API，再读filtering.py。真实速度固定10m/s，固定种子18生成250个[-1,1)均匀范围的教学伪随机误差；用后200个样本统计均值、方差(ddof=0)、标准差、偏差和RMSE。另做100点无噪声阶跃（第20号样本起0→1），dt=0.1s；滤波输出初值取第一个输入。两组alpha使用相同数据。上升时间采用首次达到10%和90%的采样时刻之差，不插值。

## 本地实作
安装Python 3.11及依赖：`python -m pip install -r requirements.txt`。
运行 `python -m unittest -v test_filtering`。
分别运行 `python demo.py --scenario 0 --out charts/a01` 和 `python demo.py --scenario 1 --out charts/a08`，记录raw_variance、filtered_variance、t10_s、t90_s、rise_s。S03/S04复用相同条件，重点核对阶跃。S05加入0.4m/s固定偏差；S06 alpha=1不滤波；S07 alpha=0被拒绝，退出2。正常案例保存noise.png和step.png。图缺中文可安装Noto Sans CJK SC。

理论核对：alpha=0.1的无噪声阶跃首次达到10%、90%分别是0、2.1秒（相对阶跃首个采样）；alpha=0.8为0、0.1秒。固定偏差不能通过此低通滤波消除。所有信号为离线教学数据，浏览器JS不执行真实Python。D17的真实C/Python历史验收不改变。
