;(function () {
  document.addEventListener(
    'click',
    function (e) {
      var a = e.target && e.target.closest && e.target.closest('a')
      if (!a) return
      var href = a.getAttribute('href') || ''
      if (!/^\/(en\/|zh\/|ja\/)?(cv|about)\/?$/.test(href)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      window.location.assign(href)
    },
    true
  )
})()
