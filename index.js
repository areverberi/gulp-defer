var es = require('event-stream'),
    gutil = require('gulp-util');

var deferTemplate =
    '\t<script type="text/javascript" id="deferscript">' +
    '!function (a, b, c) { "use strict"; var d = function (a) { if ("[object Array]" !== ' +
    'Object.prototype.toString.call(a))return !1; for (var c = 0; c < a.length; c++) { ' +
    'var d = b.createElement("script"), e = a[c]; d.src = e.src, d.async = e.async, ' +
    'b.body.appendChild(d) } return !0 }; var e = function (a) { if ("[object Array]" ' +
    '!== Object.prototype.toString.call(a))return !1; for (var c = 0; c < a.length; c++) { ' +
    'var d = document.createElement("link"), e = a[c]; d.rel = "stylesheet", d.href = e.href; ' +
    'var t = document.getElementById("deferscript"); document.body.appendChild(d); } return !0 }; a.addEventListener ? ' +
    'a.addEventListener("load", function () { e(c.styles); d(c.scripts); }, !1) : a.attachEvent ? ' +
    'a.attachEvent("onload", function () { e(c.styles); d(c.scripts); }) : a.onload = function () { ' +
    'e(c.styles); d(c.scripts); } }(window, document, %RESOURCES%);</script>\n';

module.exports = function () {

    function include(file, callback) {
        if (file.isNull()) {
            return callback(null, file);
        }

        if (file.isStream()) {
            throw new gutil.PluginError('gulp-defer', 'stream not supported');
        }

        if (file.isBuffer()) {
            var newText = processFile(String(file.contents), file.path);
            file.contents = new Buffer(newText);
        }

        callback(null, file);
    }

    return es.map(include)
};

function processFile(content) {
    var deferBlockRx = /<!--defer-->([\s\S]*?)<!--enddefer-->/g,
        deferInjectBlockRx = /<!--deferinject-->([\s\S]*?)<!--enddeferinject-->/g,
        scriptRx = /script.*?src=["'](.*?)["']/g,
        styleRx = /link.*?href=["'](.*?)["']/g,
        bodyRx = /<\/body>/;

    // find all defer blocks, and links inside them
    var res, block,
        scripts = [],
        styles = [];

    while ((res = deferBlockRx.exec(content)) !== null) {
        block = res[1];
        // find all script links
        while (( res = scriptRx.exec(block)) !== null) {
            scripts.push({
                src: res[1],
                async: false
            });
        }
        // find all style links
        while ((res = styleRx.exec(block)) !== null) {
            styles.push({
                href: res[1]
            });
        }
    }

    // nothing found?
    if (!scripts.length && !styles.length) {
        return content;
    }

    var deferFnText = deferTemplate.replace('%RESOURCES%', JSON.stringify({scripts: scripts, styles: styles}));
    return content.replace(deferInjectBlockRx, deferFnText).replace(deferBlockRx, '');
}

