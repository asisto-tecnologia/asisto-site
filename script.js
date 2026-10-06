// Menu "tubelight": recriação em JS puro do efeito do componente React que o usuário mandou
// (pílula com indicador de luz animado embaixo do item ativo), sem depender de React/framer-motion.
// A animação desliza usando getBoundingClientRect() + transition em CSS, no lugar do layoutId do
// framer-motion.
(function () {
  var nav = document.getElementById('pillnav');
  if (!nav) return;
  var lamp = nav.querySelector('.lamp');
  var items = nav.querySelectorAll('.nav-item');

  function moveLamp(el) {
    if (!el) return;
    var navRect = nav.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    lamp.style.left = (r.left - navRect.left) + 'px';
    lamp.style.width = r.width + 'px';
  }

  items.forEach(function (it) {
    it.addEventListener('click', function () {
      items.forEach(function (i) { i.classList.remove('active'); });
      it.classList.add('active');
      moveLamp(it);
    });
  });

  function place() {
    moveLamp(nav.querySelector('.nav-item.active') || items[0]);
  }

  // posiciona depois da fonte carregar (a largura do texto muda com Nunito Sans vs. a fonte de
  // fallback, então a pílula precisa recalcular a posição correta)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(place);
  }
  window.addEventListener('load', place);
  window.addEventListener('resize', place);
  place();
})();

// "Big numbers" animados: recriação em JS puro do componente CountingNumber (React + motion/react)
// que o usuário mandou. Conta de 0 até o valor de "data-target" com requestAnimationFrame + easing,
// no lugar do useMotionValue/animate do framer-motion. Dispara quando a seção de números entra na
// tela (IntersectionObserver), não no load da página.
(function () {
  var counters = document.querySelectorAll('.count[data-target]');
  if (!counters.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  // "data-decimals" (opcional): quantas casas decimais mostrar, pro caso do "+1,3bi" — o resto
  // (ex.: "120", "80") continua inteiro, sem casas decimais.
  function formatCount(value, decimals) {
    if (decimals > 0) return value.toFixed(decimals).replace('.', ',');
    return Math.round(value).toLocaleString('pt-BR');
  }

  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-target')) || 0;
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if (reduceMotion) { el.textContent = formatCount(target, decimals); return; }
    var duration = 1500;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      el.textContent = formatCount(easeOutCubic(progress) * target, decimals);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { io.observe(c); });
  } else {
    counters.forEach(animateCount);
  }
})();

// Ícones dos "hero-stats": efeito "desenha a linha + nós pulsam" no hover, recriação em CSS/JS puro
// do componente React ShareIcon (Heroicons Animated, usa motion/react) que o usuário mandou. Mede o
// comprimento real de cada traço com getTotalLength() (a técnica clássica de "desenhar" um path em
// SVG: stroke-dasharray = comprimento, stroke-dashoffset anima de "comprimento" até 0) e reinicia a
// animação a cada hover tirando e recolocando a classe (força reflow no meio pra reiniciar).
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var icons = document.querySelectorAll('.hs-ic');
  if (!icons.length) return;

  icons.forEach(function (ic) {
    ic.querySelectorAll('.ic-line').forEach(function (line) {
      try { line.style.setProperty('--len', line.getTotalLength()); } catch (e) {}
    });
  });

  document.querySelectorAll('.hs').forEach(function (card) {
    var ic = card.querySelector('.hs-ic');
    if (!ic) return;
    card.addEventListener('mouseenter', function () {
      ic.classList.remove('anim');
      void ic.offsetWidth; // força reflow pra reiniciar a animação a cada hover
      ic.classList.add('anim');
    });
  });
})();

// Carrossel "coverflow" de produtos: recriação em JS puro do componente React (CoverFlowCarousel,
// com useState/useEffect) que o usuário mandou. Sem framework — o estado é uma variável simples
// (currentIndex) e cada card recalcula seu próprio transform/opacity/zIndex conforme a distância
// (offset) até o card central, igual à lógica original.
(function () {
  var stage = document.getElementById('cfStage');
  if (!stage) return;
  var cards = Array.prototype.slice.call(stage.querySelectorAll('.cf-card'));
  var total = cards.length;
  var dotsWrap = document.getElementById('cfDots');
  var prevBtn = document.getElementById('cfPrev');
  var nextBtn = document.getElementById('cfNext');
  var section = document.getElementById('solucoes');
  var currentIndex = 2; // começa no FLOW: com 6 cards, a tela lê FAB · ERP · FLOW · ATENDE · VOICE
  var autoplayDelay = 5000;
  var autoplayTimer = null;
  var isHovered = false;
  var autoDir = 1;

  // cria os pontos de paginação
  var dots = cards.map(function (_, idx) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Ir pro slide ' + (idx + 1));
    b.addEventListener('click', function () { goTo(idx); });
    dotsWrap.appendChild(b);
    return b;
  });

  function render() {
    cards.forEach(function (card, idx) {
      var offset = idx - currentIndex; // linear (sem dar a volta): a ordem FAB · ERP · FLOW · VOICE · LMS nunca muda
      var transform, opacity, zIndex, filter, isCenter = false;
      var narrow = window.innerWidth <= 700; // celular: vizinhos mais colados e só 1 de cada lado
      var d1 = narrow ? 185 : 265, d2 = narrow ? 300 : 470;

      if (offset === 0) {
        isCenter = true;
        transform = 'translateX(0px) scale(1) rotateY(0deg)';
        opacity = 1; zIndex = 30; filter = 'brightness(1)';
      } else if (offset === 1) {
        transform = 'translateX(' + d1 + 'px) scale(.84) rotateY(-24deg)';
        opacity = .65; zIndex = 20; filter = 'brightness(.75)';
      } else if (offset === 2) {
        transform = 'translateX(' + d2 + 'px) scale(.68) rotateY(-38deg)';
        opacity = narrow ? 0 : .38; zIndex = 10; filter = 'brightness(.55) blur(1px)';
      } else if (offset === -1) {
        transform = 'translateX(-' + d1 + 'px) scale(.84) rotateY(24deg)';
        opacity = .65; zIndex = 20; filter = 'brightness(.75)';
      } else if (offset === -2) {
        transform = 'translateX(-' + d2 + 'px) scale(.68) rotateY(38deg)';
        opacity = narrow ? 0 : .38; zIndex = 10; filter = 'brightness(.55) blur(1px)';
      } else {
        transform = 'translateX(0px) scale(.4) rotateY(0deg)';
        opacity = 0; zIndex = 0; filter = 'brightness(.4) blur(2px)';
      }

      card.style.transform = transform;
      card.style.opacity = opacity;
      card.style.zIndex = zIndex;
      card.style.filter = filter;
      card.classList.toggle('is-center', isCenter);
    });
    dots.forEach(function (d, idx) { d.classList.toggle('on', idx === currentIndex); });
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === total - 1;
  }

  function goTo(idx) { currentIndex = Math.max(0, Math.min(total - 1, idx)); render(); }
  function next() { goTo(currentIndex + 1); }
  function prev() { goTo(currentIndex - 1); }

  cards.forEach(function (card, idx) {
    card.addEventListener('click', function () {
      if (idx !== currentIndex) goTo(idx);
    });
  });
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  // autoplay, pausa no hover
  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(function () {
      if (isHovered) return;
      // vai e volta (sem pular do último pro primeiro)
      if (currentIndex === total - 1) autoDir = -1;
      else if (currentIndex === 0) autoDir = 1;
      goTo(currentIndex + autoDir);
    }, autoplayDelay);
  }
  function stopAutoplay() { if (autoplayTimer) clearInterval(autoplayTimer); }
  section.addEventListener('mouseenter', function () { isHovered = true; });
  section.addEventListener('mouseleave', function () { isHovered = false; });

  // teclado (setas, só quando a seção está visível na tela)
  window.addEventListener('keydown', function (e) {
    var r = section.getBoundingClientRect();
    if (r.top > window.innerHeight || r.bottom < 0) return;
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  // swipe no touch
  var touchStartX = 0;
  stage.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    var diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 45) { diff < 0 ? next() : prev(); }
  });

  window.addEventListener('resize', render);
  render();
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) startAutoplay();
})();

// Cards "modelo de atuação": entrada com fade+slide escalonado ao entrar na tela, e spotlight que
// segue o cursor no hover. Recriação em JS puro do componente React (Feature32 + SpotlightCard,
// usa framer-motion + useMotionValue para a posição do mouse) que o usuário mandou — aqui a
// posição vira duas custom properties CSS (--mx/--my) lidas pelo gradient radial em style.css.
(function () {
  var cards = document.querySelectorAll('.mo-col');
  if (!cards.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    cards.forEach(function (c) { c.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    cards.forEach(function (c) { io.observe(c); });
  }

  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
})();

// Gráfico "crescimento contínuo": ponto + tooltip que seguem o mouse ao longo da curva, recriação
// em JS puro do <Tooltip/> do recharts. Os pontos abaixo são os mesmos usados pra desenhar a curva
// (ver index.html) — a interpolação é linear entre eles, só pra achar a posição do mouse na curva,
// não precisa ser idêntica à bezier (a diferença visual é mínima no segmento).
(function () {
  var chart = document.querySelector('.sg-chart');
  if (!chart) return;
  var svg = chart.querySelector('svg');
  var dot = document.getElementById('sgDot');
  var guide = document.getElementById('sgGuide');
  var tooltip = chart.querySelector('.sg-tooltip');
  var valueEl = tooltip ? tooltip.querySelector('.sg-tooltip-value') : null;
  if (!svg || !dot || !guide || !tooltip || !valueEl) return;

  var points = [
    { x: 0, y: 230, pct: 20 },
    { x: 106.7, y: 200, pct: 40 },
    { x: 213.3, y: 170, pct: 60 },
    { x: 320.0, y: 140, pct: 80 },
    { x: 426.7, y: 110, pct: 100 },
    { x: 533.3, y: 65, pct: 130 },
    { x: 640.0, y: 20, pct: 160 }
  ];

  function update(clientX) {
    var rect = svg.getBoundingClientRect();
    var fx = (clientX - rect.left) / rect.width;
    fx = Math.max(0, Math.min(1, fx));
    var vx = fx * 640;

    var i = 0;
    while (i < points.length - 2 && points[i + 1].x < vx) i++;
    var a = points[i], b = points[i + 1];
    var t = (vx - a.x) / (b.x - a.x);
    var vy = a.y + (b.y - a.y) * t;
    var pct = a.pct + (b.pct - a.pct) * t;

    dot.setAttribute('cx', vx);
    dot.setAttribute('cy', vy);
    dot.style.opacity = '1';
    guide.setAttribute('x1', vx);
    guide.setAttribute('x2', vx);
    guide.style.opacity = '1';

    tooltip.style.left = ((vx / 640) * rect.width) + 'px';
    tooltip.style.top = ((vy / 260) * rect.height) + 'px';
    tooltip.style.opacity = '1';
    valueEl.textContent = '+' + Math.round(pct) + '%';
  }

  function hide() {
    dot.style.opacity = '0';
    guide.style.opacity = '0';
    tooltip.style.opacity = '0';
  }

  chart.addEventListener('mousemove', function (e) { update(e.clientX); });
  chart.addEventListener('mouseleave', hide);
  chart.addEventListener('touchmove', function (e) {
    if (e.touches[0]) update(e.touches[0].clientX);
  }, { passive: true });
  chart.addEventListener('touchend', hide);
})();

// Seção "Módulos": abas Gestão/Atendimento/Aprendizado/Relacionamento, troca o grupo visível.
(function () {
  var tabs = document.getElementById('mdTabs');
  var grid = document.getElementById('mdGrid');
  if (!tabs || !grid) return;
  var buttons = tabs.querySelectorAll('.md-tab');
  var groups = grid.querySelectorAll('.md-group');

  tabs.addEventListener('click', function (e) {
    var btn = e.target.closest('.md-tab');
    if (!btn) return;
    var name = btn.getAttribute('data-group');

    buttons.forEach(function (b) { b.classList.toggle('active', b === btn); });
    groups.forEach(function (g) { g.hidden = g.getAttribute('data-group') !== name; });
  });
})();

// Seção "Metodologia ágil": os círculos do stepper entram com fade+scale escalonado (e as linhas
// entre eles "desenham") quando a seção aparece na tela.
(function () {
  var steps = document.querySelector('.ag-steps');
  if (!steps) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    steps.classList.add('in');
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  io.observe(steps);
})();

// Esteira de clientes: duplica os cards uma vez (a faixa fica com 2 cópias lado a lado) pra a
// animação CSS "translateX(-50%)" fazer um loop contínuo sem costura.
(function () {
  var track = document.getElementById('clientTrack');
  if (!track) return;
  var original = Array.prototype.slice.call(track.children);
  original.forEach(function (card) {
    track.appendChild(card.cloneNode(true));
  });
})();

// Cards de cliente: spotlight que segue o mouse no hover, igual ao efeito dos cards de "Modelo de
// atuação" (mo-col) — recriação do glow do componente GlowCard que o usuário mandou.
(function () {
  var cards = document.querySelectorAll('.client-card');
  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
})();

// Time: os 4 cards entram com fade+slide escalonado quando a seção aparece na tela — recriação em
// CSS/JS puro do componente React (TeamGrid, usa motion/react) que o usuário mandou.
(function () {
  var grid = document.querySelector('.teamgrid');
  if (!grid) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    grid.classList.add('in');
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  io.observe(grid);
})();

// CTA: texto e botões entram com fade+slide escalonado quando o card aparece na tela.
(function () {
  var card = document.getElementById('ctaCard');
  if (!card) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    card.classList.add('in');
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  io.observe(card);
})();

/* FAQ: abrir uma pergunta fecha as outras */
document.querySelectorAll('.faqlist details').forEach(function(d){
  d.addEventListener('toggle',function(){
    if(!d.open) return;
    document.querySelectorAll('.faqlist details[open]').forEach(function(o){ if(o!==d) o.open=false; });
  });
});

/* Efeito de rolagem por seção (referência: asisto.com.br publicado, seção "Bem-vindo a Asisto"):
   cada seção entra com opacidade ~.45 e escala ~.976 e chega a 1/1 conforme sobe na tela.
   Atrelado à posição de rolagem (scrub), não a um disparo único. Para tirar uma seção do efeito,
   adicione data-fx="off" nela. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var secs = Array.prototype.slice.call(document.querySelectorAll('main > section:not(.hero)'))
    .filter(function (s) { return s.getAttribute('data-fx') !== 'off'; });
  if (!secs.length) return;
  var MIN_O = 0.15, MIN_S = 0.95, LIFT = 48, ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    secs.forEach(function (s) {
      var top = s.getBoundingClientRect().top;
      var p = (vh - top) / (vh * 0.7);
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      if (p === 1) { s.style.opacity = ''; s.style.transform = ''; return; }
      s.style.opacity = (MIN_O + (1 - MIN_O) * p).toFixed(3);
      s.style.transform = 'translateY(' + (LIFT * (1 - p)).toFixed(1) + 'px) scale(' + (MIN_S + (1 - MIN_S) * p).toFixed(4) + ')';
      s.style.transformOrigin = '50% 0';
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

/* Hover do vídeo da hero (referência: asisto.com.br publicado): o cartão acompanha o mouse com um
   deslocamento mínimo + inclinação leve, transição .3s ease-out, e volta ao centro ao sair. */
(function () {
  var card = document.querySelector('.video-card');
  if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !window.matchMedia('(hover: hover)').matches) return;
  var MOVE = 5, TILT = 1.6;
  card.addEventListener('mousemove', function (e) {
    var r = card.getBoundingClientRect();
    var nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    var ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    card.style.transform = 'perspective(900px) translate3d(' + (nx * MOVE).toFixed(2) + 'px,' +
      (ny * MOVE).toFixed(2) + 'px,0) rotateX(' + (-ny * TILT).toFixed(2) + 'deg) rotateY(' +
      (nx * TILT).toFixed(2) + 'deg)';
  });
  card.addEventListener('mouseleave', function () {
    card.style.transform = '';
  });
})();

/* Avatares do time: o tooltip inclina (±45°) e desloca (±50px) conforme a posição do mouse sobre a
   foto, como no AnimatedTooltip de referência. A "mola" do tooltip está no CSS (transition). */
(function () {
  var items = document.querySelectorAll('.at-item');
  if (!items.length || !window.matchMedia('(hover: hover)').matches) return;
  items.forEach(function (item) {
    var img = item.querySelector('img'), tip = item.querySelector('.at-tip');
    img.addEventListener('mousemove', function (e) {
      var r = img.getBoundingClientRect();
      var x = (e.clientX - r.left) - r.width / 2;           // -52..52
      var k = Math.max(-1, Math.min(1, x / 100));            // mesma escala do original (-100..100)
      tip.style.setProperty('--rot', (k * 45).toFixed(1) + 'deg');
      tip.style.setProperty('--tx', (k * 50).toFixed(1) + 'px');
    });
    item.addEventListener('mouseleave', function () {
      tip.style.setProperty('--rot', '0deg');
      tip.style.setProperty('--tx', '0px');
    });
  });
})();

/* "Bem-vindo a Asisto": carrossel de fotos com fade, setas, pontos, swipe e autoplay (pausa no hover) */
(function () {
  var box = document.getElementById('wcMedia');
  if (!box) return;
  var slides = Array.prototype.slice.call(box.querySelectorAll('.wc-slide'));
  if (slides.length < 2) return;
  var dotsWrap = box.querySelector('.wc-dots'), i = 0, hover = false, timer = null;
  var dots = slides.map(function (_, n) {
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', 'Ir para a foto ' + (n + 1));
    b.addEventListener('click', function () { go(n); restart(); });
    dotsWrap.appendChild(b); return b;
  });
  function go(n) {
    slides[i].classList.remove('on'); dots[i].classList.remove('on');
    i = (n + slides.length) % slides.length;
    slides[i].classList.add('on'); dots[i].classList.add('on');
  }
  function restart() {
    if (timer) clearInterval(timer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(function () { if (!hover) go(i + 1); }, 4000);
  }
  box.querySelector('.wc-nav.prev').addEventListener('click', function () { go(i - 1); restart(); });
  box.querySelector('.wc-nav.next').addEventListener('click', function () { go(i + 1); restart(); });
  box.addEventListener('mouseenter', function () { hover = true; });
  box.addEventListener('mouseleave', function () { hover = false; });
  var x0 = 0;
  box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    var d = e.changedTouches[0].clientX - x0;
    if (Math.abs(d) > 40) { go(i + (d < 0 ? 1 : -1)); restart(); }
  });
  dots[0].classList.add('on');
  restart();
})();


// Mobile: esteira de clientes rola sozinha (JS) e o dedo assume — pausa ao tocar e volta depois de 2s.
// Time: pontos de paginação sincronizados com o carrossel (scroll-snap).
(function () {
  var mq = window.matchMedia('(max-width: 700px)');

  var vp = document.querySelector('.client-viewport');
  if (vp) {
    var pos = 0, last = 0, touching = false, resumeAt = 0;
    function half() { return vp.scrollWidth / 2; }
    function tick(t) {
      if (mq.matches) {
        var dt = last ? Math.min(t - last, 50) : 16;
        if (touching || t < resumeAt) { pos = vp.scrollLeft; }
        else {
          pos += dt * 0.04; // ~40px/s
          if (pos >= half()) pos -= half();
        }
        if (!touching) {
          if (pos < 0) pos += half();
          vp.scrollLeft = pos;
          if (t >= resumeAt && vp.scrollLeft >= half()) { pos = vp.scrollLeft - half(); vp.scrollLeft = pos; }
        }
      }
      last = t;
      requestAnimationFrame(tick);
    }
    function hold() { resumeAt = performance.now() + 2000; }
    vp.addEventListener('touchstart', function () { touching = true; });
    vp.addEventListener('touchend', function () { touching = false; hold(); });
    vp.addEventListener('touchcancel', function () { touching = false; hold(); });
    vp.addEventListener('scroll', function () {
      // rolagem manual passou da metade: volta uma cópia pra trás sem costura
      if (touching || performance.now() < resumeAt) {
        var h = half();
        if (vp.scrollLeft >= h) vp.scrollLeft -= h;
        else if (vp.scrollLeft <= 0) vp.scrollLeft += h;
      }
    }, { passive: true });
    requestAnimationFrame(tick);
  }

  var grid = document.querySelector('.teamgrid');
  if (grid) {
    var people = Array.prototype.slice.call(grid.querySelectorAll('.person'));
    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'team-dots';
    var dots = people.map(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Ir pra pessoa ' + (i + 1));
      b.addEventListener('click', function () {
        grid.scrollTo({ left: p.offsetLeft - (grid.clientWidth - p.offsetWidth) / 2, behavior: 'smooth' });
      });
      dotsWrap.appendChild(b);
      return b;
    });
    grid.parentNode.insertBefore(dotsWrap, grid.nextSibling);
    function sync() {
      var c = grid.scrollLeft + grid.clientWidth / 2, best = 0, bd = 1e9;
      people.forEach(function (p, i) {
        var d = Math.abs(p.offsetLeft + p.offsetWidth / 2 - c);
        if (d < bd) { bd = d; best = i; }
      });
      dots.forEach(function (d, i) { d.classList.toggle('on', i === best); });
    }
    grid.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }
})();
