const $ = s => document.querySelector(s);
const store = {
  get: k => { try { return JSON.parse(localStorage.getItem('cc_' + k)) || []; } catch (e) { return []; } },
  set: (k, v) => { try { localStorage.setItem('cc_' + k, JSON.stringify(v)); } catch (e) {} }
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^https?:\/\//i.test(u) ? u : '#';
const day = t => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const redraw = {};

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 1800);
}

function section(key, formSel, listSel, card, searchSel, sortFn) {
  const form = $(formSel), list = $(listSel);
  const draw = () => {
    let items = store.get(key);
    const q = searchSel ? $(searchSel).value.trim().toLowerCase() : '';
    if (q) items = items.filter(i => JSON.stringify(i).toLowerCase().includes(q));
    if (sortFn) items.sort(sortFn);
    list.innerHTML = items.length ? items.map(card).join('') : '<p class="empty">Abhi kuch nahi hai. Pehla post tum karo.</p>';
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    d.id = Date.now(); d.replies = [];
    store.set(key, [d, ...store.get(key)]);
    form.reset(); draw(); toast('Posted');
  });
  if (searchSel) $(searchSel).addEventListener('input', draw);
  redraw[key] = draw; draw();
}

const actions = (key, id, extra = '') =>
  `<div class="row">${extra}<button class="ghost" data-act="del" data-key="${key}" data-id="${id}">Delete</button></div>`;

section('lost', '#lostForm', '#lostList', i => `
  <article class="card item ${i.claimed ? 'done' : ''}">
    <span class="tag ${esc(i.type)}">${esc(i.type)}</span>
    <h3>${esc(i.item)}</h3>
    <p>Place: ${esc(i.place)}</p><p>Contact: ${esc(i.contact)}</p>
    ${actions('lost', i.id, `<button class="ghost" data-act="claim" data-key="lost" data-id="${i.id}">${i.claimed ? 'Reopen' : 'Mark resolved'}</button>`)}
  </article>`, '#lostSearch');

section('notes', '#notesForm', '#notesList', i => `
  <article class="card item">
    <span class="tag">${esc(i.subject)}</span>
    <h3>${esc(i.title)}</h3>
    <p><a href="${esc(safeUrl(i.link))}" target="_blank" rel="noopener noreferrer">Open material</a></p>
    ${actions('notes', i.id)}
  </article>`, '#notesSearch');

section('events', '#eventsForm', '#eventsList', i => `
  <article class="card item">
    <span class="tag">${esc(day(i.date))}</span>
    <h3>${esc(i.title)}</h3>
    <p>Venue: ${esc(i.venue)}</p><p>${esc(i.details)}</p>
    ${actions('events', i.id)}
  </article>`, null, (a, b) => new Date(a.date) - new Date(b.date));

section('forum', '#forumForm', '#forumList', i => `
  <article class="card item">
    <h3>${esc(i.title)}</h3>
    <p>${esc(i.body)}</p><p>by ${esc(i.name)} · ${esc(day(i.id))}</p>
    <ul class="replies">${(i.replies || []).map(r => `<li><b>${esc(r.name)}:</b> ${esc(r.text)}</li>`).join('')}</ul>
    <form class="reply" data-key="forum" data-id="${i.id}">
      <input name="name" placeholder="Naam" required maxlength="30" style="max-width:130px">
      <input name="text" placeholder="Jawab likho…" required maxlength="300">
      <button>Reply</button>
    </form>
    ${actions('forum', i.id)}
  </article>`);

section('anon', '#anonForm', '#anonList', i => `
  <article class="card item">
    <span class="tag ${esc(i.kind)}">${esc(i.kind)}</span>
    <p style="color:inherit;margin-top:8px">${esc(i.message)}</p>
  </article>`);

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const { act, key, id } = b.dataset;
  let items = store.get(key);
  if (act === 'del') items = items.filter(i => String(i.id) !== id);
  if (act === 'claim') items = items.map(i => String(i.id) === id ? { ...i, claimed: !i.claimed } : i);
  store.set(key, items); redraw[key]();
});

document.addEventListener('submit', e => {
  const f = e.target.closest('.reply'); if (!f) return;
  e.preventDefault();
  const { key, id } = f.dataset, d = Object.fromEntries(new FormData(f));
  store.set(key, store.get(key).map(i => String(i.id) === id ? { ...i, replies: [...(i.replies || []), d] } : i));
  redraw[key]();
});
