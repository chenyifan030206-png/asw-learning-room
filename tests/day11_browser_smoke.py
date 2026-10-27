"""Smoke test for the released-style static Pages frontend (no private token)."""
import asyncio
import json
import pathlib
import subprocess
import time
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCREENSHOTS = ROOT / "day11-ui-evidence"
SCREENSHOTS.mkdir(exist_ok=True)

async def exercise(browser, width, height, label):
    ctx = await browser.new_context(viewport={"width": width, "height": height})
    await ctx.add_init_script("""
        const state={notes:[],progress:Array.from({length:10},(_,i)=>({
          day:i+1,method:'test',source:'browser-simulation',created:'2026-10-20T00:00:00Z'
        })),runs:[],attempts:[]};
        localStorage.setItem('asw-pages-v1:/', JSON.stringify(state));
    """)
    page = await ctx.new_page()
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    await page.goto("http://127.0.0.1:8765/", wait_until="networkidle")
    await page.wait_for_function("document.getElementById('title')?.textContent.includes('环形缓冲')")
    assert await page.locator("#day11Compass").is_visible()
    assert await page.locator("#walkthrough").is_visible()
    assert await page.locator("#cloudPanel").is_hidden()
    await page.locator("#day11Compass button").filter(has_text="queue").first.click()
    info = await page.locator("#day11SymbolInfo").inner_text()
    assert "demo.c" in info, info
    await page.locator("#tab-run").click()
    await page.locator("#scenario").select_option("1")
    await page.locator("#runButton").click()
    await page.locator("#day11QueueTrace").wait_for()
    assert "第1/11步" in await page.locator(".d11-trace-controls").inner_text()
    for _ in range(6):
        await page.locator("#day11QueueTrace button").filter(has_text="下一步").click()
    assert "队列已满" in await page.locator(".d11-trace-explanation").inner_text()
    await page.screenshot(path=str(SCREENSHOTS / (label + "_trace.png")), full_page=True)
    await page.locator("#tab-learn").click()
    await page.screenshot(path=str(SCREENSHOTS / (label + "_lesson.png")), full_page=True)
    overflow = await page.evaluate("document.documentElement.scrollWidth > innerWidth + 2")
    assert not overflow, label + " horizontal overflow"
    assert not errors, errors
    await ctx.close()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        await exercise(browser, 1440, 900, "desktop")
        await exercise(browser, 390, 844, "mobile")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
