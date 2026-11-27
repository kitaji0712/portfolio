/* On-page editor. Open the site with ?edit, click any text, change it, press Save.
   Save writes content.json to GitHub with a fine-grained token kept in this browser only. */

export const REPO = 'kitaji0712/portfolio';
export const FILE = 'content.json';
const API = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
const KEY = 'pf-gh-token';

export const token = {
  get() { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } },
  set(v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {} },
};
const headers = () => ({ Authorization: `Bearer ${token.get()}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });

const b64 = (str) => {
  const bytes = new TextEncoder().encode(str); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

/* the freshest copy, straight from GitHub (Pages can lag a minute behind a save) */
export async function loadFresh() {
  if (!token.get()) return null;
  try {
    const r = await fetch(`${API}?ref=main`, { headers: headers(), cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return { data: JSON.parse(unb64(j.content)), sha: j.sha };
  } catch { return null; }
}

const ALLOWED = new Set(['EM', 'SPAN', 'BR']);
function cleanHtml(html) {
  const box = document.createElement('div'); box.innerHTML = html;
  box.querySelectorAll('i, [contenteditable="false"]').forEach((n) => n.remove());
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType !== 1) return;
    walk(n);
    if (!ALLOWED.has(n.tagName)) n.replaceWith(...n.childNodes);
    else [...n.attributes].forEach((a) => n.removeAttribute(a.name));
  });
  walk(box);
  return box.innerHTML.replace(/&nbsp;/g, ' ').trim();
}

function setPath(obj, path, val) {
  const ks = path.split('.'); const last = ks.pop();
  ks.reduce((o, k) => o[k], obj)[last] = val;
}

/* drop what was emptied out: empty facts, empty tags, CV rows with neither date nor title */
function tidy(C) {
  const c = structuredClone(C);
  const t = (s) => (typeof s === 'string' ? s.replace(/ /g, ' ').trim() : s);
  c.hero.facts = c.hero.facts.map(t).filter(Boolean);
  c.works.forEach((w) => { w.tags = w.tags.map(t).filter(Boolean); w.notes = (w.notes || []).map(t).filter(Boolean); ['title', 'sub', 'meta', 'desc'].forEach((k) => (w[k] = t(w[k]))); });
  c.about.cv.forEach((s) => { s.items = s.items.map((it) => ({ time: t(it.time), title: t(it.title), text: t(it.text) })).filter((it) => it.time || it.title); });
  return c;
}

export function startEditor({ C, sha, fillText, renderCv, renderFacts }) {
  const root = document.documentElement;
  root.classList.add('editing');
  let dirty = false, baseSha = sha;

  /* ── toolbar ── */
  const bar = document.createElement('div');
  bar.className = 'ed-bar';
  bar.innerHTML = `
    <span class="ed-dot"></span><span class="ed-msg">編集モード: 文字をクリックして直せます</span>
    <button type="button" class="ed-key">Token</button>
    <a class="ed-btn ghost" href="${location.pathname}">Exit</a>
    <button type="button" class="ed-btn ed-save" disabled>Save</button>`;
  document.body.append(bar);
  const msg = bar.querySelector('.ed-msg'), saveBtn = bar.querySelector('.ed-save');
  const say = (t, kind = '') => { msg.textContent = t; bar.dataset.state = kind; };
  const markDirty = () => { dirty = true; saveBtn.disabled = false; say('未保存の変更があります', 'dirty'); };

  /* ── token dialog ── */
  const dlg = document.createElement('dialog');
  dlg.className = 'ed-dlg';
  dlg.innerHTML = `
    <form method="dialog">
      <h2>GitHub に保存するための鍵</h2>
      <p>このブラウザにだけ保存され、GitHub 以外には送られません。最初の 1 回だけ必要です。</p>
      <ol>
        <li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub の Fine-grained token 作成ページ ↗</a> を開く</li>
        <li>Repository access → <b>Only select repositories</b> → <b>portfolio</b></li>
        <li>Permissions → Repository permissions → <b>Contents: Read and write</b></li>
        <li>Generate token を押して、出てきた <code>github_pat_…</code> を下に貼る</li>
      </ol>
      <input type="password" name="t" placeholder="github_pat_…" autocomplete="off" spellcheck="false">
      <div class="ed-row">
        <button value="forget" class="ed-btn ghost">Forget</button>
        <button value="cancel" class="ed-btn ghost">Cancel</button>
        <button value="ok" class="ed-btn">Use this token</button>
      </div>
    </form>`;
  document.body.append(dlg);
  const askToken = () => new Promise((res) => {
    dlg.querySelector('input').value = token.get();
    dlg.showModal();
    dlg.addEventListener('close', () => {
      if (dlg.returnValue === 'ok') token.set(dlg.querySelector('input').value.trim());
      if (dlg.returnValue === 'forget') token.set('');
      res(!!token.get());
    }, { once: true });
  });
  bar.querySelector('.ed-key').addEventListener('click', askToken);

  /* ── make text editable ── */
  const plain = (() => { const d = document.createElement('div'); d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only'; })();
  function arm(scope = document) {
    scope.querySelectorAll('[data-k]').forEach((el) => {
      if (el.isContentEditable) return;
      el.contentEditable = 'html' in el.dataset || !plain ? 'true' : 'plaintext-only';
      el.spellcheck = false;
    });
  }
  document.addEventListener('input', (e) => {
    const el = e.target.closest?.('[data-k]'); if (!el) return;
    setPath(C, el.dataset.k, 'html' in el.dataset ? cleanHtml(el.innerHTML) : el.innerText.replace(/\n+$/, ''));
    markDirty();
  });
  document.addEventListener('keydown', (e) => {
    const el = e.target.closest?.('[data-k]'); if (!el) return;
    if (e.key === 'Enter' && !e.shiftKey && !/\.(desc|sub|text)$/.test(el.dataset.k)) { e.preventDefault(); el.blur(); }
  });
  document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); } });
  /* links stay put while you edit their text; pasting brings plain text only */
  document.addEventListener('click', (e) => { if (e.target.closest('a [data-k], a[data-k]')) e.preventDefault(); }, true);
  document.addEventListener('paste', (e) => {
    if (!e.target.closest?.('[data-k][data-html]')) return;
    e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });

  /* ── lists: + to add; ↑ ↓ × on CV rows; emptying a fact or tag removes it ── */
  function addControls() {
    const facts = document.getElementById('facts');
    facts.insertAdjacentHTML('beforeend', '<li class="ed-add" contenteditable="false"><button type="button" data-add="facts">+</button></li>');
    document.querySelectorAll('[data-tags]').forEach((ul) => {
      ul.insertAdjacentHTML('beforeend', `<li class="ed-add" contenteditable="false"><button type="button" data-add="tag" data-path="${ul.dataset.tags}">+ tag</button></li>`);
    });
    document.querySelectorAll('[data-notes]').forEach((ul) => {
      ul.insertAdjacentHTML('beforeend', `<li class="ed-add" contenteditable="false"><button type="button" data-add="tag" data-path="${ul.dataset.notes}">+ note</button></li>`);
    });
    document.querySelectorAll('#cv li[data-list]').forEach((li) => {
      li.insertAdjacentHTML('beforeend', '<span class="ed-ops" contenteditable="false"><button type="button" data-op="up" aria-label="上へ">↑</button><button type="button" data-op="down" aria-label="下へ">↓</button><button type="button" data-op="del" aria-label="削除">×</button></span>');
    });
    document.querySelectorAll('#cv ul').forEach((ul, s) => {
      ul.insertAdjacentHTML('afterend', `<button type="button" class="ed-more" data-add="cv" data-s="${s}">+ 追加</button>`);
    });
  }
  function rebuild(which) {
    if (which === 'cv') renderCv(); else renderFacts();
    fillText(document.getElementById(which === 'cv' ? 'cv' : 'facts'));
    document.querySelectorAll('.ed-add, .ed-ops, .ed-more').forEach((n) => n.remove());
    arm(); addControls();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-add], button[data-op]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    let focus;
    if (b.dataset.add === 'facts') { C.hero.facts.push(''); rebuild('facts'); focus = `hero.facts.${C.hero.facts.length - 1}`; }
    if (b.dataset.add === 'cv') { const s = +b.dataset.s; C.about.cv[s].items.unshift({ time: String(new Date().getFullYear()), title: '', text: '' }); rebuild('cv'); focus = `about.cv.${s}.items.0.title`; }
    if (b.dataset.add === 'tag') {
      const ks = b.dataset.path.split('.'); const last = ks.pop(); const par = ks.reduce((o, k) => o[k], C); const arr = (par[last] ||= []); arr.push('');
      const k = `${b.dataset.path}.${arr.length - 1}`;
      b.parentElement.insertAdjacentHTML('beforebegin', `<li data-k="${k}"></li>`); arm(b.closest('ul')); focus = k;
    }
    if (b.dataset.op) {
      const li = b.closest('li[data-list]'); const arr = li.dataset.list.split('.').reduce((o, k) => o[k], C); const i = +li.dataset.i;
      if (b.dataset.op === 'del') arr.splice(i, 1);
      if (b.dataset.op === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      if (b.dataset.op === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      rebuild('cv');
    }
    markDirty();
    if (focus) document.querySelector(`[data-k="${focus}"]`)?.focus();
  }, true);

  /* ── save ── */
  async function save() {
    if (!dirty) return;
    if (!token.get() && !(await askToken())) { say('保存には GitHub の鍵が必要です', 'err'); return; }
    saveBtn.disabled = true; say('保存しています…', 'busy');
    try {
      const cur = await fetch(`${API}?ref=main`, { headers: headers(), cache: 'no-store' });
      if (cur.status === 401 || cur.status === 403 || cur.status === 404) throw new Error('鍵が使えません（期限切れか、portfolio の Contents: Read and write が付いていない）');
      const j = await cur.json();
      if (baseSha && j.sha !== baseSha && !confirm('開いてから別の場所で content.json が更新されています。こちらの内容で上書きしますか？')) { say('保存をやめました。再読み込みすると最新版になります', 'err'); saveBtn.disabled = false; return; }
      const body = JSON.stringify(tidy(C), null, 2) + '\n';
      const r = await fetch(API, {
        method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Edit text on the site', content: b64(body), sha: j.sha, branch: 'main' }),
      });
      if (!r.ok) throw new Error(`GitHub が保存を断りました (${r.status})`);
      baseSha = (await r.json()).content.sha;
      dirty = false; say('保存しました。公開サイトには 1〜2 分で反映されます', 'ok');
    } catch (err) {
      saveBtn.disabled = false; say(err.message || '保存できませんでした', 'err');
    }
  }
  saveBtn.addEventListener('click', save);
  addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });

  arm(); addControls();
  if (!token.get()) say('編集モード: 文字をクリックして直せます。保存には最初に Token の設定が必要です');
}
