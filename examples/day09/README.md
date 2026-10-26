# Day09：控制漏次与dt

这是真实C工程；网页中的JavaScript仅为教学模拟。

main读取速度、跳过轮次、迟到毫秒，创建result并把&result传给Timeline_Run。函数先在draft里计算，成功时用*out=draft写回。

```sh
gcc -std=c17 -Wall -Wextra -Wpedantic -Wconversion -Werror demo.c timing.c -o timeline_demo -lm
printf '10 3 0\n' | ./timeline_demo
cmake -S . -B build-main -DCMAKE_BUILD_TYPE=Release
cmake --build build-main
ctest --test-dir build-main --output-on-failure
```

D08A独立补课：添加-DBUILD_APPENDIX=ON，另行构建signal示例与测试。
本工程只模拟给定时刻，未测CPU调度，不保证漏控制后的实车安全。
