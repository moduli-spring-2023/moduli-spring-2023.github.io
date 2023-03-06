var inputs = document.querySelectorAll("input");

inputs.forEach(i => {
  i.addEventListener("keypress", (event) => {
    if (event.key === "Enter")
      runCode();
  })
});


var statusElement = document.getElementById('status');
var progressElement = document.getElementById('progress');
var spinnerElement = document.getElementById('spinner');

async function callWasm() {
  var d = document.getElementById("d").value;
  var n = document.getElementById("n").value;
  var p = document.getElementById("p").value;
  var m = document.getElementById("m").value;

  Module.ccall("main_wrap", "number", ["number", "number", "number", "number"], [d, n, p, m])
}

var runCode = async () => {

  var loader = document.getElementById("loader");
  loader.style.display = "flex";
  setTimeout(async () => {
    var res = await callWasm().then(() => {
      loader.style.display = "none";
    });
  }, 100); // lol race condition
}

var clearOut = () => {
  var element = document.getElementById('output')
  element.innerHTML = '';
}

var Module = {
  noInitialRun: true,
  preRun: [],
  postRun: [],
  print: (function() {
    var element = document.getElementById('output');
    if (element) element.value = ''; // clear browser cache
    return function(text) {
      if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
      if (element) {
        
        if (text.startsWith("\t")) text = "<span class=\"indent\">" + text + "</span>";

        element.innerHTML += text + "<br>";
        element.scrollTop = element.scrollHeight; // focus on bottom
      }
    };
  })(),
  setStatus: function(text) {
    if (!Module.setStatus.last) Module.setStatus.last = { time: Date.now(), text: '' };
    if (text === Module.setStatus.last.text) return;
    var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
      var now = Date.now();
      if (m && now - Module.setStatus.last.time < 30) return; // if this is a progress update, skip it if too soon
      Module.setStatus.last.time = now;
      Module.setStatus.last.text = text;
      if (m) {
        text = m[1];
        progressElement.value = parseInt(m[2])*100;
        progressElement.max = parseInt(m[4])*100;
        progressElement.hidden = false;
        spinnerElement.hidden = false;
        var n = document.getElementById("n").value;
      } else {
        progressElement.value = null;
        progressElement.max = null;
        progressElement.hidden = true;
        if (!text) spinnerElement.hidden = true;
      }
    statusElement.innerHTML = text;
  },
  totalDependencies: 0,
  monitorRunDependencies: function(left) {
    this.totalDependencies = Math.max(this.totalDependencies, left);
    Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
  }
};
Module.setStatus('Downloading...');
window.onerror = function() {
  Module.setStatus('Exception thrown, see JavaScript console');
  spinnerElement.style.display = 'none';
  Module.setStatus = function(text) {
    if (text) console.error('[post-exception status] ' + text);
  };
};

Module.printErr = Module.print;
