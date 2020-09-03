(function (d, scripts) {
  for (var id in scripts) if (d.getElementById(id) === null) {
    var js = d.createElement('script'); js.id = id; js.src = scripts[id];
    d.head.appendChild(js);
  }
}(document, {
  embedly: 'https://cdn.embedly.com/widgets/platform.js',
  twitter: 'https://platform.twitter.com/widgets.js',
}));

(function () {
  window.loadQueue = window.loadQueue || [];
  window.embedly = window.embedly || function () {
    (window.embedly.q = window.embedly.q || []).push(arguments);
  };

  function eachElement(els, eachFn) {
    if (els.length) {
      for(var i = 0; i < els.length; i++) {
        eachFn(els[i], i, els);
      }
    }
  }

  window.loadQueue.push(function externalLinks() {
    eachElement(document.querySelectorAll('.e-content a[href]'), function (el) {
      if (el.getAttribute('href') && el.hostname !== window.location.hostname) {
        el.target = '_blank';
        // console.log('Settings', el);
      } else {
        // console.log('Skipping', el);
      }
    });
  });

  window.embedly('defaults', {
    cards: {
      override: true,
      // key: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      chrome: 0,
      controls: 0,
      recommend: 0,
    },
  });

  function triggerLoadQueue() {
    // If any new loadQueue calls hit the array, automatically execute them
    window.loadQueue.push = function(c) { c(); };

    // Run through each function in the loadQueue and execute them
    (Array.isArray(window.loadQueue) ? window.loadQueue : [])
      .filter(function (fn) { return typeof fn === 'function' })
      .forEach(function (fn) { fn(); });
  }

  if (document.readyState !== 'loading') triggerLoadQueue();
  else document.addEventListener('DOMContentLoaded', triggerLoadQueue);
})();
