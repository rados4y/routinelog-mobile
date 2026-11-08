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
    # A cold React host can briefly have no accessibility root. Use a fresh
    # path and bounded retries so an old dump cannot masquerade as the new UI.
    for attempt in range(5):
        path = '/sdcard/widget-screen-' + str(time.monotonic_ns()) + '.xml'
        try:
            adb('shell', 'uiautomator', 'dump', path)
            xml = adb('shell', 'cat', path)
            root = ET.fromstring(xml)
            if not list(root.iter('node')):
                raise ValueError('Accessibility window is not ready.')
            break
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ET.ParseError, ValueError):
            if attempt == 4:
                raise
            time.sleep(1)
    (results / (name + '.xml')).write_text(xml)
    with (results / (name + '.png')).open('wb') as image:
        subprocess.run(['adb', 'exec-out', 'screencap', '-p'], stdout=image, check=True, timeout=30)
    return root


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


def wait_text(text, name):
    for _ in range(10):
        time.sleep(2)
        root = screen(name)
        if any(text in node.attrib.get('text', '') for node in root.iter('node')):
            return root
    raise RuntimeError('App did not display: ' + text)


def widget_item(label, name):
    for attempt in range(5):
        root = screen(name)
        node = find_label(root, label)
        if node is not None:
            return root, node
        widget = find_label(root, 'RoutineLog today')
        if widget is None:
            raise RuntimeError('Launcher widget is missing while looking for ' + label)
        left, top, right, bottom = map(int, re.findall(r'\d+', widget.attrib['bounds']))
        x = (left + right) // 2
        adb('shell', 'input', 'swipe', str(x), str(top + (bottom - top) * 85 // 100), str(x), str(top + (bottom - top) * 35 // 100), '400')
        time.sleep(2)
    raise RuntimeError('Widget did not display ' + label)


def verify_note_above_keyboard(name, date, text):
    time.sleep(2)
    windows = adb('shell', 'dumpsys', 'window', 'windows')
    (results / (name + '-windows.txt')).write_text(windows)
    keyboard_top = None
    # Insets describe the visible IME even if its transparent host window fills
    # the screen. Older Android dumps only expose the InputMethod frame.
    for line in windows.splitlines():
        if re.search(r'(?:mType|type)=ime\b', line) and re.search(r'(?:mVisible|visible)=true', line):
            match = re.search(r'(?:mFrame|\bframe)=\[(\d+),(\d+)\]\[(\d+),(\d+)\]', line)
            if match and int(match[4]) > int(match[2]):
                keyboard_top = int(match[2])
                break
    if keyboard_top is None:
        for window in re.split(r'\n\s*Window #', windows):
            if not re.search(r'Window\{[^\n]*InputMethod[^\n]*\}:', window):
                continue
            match = re.search(r'(?:mFrame|\bframe)=\[(\d+),(\d+)\]\[(\d+),(\d+)\]', window)
            if match and int(match[4]) > int(match[2]):
                # Gboard uses a transparent fill-screen host; its reported
                # visible inset excludes the transparent area above the keys.
                inset = re.search(r'mGivenVisibleInsets=\[\d+,(\d+)\]', window)
                keyboard_top = int(match[2]) + (int(inset[1]) if inset else 0)
                break
    if keyboard_top is None:
        raise RuntimeError('Could not measure the real Android software keyboard.')
    root = screen(name)
    editor = find_label(root, 'Daily note for ' + date)
    if editor is None or text not in editor.attrib.get('text', ''):
        raise RuntimeError('The focused daily note did not retain entered text.')
    left, top, right, bottom = map(int, re.findall(r'\d+', editor.attrib['bounds']))
    if top >= keyboard_top or bottom > keyboard_top or bottom - top < 100:
        raise RuntimeError(f'Note field is obscured: {editor.attrib["bounds"]}, keyboard starts at {keyboard_top}.')
    # An accessibility rectangle alone can be clipped; also check actual text
    # pixels above the IME, rather than keyboard keys or surrounding labels.
    image = Image.open(results / (name + '.png')).convert('RGB').crop((left + 8, top + 8, right - 8, min(bottom, keyboard_top) - 8))
    ink = sum(1 for red, green, blue in image.getdata() if min(red, green, blue) > 150)
    if ink < 120:
        raise RuntimeError('Entered note text is not visibly rendered above the keyboard.')
    print(f'{name}: entered text visible above keyboard (field bottom {bottom}, IME top {keyboard_top}).')


try:
    adb('install', '-r', '/tmp/routinelog-preview.apk')
    adb('shell', 'settings', 'put', 'secure', 'show_ime_with_hard_keyboard', '1')
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
    # Exercise inline daily notes and durable navigation on the real Android UI.
    date = adb('shell', 'date', '+%F').strip()
    details = find_label(root, 'Routine details: Wyjście na spacer z psem')
    if details is not None:
        tap(details)
    editor = None
    for _ in range(4):
        root = screen('daily-notes-editor')
        editor = find_label(root, 'Daily note for ' + date)
        if editor is not None:
            break
        adb('shell', 'input', 'swipe', '200', '650', '200', '300', '300')
    if editor is None:
        raise RuntimeError('Inline daily-note editor is missing below routines.')
    tap(editor)
    adb('shell', 'input', 'text', 'Native%sdaily%snote')
    verify_note_above_keyboard('daily-notes-keyboard', date, 'Native daily note')
    for line in range(1, 9):
        adb('shell', 'input', 'keyevent', 'KEYCODE_ENTER')
        adb('shell', 'input', 'text', 'Visible%sline%s' + str(line))
    verify_note_above_keyboard('daily-notes-long-keyboard', date, 'Visible line 8')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
    root = wait_text('Saved on device', 'daily-notes-saved')
    notes_tab = find_label(root, 'Notes')
    if notes_tab is None:
        raise RuntimeError('Notes tab is missing.')
    tap(notes_tab)
    root = wait_text('Native daily note', 'daily-notes-list')
    edit = find_label(root, 'Edit note for ' + date)
    if edit is None:
        raise RuntimeError('Daily-note edit action is missing.')
    tap(edit)
    root, editor = wait_label('Daily note for ' + date, 'daily-notes-sheet')
    tap(editor)
    adb('shell', 'input', 'keyevent', 'KEYCODE_MOVE_END')
    adb('shell', 'input', 'text', '%sSheet%sedition')
    verify_note_above_keyboard('daily-notes-sheet-keyboard', date, 'Sheet edition')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
    root = wait_text('Saved on device', 'daily-notes-sheet-saved')
    close = find_label(root, 'Close')
    if close is None:
        raise RuntimeError('Notes editor could not be closed.')
    tap(close)
    adb('shell', 'am', 'force-stop', package)
    adb('shell', 'am', 'start', '-n', package + '/.MainActivity')
    root, notes_tab = wait_label('Notes', 'daily-notes-restart')
    tap(notes_tab)
    root = wait_text('Native daily note', 'daily-notes-persisted')
    today_tab = find_label(root, 'Today')
    if today_tab is None:
        raise RuntimeError('Today tab is missing.')
    tap(today_tab)
    root, button = wait_label('Add home-screen widget', 'app')
    print('Native daily note saved inline, appeared in Notes and survived process restart.')
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
    root, body = widget_item('Open routine: ' + name, 'routine-link')
    tap(body)
    root, _ = wait_label('Edit routine: ' + name, 'focused-routine')
    if find_label(root, 'Status: ' + name + '. Unchecked.') is None:
        raise RuntimeError('Opening a routine changed its status.')
    details = find_label(root, 'Routine details: ' + name)
    tap(details)
    adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
    root, body = widget_item('Open routine: ' + name, 'repeat-routine-link')
    tap(body)
    wait_label('Edit routine: ' + name, 'focused-routine-again')
    print('Routine name opened expanded details without changing status, including a repeated warm link.')
    adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
    root, note_link = widget_item('Open daily note:', 'widget-note')
    if 'Native daily note' not in note_link.attrib.get('content-desc', ''):
        raise RuntimeError('The widget did not show the saved daily-note preview.')
    tap(note_link)
    root, editor = wait_label('Daily note for ' + date, 'widget-focused-note')
    if editor.attrib.get('focused') != 'true':
        raise RuntimeError('Widget note link did not focus the inline editor.')
    verify_note_above_keyboard('widget-focused-note-keyboard', date, 'Native daily note')
    adb('shell', 'input', 'keyevent', 'KEYCODE_MOVE_END')
    adb('shell', 'input', 'text', '%sWidget%sedition')
    time.sleep(2)
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
    adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
    root, note_link = widget_item('Open daily note:', 'widget-note-updated')
    if 'Widget edition' not in note_link.attrib.get('content-desc', ''):
        time.sleep(3)
        root, note_link = widget_item('Open daily note:', 'widget-note-updated')
    if 'Widget edition' not in note_link.attrib.get('content-desc', ''):
        raise RuntimeError('Editing the daily note did not refresh its widget preview.')
    tap(note_link)
    wait_label('Daily note for ' + date, 'widget-note-reopened')
    verify_note_above_keyboard('widget-note-reopened-keyboard', date, 'Widget edition')
    print('Widget displayed the daily note, opened its focused editor and refreshed after editing.')
except Exception:
    root = screen('failure')
    labels = [node.attrib.get('text') or node.attrib.get('content-desc') for node in root.iter('node')]
    print('Seeded emulator screen:', [label for label in labels if label][:40])
    raise
finally:
    (results / 'logcat.txt').write_text(adb('logcat', '-d', '-v', 'brief'))
    (results / 'widgets.txt').write_text(adb('shell', 'dumpsys', 'appwidget'))
