'use strict';

// Ссылка на Telegram-бот, который выдаёт ключи. Замените на свою.
const TELEGRAM_URL = 'https://t.me/coke_vpnbot';

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

  for (const g of groups) {
    if (!document.querySelector(g.target)) continue;
    try {
      liquidGL({ ...glass, snapshot: 'body', resolution, ...g });
    } catch (err) {
      console.warn('liquidGL недоступен, включаю запасной вариант', err);
      useFallback();
      break;
    }
  }
});
