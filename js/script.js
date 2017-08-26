(function () {
  window.loadQueue = window.loadQueue || [];

  function init() {
    for (var i = 0; i < window.loadQueue.length; i++) {
      if (typeof window.loadQueue[i] === 'function') window.loadQueue[i].call();
    }
	  window.loadQueue.push = function(c) { c(); };
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
