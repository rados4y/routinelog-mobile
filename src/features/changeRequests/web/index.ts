import { screens, findScreen } from '../catalog';
import {
  addRequestedChange,
  emptyChangeDraft,
  generateChangePrompt,
  restoreChangeDraft,
  type ChangeDraft,
} from '../model';
// The build injects only bundled reference images; the page makes no network requests.
declare const GUIDE_IMAGES: Record<string, string>;
declare const window: Window & {
  ReactNativeWebView?: { postMessage(message: string): void };
};
const channel = 'routinelog-change-guide';
const byId = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing guide control: ${id}`);
  return element as T;
};
const boot = JSON.parse(byId('bootstrap').textContent ?? '{}') as {
  host?: string;
  appVersion?: string;
  draft?: unknown;
  parentOrigin?: string;
};
const storageKey = '@routinelog/change-guide/browser/v1';
let state: ChangeDraft = emptyChangeDraft();
let storageFailed = false;
try {
  const raw =
    boot.host === 'standalone' ? localStorage.getItem(storageKey) : null;
  state = restoreChangeDraft(
    boot.draft ?? (raw ? JSON.parse(raw) : emptyChangeDraft()),
  );
} catch {
  storageFailed = true;
}
const screenSelect = byId<HTMLSelectElement>('screen');
const change = byId<HTMLTextAreaElement>('change');
const constraints = byId<HTMLTextAreaElement>('constraints');
const prompt = byId<HTMLTextAreaElement>('prompt');
const error = byId('error');
function send(type: 'draft' | 'copy') {
  const message = { channel, type, draft: state };
  if (boot.host === 'native')
    window.ReactNativeWebView?.postMessage(JSON.stringify(message));
  else if (boot.host === 'web')
    window.parent.postMessage(message, boot.parentOrigin ?? '*');
}
function save() {
  if (boot.host === 'standalone') {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      storageFailed = false;
    } catch {
      storageFailed = true;
    }
  } else send('draft');
  byId('saved').textContent = storageFailed
    ? 'Draft stays here; browser storage is unavailable'
    : 'Draft stays on this device';
}
function showError(text: string) {
  error.textContent = text;
  error.hidden = !text;
}
function button(text: string, action: () => void) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = text;
  element.onclick = action;
  return element;
}
function render() {
  const screen = findScreen(state.selectedScreen)!;
  const section = screen.sections.find(
    (item) => item.id === state.selectedSection,
  )!;
  screenSelect.value = screen.id;
  byId('screen-name').textContent = screen.name;
  byId('purpose').textContent = screen.purpose;
  byId('screen-logic').textContent = screen.logic;
  byId('section-name').textContent = `${section.id} · ${section.name}`;
  byId('section-logic').textContent = section.logic;
  const image = screen.image ? GUIDE_IMAGES[screen.image] : undefined;
  byId('reference').hidden = !image;
  if (image) {
    byId<HTMLImageElement>('screen-image').src = image;
    byId<HTMLImageElement>('screen-image').alt =
      `${screen.name} reference layout`;
  }
  const sections = byId('sections');
  sections.replaceChildren();
  for (const item of screen.sections) {
    const control = button('', () => {
      state = { ...state, selectedSection: item.id };
      render();
      save();
    });
    control.className = 'section';
    control.setAttribute('aria-pressed', String(item.id === section.id));
    control.setAttribute('aria-label', `${item.id} ${item.name}`);
    const id = document.createElement('span');
    id.textContent = item.id;
    const title = document.createElement('strong');
    title.textContent = item.name;
    control.append(id, title);
    sections.append(control);
  }
  change.value = state.entry;
  constraints.value = state.constraints;
  byId('add').textContent = state.editingId ? 'Save change' : 'Add change';
  byId('cancel-edit').hidden = !state.editingId;
  byId('count').textContent = String(state.items.length);
  byId('empty').hidden = Boolean(state.items.length);
  byId<HTMLButtonElement>('generate').disabled = !state.items.length;
  const items = byId('items');
  items.replaceChildren();
  state.items.forEach((item, index) => {
    const article = document.createElement('article');
    article.className = 'change-item';
    article.setAttribute('aria-label', `Change ${index + 1}`);
    const heading = document.createElement('h3');
    heading.textContent = `${index + 1}. ${item.screenName} · ${item.sectionId} · ${item.sectionName}`;
    const text = document.createElement('p');
    text.textContent = item.change;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const edit = button('Edit', () => {
      state = {
        ...state,
        selectedScreen: item.screenId,
        selectedSection: item.sectionId,
        entry: item.change,
        editingId: item.id,
        view: 'compose',
      };
      state = restoreChangeDraft(state);
      render();
      save();
      change.focus();
      change.scrollIntoView({ block: 'center' });
    });
    edit.setAttribute('aria-label', `Edit change ${index + 1}`);
    const remove = button('Remove', () => {
      state = {
        ...state,
        items: state.items.filter((existing) => existing.id !== item.id),
        ...(state.editingId === item.id ? { editingId: null, entry: '' } : {}),
      };
      render();
      save();
    });
    remove.setAttribute('aria-label', `Remove change ${index + 1}`);
    actions.append(edit, remove);
    article.append(heading, text, actions);
    items.append(article);
  });
  byId('composer').hidden = state.view === 'review';
  byId('review').hidden = state.view !== 'review';
  if (state.view === 'review')
    prompt.value = generateChangePrompt(state, boot.appVersion ?? 'unknown');
}
for (const screen of screens) {
  const option = document.createElement('option');
  option.value = screen.id;
  option.textContent = screen.name;
  screenSelect.append(option);
}
screenSelect.onchange = () => {
  const screen = findScreen(screenSelect.value)!;
  state = {
    ...state,
    selectedScreen: screen.id,
    selectedSection: screen.sections[0]!.id,
  };
  byId<HTMLDetailsElement>('reference').open = false;
  render();
  save();
};
change.oninput = () => {
  state = { ...state, entry: change.value };
  save();
  showError('');
};
constraints.oninput = () => {
  state = { ...state, constraints: constraints.value };
  save();
};
change.onfocus = () => {
  setTimeout(
    () => change.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    250,
  );
};
byId('change-form').onsubmit = (event) => {
  event.preventDefault();
  try {
    state = addRequestedChange(
      state,
      `change-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    render();
    save();
    showError('');
    byId('items').scrollIntoView({ block: 'nearest' });
  } catch (reason) {
    showError(
      reason instanceof Error && reason.name !== 'ZodError'
        ? reason.message
        : 'Describe what should change (up to 2,000 characters).',
    );
  }
};
byId('cancel-edit').onclick = () => {
  state = { ...state, entry: '', editingId: null };
  render();
  save();
};
byId('generate').onclick = () => {
  if (state.editingId || state.entry.trim()) {
    showError(
      'Add your current change or cancel the edit before generating the prompt.',
    );
    change.focus();
    change.scrollIntoView({ block: 'center' });
    return;
  }
  if (!state.items.length) return;
  state = { ...state, view: 'review' };
  render();
  save();
  window.scrollTo(0, 0);
  byId('copy').focus();
};
byId('back-edit').onclick = () => {
  state = { ...state, view: 'compose' };
  render();
  save();
  window.scrollTo(0, 0);
};
const showClear = () => {
  byId('clear-confirm').hidden = false;
  byId('keep').focus();
};
byId('clear').onclick = showClear;
byId('clear-review').onclick = showClear;
byId('keep').onclick = () => {
  byId('clear-confirm').hidden = true;
};
byId('confirm-clear').onclick = () => {
  state = emptyChangeDraft();
  byId('clear-confirm').hidden = true;
  render();
  save();
  window.scrollTo(0, 0);
};
function copied(success: boolean) {
  byId('copy-status').textContent = success
    ? 'Copied. Paste this into your ChatGPT conversation.'
    : 'Select the instructions below, then choose Copy.';
  if (!success) {
    prompt.focus();
    prompt.select();
  }
}
byId('copy').onclick = async () => {
  if (boot.host === 'native') {
    send('copy');
    return;
  }
  try {
    await navigator.clipboard.writeText(prompt.value);
    copied(true);
  } catch {
    prompt.focus();
    prompt.select();
    copied(document.execCommand('copy'));
  }
};
window.addEventListener('guide-copy-result', (event) =>
  copied(Boolean((event as CustomEvent<{ success: boolean }>).detail.success)),
);
render();
if (storageFailed)
  byId('saved').textContent =
    'Could not restore the saved draft. This page is still usable.';

window.addEventListener('resize', () => {
  const input = document.activeElement;
  if (input instanceof HTMLTextAreaElement)
    setTimeout(() => input.scrollIntoView({ block: 'center' }), 60);
});
