(function(win, lib){
    var doc = win.document;
    var docEl = doc.documentElement;
    var gridEl = doc.querySelector('meta[name="grid"]');
    var styleEl;
    var flexible = lib.flexible || (lib.flexible = {});

    function makeGrid(params) {
        var designWidth = parseFloat(params.designWidth);//设计图的宽度
        var designUnit = parseFloat(params.designUnit);//设计单元
        var columnCount = parseFloat(params.columnCount);//栅格列数
        var columnXUnit = parseFloat(params.columnXUnit);//栅格列宽
        var gutterXUnit = parseFloat(params.gutterXUnit);//栅格间距
        var edgeXUnit = parseFloat(params.edgeXUnit);//页面左右边距
        var className = params.className || 'grid';//栅格的名称

        if (!(params.designWidth && params.designUnit && params.columnCount && params.columnXUnit && params.gutterXUnit && params.edgeXUnit)) {
            throw new Error('参数错误');
        }

        lib.flexible.gridParams = params;

        var ratio = designUnit / designWidth * 10;//设计单元/设计图宽度*10  6/750*10=0.08
        var columnWidth = columnXUnit * ratio;//栅格的列宽 0.08*7
        var gutterWidth = gutterXUnit * ratio;//栅格间距 0.08*3
        var edgeWidth = edgeXUnit * ratio;//边距 0.08*4

        var cssText = [
            '.' + className + ' {',
            'box-sizing:content-box;',
            'padding-left: ' + edgeWidth + 'rem;',
            'padding-right: ' + edgeWidth + 'rem;',
            'margin-left: -' + gutterWidth + 'rem;',
            '}',

            '.' + className + ':before,',
            '.' + className + ':after{',
            'content: " ";',
            'display: table;',
            '}',

            '.' + className + ':after {',
            'clear: both;',
            '}',

            '.' + className + ' [class^="col-"] {',
            'margin-left: ' + gutterWidth + 'rem;',
            'float: left;',
            '}'
        ];

        for (var i = 1; i <= columnCount; i++) {
            var width = columnWidth * i + gutterWidth * (i - 1);
            cssText.push('.' + className + ' .col-' + i + ' {width: ' + width + 'rem;}');
        }

        if (styleEl && styleEl.parentNode) {
            styleEl.parentNode.removeChild(styleEl);
        }
        styleEl = doc.createElement('style');
        styleEl.innerHTML = cssText.join('');
        var el = doc.querySelector('head') || docEl.firstElementChild || docEl;
        el.appendChild(styleEl);
    }


   /* designWidth - 设计稿宽度
    designUnit - 设计稿最小单位a（以px为单位）
    columnCount - 栅格列数
    columnXUnit - 栅格列宽（以a为单位）
    gutterXUnit - 栅格间距（以a为单位）
    edgeXUnit - 页面左右边距（以a为单位）
    className - 栅格样式的名称（可省略，默认为grid）*/
    //640
    var gridMode = {
        '750-12': {designWidth:750,designUnit:6,columnCount:12,columnXUnit:7,gutterXUnit:3,edgeXUnit:4},
        '750-6': {designWidth:750,designUnit:6,columnCount:6,columnXUnit:17,gutterXUnit:3,edgeXUnit:4},
        '640-12': {designWidth:640,designUnit:4,columnCount:12,columnXUnit:11,gutterXUnit:2,edgeXUnit:3},
        '640-6': {designWidth:640,designUnit:4,columnCount:6,columnXUnit:24,gutterXUnit:2,edgeXUnit:3}
    }
    function makeGridMode(modeName) {
        var mode = gridMode[modeName];
        if (mode) {
            makeGrid(mode);
        } else {
            throw new Error('不支持这个预设模式');
        }
    }

    if (gridEl) {
        var content = gridEl.getAttribute('content');
        if (content) {
            var reg = /([^=]+)([\d\.\-]+)/g;
            var matched;
            var params = {};
            console.log(reg.exec(content));
            while (!!(matched = reg.exec(content))) {
                params[matched[1]] = matched[2];
            }
            if (params.modeName){
                makeGridMode(params.modeName);
            } else {
                makeGrid(params);
            }
        }
    }

    flexible.makeGrid = makeGrid;
    flexible.makeGridMode = makeGridMode;

})(window, window['lib'] || (window['lib'] = {}));