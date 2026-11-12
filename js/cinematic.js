/* Cinematic layer — reveals, manifesto, count-up, the projects spotlight deck,
   and the career/education view switch (기본 보기 / 타임라인).
   Shared by index.html and the project case studies; every part checks that
   its markup exists, so pages only get what they have. */
(function () {
    'use strict';
    var root = document.getElementById('root');
    if (!root) return;
    var calm = false;
    try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    function $(sel, el) { return (el || document).querySelector(sel); }
    function $$(sel, el) { return [].slice.call((el || document).querySelectorAll(sel)); }
    function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function pad2(n) { return String(n).padStart(2, '0'); }

    /* ---------- reveal on scroll ---------- */
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
        es.forEach(function (e) {
            if (!e.isIntersecting) return;
            e.target.classList.add('cx-in');
            countUp(e.target);
            io.unobserve(e.target);
        });
    }, {threshold: .12, rootMargin: '0px 0px -6% 0px'}) : null;

    function reveal(list) {
        if (!io || calm) return;
        list.forEach(function (n) {
            // the page's own scroll reveal (.rv) already animates these; never stack a second one on top
            if (n.closest('.dhero, .hero, .iv, .cx-deck, .rv') || n.classList.contains('cx-rv') || n.querySelector('.rv')) return;
            var i = n.parentElement ? [].indexOf.call(n.parentElement.children, n) : 0;
            n.style.setProperty('--cx-i', Math.min(Math.max(i, 0), 5));
            n.classList.add('cx-rv');
            io.observe(n);
        });
    }

    /* ---------- count-up for big numbers ---------- */
    function countUp(scope) {
        $$('.num', scope).forEach(function (n) {
            var t = n.firstChild;
            if (!t || t.nodeType !== 3 || n.dataset.cxDone) return;
            var to = parseInt(t.nodeValue, 10);
            if (!to) return;
            n.dataset.cxDone = '1';
            var t0 = performance.now();
            (function step(now) {
                var k = Math.min(1, (now - t0) / 1400);
                t.nodeValue = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
                if (k < 1) requestAnimationFrame(step);
            })(t0);
        });
    }

    /* ---------- manifesto: words light up as the line passes ---------- */
    var words = [];
    $$('.cx-words').forEach(function (p) {
        var html = '';
        [].forEach.call(p.childNodes, function (n) {
            var key = n.nodeType === 1;
            n.textContent.split(/(\s+)/).forEach(function (w) {
                html += !w || /^\s+$/.test(w) ? w : '<span class="cx-wd' + (key ? ' k' : '') + '">' + esc(w) + '</span>';
            });
        });
        p.innerHTML = html;
        words = words.concat($$('.cx-wd', p));
    });
    function lightWords() {
        var line = innerHeight * .64;
        for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', calm || words[i].getBoundingClientRect().top < line);
    }

    /* =====================================================================
       PROJECTS — the stage pins, one project at a time in the spotlight; then the
       camera pulls back to a big 3-column grid (전체 보기) that keeps scrolling
       ===================================================================== */
    function Deck(sec) {
        this.sec = sec;
        this.src = $('.bento', sec);
        this.items = $$('article.pc, article.mini', sec).map(function (a) {
            var img = $('.vis img', a), more = $('a.more', a);
            return {
                cat: a.getAttribute('data-cat') || '',
                img: img ? img.getAttribute('src') : '',
                title: txt($('.pt', a)), period: txt($('.period', a)), badge: txt($('.badge', a)),
                desc: txt($('.pd', a)), pts: $$('.pts li', a).map(txt), tags: $$('.tag', a).map(txt),
                href: more ? more.getAttribute('href') : '', moreText: more ? txt(more) : '',
                ext: more ? /^https?:/.test(more.getAttribute('href')) : false
            };
        });
        this.n = this.items.length;
        this.cur = -1;
        this.build();
    }

    Deck.prototype.build = function () {
        var d = this, label = txt($('.eyebrow', d.sec));
        d.wrap = el('div', 'cx-deck');
        d.stage = el('div', 'cx-stage');
        d.cam = el('div', 'cx-cam');
        d.grid = el('div', 'cx-grid');
        d.cam.appendChild(d.grid);
        d.stage.appendChild(d.cam);
        d.top = el('div', 'cx-top', '<span>' + esc(label) + '</span><span class="cx-cnt"><b>01</b> / ' + pad2(d.n) + '</span>');
        d.cnt = $('.cx-cnt b', d.top);
        d.overh = el('div', 'cx-overh', '<h3><small>' + esc(label) + '</small>전체 보기</h3><span class="cx-hint">항목을 누르면 그 장면으로 이동</span>');
        d.prog = el('div', 'cx-prog', '<i></i>');
        d.panel = el('div', 'cx-panel');
        [d.panel, d.top, d.overh, d.prog].forEach(function (x) { d.stage.appendChild(x); });

        // the filter tabs move into the overview header; a marker keeps their home
        d.tabs = $('.tabs', d.sec);
        if (d.tabs) {
            d.tabsHome = document.createComment('tabs');
            d.tabs.parentNode.insertBefore(d.tabsHome, d.tabs);
            $('.cx-hint', d.overh).replaceWith(d.tabs);
            d.tabs.classList.remove('rv');   // the overview header fades it in, not the page reveal
            d.onTab = function (e) {
                var b = e.target.closest('[data-filter]');
                if (!b) return;
                var f = b.getAttribute('data-filter');
                d.cards.forEach(function (c, i) { c.classList.toggle('off', f !== 'all' && d.items[i].cat !== f); });
            };
            d.tabs.addEventListener('click', d.onTab);
        }

        d.cards = d.items.map(function (it, i) {
            var c = el('button', 'cx-card');
            c.type = 'button';
            c.setAttribute('aria-label', it.title + ' — 이 장면으로 이동');
            c.innerHTML = '<span class="cx-img">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async">' : '<span class="cx-poster"><span>' + esc(it.badge || 'Project') + '</span><b>' + esc(it.title) + '</b></span>') + '</span>' +
                '<span class="cx-cap"><small><i>' + pad2(i + 1) + '</i>' + esc([it.period, it.badge].filter(Boolean).join(' · ')) + '</small><b>' + esc(it.title) + '</b>' + (it.desc ? '<em>' + esc(it.desc) + '</em>' : '') + '</span>';
            c.addEventListener('click', function () { d.jump(i); });
            d.grid.appendChild(c);
            return c;
        });

        d.wrap.appendChild(d.stage);
        d.src.parentNode.insertBefore(d.wrap, d.src.nextSibling);
        d.sec.classList.add('cx-has-deck');
        d.src.classList.add('cx-src');
        d.layout();
    };

    Deck.prototype.layout = function () {
        var d = this, st = d.wrap.style;
        var vw = document.documentElement.clientWidth, vh = innerHeight;
        var mx = Math.round(Math.max(32, vw * .06));
        d.wrap.style.width = vw + 'px';
        d.wrap.style.marginLeft = 'calc(50% - ' + vw / 2 + 'px)';
        st.setProperty('--cx-mx', mx + 'px');

        // the overview: three big columns; it may be taller than the screen
        var gTop = 196, gBot = vh - 72, availW = Math.min(1320, vw - 2 * mx), gap = 32;
        var cw = Math.floor((availW - 2 * gap) / 3);
        st.setProperty('--cx-cw', cw + 'px');
        st.setProperty('--cx-gap', gap + 'px');
        d.cam.style.transform = 'none';
        var gw = d.grid.offsetWidth, gh = d.grid.offsetHeight;
        d.grid.style.left = Math.round((vw - gw) / 2) + 'px';
        d.grid.style.top = gTop + 'px';
        var sr = d.stage.getBoundingClientRect();
        d.box = d.cards.map(function (c) {
            var r = $('.cx-img', c).getBoundingClientRect();
            return {x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height};
        });

        // spotlight rectangle and the detail panel beside it
        var aTop = 150, aH = vh - 84 - aTop;
        var sw = Math.min(vw * .56, aH / .625), sh = sw * .625;
        d.spot = {x: mx, y: aTop + (aH - sh) / 2, w: sw, h: sh};
        d.sc = {x: d.spot.x + sw / 2, y: d.spot.y + sh / 2};
        var pl = d.spot.x + sw + Math.max(48, vw * .045);
        d.panel.style.left = pl + 'px';
        d.panel.style.width = Math.max(240, vw - mx - pl) + 'px';
        d.panel.style.top = aTop + 'px';
        d.panel.style.height = aH + 'px';
        d.F = d.box.map(function (b) {
            var s = d.spot.w / b.w;
            return {s: s, x: d.spot.x - s * b.x, y: d.spot.y - s * b.y};
        });

        // scroll budget: item k sits at k·L; the last one rests, the camera pulls back,
        // then the grid itself scrolls by (B) until its last row is in view
        d.L = vh * .5;
        d.zs = (d.n - 1) * d.L + d.L * .4;
        d.Z = vh * .85;
        d.B = Math.max(0, gTop + gh - gBot);
        d.E = vh * .2;
        d.T = d.zs + d.Z + d.B + d.E;
        d.wrap.style.height = Math.round(vh + d.T) + 'px';
        d.cur = -1;
        d.aim();
        d.q = d.p;
        d.render(d.q);
    };

    // a short rest on each item, a gentle glide between neighbours
    function glide(f) {
        var h = .18;
        if (f <= h) return 0;
        if (f >= 1 - h) return 1;
        return .5 - .5 * Math.cos(Math.PI * (f - h) / (1 - 2 * h));
    }

    Deck.prototype.camAt = function (p) {
        var d = this, N = d.n, F = d.F;
        if (p < d.zs) {
            var u = p / d.L, k = Math.min(N - 1, Math.floor(u));
            if (k >= N - 1) return {s: F[k].s, x: F[k].x, y: F[k].y, active: k, z: 0};
            // fly-to: the focus point travels in a straight line; far hops (a new row) rise a little
            var e = glide(u - k), A = d.box[k], B = d.box[k + 1];
            var ax = A.x + A.w / 2, ay = A.y + A.h / 2, bx = B.x + B.w / 2, by = B.y + B.h / 2;
            var dip = clamp((Math.hypot(bx - ax, by - ay) / A.w - 1.3) * .14, 0, .6);
            var sc = (F[k].s + (F[k + 1].s - F[k].s) * e) * (1 - dip * Math.sin(Math.PI * e));
            var fx = ax + (bx - ax) * e, fy = ay + (by - ay) * e;
            return {s: sc, x: d.sc.x - sc * fx, y: d.sc.y - sc * fy, active: e < .5 ? k : k + 1, z: 0};
        }
        if (p < d.zs + d.Z) {
            // pull back: scale in log space while the last card glides to its grid slot
            var z = (p - d.zs) / d.Z, e2 = ease(z), f0 = F[N - 1], b0 = d.box[N - 1];
            var cx = b0.x + b0.w / 2, cy = b0.y + b0.h / 2;
            var s = Math.exp(Math.log(f0.s) * (1 - e2));
            var px = (f0.x + f0.s * cx) * (1 - e2) + cx * e2, py = (f0.y + f0.s * cy) * (1 - e2) + cy * e2;
            return {s: s, x: px - s * cx, y: py - s * cy, active: N - 1, z: z, e: e2};
        }
        // 전체 보기: the big grid scrolls by under the header
        return {s: 1, x: 0, y: -clamp(p - d.zs - d.Z, 0, d.B), active: N - 1, z: 1, e: 1};
    };

    // where the page has scrolled to — the camera eases toward it
    Deck.prototype.aim = function () {
        this.p = clamp(-this.wrap.getBoundingClientRect().top, 0, this.T);
    };

    Deck.prototype.render = function (q) {
        var d = this, c = d.camAt(q), st = d.wrap.style;
        d.cam.style.transform = 'translate3d(' + c.x.toFixed(2) + 'px,' + c.y.toFixed(2) + 'px,0) scale(' + c.s.toFixed(4) + ')';
        var over = c.z ? clamp((c.z - .55) / .45, 0, 1) : 0;
        st.setProperty('--cx-over', over.toFixed(3));
        st.setProperty('--cx-z', (c.z || 0).toFixed(3));
        st.setProperty('--cx-dim', (c.z ? .2 + .8 * (c.e || 0) : .2).toFixed(3));
        st.setProperty('--cx-p', (q / d.T).toFixed(4));
        d.overh.classList.toggle('live', over > .5);
        if (c.active !== d.cur) {
            if (d.cur >= 0) d.cards[d.cur].classList.remove('on');
            d.cards[c.active].classList.add('on');
            d.cur = c.active;
            d.cnt.textContent = pad2(c.active + 1);
            d.fill(c.active);
        }
    };

    // ease the shown position toward the scroll position (frame-rate independent),
    // so a mouse wheel's steps become one continuous glide; true when settled
    Deck.prototype.step = function (dt) {
        var d = this, gap = d.p - d.q;
        if (Math.abs(gap) < .5) { if (gap) { d.q = d.p; d.render(d.q); } return true; }
        d.q += gap * (1 - Math.exp(-dt / .16));
        d.render(d.q);
        return false;
    };

    Deck.prototype.fill = function (i) {
        var it = this.items[i];
        var h = '<div class="cx-swap"><div class="cx-pk"><b>' + pad2(i + 1) + '</b><span>/ ' + pad2(this.n) + '</span></div>' +
            '<div class="cx-pm">' + esc([it.period, it.badge].filter(Boolean).join(' · ')) + '</div><h3>' + esc(it.title) + '</h3>';
        if (it.desc) h += '<p>' + esc(it.desc) + '</p>';
        if (it.pts.length) h += '<ul class="pts">' + it.pts.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
        if (it.tags.length) h += '<div class="tags">' + it.tags.map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('') + '</div>';
        if (it.href) h += '<a class="cx-more" href="' + esc(it.href) + '"' + (it.ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(it.moreText || '자세히 보기') + ' →</a>';
        this.panel.innerHTML = h + '</div>';
    };

    Deck.prototype.jump = function (i) {
        var y = scrollY + this.wrap.getBoundingClientRect().top + i * this.L + 1;
        scrollTo({top: y, behavior: calm ? 'auto' : 'smooth'});
    };

    Deck.prototype.destroy = function () {
        var d = this;
        if (d.tabs) {
            d.tabs.removeEventListener('click', d.onTab);
            d.tabsHome.parentNode.insertBefore(d.tabs, d.tabsHome);
            d.tabsHome.remove();
        }
        d.wrap.remove();
        d.sec.classList.remove('cx-has-deck');
        d.src.classList.remove('cx-src');
    };

    var deck = null;
    function wantDeck() { return !calm && document.documentElement.clientWidth >= 900 && innerHeight >= 600; }
    function buildDeck() {
        var sec = $('#projects');
        if (!deck && wantDeck() && sec && $('.bento', sec)) deck = new Deck(sec);
    }

    /* =====================================================================
       Career · education · certificates: 기본 보기 / 타임라인
       — three timelines (경력 · 학력 · 자격증), each newest first
       ===================================================================== */
    var path = $('.cx-path');
    if (path) {
        var list = $('.cx-view[data-view="list"]', path);
        var when = function (s) { // "2025.10 — 2026.01" → 202510, "2023 — 2025" → 202300
            var m = /(\d{4})(?:\.(\d{1,2}))?/.exec(s || '');
            return m ? +m[1] * 100 + (m[2] ? +m[2] : 0) : 0;
        };
        var groups = [{type: 'career', label: '경력', items: $$('.tl-item', path).map(function (t) {
            return {title: txt($('.tl-head h3', t)), sub: txt($('.tl-role', t)), date: txt($('.tl-when', t)), desc: txt($('.tl-card p', t)), tags: $$('.tag', t).map(txt)};
        })}];
        $$('.edu', path).forEach(function (card, ci) {
            groups.push({type: ci === 0 ? 'edu' : 'cert', label: txt($('h3', card)) || (ci === 0 ? '학력' : '자격증'), items: $$('.li', card).map(function (li) {
                return {title: txt($('b', li)), sub: txt($('small', li)), date: txt($('.yr', li)), tags: []};
            })});
        });

        var tl = el('div', 'cx-view');
        tl.setAttribute('data-view', 'timeline');
        tl.hidden = true;
        tl.innerHTML = groups.map(function (g) {
            g.items.forEach(function (it) { it.key = when(it.date); });
            g.items.sort(function (a, b) { return b.key - a.key; });
            var years = [];
            g.items.forEach(function (it) {
                var y = Math.floor(it.key / 100), last = years[years.length - 1];
                if (!last || last.y !== y) years.push(last = {y: y, items: []});
                last.items.push(it);
            });
            var span = years.length ? (years.length > 1 ? years[years.length - 1].y + ' — ' + years[0].y : '' + years[0].y) : '';
            return '<div class="cx-group cx-tg" data-type="' + g.type + '"><h3 class="cx-gh cx-tgh"><b>' + esc(g.label) + '</b><span>' + g.items.length + '건 · ' + span + '</span></h3>' +
                '<ol class="cx-tl" data-type="' + g.type + '">' + years.map(function (yr) {
                return '<li class="cx-yr"><div class="cx-y">' + yr.y + '</div><div class="cx-items">' + yr.items.map(function (it) {
                    return '<article class="cx-ti"><div class="cx-tm"><span class="cx-when">' + esc(it.date) + '</span></div>' +
                        '<h4>' + esc(it.title) + '</h4>' + (it.sub ? '<div class="cx-sub">' + esc(it.sub) + '</div>' : '') +
                        (it.desc ? '<p>' + esc(it.desc) + '</p>' : '') +
                        (it.tags.length ? '<div class="tags">' + it.tags.map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
                        '</article>';
                }).join('') + '</div></li>';
            }).join('') + '</ol></div>';
        }).join('');
        list.parentNode.insertBefore(tl, list.nextSibling);

        // the switch, in the section head
        var tabs = el('div', 'tabs cx-vtabs', '<button type="button" class="tab on" role="tab" aria-selected="true" data-view="list">기본 보기</button>' +
            '<button type="button" class="tab" role="tab" aria-selected="false" data-view="timeline">타임라인 <span>최신순</span></button>');
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', '보기 방식');
        $('.sec-head', path).appendChild(tabs);
        var views = {list: list, timeline: tl};
        var show = function (v) {
            $$('.tab', tabs).forEach(function (b) {
                var on = b.getAttribute('data-view') === v;
                b.classList.toggle('on', on);
                b.setAttribute('aria-selected', String(on));
            });
            Object.keys(views).forEach(function (k) { views[k].hidden = k !== v; });
            reveal($$(v === 'timeline' ? '.cx-gh, .cx-yr' : '.tl-item, .li', views[v]));
            try { localStorage.setItem('path-view', v); } catch (e) {}
        };
        tabs.addEventListener('click', function (e) {
            var b = e.target.closest('[data-view]');
            if (b) show(b.getAttribute('data-view'));
        });
        var saved = null;
        try { saved = localStorage.getItem('path-view'); } catch (e) {}
        show(saved === 'timeline' ? 'timeline' : 'list');

        // the nav's 학력·자격 link targets the list view; in the timeline, go to the section
        document.addEventListener('click', function (e) {
            var a = e.target.closest('a[href="#education"]');
            if (a && list.hidden) {
                e.preventDefault();
                path.scrollIntoView({behavior: calm ? 'auto' : 'smooth'});
            }
        });
    }

    /* ---------- wire up ---------- */
    reveal($$('.sec-head, .sub-head, .card, .cx-about .stat, .cx-manifesto, .back-row, #stack .stack-card'));
    buildDeck();

    // one loop: runs while the page scrolls and until the deck has caught up
    var running = false, last = 0;
    function loop(now) {
        var dt = Math.min(.05, Math.max(.001, (now - last) / 1000));
        last = now;
        lightWords();
        var settled = true;
        if (deck) { deck.aim(); settled = deck.step(dt); }
        if (settled) { running = false; return; }
        requestAnimationFrame(loop);
    }
    function frame() {
        if (running) return;
        running = true;
        last = performance.now();
        requestAnimationFrame(loop);
    }
    addEventListener('scroll', frame, {passive: true});

    var rt = 0;
    addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () {
            if (!wantDeck()) { if (deck) { deck.destroy(); deck = null; } }
            else if (!deck) buildDeck();
            else deck.layout();
            lightWords();
        }, 150);
    });
    // fonts and images change sizes: lay out again once everything has loaded
    addEventListener('load', function () { if (deck) deck.layout(); lightWords(); });
    lightWords();
})();
