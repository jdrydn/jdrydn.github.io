(function () {
  window.loadQueue = window.loadQueue || [];

  function eachElement(els, eachFn) {
    if (els.length) {
      for(var i = 0; i < els.length; i++) {
        eachFn(els[i], i, els);
      }
    }
  }

  window.loadQueue.push(function externalLinks() {
    eachElement(document.getElementsByTagName('a'), function (el) {
      if (el.getAttribute('href') && el.hostname !== window.location.hostname) {
        el.target = '_blank';
        // console.log('Settings', el);
      } else {
        // console.log('Skipping', el);
      }
    });
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
