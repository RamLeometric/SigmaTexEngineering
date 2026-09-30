(function () {
  'use strict';

  var body = document.body;

  // Keep "years in business" and the footer year current (static pages are built once)
  var founded = body.getAttribute('data-founded');
  if (founded) {
    var f = new Date(founded + 'T00:00:00'), now = new Date();
    var yrs = now.getFullYear() - f.getFullYear() - ((now.getMonth() < f.getMonth() || (now.getMonth() === f.getMonth() && now.getDate() < f.getDate())) ? 1 : 0);
    document.querySelectorAll('[data-years]').forEach(function (el) {
      el.textContent = yrs;
      if (el.hasAttribute('data-count')) el.setAttribute('data-count', yrs);
    });
  }
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Mobile navigation
  var toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('nav-open')) {
        body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('click', function (e) {
      if (body.classList.contains('nav-open') && !e.target.closest('.site-nav') && !e.target.closest('.nav-toggle')) {
        body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Header shadow on scroll
  var header = document.querySelector('.site-header');
  var onScroll = function () {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 10);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Services page: tabbed size tables
  var tabs = document.querySelectorAll('.spec-tabs [role="tab"]');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
    });
  });

  // Services page: highlight the service currently on screen in the sticky menu
  var spyLinks = document.querySelectorAll('[data-spy]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    var spyMap = {};
    spyLinks.forEach(function (a) { spyMap[a.getAttribute('data-spy')] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var link = spyMap[entry.target.id];
        if (!link) return;
        spyLinks.forEach(function (a) { a.classList.toggle('is-active', a === link); });
        var list = link.closest('.svc-tabs__list');
        if (list) {
          var lr = list.getBoundingClientRect(), ar = link.getBoundingClientRect();
          list.scrollTo({ left: list.scrollLeft + (ar.left - lr.left) - 16, behavior: 'smooth' });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(spyMap).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  // Reveal-on-scroll
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Count-up numbers
  var counters = document.querySelectorAll('[data-count]');
  var runCounter = function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var start = null, dur = 1200;
    var step = function (ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCounter(entry.target); co.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  // Contact form: client-side checks + prevent double submit
  var form = document.getElementById('enquiry-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (input) {
        var field = input.closest('.field');
        if (!field) return;
        var valid = input.checkValidity();
        field.classList.toggle('has-error', !valid);
        if (!valid) ok = false;
      });
      if (!ok) {
        e.preventDefault();
        var first = form.querySelector('.has-error input, .has-error select, .has-error textarea');
        if (first) first.focus();
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (!form.hasAttribute('data-ajax')) {
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
        return;
      }

      // Static (Vercel) build: send to the serverless function
      e.preventDefault();
      var status = document.getElementById('form-status');
      var btnHtml = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      form.querySelectorAll('.field__error').forEach(function (el) { el.remove(); });

      var payload = {};
      new FormData(form).forEach(function (v, k) { payload[k] = v; });

      var showStatus = function (ok, msg) {
        if (!status) return;
        status.hidden = false;
        status.className = 'alert ' + (ok ? 'alert--success' : 'alert--error');
        status.textContent = msg;
        status.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };

      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
        .then(function (data) {
          if (data && data.ok) {
            var name = (payload.name || '').trim();
            showStatus(true, 'Thank you' + (name ? ', ' + name : '') + '! Your enquiry has been sent. We will contact you shortly — a confirmation has been emailed to you.');
            form.reset();
            form.querySelector('[name="ts"]').value = String(Date.now());
            return;
          }
          var errs = (data && data.errors) || {};
          Object.keys(errs).forEach(function (k) {
            var input = form.querySelector('[name="' + k + '"]');
            var field = input && input.closest('.field');
            if (!field) return;
            field.classList.add('has-error');
            var span = document.createElement('span');
            span.className = 'field__error';
            span.textContent = errs[k];
            field.appendChild(span);
          });
          showStatus(false, (data && data.message) || 'Please correct the highlighted fields below.');
        })
        .catch(function () {
          showStatus(false, 'Sorry, we could not send your enquiry right now. Please call us or try again shortly.');
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.innerHTML = btnHtml; }
        });
    });

    // Static build: time-stamp the form (spam check) and pre-select ?service=slug
    var ts = form.querySelector('[name="ts"]');
    if (ts) ts.value = String(Date.now());
    var svc = new URLSearchParams(window.location.search).get('service');
    var select = form.querySelector('select[name="service"]');
    if (svc && select && !select.value) {
      var map = window.SIGMATEX_SERVICES || {};
      if (map[svc]) select.value = map[svc];
    }
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('has-error') && e.target.checkValidity()) {
        field.classList.remove('has-error');
        var msg = field.querySelector('.field__error');
        if (msg) msg.remove();
      }
    });
  }
})();
