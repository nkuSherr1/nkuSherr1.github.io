(function () {
  var CHAPTER = /\/posts\/(?:analysis\/(?:fa-(?!notes\/)[^/]+|mfld-(?!notes\/)[^/]+)|graph-theory\/matroid-(?!notes\/)[^/]+|research\/(?:steklov-core-relations|steklov-rank-formula|steklov-tree-coordinates|steklov-positive-realization|graph-highway-obstruction|graph-highway-conformal|graph-highway-y|graph-highway-ribbon|graph-highway-not-dijkstra|steklov-boundary-injectivity|steklov-vertex-morse|steklov-extrema|steklov-nodal))(?:\/|$)/
  var COVERS = {
    '/notes/11/': '/files/notes/covers/matroids.svg',
    '/notes/10/': '/files/notes/covers/fourier.svg',
    '/notes/9/': '/files/notes/covers/manifolds.svg',
  }

  function localePrefix() {
    var match = location.pathname.match(/^\/(zh|ja)(?=\/)/)
    return match ? match[0] : ''
  }

  function pathOf(href) {
    try {
      var path = new URL(href, location.origin).pathname
      return path.replace(/^\/(zh|ja|en)(?=\/)/, '')
    } catch (error) {
      return href || ''
    }
  }

  function onIndex(name) {
    return new RegExp('/' + name + '/?$').test(location.pathname)
  }

  function placeNow() {
    var stats = document.querySelector('.hero-stats')
    if (!stats) return
    var prev = stats.previousElementSibling
    if (prev && prev.classList.contains('hero-now')) return
    document.querySelectorAll('.hero-now').forEach(function (node) {
      node.remove()
    })
    var prefix = localePrefix()
    var line = document.createElement('p')
    line.className = 'hero-now text-center lg:text-left'
    line.innerHTML =
      '<span class="hero-now__kicker">Now</span> ' +
      '<a href="' + prefix + '/posts/research/steklov-local-variation/">边权的局部变分</a>' +
      '<span aria-hidden="true"> · </span>' +
      '<a href="' + prefix + '/posts/research/graph-highway-metric/">公路度量</a>'
    stats.parentNode.insertBefore(line, stats)
  }

  function foldPosts() {
    if (!onIndex('posts')) return
    var hidden = 0
    document.querySelectorAll('a.index-list-row').forEach(function (link) {
      var item = link.closest('li') || link
      var chapter = CHAPTER.test(pathOf(link.getAttribute('href') || ''))
      item.classList.toggle('is-series-chapter', chapter)
      if (chapter) hidden += 1
    })
    if (!hidden || document.getElementById('series-fold')) return
    var button = document.createElement('button')
    button.id = 'series-fold'
    button.type = 'button'
    button.className = 'series-fold'
    var folded = localStorage.getItem('sherr1-posts-fold') !== 'all'
    document.documentElement.classList.toggle('series-folded', folded)
    function label() {
      var closed = document.documentElement.classList.contains('series-folded')
      button.textContent = closed ? 'Show ' + hidden + ' chapters' : 'Series hubs only'
    }
    label()
    button.addEventListener('click', function () {
      var closed = document.documentElement.classList.toggle('series-folded')
      localStorage.setItem('sherr1-posts-fold', closed ? 'hubs' : 'all')
      label()
    })
    var list = document.querySelector('.index-list-stack')
    if (list) list.parentNode.insertBefore(button, list)
  }

  function foldTimeline() {
    if (!onIndex('timeline')) return
    var first = true
    var seenOpen = document.querySelector('.tl-month--open')
    document.querySelectorAll('main section > div.mb-8').forEach(function (month) {
      var heading = month.querySelector(':scope > h3')
      if (!heading || !month.querySelector(':scope > ul')) return
      var fresh = !month.classList.contains('tl-month')
      month.classList.add('tl-month')
      if (fresh && first && !seenOpen) {
        month.classList.add('tl-month--open')
        seenOpen = month
      }
      if (fresh) first = false
      if (heading.dataset.bound) return
      heading.dataset.bound = '1'
      heading.setAttribute('role', 'button')
      heading.tabIndex = 0
      function toggle() {
        month.classList.toggle('tl-month--open')
      }
      heading.addEventListener('click', toggle)
      heading.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          toggle()
        }
      })
    })
  }

  function noteCovers() {
    if (!onIndex('notes')) return
    document.querySelectorAll('a.index-featured, a.index-list-row').forEach(function (link) {
      var cover = COVERS[pathOf(link.getAttribute('href') || '')]
      if (!cover || link.querySelector('.note-cover')) return
      var image = document.createElement('img')
      image.className = 'note-cover'
      image.alt = ''
      image.src = cover
      link.insertBefore(image, link.firstChild)
    })
  }

  function reading() {
    var article = document.querySelector('#main-content-render')
    if (!article) return
    var title = document.querySelector('.reading-cover__title, .article-prose h1, article h1')
    if (!document.querySelector('.reading-progress')) {
      var bar = document.createElement('div')
      bar.className = 'reading-progress'
      bar.setAttribute('aria-hidden', 'true')
      document.body.appendChild(bar)
      var paint = function () {
        var height = document.documentElement.scrollHeight - window.innerHeight
        var progress = height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0
        bar.style.transform = 'scaleX(' + progress + ')'
      }
      window.addEventListener('scroll', paint, { passive: true })
      paint()
    }
    if (title && !document.querySelector('.reading-pdf')) {
      var pdf = document.querySelector('#main-content-render a[href$=".pdf"], article a[href$=".pdf"]')
      if (pdf) {
        var chip = document.createElement('a')
        chip.className = 'reading-pdf'
        chip.href = pdf.href
        chip.target = '_blank'
        chip.rel = 'noreferrer'
        chip.textContent = 'PDF'
        title.insertAdjacentElement('afterend', chip)
      }
    }
    article.querySelectorAll('p').forEach(function (paragraph) {
      if (paragraph.classList.contains('series-step')) return
      if (/上一篇|下一篇|上一节|下一节/.test(paragraph.textContent) && paragraph.querySelector('a')) {
        paragraph.classList.add('series-step')
      }
    })
    var toc = document.querySelector('.reading-toc')
    if (toc && !toc.dataset.bound) {
      toc.dataset.bound = '1'
      var kicker = toc.querySelector('.reading-toc__kicker')
      if (kicker) {
        kicker.addEventListener('click', function () {
          if (window.matchMedia('(max-width: 800px)').matches) toc.classList.toggle('is-open')
        })
      }
    }
  }

  function run() {
    placeNow()
    foldPosts()
    foldTimeline()
    noteCovers()
    reading()
  }

  var timer
  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(run, 30)
  }

  run()
  ;[0, 80, 300, 900, 1800].forEach(function (ms) {
    setTimeout(run, ms)
  })
  if (document.body) {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true })
  }
})()
