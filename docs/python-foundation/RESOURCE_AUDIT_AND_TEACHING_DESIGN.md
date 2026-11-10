# Python 零基础导学：资源审核、选型与课程设计（2026-11-10）

## 本次任务与决策

学员明确从未系统学习过Python，原D15直接开展CSV/NumPy和Matplotlib过快，但已经有D01–D14的C语言学习经历，并且应保留原D15课程、题号、个人代码注释与通关记录。

处理方式：**新增独立`python-foundation.html`先修页**，不额外消耗84天课表编号、不更改`courses.json`及D15主课内容、不改进度或私有记录仓库。D15和课程首页放可直接到达的链接。

完整教材：20章分阶段课、24条今后高频语法/库索引、20项C与Python对照、11个资源及一套可下载的原生Python标准库工程。用户本地独立执行Python，网页仅用于阅读/自测/ZIP下载/笔记浏览器自动保存。导学页笔记可JSON导出，转存D15主课时复制总结进原笔记框，以复用原私有云同步，而不直接修改私人记录。

## 外部资源经过核对（课程未复刻原文与他人代码）

1. Python官方中文教程：https://docs.python.org/zh-cn/3/tutorial/index.html
   - 涵盖Python解释器、控制流、数据结构、模块、文件、异常、类；官方自述主要面向已有一般编程概念的读者。
   - 本教程的做法：补上每个示例的“程序入口→函数调用→局部变量→返回值”逐步解释。

2. Harvard CS50P：https://cs50.harvard.edu/python/weeks/ ，总课程https://cs50.harvard.edu/python/
   - 章节按函数/变量、条件、循环、异常、库、测试、文件、正则、类等排列，设有视频与练习。
   - 采用“讲一个概念→做小练习→验证”，将例子换成原创汽车日志语境。

3. Microsoft Learn中文基础：https://learn.microsoft.com/zh-cn/training/paths/get-started-with-python-fundamentals/
   - 第一部分基础（文档显示4模块约3小时12分钟），另有构建程序的第二部分：https://learn.microsoft.com/zh-cn/training/paths/get-started-with-python-programs/（循环、容器、文件和函数）。
   - 借鉴短单元先掌握一种操作的节奏，但不把官方本身的学习时长强制当作本页所需时间。

4. Microsoft Learn视频Python for Beginners：https://learn.microsoft.com/en-us/shows/intro-to-python-development/
   - 页面列出44集短视频，可先看前6集、13–14集、17–24集以及25–31集，优先补环境、数字、异常、条件、容器、循环、函数。
   - 视频部分作为操作演示补充；不声称已经逐帧观看/复核每集视频内容。

5. 骆昊GitHub Python-100-Days：https://github.com/jackfrued/Python-100-Days
   - 仓库README列出Day01–20基础、变量、if、for、列表、元组、字典、函数、类，另有Day23读写CSV。
   - 借鉴范围和递进顺序，不复制示例或他人题目。适合中文补习。

6. Automate the Boring Stuff with Python第三版：https://automatetheboringstuff.com/3e/
   - 目录从基础、控制流、函数、调试、列表、字典、字符串进入文件、CSV/JSON、自动化任务；重视真实可完成的项目。
   - 课程采取一个连续工程贯穿多个语法，避免知识点孤立。

7. MicrosoftLearning公开练习仓库：https://github.com/MicrosoftLearning/mslearn-python-programming
   - 官方README说明练习可单独完成且配合Learn模块更合适，用于额外基础练习推荐。

8. 微软视频示例仓库：https://github.com/microsoft/c9-python-getting-started
   - 官方README说明它假设学员有一点其他编程语言经验，适合已学C者做写法对照，但仍需要本教程从Python零开始。

9. Python Packaging User Guide：https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/
   - 用于venv/pip安装指令和隔离环境概念。

10. NumPy官方入门：https://numpy.org/doc/stable/user/absolute_beginners.html
    - 学会基础Python再阅读NumPy的ndarray、shape、向量操作，连接原D15。

## 课程框架与工程链

第01–06章：解释器/脚本入口/环境/类型/运算/if/文本；
第07–09章：list/dict/tuple/set、for/while、下标切片；
第10–13章：def、返回值、关键字参数、import、__name__、class/dataclass；
第14–16章：Path、CSV、JSON、异常、Traceback、unittest；
第17–18章：从main.py→reader.py→models.py/monitor.py→main.py的完整逻辑链、故障注入、真实运行；
第19–20章：语法索引和衔接NumPy/Matplotlib。

原创完整工程文件：`python-foundation-project/`：`models.py`、`reader.py`、`monitor.py`、`main.py`、`test_pipeline.py`、正常/损坏CSV、README。使用Python标准库，无第三方依赖。

## 验收边界

- GitHub Actions：真实Python 3.11运行单元测试、8帧输出、损坏CSV行号；Playwright真实浏览器验证页面跳转、笔记切换/刷新自动保存、20章节导航、源码文件显示、下载ZIP的CRC、手机端布局。
- 学员仍须在自己的WSL/电脑实际运行Python并留存输出；浏览器上显示理解检测正确不能当作本地真实Python或C通关。
- 本页是离线教学模拟，既没有实际汽车接口也没有真实20ms调度，更不能输出真实车控命令。


## 2026-11-10 进一步审核：从“课目简介”改成“语法精讲”

学员指出V1虽然有20章，但每章讲解只有几百字、十几行代码，符号没有前置说明，`for`被混在list章节、`while`另占一章，`enumerate`在未学解包前直接出现，跨文件ASW工程过早。这些问题通过检查`python-foundation-content.json`属实。

实际阅读了以下GitHub公开教程的目录与章节正文：

- 骆昊`jackfrued/Python-100-Days`当前`Day01-20/03.Python语言中的变量.md`：先程序、变量与类型、命名，配用法；`Day01-20/06.循环结构.md`同一章有`for-in循环`、`while循环`、`break和continue`、嵌套循环与练习；`Day01-20/14.函数和模块.md`有`def`、参数、返回、模块导入等。从其组织方式借鉴“一个主题内部讲全”；未复制原有正文或代码。
- `mraza007/Python-for-beginners/course/07-loops/README.md`：顺序为for→range→while→break/continue→常见错误→练习，明确for和while不同的控制方式；`course/13-functions/README.md`先定义与调用，再参数和return，再默认值与作用域，适合按颗粒度学习。
- Python官方控制流教程 https://docs.python.org/3/tutorial/controlflow.html ：明确Python `for` 遍历元素，`range`终点不包含，通常可用`enumerate`取得序号；语言参考 https://docs.python.org/3/reference/expressions.html#primaries 对`.`属性访问与`()`调用、`[]`索引作严格区分。
- Python官方 PEP 8 https://peps.python.org/pep-0008/ ：`lower_case_with_underscores`的常见命名风格、`_single_leading_underscore`的约定用途、`__double_leading_and_trailing_underscore__`特殊协议名称；课程没有把单前导`_`误写成强制私有。
- 对照了`mraza007/Python-for-beginners/course`完整目录和`jackfrued/Python-100-Days/Day01-20`前20天，决定将学习顺序改为代码符号→类型→运算→字符串→条件→完整循环→容器→函数→模块→类→文件/异常→测试→工程，避免让ASW应用本身变成最初的认知障碍。

### V2具体交付与验收

- 独立新版`python-foundation-v2-content.json`：21章、102个`details`语法小节，每节包含写法、解说、符号表、可复制代码、执行追踪、预期输出、常见错误与修改任务。第02章11种标点/特殊符号，第08章12种完整循环语法。
- 原教材文件不删除；新的v2章节key独立分配，不将旧笔记错误挂到改变顺序的章节。
- `python-foundation.html`的知识点结构直接渲染在正文中；保留现有C→Python对照、个人笔记、逐文件代码注释、划线批注、下载项目ZIP及后续原D15链接。
- `tests/python_foundation_v2_examples.py`在GitHub Actions中以真实Python实际执行教材例子，核对输出；`tests/python_foundation_browser.py`在浏览器里验证章节跳转、旧笔记可见、新笔记保存/刷新后保留、完整源码及ZIP。
- 所有案例仍是离线ASW教学背景，首次涉及某语法时尽量使用简单数字/列表；后来才做输入校验、状态与模块调用。视频类资源只查阅官方大纲/资源介绍，不声称逐帧看完视频。
