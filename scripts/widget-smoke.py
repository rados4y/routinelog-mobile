"""Exercise the released APK and real Android launcher, using only seeded emulator data."""
import pathlib
import re
import subprocess
import time
import xml.etree.ElementTree as ET

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
finally:
    (results / 'logcat.txt').write_text(adb('logcat', '-d', '-v', 'brief'))
    (results / 'widgets.txt').write_text(adb('shell', 'dumpsys', 'appwidget'))
