'use strict';

// Ссылка на Telegram-бот, который выдаёт ключи. Замените на свою.
const TELEGRAM_URL = 'https://t.me/coke_vpnbot';

// Переключатель тарифа PRO / PRO+ в блоке цен
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Плавно «докручивает» число от текущего значения к новому. */
function animateNumber(el, to) {
  const from = parseInt(el.textContent.replace(/\D/g, ''), 10);
  if (reduceMotion || !Number.isFinite(from) || from === to) { el.textContent = String(to); return; }
  const start = performance.now();
  const duration = 650;
  cancelAnimationFrame(el._raf);
  const step = (t) => {
    const p = Math.min(1, (t - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(from + (to - from) * eased));
    if (p < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

function setTier(tier) {
  const plus = tier === 'plus';
  if (document.body.classList.contains('tier-plus') === plus) return;
  document.body.classList.toggle('tier-plus', plus);
  const sw = document.querySelector('.tier-switch');
  if (sw) { sw.classList.remove('bump'); void sw.offsetWidth; sw.classList.add('bump'); }
  document.querySelectorAll('.tier').forEach((b) => {
    const on = b.dataset.tier === tier;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
  document.querySelectorAll('[data-pro][data-plus]').forEach((el) => {
    const value = plus ? el.dataset.plus : el.dataset.pro;
    if (/^\d+$/.test(value)) animateNumber(el, Number(value));
    else el.textContent = value;
  });
  document.querySelectorAll('[data-pro-start]').forEach((a) => {
    a.dataset.telegram = plus ? a.dataset.plusStart : a.dataset.proStart;
    a.href = `${TELEGRAM_URL}?start=${a.dataset.telegram}`;
  });
  document.querySelectorAll('.tier-name').forEach((el) => { el.textContent = plus ? 'PRO+' : 'PRO'; });
}
document.querySelectorAll('.tier').forEach((b) => b.addEventListener('click', () => setTier(b.dataset.tier)));
if (location.hash === '#pro-plus') setTier('plus');

// data-telegram="buy_1m" открывает бота сразу на нужном тарифе
document.querySelectorAll('[data-telegram]').forEach(a => {
  const start = a.dataset.telegram;
  a.href = start ? `${TELEGRAM_URL}?start=${encodeURIComponent(start)}` : TELEGRAM_URL;
  a.target = '_blank';
  a.rel = 'noopener';
});

// Жидкое стекло (liquidGL). Если WebGL недоступен, остаётся CSS-размытие.
const useFallback = () => document.documentElement.classList.add('no-gl');

// Видеокарты не принимают текстуры больше ~8192 px. Если снимок страницы
// выходит больше, стекло рвётся по краям. Подбираем разрешение под размер.
function safeResolution(el, max = 2) {
  const dpr = window.devicePixelRatio || 1;
  const longest = Math.max(el.scrollHeight, el.scrollWidth) * dpr;
  return Math.max(0.5, Math.min(max, 7800 / longest));
}

window.addEventListener('load', async () => {
  if (typeof window.liquidGL !== 'function') return useFallback();
  try { await document.fonts.ready; } catch (_) { /* шрифты не критичны */ }

  // Если через 5 секунд холста для стекла нет, значит WebGL недоступен: включаем CSS-стекло
  setTimeout(() => { if (!document.querySelector('canvas')) useFallback(); }, 5000);
  const glass = {
    zIndex: 30,
    refraction: 0.015,
    aberration: 0,
    bevelDepth: 0.07,
    bevelWidth: 0.18,
    frost: 1.5,
    shadow: true,
    specular: true,
    reveal: 'fade',
    tint: 'rgba(30, 0, 6, 0.18)',
  };

  // Все линзы на одном холсте: так верхнее стекло (меню) видит нижние
  // и размывает их вместе с текстом. Меню создаётся последним, чтобы быть сверху.
  const groups = [
    { target: '.lens-drag', refraction: 0.03, bevelWidth: 0.4 },
    { target: '.apps .lens-tilt' },
    { target: '.price .lens-tilt' },
    { target: '.lens-nav', bevelWidth: 0.35, frost: 7, refraction: 0.02, tint: 'rgba(10, 0, 2, 0.4)' },
  ];
  const resolution = safeResolution(document.body);

  let registered = false;
  for (const g of groups) {
    if (!document.querySelector(g.target)) continue;
    try {
      liquidGL({ ...glass, snapshot: 'body', resolution, ...g });
      // цифра за карточками цен меняется при переключении PRO / PRO+ — стекло должно видеть новую
      if (!registered && typeof liquidGL.registerDynamic === 'function') {
        liquidGL.registerDynamic('.price-giant');
        registered = true;
      }
    } catch (err) {
      console.warn('liquidGL недоступен, включаю запасной вариант', err);
      useFallback();
      break;
    }
  }
});
