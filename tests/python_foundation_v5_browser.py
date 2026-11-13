"""V5真实页面回归：新增84课题渲染、真实交互和旧页第01–14章本地记录迁移。"""
from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
URL="http://127.0.0.1:8765/python-foundation-v5.html"

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        context=browser.new_context(viewport={"width":1440,"height":940},accept_downloads=True)
        page=context.new_page()
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.add_init_script("""(() => {
            const old='asw-python-foundation-v1:'+location.pathname.replace(/python-foundation-v5\.html$/,'python-foundation.html');
            if(!localStorage.getItem(old)){
                localStorage.setItem(old,JSON.stringify({
                    schema:1,
                    done:['v2_01','v2_12'],
                    answers:{v2_01:1},
                    notes:{v2_01:'第一章旧笔记：import定义与调用',v2_12:'第14章旧笔记：关键字参数'},
                    annotations:[{id:'v5-old-annotation',chapter:'v2_01',quote:'模块',note:'标记来自旧页'}],
                    fileNotes:{'main.py':'旧页已有的main源码理解'},
                    checklist:{"0":true},
                    lastChapter:'v2_12'
                }));
            }
        })();""")
        page.goto(URL,wait_until="networkidle")
        page.wait_for_function("document.body.dataset.foundationReady === 'yes'")
        assert page.locator("#chapterNav button[data-chapter]").count()==23
        assert "已从当前浏览器旧页迁移" in page.locator("#migrationStatus").inner_text()
        old_json=page.evaluate("""() => {
            const k='asw-python-foundation-v1:'+location.pathname.replace(/python-foundation-v5\.html$/,'python-foundation.html');
            return localStorage.getItem(k);
        }""")
        assert old_json and "第一章旧笔记" in old_json
        new_json=page.evaluate("localStorage.getItem('asw-python-foundation-v1:'+location.pathname)")
        state=json.loads(new_json)
        assert state["notes"]["v2_01"].startswith("第一章旧笔记")
        assert state["notes"]["v2_12"].startswith("第14章旧笔记")
        assert "v2_01" in state["done"] and "v2_12" in state["done"]
        assert state["annotations"][0]["note"]=="标记来自旧页"
        assert state["fileNotes"]["main.py"].startswith("旧页已有")
        assert page.locator("#chapterNote").input_value()=="第14章旧笔记：关键字参数"
        assert "2 / 23" in page.locator("#progressLine").inner_text()

        page.locator("#startDeep").click()
        assert "15｜模块" in page.locator("#chapterPanel h2").inner_text()
        assert page.locator("#chapterPanel details.deepLesson").count()==8
        assert page.locator("#chapterPanel details.deepLesson[open]").count()==1
        assert "第一个" in page.locator("#chapterPanel").inner_text() or "函数" in page.locator("#chapterPanel").inner_text()
        first=page.locator("#chapterPanel details.deepLesson").first
        assert first.locator("table tbody tr").count()>=3
        assert first.locator(".deepSteps li").count()>=3
        first.get_by_role("button",name="下一步").click()
        assert "第 2 /" in first.locator(".deepStepper").inner_text()
        first.locator("textarea").fill("已经在本地运行第15章第1例")
        page.locator("#chapterNav button[data-chapter='v2_14']").click()
        assert page.locator("#chapterPanel details.deepLesson").count()==13
        page.locator("#chapterNav button[data-chapter='v2_15']").click()
        assert page.locator("#chapterPanel details.deepLesson").count()==20
        summaries=page.locator("#chapterPanel details.deepLesson summary")
        assert any("JSON" in s for s in summaries.all_inner_texts())
        section=page.locator("#chapterPanel details.deepLesson").nth(15)
        section.locator("summary").click()
        assert section.locator(".deepCode").is_visible()
        assert section.locator(".syntaxTable table").is_visible()
        page.screenshot(path=str(ROOT/"python-foundation-v5-test-desktop.png"),full_page=True)

        page.reload(wait_until="networkidle")
        page.wait_for_function("document.body.dataset.foundationReady === 'yes'")
        page.locator("#chapterNav button[data-chapter='v2_13']").click()
        assert page.locator("#chapterPanel details.deepLesson").first.locator("textarea").input_value()=="已经在本地运行第15章第1例"
        page.locator("#chapterNav button[data-chapter='v2_01']").click()
        assert page.locator("#chapterNote").input_value().startswith("第一章旧笔记")

        with page.expect_download() as downloaded:
            page.get_by_role("button",name="导出学习笔记 JSON").click()
        payload=json.loads(Path(downloaded.value.path()).read_text(encoding="utf-8"))
        assert payload["data"]["notes"]["v2_12"].startswith("第14章旧笔记")
        assert payload["data"]["deepNotes"]["v2_13::0"].startswith("已经在本地")
        assert payload["data"]["annotations"][0]["note"]=="标记来自旧页"

        phone=browser.new_page(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
        phone.goto(URL,wait_until="networkidle")
        phone.wait_for_function("document.body.dataset.foundationReady === 'yes'")
        phone.locator("#startDeep").click()
        assert phone.locator("#chapterPanel details.deepLesson").count()==8
        phone.screenshot(path=str(ROOT/"python-foundation-v5-test-mobile.png"),full_page=True)
        assert not errors,errors
        print("V5 PASS: 84 lessons, old 01–14 notes copied without deletion, deep notes autosave, refresh/export and mobile rendering")
        browser.close()

if __name__=="__main__":
    main()
