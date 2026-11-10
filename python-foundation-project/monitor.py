"""ASW教学监视器：输入一帧，返回一个Decision；保留跨帧告警状态。"""
from models import Decision, Frame


class Monitor:
    """class代表可以保存状态与提供方法的类型；每个实例各有自己的alert。"""

    def __init__(self) -> None:
        # __init__在Monitor()创建对象时执行一次，而不是每读一帧执行一次。
        self.previous_alert = False

    def step(self, frame: Frame, now_ms: int) -> Decision:
        """处理一帧。self是当前Monitor实例；返回完整Decision对象。"""
        age_ms = now_ms - frame.time_ms

        # 若年龄超出允许范围或雷达无效，清除旧告警，拒绝有效输出。
        if age_ms < 0 or age_ms > 100 or not frame.radar_valid:
            self.previous_alert = False
            return Decision(frame.time_ms, "INVALID", False, False, age_ms)

        # 未启用时，输出状态OFF，valid=False。status与valid不是一个含义。
        if not frame.enable:
            self.previous_alert = False
            return Decision(frame.time_ms, "OFF", False, False, age_ms)

        # 二阈值滞环：告警未开时35m开启，已开时41m才关闭。
        if not self.previous_alert and frame.distance_m <= 35.0:
            self.previous_alert = True
        elif self.previous_alert and frame.distance_m >= 41.0:
            self.previous_alert = False

        # 函数一次返回整个对象；调用者再通过decision.status等取成员。
        return Decision(frame.time_ms, "ACTIVE", True, self.previous_alert, age_ms)
