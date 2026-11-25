"""D19真正Chromium验收：理论阅读顺序、八案例图示、源码下载及个人笔记。"""
import zipfile
from playwright.sync_api import sync_playwright


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1300, "height": 900},
                                accept_downloads=True)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.add_init_script("""(() => {
          if (localStorage.getItem('asw-pages-v1:/')) return;
          const data={
            notes:[{day:18,notes:'D18滤波递推',
               feedback:'',annotations:'[]',file_notes:'{}',
               updated:'2026-11-23T00:00:00Z'}],
            progress:Array.from({length:18},(_,i)=>({
              day:i+1,method:'test',detail:'浏览器在线练习',
              updated:'2026-11-23T00:00:00Z'
            })),
            attempts:[],runs:[]
          };
          localStorage.setItem('asw-pages-v1:/',JSON.stringify(data));
        })()""")
        page.goto("http://127.0.0.1:8765/index.html", wait_until="networkidle")
        page.wait_for_function("document.querySelector('#courseStatus')?.textContent.includes('D19')")
        assert "卡尔曼滤波入门" in page.locator("#title").inner_text()
        assert page.locator("#reading .d17-concept").count() == 0
        assert page.locator("#reading svg").count() == 0
        assert page.locator("#codeSteps button").count() == 12
        assert "模块" in page.locator("#architecture").inner_text()
        assert page.locator("#fileTabs button[data-file='FUNCTION_GUIDE.md']").count()==1
        page.locator("#fileTabs button[data-file='FUNCTION_GUIDE.md']").click()
        assert "np.linalg.eigvalsh" in page.locator("#code").inner_text()

        assert page.locator("#fileTabs button[data-file]").count()==8
        page.locator("#fileTabs button[data-file='kalman.py']").click()
        assert "class KalmanCV" in page.locator("#code").inner_text()
        page.locator("#editCodeNotes").click()
        page.locator("#codeNotes").fill(
            "# 我的D19源码批注：self.x和self.P跨帧保存。")
        page.locator("#fileTabs button[data-file='demo.py']").click()
        page.locator("#fileTabs button[data-file='kalman.py']").click()
        page.locator("#editCodeNotes").click()
        assert "我的D19源码批注" in page.locator("#codeNotes").input_value()

        page.locator("#tab-run").click()
        for scenario in range(7):
            page.locator("#scenario").select_option(str(scenario))
            page.locator("#runButton").click()
            page.wait_for_function("""n => {
              const output=document.querySelector('#output')?.textContent||'';
              return output.includes('S'+String(n+1).padStart(2,'0'));
            }""", arg=scenario)
            output=page.locator("#output").inner_text()
            assert "status" in output and "valid" in output,scenario
            if scenario==6:
                assert page.locator("[data-role='day19-chart']").count()==0
                assert "invalid_r" in output
            else:
                assert page.locator("[data-role='day19-chart']").count()==4,scenario
                assert "原始位置RMSE" in output
                assert "全帧速度RMSE" in output
                assert "位置方差" in output
                assert "RMSE" in output
                if scenario == 1:
                    assert "缺测" in output and "仅预测" in output
        page.locator("#tab-learn").click()
        with page.expect_download() as transfer:
            page.locator("#downloadProject").click()
        with zipfile.ZipFile(transfer.value.path()) as z:
            assert z.testzip() is None
            assert len(z.namelist())==8
            names=z.namelist()
            assert any(n.endswith("/FUNCTION_GUIDE.md") for n in names)
            assert b"np.linalg.eigvalsh" in z.read(next(n for n in names if n.endswith("/FUNCTION_GUIDE.md")))
            assert any(n.endswith("/kalman.py") for n in names)
            assert b"class KalmanCV" in z.read(next(n for n in names if n.endswith("/kalman.py")))

        page.locator("#notes").fill("D19：估计器不读取真值。")
        page.locator("#saveNotes").click()
        page.wait_for_function("""() => {
          const db=JSON.parse(localStorage.getItem('asw-pages-v1:/'));
          return db.notes.some(n=>n.day===19&&n.notes.includes('D19：估计器不读取真值'));
        }""")
        original=page.evaluate("() => JSON.parse(localStorage.getItem('asw-pages-v1:/'))")
        assert next(x for x in original["notes"] if x["day"]==18)["notes"].startswith("D18滤波递推")
        assert len(original["progress"])==18

        page.reload(wait_until="networkidle")
        page.wait_for_function("document.querySelector('#notes')?.value.includes('D19：估计器不读取真值')")
        page.locator("#fileTabs button[data-file='kalman.py']").click()
        page.locator("#editCodeNotes").click()
        assert "我的D19源码批注" in page.locator("#codeNotes").input_value()

        page.set_viewport_size({"width": 390, "height": 844})
        sizes=page.evaluate("() => ({vp:innerWidth,w:document.documentElement.scrollWidth})")
        assert sizes["w"]<=sizes["vp"]+2,sizes
        assert not errors,errors
        print("PASS D19 engineering-only page, 12 code steps, 7 cases, 4 charts, API ZIP and notes")
        browser.close()


if __name__=="__main__":
    run()
