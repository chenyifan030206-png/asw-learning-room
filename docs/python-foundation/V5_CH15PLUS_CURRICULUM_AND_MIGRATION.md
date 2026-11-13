# Python基础课程 V5：第15–23章教学重构与笔记迁移说明

## 需求和边界

学习者已掌握一点C语言，最近实际反复询问 import / from / as、类和实例、def与self的传参规则、初始化__init__与@dataclass区别、staticmethod、with与r/w/a/x、CSV+StringIO+DictReader的嵌套数据、JSON的dumps/loads/dump/load及布尔大小写转换。V4的第15章以后仅有6–8个概括性主题，语法细节和完整代码解释不足。

本次V5是独立的新网页版 `python-foundation-v5.html`，保留旧页面 `python-foundation.html`。原有V4第01–14章字段和章节ID不变，不改原D15运行器、课程事实记录或用户在私有笔记库中的成绩。

## 重新编排的教学内容

每一课必须遵循六步：
1. 先回答“为什么要学、什么时候用”，不要提前进入ASW工程。
2. 用完整语法模板拆解关键字、对象、形参、点号、括号、冒号、默认值、调用方式等；避免以为self会从外部布尔变量自动传值。
3. 给能复制到Python本地真正执行的最小完整代码。多文件导入同时提供每份源文件和正确运行命令，不能把伪代码冒充可执行程序。
4. 按真正运行顺序逐条解释对象创建、形参绑定、函数返回、状态更新、文件关闭与异常传播。
5. 说明精确预期输出和常见错误（正常与故意报错的例子必须分开）。
6. 给学生一个可修改的变量或条件，要求自己先预测，再实跑，最后把结果写进该题笔记。

### 15–23章结构（84个V5新增完整精讲课题）

- 15：模块、from/import/as、首次模块加载、__name__、跨文件参数与导入错误，8题；
- 16：class/实例、__init__/self、类属性/实例属性、dataclass/无默认值/类型注解、staticmethod/classmethod、四帧滞环与asdict，13题；
- 17：Path、工作目录、with、文件r/w/a/x、写入换行/编码、read与seek、CSV quoting/DictReader/类型校验、JSON六种类型与四种接口、中文、错误与完整CSV→JSON，20题；
- 18：SyntaxError与运行时异常、try/except/else/finally、raise、异常链、业务INVALID与异常的区别，8题；
- 19：print、断点、assert与unittest、隔离、35/41边界、故障注入、读写回归，8题；
- 20：和仓库真实九文件ASW项目相对应的调用链、argparse、reader、Monitor三个分支、八帧状态、asdict与JSON、本地运行，7题；
- 21：真正本地验收：工作目录、坏CSV行号、边界失败-修复、循环错误、return、JSON闭环、运行清单，7题；
- 22：语法定位、函数签名、官方文档、环境、错误类型、完整系统理解，6题；
- 23：列表与NumPy差别、二维索引、切片、shape/axis、Matplotlib与原D15衔接，7题。

## 第01–14章学习记录迁移

旧网页保存位置：`asw-python-foundation-v1:` + 旧页面pathname。
新网页保存位置：同前缀 + `python-foundation-v5.html` pathname。
两者在GitHub Pages同一origin，因而同一浏览器的localStorage可以读取。

V5加载时：
- 首先检查新页面的有效记录；
- 然后读取旧页面记录，并**仅补充新页面缺失的字段**，已有新页面笔记优先；
- 合并 `done`、`answers`、`notes`、`annotations`、`fileNotes`、`checklist`；V5新增逐题笔记存入 `deepNotes`；
- **不删除、不覆盖旧页面对应的localStorage键**；
- 章节1–14仍使用原V4的稳定 `v2_.../v3_...` ID，避免将原批注错挂到不同章节；
- 显示自动迁移状态，允许JSON导出及恢复（兼容旧版version:1备份）。

**浏览器限制：** localStorage不能自动跨设备、不同浏览器或不相同的网站源迁移。使用者应先在旧网页导出JSON，再在新页面使用导入按钮，且导入会替换新页面当前记录，因此导入前先导出现有笔记备份。

原84天主课程D01–D15的独立私有记录不参与迁移，不应假称已经复制到此页面或把阅读标记当作真实Python本地验收。

## 教材核验和实现

- 基础语法和跨文件导入：Python官方教程 Modules https://docs.python.org/3.14/tutorial/modules.html
- __main__入口：https://docs.python.org/3.14/library/__main__.html
- 异常与错误：Python官方教程 Errors and Exceptions https://docs.python.org/3.14/tutorial/errors.html
- 字段与默认值：Python标准库dataclasses；文件API pathlib/open；CSV与JSON分别参照对应标准库文档。
- 独立脚本 `tests/python_foundation_v5_examples.py` 会校核84节完整字段，解析所有代码，对能实际运行的示例创建临时目录执行并核对精确输出（多文件示例会真实保存多个源文件并运行）。
- `tests/python_foundation_v5_browser.py` 在浏览器模拟旧页有笔记，核对第01–14章的内容与掌握标记自动复制、旧键不删除、84课题渲染、逐步讲解切换、逐题笔记保存、刷新与导出以及手机视口页面。

课程前14章不要求重学，V5从15开始；每章原V4小例子保留为可展开复习区，但新的逐字精讲是学习主线。
