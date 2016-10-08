(function () {
  var enableMailtoURLs = function () {
    var els = document.querySelectorAll('a[href="#mailto:turn-on-javascript-to-find-my-email"]');
    if (!els.length) return;

    Array.prototype.forEach.call(els, function (el) {
      el.addEventListener('mouseover', function listener() {
        el.removeEventListener('mouseover', listener);
        el.setAttribute('href', window.atob('bWFpbHRvOmphbWVzQGpkcnlkbi5jb20='));
      });
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    enableMailtoURLs();
  });
})();
