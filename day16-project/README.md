# D16｜线性代数与二维车体/世界坐标变换（Python + NumPy）

## 为什么学这一课

D15已经能处理离线CSV和二维NumPy矩阵。D16用同样的数组知识解决：雷达目标在车体前方1米，车在世界系里朝什么方向？世界系坐标是多少？实现二维旋转、平移、齐次矩阵、变换顺序、逆变换和可视化。它是一套教学模型，不是实际的整车定位、惯导系统或ROS tf2实时数据。

约定：世界系W的x轴在图上向右、y轴向上；车辆未旋转时，车体x轴指向车头前方、车体y轴指向车辆左侧。车辆旋转后，车体轴也跟着旋转，所以不能一直说“车体x向右、y向上”。采用二维列向量，正角逆时针；从车体坐标转换到世界坐标：

```text
p_W = R_WV @ p_V + t_WV
pW_h = T_WV @ pV_h
R_WV = [[cosθ,-sinθ],[sinθ,cosθ]]
T_WV = [[cosθ,-sinθ,tx],
        [sinθ, cosθ,ty],
        [0,      0,  1]]
```

这是一套特定且明确的二维教学约定，不自动代表任何实车传感器的轴方向。输入角度用度数，在`rotation_deg()`内部转换成弧度。Python NumPy的`@`是矩阵乘法，`*`是逐元素乘法（形状匹配时）。

## 先理解图和数学，再进入代码

浏览器D16学习页现已按照“具体车辆问题→画坐标轴→单位圆→从两根单位箭头推导R→旋转后加t→齐次坐标→交换顺序→逆向恢复→批量点→故障→源码”组织，包含10种原生SVG图（其中单位圆可以选择0°、30°、90°、180°）。

拿一个最简单的例子讲：雷达目标在车头正前方1m，即车体系的`(1,0)`。如果车头向世界y正方向转过90°，车前方1m对应世界相对位移`(0,1)`。车辆若在世界`(10,5)`米处，则目标世界坐标是`(10,6)`，因为：

```text
第1步：车体点 p_V = (1,0)m
第2步：正向旋转 R90 @ p_V = (0,1)m
第3步：加车体原点在世界的位置 t=(10,5)m
结果：世界点 p_W=(10,6)m
```

再把两个基准向量的旋转结果放成矩阵的两列。车体x单位向量`(1,0)`转90°后是`(0,1)`，车体y单位向量`(0,1)`转90°后是`(-1,0)`，所以`R90=[[0,-1],[1,0]]`，这就是负号的来源。

**为什么补1？** 点的齐次形式`(x,y,1)`让矩阵右上角的平移值参与计算；只有方向没有具体位置的箭头使用`(x,y,0)`，所以不加平移。反向坐标的恢复则先减去t，再用`R.T`旋转回来：`p_V=R.T@(p_W-t)`。

**为什么要看相乘顺序？** 以`(1,0)`为起点，先旋转90°再向世界x正方向平移2m得到`(2,1)`；先平移后旋转得到`(0,3)`。在列向量约定下，表达式`A@R@p`总是右侧R先作用于点。这个顺序必须先用语言理解，再在源码里用`@`表示。

**从理论衔接Python的顺序：**

1. `rotation_deg`：传入**度**，内部显式`np.deg2rad`后调用`np.cos/sin`，返回shape=(2,2)的`np.ndarray`。
2. `rigid_transform_deg`：用`np.eye(3)`建3×3单位阵，再用`[:2,:2]`放旋转、`[:2,2]`放车辆位置。
3. `transform_point`：先检查T和二维点，补末尾1，执行`matrix @ p_h`，最后`[:2]`取前两个坐标。
4. `transform_direction`：方向向量补末尾0，所以只旋转不平移。
5. `inverse_rigid`：用`R.T`和`-R.T@t`构造世界→车体的逆向变换。
6. `transform_points`：从(N,2)拼成(N,3)，转置成(3,N)，一次处理全部点后返回(N,2)。

上面每一个符号、完整演算和对应代码位置都可以在Pages第16课找到。原有的在线7案例与本地Python测试保持不变。**网页图只服务于教学理解；真实PNG仍须运行本地Matplotlib生成。**

## 文件职责和完整执行顺序

```text
python demo.py --scenario 1 --out charts
  └─ demo.py: if __name__ == '__main__' → main()
       └─ scenarios.run_scenario(1)
            ├─ geometry2d.rigid_transform_deg(angle,tx,ty)
            │    └─ rotation_deg → np.deg2rad → np.cos/np.sin
            ├─ geometry2d.transform_point(T,p)
            │    └─ 把二维点拼成(x,y,1)再算T @ p_h
            └─ 返回含status/valid/world_point的dict给main
       ├─ main输出解释、坐标和误差
       └─ plot_frames.save_frame_plot(...) → coordinate_frames.png
```

`test_geometry.py`是独立unittest入口，不是直接执行demo时自动运行。

## 本地真实Python验收（建议 Python 3.11+）

在D16项目目录解压文件后：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python demo.py --scenario 0 --out charts
python demo.py --scenario 1 --out charts
python demo.py --scenario 2 --out charts
python demo.py --scenario 3 --out charts
python demo.py --scenario 4 --out charts
python demo.py --scenario 5 --out charts
python demo.py --scenario 6 --out charts
python -m unittest -v test_geometry
```

Windows PowerShell激活命令通常是`.venv\Scripts\Activate.ps1`。WSL缺中文字体时先安装`fonts-noto-cjk`，并重新打开Python终端；工程会在缺字体时打印提示。

## 七组场景及判定

| 案例 | 内容 | 预期 |
|---|---|---|
| S01 | R(90°)·(1,0) | world=(0,1)，浮点误差允许1e-12 |
| S02 | 旋转90°，平移(10,5) | world=(10,6) |
| S03 | T(2,0)@R(90°) vs R(90°)@T(2,0) | world=(2,1)，交换得(0,3) |
| S04 | 故意将90度送给sin/cos当弧度 | status=-3、valid=0；有误差诊断，**不能作为有效坐标** |
| S05 | 30°旋转、平移(10,5)、点(3,-2)逆变换 | 闭环误差<1e-9m |
| S06 | NaN角度 | status=-2、valid=0；不生成有效世界点和PNG |
| S07 | 5个地标批量变换 | shape=(5,2)，点分别(10,5),(10,6),(9,5),(11,7),(8,4) |

注意：运行D16脚本和test_geometry是在学员电脑上完成，Pages只是JavaScript教学演算。GitHub CI成功表示参考代码通过自动化检查，不意味着学员已通过本地Python；D01–D14历史C本地真实验收依旧单独进行。

## 故障注入 P1–P4

1. 先运行S01，手算90度旋转得(0,1)，观察为什么x可能显示6.123e-17而不是精确0；使用`np.allclose`测试浮点近似。
2. 暂时把`np.deg2rad(angle)`改成`angle`，观察测试从PASS变为FAIL，随后恢复。
3. 把S03的`translate @ rotate`改为`rotate @ translate`，预测(2,1)如何变为(0,3)；恢复后重新测试。
4. 运行S05确认误差<1e-9m；运行S06确认NaN被拒绝、`valid=0`，错误时没有PNG。

源自官方权威资料的概念：Python math.radians、NumPy matmul/@与逐元素乘法区别。辅助阅读：
- https://docs.python.org/3/library/math.html
- https://numpy.org/doc/stable/reference/generated/numpy.matmul.html
- https://numpy.org/doc/stable/user/quickstart.html
- https://docs.ros.org/en/rolling/Concepts/Intermediate/About-Tf2.html

## 后续页面制作规范

课程按内容选择展示顺序，理论与数学课优先图示、逻辑推导和手算，编程/软件架构课按具体问题决定是否先看调用链。详细规则见仓库 `docs/COURSE_PAGE_AUTHORING_STANDARD.md`。D16在发布前须通过真实NumPy测试、SVG交互、代码下载、笔记保留、手机端布局和旧课程兼容性检查。
