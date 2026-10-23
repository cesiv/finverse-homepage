/* Finverse — boot flag.
 *
 * Runs in <head> before first paint. `.rise` elements are visible by default
 * (see style.css); only when this file executes do we opt into the reveal
 * animation, so blocked/disabled JS can never leave the page blank.
 */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  // Safety net: if main.js fails to load or IntersectionObserver never fires,
  // make every reveal block visible after a short delay instead of leaving
  // the page blank.
  window.addEventListener('load', function () {
    window.setTimeout(function () {
      var nodes = document.querySelectorAll('.rise');
      for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('in');
    }, 1200);
  });
})();
