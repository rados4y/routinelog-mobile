"""Exercise the released APK and real Android launcher, using only seeded emulator data."""
import pathlib
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from PIL import Image

results = pathlib.Path('/tmp/widget-smoke-results')
results.mkdir(exist_ok=True)
package = 'pl.rados4y.routinelog'


def adb(*args):
    return subprocess.check_output(['adb', *args], timeout=45).decode(errors='replace')


def screen(name):
    adb('shell', 'uiautomator', 'dump', '/sdcard/widget-screen.xml')
    xml = adb('shell', 'cat', '/sdcard/widget-screen.xml')
    (results / (name + '.xml')).write_text(xml)
    with (results / (name + '.png')).open('wb') as image:
        subprocess.run(['adb', 'exec-out', 'screencap', '-p'], stdout=image, check=True, timeout=30)
    return ET.fromstring(xml)


def tap(node):
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.attrib['bounds']))
    adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))


def find_label(root, label):
    return next((node for node in root.iter('node') if label in node.attrib.get('content-desc', '')), None)


def wait_label(label, name):
    for _ in range(10):
        time.sleep(2)
        root = screen(name)
        node = find_label(root, label)
        if node is not None:
            return root, node
    raise RuntimeError('Launcher did not display: ' + label)


try:
    adb('install', '-r', '/tmp/routinelog-preview.apk')
    adb('logcat', '-c')
    adb('shell', 'am', 'start', '-n', package + '/.MainActivity')
    # A released APK may have a compatible OTA newer than its embedded bundle.
    # Let Expo download it, then cold-launch to apply it before testing.
    time.sleep(20)
    adb('shell', 'am', 'force-stop', package)
    adb('shell', 'am', 'start', '-n', package + '/.MainActivity')
    button = None
    for _ in range(20):
        time.sleep(2)
        root = screen('app')
        button = next((node for node in root.iter('node') if 'Add home-screen widget' in node.attrib.get('content-desc', '')), None)
        if button is not None:
            break
    if button is None:
        raise RuntimeError('The app did not display the widget action.')
    tap(button)
    time.sleep(3)
    root = screen('pin-dialog')
    confirm = next((node for node in root.iter('node') if node.attrib.get('text', '').lower() in ['add', 'add automatically', 'add to home screen']), None)
    if confirm is None:
        raise RuntimeError('Android did not display its add-widget confirmation.')
    tap(confirm)
    adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
    rendered = False
    for _ in range(15):
        time.sleep(2)
        root = screen('launcher')
        rendered = any('RoutineLog today' in node.attrib.get('content-desc', '') for node in root.iter('node'))
        if rendered:
            break
    if not rendered:
        raise RuntimeError('Widget did not render in the Android launcher.')
    print('Native launcher rendered RoutineLog Today.')
    widget = find_label(root, 'RoutineLog today')
    bounds = tuple(map(int, re.findall(r'\d+', widget.attrib['bounds'])))
    pixels = Image.open(results / 'launcher.png').convert('RGB').crop(bounds)
    # The drawn panel fits its contents; unused launcher grid space is now
    # transparent. Validate the visible light panel, allowing thin dividers.
    first = last = None
    gap = 0
    for y in range(pixels.height):
        light_row = sum(1 for x in range(pixels.width) if min(pixels.getpixel((x, y))) >= 230 and max(pixels.getpixel((x, y))) - min(pixels.getpixel((x, y))) < 8)
        if light_row / pixels.width >= 0.55:
            if first is None:
                first = y
            last = y + 1
            gap = 0
        elif first is not None:
            gap += 1
            if gap > 8:
                break
    if first is None:
        raise RuntimeError('The compact light panel is missing.')
    pixels = pixels.crop((0, first, pixels.width, last))
    light = sum(1 for r, g, b in pixels.getdata() if min(r, g, b) >= 230 and max(r, g, b) - min(r, g, b) < 8)
    ratio = light / (pixels.width * pixels.height)
    if ratio < 0.55:
        raise RuntimeError('Widget does not have the reference light background.')
    print(f'Light widget background verified ({ratio:.0%} of widget pixels).')
    previous = find_label(root, 'Previous day')
    if previous is None:
        raise RuntimeError('Previous-day arrow is missing.')
    tap(previous)
    root, heading = wait_label('Return to today', 'previous-day')
    if find_label(root, 'Next status:') is not None:
        raise RuntimeError('Past-day routines must be read-only.')
    tap(heading)
    root, _ = wait_label('RoutineLog today', 'today-again')
    print('Date arrows and return-to-today verified.')
    candidate = find_label(root, '. Unchecked. Next status: Done')
    if candidate is None:
        raise RuntimeError('No seeded routine is available for status cycling.')
    name = candidate.attrib['content-desc'].split('. Unchecked.')[0]
    for status in ['Done', 'Not done', 'Skipped', 'Unchecked']:
        # Tap the circular status area on the right of the routine row.
        x1, y1, x2, y2 = map(int, re.findall(r'\d+', candidate.attrib['bounds']))
        adb('shell', 'input', 'tap', str(x2 - (y2 - y1) // 2), str((y1 + y2) // 2))
        root, candidate = wait_label(name + '. ' + status + '.', 'status-' + status.lower().replace(' ', '-'))
        if find_label(root, 'RoutineLog today') is None:
            raise RuntimeError('Routine click unexpectedly opened the app.')
    print('Native circular control cycled all four statuses without opening the app.')
except Exception:
    root = screen('failure')
    labels = [node.attrib.get('text') or node.attrib.get('content-desc') for node in root.iter('node')]
    print('Seeded emulator screen:', [label for label in labels if label][:40])
    raise
finally:
    (results / 'logcat.txt').write_text(adb('logcat', '-d', '-v', 'brief'))
    (results / 'widgets.txt').write_text(adb('shell', 'dumpsys', 'appwidget'))
