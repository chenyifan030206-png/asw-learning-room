# D16｜线性代数与二维车体/世界坐标变换（Python + NumPy）

## 为什么学这一课

D15已经能处理离线CSV和二维NumPy矩阵。D16用同样的数组知识解决：雷达目标在车体前方1米，车在世界系里朝什么方向？世界系坐标是多少？实现二维旋转、平移、齐次矩阵、变换顺序、逆变换和可视化。它是一套教学模型，不是实际的整车定位、惯导系统或ROS tf2实时数据。

约定：世界系W和车体系V都采用右手二维平面（x向右、y向上），正角逆时针，从局部向世界列向量变换：

```text
p_W = R_WV @ p_V + t_WV
pW_h = T_WV @ pV_h
R_WV = [[cosθ,-sinθ],[sinθ,cosθ]]
T_WV = [[cosθ,-sinθ,tx],
        [sinθ, cosθ,ty],
        [0,      0,  1]]
```

这是一套特定且明确的二维教学约定，不自动代表任何实车传感器的轴方向。输入角度用度数，在`rotation_deg()`内部转换成弧度。Python NumPy的`@`是矩阵乘法，`*`是逐元素乘法（形状匹配时）。

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
