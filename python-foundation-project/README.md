# Python零基础入门：ASW离线监视器完整练习工程

## 目的
单日Python导学的原创教学案例，使用标准库（无需NumPy）讲清程序入口、模块、类、函数返回值、CSV输入、异常、列表、字典、文件输出、测试。之后进入原D15的NumPy和三图任务。

这是**教学用离线监视器**，结果仅是距离告警提示，并非真实ACC控制、硬件在环或实际20ms调度。工程中的阈值仅为课程约定；不要用于车辆驾驶决策。

## 文件和调用顺序

```text
python main.py --input sample.csv
  └─ main.py: if __name__ == '__main__'
       └─ main() 读取命令行选项
            └─ run(input, output)
                 ├─ reader.py: load_frames() → list[Frame]
                 │     └─ models.py: Frame 定义
                 ├─ monitor.py: Monitor() → __init__初始化一次
                 ├─ for frame in frames
                 │     └─ monitor.step(frame, now_ms)
                 │           └─ models.py: Decision对象 → 返回
                 ├─ dataclasses.asdict(decision) → dict
                 └─ json.dump(results) → output/results.json
```

## 本地使用（Python 3.11+）

把目录中9个文件放在同一个目录，不需要安装任何第三方依赖：

```bash
python3 --version
python3 main.py --input sample.csv --output output/results.json
python3 -m unittest -v test_pipeline
python3 main.py --input bad_string.csv
python3 main.py --input bad_missing.csv
```

Windows PowerShell可以使用`py -3 main.py --input sample.csv`；Linux/WSL使用`python3`。

正确输出应为8帧；alert序列为0/1/1/0/0/1/0/1。正常程序返回码0，异常CSV返回码2并报告原始物理行；修改前后要保存终端日志。

## 故障注入：必须在自己复制的工程上完成

1. 先运行测试，保存通过记录。
2. 把`monitor.py`中的`distance_m <= 35.0`暂改为`<= 40.0`，再次运行`python3 -m unittest -v test_pipeline`，测试应失败。
3. 将阈值恢复为35.0，重新运行全部测试并保存通过记录。
4. 删除或重命名`reader.py`，运行main观察`ModuleNotFoundError`；恢复后确认能够正常导入。
5. 解释`input`是参数、`frames`是列表、`decision`是实例、`asdict`把实例转成字典，以及为何`Monitor()`必须在循环外。

## 与原D15关系
本补充工程只用Python标准库，用来建立基础语法与多文件调用概念。原D15接着在另一个工程学习NumPy、CSV数据质量和三张Matplotlib图，两者均需要学员**在本地执行**。网页的练习模拟和GitHub CI不代表用户自己的Python通关。
