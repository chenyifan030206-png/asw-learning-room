# D18 非自定义函数与语法参考（随工程ZIP）

阅读顺序：先看最小例子，再回到源码。下列均为库API、语言语法或属性；seeded_noise、lowpass、statistics、step_metrics、run_scenario、save_charts、main为本课自定义函数。

## 数组、统计、索引

| API与类型 | 定义、参数 | 最小示例与返回 | 本课用途、容易犯的错 |
|---|---|---|---|
| np.asarray(a,dtype=...) | 将数组样对象转换为ndarray；dtype指定类型 | np.asarray([1,2],dtype=np.float64) → array([1.,2.])，shape=(2,) | 统一输入；符合条件可复用，不保证复制 |
| np.float64 / .ndim / .shape | 类型 / 属性 / 属性 | array([1.,2.]).ndim=1，shape=(2,) | 小数及一维检查；属性不加() |
| np.empty(n,dtype=...) | 创建未初始化数组 | np.empty(3) → shape=(3,)，内容未定义 | 生成噪声前分配；未填充绝不能读 |
| np.empty_like(a) | 按原数组形状和类型创建未初始化数组 | np.empty_like(np.array([1.,2.])) → 2个浮点位置 | 滤波输出逐个填入 |
| np.zeros(n,dtype=...) | 创建全0数组 | np.zeros(3) → [0.,0.,0.] | 阶跃的初始输入 |
| np.mean(a) | 所有元素和除以数量（默认axis=None） | np.mean([9,10,11])=10 | 平均水平 |
| np.var(a,ddof=0) | 围绕均值的平方偏差之和/(N-ddof) | np.var([9,10,11])=2/3；ddof=1则=1 | 当前记录的描述性方差，单位(m/s)^2；ddof=1常用于独立同分布样本估计总体方差，N必须>1 |
| np.std(a,ddof=0) | 同分母方差的平方根 | np.std([9,10,11])≈0.8165 | 波动尺度，单位m/s |
| np.sqrt(x) | 逐元素求非负平方根 | np.sqrt([4,9]) → [2.,3.] | RMSE；负实数不产生正常实根 |
| np.isfinite(a) / .all() / np.all(a) | 有限数逐项判断 / 全部为真 | np.isfinite([1,np.nan]) → [True,False]；.all()→False | 拒绝NaN/Inf；不是检查数值是否合理 |
| np.flatnonzero(a) | 返回展平后非零元素索引 | np.flatnonzero([False,True,True]) → [1,2] | 找阶跃首次过阈值；空结果不可取[0] |
| np.arange(stop) | 生成从0到stop前的等间隔数组 | np.arange(3) → [0,1,2] | 乘dt得时间；不是实际车载时间戳 |
| ndarray.tolist() | 转成Python列表 | np.array([1.,2.]).tolist() → [1.0,2.0] | JSON不能直接序列化普通ndarray |
| len(x), range(start,stop), float(x), str(x), int(x) | 内置函数/类型 | len([1,2])=2；list(range(1,3))=[1,2]；float("1.2")=1.2；str(12)="12"；int("2")=2 | 数量、循环、类型转换、错误消息、CLI整数 |
| 切片、% 、**、比较 | 语言语法 | x[50:]从索引50开始；7%3=1；2**3=8；0<alpha<=1为链式比较 | 统计窗口、伪随机状态、平方、系数检查 |
| if/else、for、try/except、raise、return、None | 语言语法与空值 | if条件真执行块；except捕获指定异常；None表示没有结果 | 不把未达到阈值写成0秒 |
| ValueError / AssertionError / SystemExit | 内置异常类 | raise ValueError("原因")；raise SystemExit(2) | 输入错误、内部不变量、进程退出状态 |

## 入口、文件与绘图

| API | 定义和参数 | 例子及返回 |
|---|---|---|
| argparse.ArgumentParser(description=...) | 创建命令行参数解析器 | parser=argparse.ArgumentParser()，返回解析器 |
| parser.add_argument(name,type=...,choices=...,default=...) | 注册选项，type转换输入，choices限定范围 | parser.add_argument("--scenario",type=int,default=0)，返回Action对象 |
| parser.parse_args() | 解析命令行 | python demo.py --scenario 1 → args.scenario=1，Namespace |
| json.dumps(obj,ensure_ascii=False) | 将可序列化对象转换成JSON字符串 | json.dumps({"a":1}) → '{"a": 1}' |
| print(*objects) | 向标准输出写文本 | print("a",1)输出a 1，返回None |
| Path(out) / .mkdir(parents=True,exist_ok=True) / 路径 / 运算符 | Path构造路径对象；mkdir创建目录，parents允许补齐父目录，exist_ok允许已存在；/拼接路径 | Path("charts")/"a.png"为charts/a.png；mkdir成功返回None |
| matplotlib.use("Agg") | 指定非交互图形后端 | 在import pyplot前调用，返回None |
| font_manager.fontManager.ttflist、字体.name、plt.rcParams | 字体列表属性、字体名称属性、全局配置映射 | {f.name for f in ...}为集合推导式；rcParams["font.sans-serif"]设置字体候选 |
| plt.subplots(figsize=(宽,高)) | 创建画布和坐标轴，英寸 | fig,ax=plt.subplots(figsize=(8,4.5)) |
| ax.plot(x,y,label=...) | 根据同长度数据画线 | ax.plot([0,1],[0,2],label="线")返回Line2D列表 |
| ax.set_xlabel / set_ylabel / set_title | 设置轴标签和标题 | ax.set_xlabel("时间(s)")返回Text对象 |
| ax.legend() / ax.grid(alpha=.25) | 图例 / 网格透明度 | legend返回Legend；grid调整网格，无数值返回 |
| fig.tight_layout() / fig.savefig(path,dpi=180) / plt.close(fig) | 调整布局 / 保存图片 / 关闭图对象 | 保存后查看PNG，均非滤波计算，通常返回None |

## 测试

unittest.TestCase为测试基类；test_方法由unittest.main()发现并执行。self.assertEqual(a,b)检查相等；assertAlmostEqual检查近似相等；assertTrue检查真值；assertLess(a,b)检查a<b；assertNotIn(key,dict)检查不存在；with self.assertRaises(ValueError)要求块内抛出指定异常。np.testing.assert_allclose(a,b,atol=...,rtol=...)检查容差，np.testing.assert_array_equal(a,b)要求逐项相等；不满足时抛AssertionError，成功返回None。例：np.testing.assert_allclose([0.1+0.2],[0.3],atol=1e-12)。

官方参考：https://numpy.org/doc/stable/reference/generated/numpy.var.html 、https://numpy.org/doc/stable/reference/generated/numpy.flatnonzero.html 、https://docs.python.org/3/library/argparse.html 、https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.subplots.html
