# D19 非自定义函数、方法与语法
先在Python交互环境运行最小例子；KalmanCV、predict、update、step、generate、estimate、rmse、run_scenario、save_charts、main均为本课自定义。
| API或语法 | 定义、参数、返回值 | 最小例子与用途 |
|---|---|---|
| class / __init__ / self | class定义对象类型；__init__(self,...)在构造实例时初始化；self指当前实例 | a=KalmanCV(.1,.25,1/3,0.)；a.x、a.P保存该对象自己的状态；不要每帧重建 |
| np.array(a,dtype=...) / np.asarray(a) | 构造或转换ndarray；dtype指定元素类型；asarray可复用内存 | np.array([[1.,2.]])的shape=(1,2)；np.asarray([1,2])的shape=(2,) |
| np.float64 / .shape / .T | 浮点类型、形状属性、转置属性 | np.array([[1,2]]).T形状(2,1)；一维数组.T仍是一维 |
| @ / * / ** | 矩阵乘法、逐元素乘法/标量乘法、乘方 | np.array([[1,2]])@np.array([3,4])→[11]；np.array([1,2])*2→[2,4] |
| np.diag(v) | 一维输入构造对角矩阵；二维输入提取对角线 | np.diag([1.,4.])→[[1,0],[0,4]]，P0 |
| np.eye(n) | 创建n×n单位矩阵 | np.eye(2)→[[1,0],[0,1]]，Joseph更新 |
| np.isfinite(a).all() | 逐元素有限性判断，再检查全部为真 | np.isfinite([1,np.nan]).all()→False |
| [0,0] / [:,0] | 二维索引/切片，分别取单元素与第一列 | K.shape=(2,1)，K[:,0].shape=(2,)；避免(2,2)意外广播 |
| np.arange(n) / np.zeros(n) | 生成0到n−1的数组 / 全零数组 | np.arange(3)→[0,1,2]；np.zeros(3)→[0.,0.,0.] |
| enumerate(iterable) | 迭代产生索引与元素元组，从0开始 | list(enumerate([10,11]))→[(0,10),(1,11)]；逐帧循环 |
| list.append(value) | 原地向末尾增加元素，返回None | a=[]; a.append(3)后a=[3]；不能写a=a.append(3) |
| 列表推导式 / 整数列表索引 | [表达式 for 元素 in 序列 if 条件]；NumPy可按整数列表取值 | [k for k,z in enumerate([1,None,3]) if z is not None]→[0,2]；np.array([1,2,3])[[0,2]]→[1,3] |
| None / is None / is not None | 空值及身份判断 | 缺测None而0是有效测量；不可用if z判断是否缺测 |
| np.mean(a) / np.sqrt(a) | 平均值与逐元素平方根 | np.sqrt(np.mean(np.array([3.,4.])**2))≈3.5355，RMSE |
| float(x) / len(x) / range(n) / str(x) | 类型转换、长度、整数迭代、字符串转换 | float("1.2")=1.2；len([1,2])=2；list(range(3))=[0,1,2] |
| .tolist() / .copy() | 转普通列表 / 独立数组副本 | np.array([1.,2.]).tolist()→[1.,2.]；copy避免修改源数组 |
| np.linalg.eigvalsh(a) / .min() | 实对称矩阵特征值（升序）；最小元素 | np.linalg.eigvalsh(np.diag([1.,4.])).min()=1；检查P半正定 |
| ValueError / AssertionError / SystemExit | 输入值错误、断言错误、进程退出异常 | raise ValueError("错误")；raise SystemExit(2) |
| argparse.ArgumentParser / add_argument / parse_args | 创建解析器、注册参数、返回Namespace | --scenario 1→args.scenario=1；type=int做转换，choices限制范围 |
| json.dumps(obj,ensure_ascii=False,allow_nan=False) | 字典序列化为字符串；保留中文，拒绝NaN/Inf | json.dumps({"z":None})→'{"z": null}' |
| print(*objects) | 输出到终端，返回None | print("a",1)输出a 1 |
| Path(out) / mkdir(parents=True,exist_ok=True) / 路径除号 | 构造路径、创建目录、拼路径 | Path("charts")/"a.png"→charts/a.png |
| matplotlib.use("Agg") | 非交互后端，导入pyplot之前调用 | 允许无桌面环境生成PNG |
| font_manager.fontManager.ttflist / .name / plt.rcParams | 已知字体列表、名称属性、全局绘图配置映射 | {f.name for f in ...}取字体名集合；rcParams设置字体 |
| plt.subplots(nrows,ncols,figsize=...) | 返回Figure和Axes，figsize单位英寸 | fig,axes=plt.subplots(2,1)；axes[0]为第一个轴 |
| ax.plot(x,y,...) / set_xlabel / set_ylabel / set_title / legend / grid | 画曲线、轴名称、标题、图例和网格 | ax.plot([0,1],[0,2],label="线")；返回Line2D列表 |
| fig.tight_layout / savefig(path,dpi=180) / plt.close(fig) | 调整布局、保存图、释放图对象 | fig.savefig("a.png",dpi=180)，无数值返回 |
| unittest.TestCase / unittest.main | 测试基类与发现执行test_方法 | class TestKalman(unittest.TestCase)；调用unittest.main() |
| assertAlmostEqual / assertEqual / assertGreater / assertLess / assertGreaterEqual / assertRaises | 检查近似相等、相等、大于、小于、大于等于、指定异常 | self.assertAlmostEqual(0.1+0.2,.3)；with self.assertRaises(ValueError): ... |
| np.testing.assert_allclose / assert_array_equal | 容差比较与严格元素比较，失败抛异常 | np.testing.assert_allclose([.1+.2],[.3],atol=1e-12) |
