//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], concat = emptyArray.concat, filter = emptyArray.filter, slice = emptyArray.slice,
    document = window.document,
    elementDisplay = {}, classCache = {},
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,
    singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
    tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    rootNodeRE = /^(?:body|html)$/i,
    capitalRE = /([A-Z])/g,

    // special attributes that should be get/set via method calls
    methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    simpleSelectorRE = /^[\w-]*$/,
    class2type = {},
    toString = class2type.toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div'),
    propMap = {
      'tabindex': 'tabIndex',
      'readonly': 'readOnly',
      'for': 'htmlFor',
      'class': 'className',
      'maxlength': 'maxLength',
      'cellspacing': 'cellSpacing',
      'cellpadding': 'cellPadding',
      'rowspan': 'rowSpan',
      'colspan': 'colSpan',
      'usemap': 'useMap',
      'frameborder': 'frameBorder',
      'contenteditable': 'contentEditable'
    },
    isArray = Array.isArray ||
      function(object){ return object instanceof Array }

  zepto.matches = function(element, selector) {
    if (!selector || !element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function type(obj) {
    return obj == null ? String(obj) :
      class2type[toString.call(obj)] || "object"
  }

  function isFunction(value) { return type(value) == "function" }
  function isWindow(obj)     { return obj != null && obj == obj.window }
  function isDocument(obj)   { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }
  function isObject(obj)     { return type(obj) == "object" }
  function isPlainObject(obj) {
    return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype
  }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return filter.call(array, function(item){ return item != null }) }
  function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return filter.call(array, function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  function children(element) {
    return 'children' in element ?
      slice.call(element.children) :
      $.map(element.childNodes, function(node){ if (node.nodeType == 1) return node })
  }

  function Z(dom, selector) {
    var i, len = dom ? dom.length : 0
    for (i = 0; i < len; i++) this[i] = dom[i]
    this.length = len
    this.selector = selector || ''
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overridden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name, properties) {
    var dom, nodes, container

    // A special case optimization for a single tag
    if (singleTagRE.test(html)) dom = $(document.createElement(RegExp.$1))

    if (!dom) {
      if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
      if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
      if (!(name in containers)) name = '*'

      container = containers[name]
      container.innerHTML = '' + html
      dom = $.each(slice.call(container.childNodes), function(){
        container.removeChild(this)
      })
    }

    if (isPlainObject(properties)) {
      nodes = $(dom)
      $.each(properties, function(key, value) {
        if (methodAttributes.indexOf(key) > -1) nodes[key](value)
        else nodes.attr(key, value)
      })
    }

    return dom
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. This method can be overridden in plugins.
  zepto.Z = function(dom, selector) {
    return new Z(dom, selector)
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overridden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overridden in plugins.
  zepto.init = function(selector, context) {
    var dom
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // Optimize for string selectors
    else if (typeof selector == 'string') {
      selector = selector.trim()
      // If it's a html fragment, create nodes from it
      // Note: In both Chrome 21 and Firefox 15, DOM error 12
      // is thrown if the fragment doesn't begin with <
      if (selector[0] == '<' && fragmentRE.test(selector))
        dom = zepto.fragment(selector, RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // If it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
    }
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, just return it
    else if (zepto.isZ(selector)) return selector
    else {
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // Wrap DOM nodes.
      else if (isObject(selector))
        dom = [selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
    }
    // create a new Zepto collection from the nodes found
    return zepto.Z(dom, selector)
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, which makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  function extend(target, source, deep) {
    for (key in source)
      if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
        if (isPlainObject(source[key]) && !isPlainObject(target[key]))
          target[key] = {}
        if (isArray(source[key]) && !isArray(target[key]))
          target[key] = []
        extend(target[key], source[key], deep)
      }
      else if (source[key] !== undefined) target[key] = source[key]
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    var deep, args = slice.call(arguments, 1)
    if (typeof target == 'boolean') {
      deep = target
      target = args.shift()
    }
    args.forEach(function(arg){ extend(target, arg, deep) })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overridden in plugins.
  zepto.qsa = function(element, selector){
    var found,
        maybeID = selector[0] == '#',
        maybeClass = !maybeID && selector[0] == '.',
        nameOnly = maybeID || maybeClass ? selector.slice(1) : selector, // Ensure that a 1 char tag name still gets checked
        isSimple = simpleSelectorRE.test(nameOnly)
    return (element.getElementById && isSimple && maybeID) ? // Safari DocumentFragment doesn't have getElementById
      ( (found = element.getElementById(nameOnly)) ? [found] : [] ) :
      (element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
      slice.call(
        isSimple && !maybeID && element.getElementsByClassName ? // DocumentFragment doesn't have getElementsByClassName/TagName
          maybeClass ? element.getElementsByClassName(nameOnly) : // If it's simple, it could be a class
          element.getElementsByTagName(selector) : // Or a tag
          element.querySelectorAll(selector) // Or it's not simple, and we need to query all
      )
  }

  function filtered(nodes, selector) {
    return selector == null ? $(nodes) : $(nodes).filter(selector)
  }

  $.contains = document.documentElement.contains ?
    function(parent, node) {
      return parent !== node && parent.contains(node)
    } :
    function(parent, node) {
      while (node && (node = node.parentNode))
        if (node === parent) return true
      return false
    }

  function funcArg(context, arg, idx, payload) {
    return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  function setAttribute(node, name, value) {
    value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
  }

  // access className property while respecting SVGAnimatedString
  function className(node, value){
    var klass = node.className || '',
        svg   = klass && klass.baseVal !== undefined

    if (value === undefined) return svg ? klass.baseVal : klass
    svg ? (klass.baseVal = value) : (node.className = value)
  }

  // "true"  => true
  // "false" => false
  // "null"  => null
  // "42"    => 42
  // "42.5"  => 42.5
  // "08"    => "08"
  // JSON    => parse if valid
  // String  => self
  function deserializeValue(value) {
    try {
      return value ?
        value == "true" ||
        ( value == "false" ? false :
          value == "null" ? null :
          +value + "" == value ? +value :
          /^[\[\{]/.test(value) ? $.parseJSON(value) :
          value )
        : value
    } catch(e) {
      return value
    }
  }

  $.type = type
  $.isFunction = isFunction
  $.isWindow = isWindow
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.isEmptyObject = function(obj) {
    var name
    for (name in obj) return false
    return true
  }

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.camelCase = camelize
  $.trim = function(str) {
    return str == null ? "" : String.prototype.trim.call(str)
  }

  // plugin compatibility
  $.uuid = 0
  $.support = { }
  $.expr = { }
  $.noop = function() {}

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  $.grep = function(elements, callback){
    return filter.call(elements, callback)
  }

  if (window.JSON) $.parseJSON = JSON.parse

  // Populate the class2type map
  $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
    class2type[ "[object " + name + "]" ] = name.toLowerCase()
  })

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    constructor: zepto.Z,
    length: 0,

    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    sort: emptyArray.sort,
    splice: emptyArray.splice,
    indexOf: emptyArray.indexOf,
    concat: function(){
      var i, value, args = []
      for (i = 0; i < arguments.length; i++) {
        value = arguments[i]
        args[i] = zepto.isZ(value) ? value.toArray() : value
      }
      return concat.apply(zepto.isZ(this) ? this.toArray() : this, args)
    },

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $($.map(this, function(el, i){ return fn.call(el, i, el) }))
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      // need to check if document.body exists for IE as that browser reports
      // document ready when it hasn't yet created the body element
      if (readyRE.test(document.readyState) && document.body) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      emptyArray.every.call(this, function(el, idx){
        return callback.call(el, idx, el) !== false
      })
      return this
    },
    filter: function(selector){
      if (isFunction(selector)) return this.not(this.not(selector))
      return $(filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    has: function(selector){
      return this.filter(function(){
        return isObject(selector) ?
          $.contains(this, selector) :
          $(this).find(selector).size()
      })
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result, $this = this
      if (!selector) result = $()
      else if (typeof selector == 'object')
        result = $(selector).filter(function(){
          var node = this
          return emptyArray.some.call($this, function(parent){
            return $.contains(parent, node)
          })
        })
      else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return result
    },
    closest: function(selector, context){
      var node = this[0], collection = false
      if (typeof selector == 'object') collection = $(selector)
      while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
        node = node !== context && !isDocument(node) && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return children(this) }), selector)
    },
    contents: function() {
      return this.map(function() { return this.contentDocument || slice.call(this.childNodes) })
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return filter.call(children(el.parentNode), function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return $.map(this, function(el){ return el[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = '')
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(structure){
      var func = isFunction(structure)
      if (this[0] && !func)
        var dom   = $(structure).get(0),
            clone = dom.parentNode || this.length > 1

      return this.each(function(index){
        $(this).wrapAll(
          func ? structure.call(this, index) :
            clone ? dom.cloneNode(true) : dom
        )
      })
    },
    wrapAll: function(structure){
      if (this[0]) {
        $(this[0]).before(structure = $(structure))
        var children
        // drill down to the inmost element
        while ((children = structure.children()).length) structure = children.first()
        $(structure).append(this)
      }
      return this
    },
    wrapInner: function(structure){
      var func = isFunction(structure)
      return this.each(function(index){
        var self = $(this), contents = self.contents(),
            dom  = func ? structure.call(this, index) : structure
        contents.length ? contents.wrapAll(dom) : self.append(dom)
      })
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return this.map(function(){ return this.cloneNode(true) })
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return this.each(function(){
        var el = $(this)
        ;(setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
      })
    },
    prev: function(selector){ return $(this.pluck('previousElementSibling')).filter(selector || '*') },
    next: function(selector){ return $(this.pluck('nextElementSibling')).filter(selector || '*') },
    html: function(html){
      return 0 in arguments ?
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        }) :
        (0 in this ? this[0].innerHTML : null)
    },
    text: function(text){
      return 0 in arguments ?
        this.each(function(idx){
          var newText = funcArg(this, text, idx, this.textContent)
          this.textContent = newText == null ? '' : ''+newText
        }) :
        (0 in this ? this.pluck('textContent').join("") : null)
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && !(1 in arguments)) ?
        (!this.length || this[0].nodeType !== 1 ? undefined :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
          else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ this.nodeType === 1 && name.split(' ').forEach(function(attribute){
        setAttribute(this, attribute)
      }, this)})
    },
    prop: function(name, value){
      name = propMap[name] || name
      return (1 in arguments) ?
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        }) :
        (this[0] && this[0][name])
    },
    data: function(name, value){
      var attrName = 'data-' + name.replace(capitalRE, '-$1').toLowerCase()

      var data = (1 in arguments) ?
        this.attr(attrName, value) :
        this.attr(attrName)

      return data !== null ? deserializeValue(data) : undefined
    },
    val: function(value){
      return 0 in arguments ?
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        }) :
        (this[0] && (this[0].multiple ?
           $(this[0]).find('option').filter(function(){ return this.selected }).pluck('value') :
           this[0].value)
        )
    },
    offset: function(coordinates){
      if (coordinates) return this.each(function(index){
        var $this = $(this),
            coords = funcArg(this, coordinates, index, $this.offset()),
            parentOffset = $this.offsetParent().offset(),
            props = {
              top:  coords.top  - parentOffset.top,
              left: coords.left - parentOffset.left
            }

        if ($this.css('position') == 'static') props['position'] = 'relative'
        $this.css(props)
      })
      if (!this.length) return null
      if (!$.contains(document.documentElement, this[0]))
        return {top: 0, left: 0}
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: Math.round(obj.width),
        height: Math.round(obj.height)
      }
    },
    css: function(property, value){
      if (arguments.length < 2) {
        var computedStyle, element = this[0]
        if(!element) return
        computedStyle = getComputedStyle(element, '')
        if (typeof property == 'string')
          return element.style[camelize(property)] || computedStyle.getPropertyValue(property)
        else if (isArray(property)) {
          var props = {}
          $.each(property, function(_, prop){
            props[prop] = (element.style[camelize(prop)] || computedStyle.getPropertyValue(prop))
          })
          return props
        }
      }

      var css = ''
      if (type(property) == 'string') {
        if (!value && value !== 0)
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)
      } else {
        for (key in property)
          if (!property[key] && property[key] !== 0)
            this.each(function(){ this.style.removeProperty(dasherize(key)) })
          else
            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
      }

      return this.each(function(){ try{this.style.cssText += ';' + css }catch(e){}})
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      if (!name) return false
      return emptyArray.some.call(this, function(el){
        return this.test(className(el))
      }, classRE(name))
    },
    addClass: function(name){
      if (!name) return this
      return this.each(function(idx){
        if (!('className' in this)) return
        classList = []
        var cls = className(this), newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (!('className' in this)) return
        if (name === undefined) return className(this, '')
        classList = className(this)
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        className(this, classList.trim())
      })
    },
    toggleClass: function(name, when){
      if (!name) return this
      return this.each(function(idx){
        var $this = $(this), names = funcArg(this, name, idx, className(this))
        names.split(/\s+/g).forEach(function(klass){
          (when === undefined ? !$this.hasClass(klass) : when) ?
            $this.addClass(klass) : $this.removeClass(klass)
        })
      })
    },
    scrollTop: function(value){
      if (!this.length) return
      var hasScrollTop = 'scrollTop' in this[0]
      if (value === undefined) return hasScrollTop ? this[0].scrollTop : this[0].pageYOffset
      return this.each(hasScrollTop ?
        function(){ this.scrollTop = value } :
        function(){ this.scrollTo(this.scrollX, value) })
    },
    scrollLeft: function(value){
      if (!this.length) return
      var hasScrollLeft = 'scrollLeft' in this[0]
      if (value === undefined) return hasScrollLeft ? this[0].scrollLeft : this[0].pageXOffset
      return this.each(hasScrollLeft ?
        function(){ this.scrollLeft = value } :
        function(){ this.scrollTo(value, this.scrollY) })
    },
    position: function() {
      if (!this.length) return

      var elem = this[0],
        // Get *real* offsetParent
        offsetParent = this.offsetParent(),
        // Get correct offsets
        offset       = this.offset(),
        parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

      // Subtract element margins
      // note: when an element has margin: auto the offsetLeft and marginLeft
      // are the same in Safari causing offset.left to incorrectly be 0
      offset.top  -= parseFloat( $(elem).css('margin-top') ) || 0
      offset.left -= parseFloat( $(elem).css('margin-left') ) || 0

      // Add offsetParent borders
      parentOffset.top  += parseFloat( $(offsetParent[0]).css('border-top-width') ) || 0
      parentOffset.left += parseFloat( $(offsetParent[0]).css('border-left-width') ) || 0

      // Subtract the two offsets
      return {
        top:  offset.top  - parentOffset.top,
        left: offset.left - parentOffset.left
      }
    },
    offsetParent: function() {
      return this.map(function(){
        var parent = this.offsetParent || document.body
        while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
          parent = parent.offsetParent
        return parent
      })
    }
  }

  // for now
  $.fn.detach = $.fn.remove

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    var dimensionProperty =
      dimension.replace(/./, function(m){ return m[0].toUpperCase() })

    $.fn[dimension] = function(value){
      var offset, el = this[0]
      if (value === undefined) return isWindow(el) ? el['inner' + dimensionProperty] :
        isDocument(el) ? el.documentElement['scroll' + dimensionProperty] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function traverseNode(node, fun) {
    fun(node)
    for (var i = 0, len = node.childNodes.length; i < len; i++)
      traverseNode(node.childNodes[i], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(operator, operatorIndex) {
    var inside = operatorIndex % 2 //=> prepend, append

    $.fn[operator] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var argType, nodes = $.map(arguments, function(arg) {
            argType = type(arg)
            return argType == "object" || argType == "array" || arg == null ?
              arg : zepto.fragment(arg)
          }),
          parent, copyByClone = this.length > 1
      if (nodes.length < 1) return this

      return this.each(function(_, target){
        parent = inside ? target : target.parentNode

        // convert all methods to a "before" operation
        target = operatorIndex == 0 ? target.nextSibling :
                 operatorIndex == 1 ? target.firstChild :
                 operatorIndex == 2 ? target :
                 null

        var parentInDocument = $.contains(document.documentElement, parent)

        nodes.forEach(function(node){
          if (copyByClone) node = node.cloneNode(true)
          else if (!parent) return $(node).remove()

          parent.insertBefore(node, target)
          if (parentInDocument) traverseNode(node, function(el){
            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
               (!el.type || el.type === 'text/javascript') && !el.src)
              window['eval'].call(window, el.innerHTML)
          })
        })
      })
    }

    // after    => insertAfter
    // prepend  => prependTo
    // before   => insertBefore
    // append   => appendTo
    $.fn[inside ? operator+'To' : 'insert'+(operatorIndex ? 'Before' : 'After')] = function(html){
      $(html)[operator](this)
      return this
    }
  })

  zepto.Z.prototype = Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.uniq = uniq
  zepto.deserializeValue = deserializeValue
  $.zepto = zepto

  return $
})()

// If `$` is not yet defined, point it to `Zepto`
window.Zepto = Zepto
window.$ === undefined && (window.$ = Zepto)

//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  var zepto = $.zepto, oldQsa = zepto.qsa, oldMatches = zepto.matches

  function visible(elem){
    elem = $(elem)
    return !!(elem.width() || elem.height()) && elem.css("display") !== "none"
  }

  // Implements a subset from:
  // http://api.jquery.com/category/selectors/jquery-selector-extensions/
  //
  // Each filter function receives the current index, all nodes in the
  // considered set, and a value if there were parentheses. The value
  // of `this` is the node currently being considered. The function returns the
  // resulting node(s), null, or undefined.
  //
  // Complex selectors are not supported:
  //   li:has(label:contains("foo")) + li:has(label:contains("bar"))
  //   ul.inner:first > li
  var filters = $.expr[':'] = {
    visible:  function(){ if (visible(this)) return this },
    hidden:   function(){ if (!visible(this)) return this },
    selected: function(){ if (this.selected) return this },
    checked:  function(){ if (this.checked) return this },
    parent:   function(){ return this.parentNode },
    first:    function(idx){ if (idx === 0) return this },
    last:     function(idx, nodes){ if (idx === nodes.length - 1) return this },
    eq:       function(idx, _, value){ if (idx === value) return this },
    contains: function(idx, _, text){ if ($(this).text().indexOf(text) > -1) return this },
    has:      function(idx, _, sel){ if (zepto.qsa(this, sel).length) return this }
  }

  var filterRe = new RegExp('(.*):(\\w+)(?:\\(([^)]+)\\))?$\\s*'),
      childRe  = /^\s*>/,
      classTag = 'Zepto' + (+new Date())

  function process(sel, fn) {
    // quote the hash in `a[href^=#]` expression
    sel = sel.replace(/=#\]/g, '="#"]')
    var filter, arg, match = filterRe.exec(sel)
    if (match && match[2] in filters) {
      filter = filters[match[2]], arg = match[3]
      sel = match[1]
      if (arg) {
        var num = Number(arg)
        if (isNaN(num)) arg = arg.replace(/^["']|["']$/g, '')
        else arg = num
      }
    }
    return fn(sel, filter, arg)
  }

  zepto.qsa = function(node, selector) {
    return process(selector, function(sel, filter, arg){
      try {
        var taggedParent
        if (!sel && filter) sel = '*'
        else if (childRe.test(sel))
          // support "> *" child queries by tagging the parent node with a
          // unique class and prepending that classname onto the selector
          taggedParent = $(node).addClass(classTag), sel = '.'+classTag+' '+sel

        var nodes = oldQsa(node, sel)
      } catch(e) {
        console.error('error performing selector: %o', selector)
        throw e
      } finally {
        if (taggedParent) taggedParent.removeClass(classTag)
      }
      return !filter ? nodes :
        zepto.uniq($.map(nodes, function(n, i){ return filter.call(n, i, nodes, arg) }))
    })
  }

  zepto.matches = function(node, selector){
    return process(selector, function(sel, filter, arg){
      return (!sel || oldMatches(node, sel)) &&
        (!filter || filter.call(node, null, arg) === node)
    })
  }
})(Zepto)

//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

// The following code is heavily inspired by jQuery's $.fn.data()

;(function($){
  var data = {}, dataAttr = $.fn.data, camelize = $.camelCase,
    exp = $.expando = 'Zepto' + (+new Date()), emptyArray = []

  // Get value from node:
  // 1. first try key as given,
  // 2. then try camelized key,
  // 3. fall back to reading "data-*" attribute.
  function getData(node, name) {
    var id = node[exp], store = id && data[id]
    if (name === undefined) return store || setData(node)
    else {
      if (store) {
        if (name in store) return store[name]
        var camelName = camelize(name)
        if (camelName in store) return store[camelName]
      }
      return dataAttr.call($(node), name)
    }
  }

  // Store value under camelized key on node
  function setData(node, name, value) {
    var id = node[exp] || (node[exp] = ++$.uuid),
      store = data[id] || (data[id] = attributeData(node))
    if (name !== undefined) store[camelize(name)] = value
    return store
  }

  // Read all "data-*" attributes from a node
  function attributeData(node) {
    var store = {}
    $.each(node.attributes || emptyArray, function(i, attr){
      if (attr.name.indexOf('data-') == 0)
        store[camelize(attr.name.replace('data-', ''))] =
          $.zepto.deserializeValue(attr.value)
    })
    return store
  }

  $.fn.data = function(name, value) {
    return value === undefined ?
      // set multiple values via object
      $.isPlainObject(name) ?
        this.each(function(i, node){
          $.each(name, function(key, value){ setData(node, key, value) })
        }) :
        // get value from first element
        (0 in this ? getData(this[0], name) : undefined) :
      // set value on all elements
      this.each(function(){ setData(this, name, value) })
  }

  $.fn.removeData = function(names) {
    if (typeof names == 'string') names = names.split(/\s+/)
    return this.each(function(){
      var id = this[exp], store = id && data[id]
      if (store) $.each(names || store, function(key){
        delete store[names ? camelize(this) : key]
      })
    })
  }

  // Generate extended `remove` and `empty` functions
  ;['remove', 'empty'].forEach(function(methodName){
    var origFn = $.fn[methodName]
    $.fn[methodName] = function() {
      var elements = this.find('*')
      if (methodName === 'remove') elements = elements.add(this)
      elements.removeData()
      return origFn.call(this)
    }
  })
})(Zepto)

//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  var _zid = 1, undefined,
      slice = Array.prototype.slice,
      isFunction = $.isFunction,
      isString = function(obj){ return typeof obj == 'string' },
      handlers = {},
      specialEvents={},
      focusinSupported = 'onfocusin' in window,
      focus = { focus: 'focusin', blur: 'focusout' },
      hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eventCapture(handler, captureSetting) {
    return handler.del &&
      (!focusinSupported && (handler.e in focus)) ||
      !!captureSetting
  }

  function realEvent(type) {
    return hover[type] || (focusinSupported && focus[type]) || type
  }

  function add(element, events, fn, data, selector, delegator, capture){
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    events.split(/\s/).forEach(function(event){
      if (event == 'ready') return $(document).ready(fn)
      var handler   = parse(event)
      handler.fn    = fn
      handler.sel   = selector
      // emulate mouseenter, mouseleave
      if (handler.e in hover) fn = function(e){
        var related = e.relatedTarget
        if (!related || (related !== this && !$.contains(this, related)))
          return handler.fn.apply(this, arguments)
      }
      handler.del   = delegator
      var callback  = delegator || fn
      handler.proxy = function(e){
        e = compatible(e)
        if (e.isImmediatePropagationStopped()) return
        e.data = data
        var result = callback.apply(element, e._args == undefined ? [e] : [e].concat(e._args))
        if (result === false) e.preventDefault(), e.stopPropagation()
        return result
      }
      handler.i = set.length
      set.push(handler)
      if ('addEventListener' in element)
        element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
    })
  }
  function remove(element, events, fn, selector, capture){
    var id = zid(element)
    ;(events || '').split(/\s/).forEach(function(event){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
      if ('removeEventListener' in element)
        element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    var args = (2 in arguments) && slice.call(arguments, 2)
    if (isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, args ? args.concat(slice.call(arguments)) : arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (isString(context)) {
      if (args) {
        args.unshift(fn[context], fn)
        return $.proxy.apply(null, args)
      } else {
        return $.proxy(fn[context], fn)
      }
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, data, callback){
    return this.on(event, data, callback)
  }
  $.fn.unbind = function(event, callback){
    return this.off(event, callback)
  }
  $.fn.one = function(event, selector, data, callback){
    return this.on(event, selector, data, callback, 1)
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$)/,
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }

  function compatible(event, source) {
    if (source || !event.isDefaultPrevented) {
      source || (source = event)

      $.each(eventMethods, function(name, predicate) {
        var sourceMethod = source[name]
        event[name] = function(){
          this[predicate] = returnTrue
          return sourceMethod && sourceMethod.apply(source, arguments)
        }
        event[predicate] = returnFalse
      })

      if (source.defaultPrevented !== undefined ? source.defaultPrevented :
          'returnValue' in source ? source.returnValue === false :
          source.getPreventDefault && source.getPreventDefault())
        event.isDefaultPrevented = returnTrue
    }
    return event
  }

  function createProxy(event) {
    var key, proxy = { originalEvent: event }
    for (key in event)
      if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

    return compatible(proxy, event)
  }

  $.fn.delegate = function(selector, event, callback){
    return this.on(event, selector, callback)
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.off(event, selector, callback)
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, data, callback, one){
    var autoRemove, delegator, $this = this
    if (event && !isString(event)) {
      $.each(event, function(type, fn){
        $this.on(type, selector, data, fn, one)
      })
      return $this
    }

    if (!isString(selector) && !isFunction(callback) && callback !== false)
      callback = data, data = selector, selector = undefined
    if (callback === undefined || data === false)
      callback = data, data = undefined

    if (callback === false) callback = returnFalse

    return $this.each(function(_, element){
      if (one) autoRemove = function(e){
        remove(element, e.type, callback)
        return callback.apply(this, arguments)
      }

      if (selector) delegator = function(e){
        var evt, match = $(e.target).closest(selector, element).get(0)
        if (match && match !== element) {
          evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
          return (autoRemove || callback).apply(match, [evt].concat(slice.call(arguments, 1)))
        }
      }

      add(element, event, callback, data, selector, delegator || autoRemove)
    })
  }
  $.fn.off = function(event, selector, callback){
    var $this = this
    if (event && !isString(event)) {
      $.each(event, function(type, fn){
        $this.off(type, selector, fn)
      })
      return $this
    }

    if (!isString(selector) && !isFunction(callback) && callback !== false)
      callback = selector, selector = undefined

    if (callback === false) callback = returnFalse

    return $this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.trigger = function(event, args){
    event = (isString(event) || $.isPlainObject(event)) ? $.Event(event) : compatible(event)
    event._args = args
    return this.each(function(){
      // handle focus(), blur() by calling them directly
      if (event.type in focus && typeof this[event.type] == "function") this[event.type]()
      // items in the collection might not be DOM elements
      else if ('dispatchEvent' in this) this.dispatchEvent(event)
      else $(this).triggerHandler(event, args)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, args){
    var e, result
    this.each(function(i, element){
      e = createProxy(isString(event) ? $.Event(event) : event)
      e._args = args
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout focus blur load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback) {
      return (0 in arguments) ?
        this.bind(event, callback) :
        this.trigger(event)
    }
  })

  $.Event = function(type, props) {
    if (!isString(type)) props = type, type = props.type
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true)
    return compatible(event)
  }

})(Zepto)

//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  var touch = {},
    touchTimeout, tapTimeout, swipeTimeout, longTapTimeout,
    longTapDelay = 750,
    gesture

  function swipeDirection(x1, x2, y1, y2) {
    return Math.abs(x1 - x2) >=
      Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
  }

  function longTap() {
    longTapTimeout = null
    if (touch.last) {
      touch.el.trigger('longTap')
      touch = {}
    }
  }

  function cancelLongTap() {
    if (longTapTimeout) clearTimeout(longTapTimeout)
    longTapTimeout = null
  }

  function cancelAll() {
    if (touchTimeout) clearTimeout(touchTimeout)
    if (tapTimeout) clearTimeout(tapTimeout)
    if (swipeTimeout) clearTimeout(swipeTimeout)
    if (longTapTimeout) clearTimeout(longTapTimeout)
    touchTimeout = tapTimeout = swipeTimeout = longTapTimeout = null
    touch = {}
  }

  function isPrimaryTouch(event){
    return (event.pointerType == 'touch' ||
      event.pointerType == event.MSPOINTER_TYPE_TOUCH)
      && event.isPrimary
  }

  function isPointerEventType(e, type){
    return (e.type == 'pointer'+type ||
      e.type.toLowerCase() == 'mspointer'+type)
  }

  $(document).ready(function(){
    var now, delta, deltaX = 0, deltaY = 0, firstTouch, _isPointerType

    if ('MSGesture' in window) {
      gesture = new MSGesture()
      gesture.target = document.body
    }

    $(document)
      .bind('MSGestureEnd', function(e){
        var swipeDirectionFromVelocity =
          e.velocityX > 1 ? 'Right' : e.velocityX < -1 ? 'Left' : e.velocityY > 1 ? 'Down' : e.velocityY < -1 ? 'Up' : null;
        if (swipeDirectionFromVelocity) {
          touch.el.trigger('swipe')
          touch.el.trigger('swipe'+ swipeDirectionFromVelocity)
        }
      })
      .on('touchstart MSPointerDown pointerdown', function(e){
        if((_isPointerType = isPointerEventType(e, 'down')) &&
          !isPrimaryTouch(e)) return
        firstTouch = _isPointerType ? e : e.touches[0]
        if (e.touches && e.touches.length === 1 && touch.x2) {
          // Clear out touch movement data if we have it sticking around
          // This can occur if touchcancel doesn't fire due to preventDefault, etc.
          touch.x2 = undefined
          touch.y2 = undefined
        }
        now = Date.now()
        delta = now - (touch.last || now)
        touch.el = $('tagName' in firstTouch.target ?
          firstTouch.target : firstTouch.target.parentNode)
        touchTimeout && clearTimeout(touchTimeout)
        touch.x1 = firstTouch.pageX
        touch.y1 = firstTouch.pageY
        if (delta > 0 && delta <= 250) touch.isDoubleTap = true
        touch.last = now
        longTapTimeout = setTimeout(longTap, longTapDelay)
        // adds the current touch contact for IE gesture recognition
        if (gesture && _isPointerType) gesture.addPointer(e.pointerId);
      })
      .on('touchmove MSPointerMove pointermove', function(e){
        if((_isPointerType = isPointerEventType(e, 'move')) &&
          !isPrimaryTouch(e)) return
        firstTouch = _isPointerType ? e : e.touches[0]
        cancelLongTap()
        touch.x2 = firstTouch.pageX
        touch.y2 = firstTouch.pageY

        deltaX += Math.abs(touch.x1 - touch.x2)
        deltaY += Math.abs(touch.y1 - touch.y2)
      })
      .on('touchend MSPointerUp pointerup', function(e){
        if((_isPointerType = isPointerEventType(e, 'up')) &&
          !isPrimaryTouch(e)) return
        cancelLongTap()

        // swipe
        if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
            (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))

          swipeTimeout = setTimeout(function() {
            touch.el.trigger('swipe')
            touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
            touch = {}
          }, 0)

        // normal tap
        else if ('last' in touch)
          // don't fire tap when delta position changed by more than 30 pixels,
          // for instance when moving to a point and back to origin
          if (deltaX < 30 && deltaY < 30) {
            // delay by one tick so we can cancel the 'tap' event if 'scroll' fires
            // ('tap' fires before 'scroll')
            tapTimeout = setTimeout(function() {

              // trigger universal 'tap' with the option to cancelTouch()
              // (cancelTouch cancels processing of single vs double taps for faster 'tap' response)
              var event = $.Event('tap')
              event.cancelTouch = cancelAll
              touch.el.trigger(event)

              // trigger double tap immediately
              if (touch.isDoubleTap) {
                if (touch.el) touch.el.trigger('doubleTap')
                touch = {}
              }

              // trigger single tap after 250ms of inactivity
              else {
                touchTimeout = setTimeout(function(){
                  touchTimeout = null
                  if (touch.el) touch.el.trigger('singleTap')
                  touch = {}
                }, 250)
              }
            }, 0)
          } else {
            touch = {}
          }
          deltaX = deltaY = 0

      })
      // when the browser window loses focus,
      // for example when a modal dialog is shown,
      // cancel all ongoing events
      .on('touchcancel MSPointerCancel pointercancel', cancelAll)

    // scrolling the window indicates intention of the user
    // to scroll, not tap or swipe, so cancel all ongoing events
    $(window).on('scroll', cancelAll)
  })

  ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown',
    'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(eventName){
    $.fn[eventName] = function(callback){ return this.on(eventName, callback) }
  })
})(Zepto)

//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function(){
  // getComputedStyle shouldn't freak out when called
  // without a valid element as argument
  try {
    getComputedStyle(undefined)
  } catch(e) {
    var nativeGetComputedStyle = getComputedStyle;
    window.getComputedStyle = function(element){
      try {
        return nativeGetComputedStyle(element)
      } catch(e) {
        return null
      }
    }
  }
})()

//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  $.fn.serializeArray = function() {
    var name, type, result = [],
      add = function(value) {
        if (value.forEach) return value.forEach(add)
        result.push({ name: name, value: value })
      }
    if (this[0]) $.each(this[0].elements, function(_, field){
      type = field.type, name = field.name
      if (name && field.nodeName.toLowerCase() != 'fieldset' &&
        !field.disabled && type != 'submit' && type != 'reset' && type != 'button' && type != 'file' &&
        ((type != 'radio' && type != 'checkbox') || field.checked))
          add($(field).val())
    })
    return result
  }

  $.fn.serialize = function(){
    var result = []
    this.serializeArray().forEach(function(elm){
      result.push(encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value))
    })
    return result.join('&')
  }

  $.fn.submit = function(callback) {
    if (0 in arguments) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.isDefaultPrevented()) this.get(0).submit()
    }
    return this
  }

})(Zepto)

//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.
//     ajax

;(function($){
  var jsonpID = 0,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/,
      originAnchor = document.createElement('a')

  originAnchor.href = window.location.href

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.isDefaultPrevented()
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings, deferred) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    if (deferred) deferred.resolveWith(context, [data, status, xhr])
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings, deferred) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    if (deferred) deferred.rejectWith(context, [xhr, type, error])
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error || type])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options, deferred){
    if (!('type' in options)) return $.ajax(options)

    var _callbackName = options.jsonpCallback,
      callbackName = ($.isFunction(_callbackName) ?
        _callbackName() : _callbackName) || ('jsonp' + (++jsonpID)),
      script = document.createElement('script'),
      originalCallback = window[callbackName],
      responseData,
      abort = function(errorType) {
        $(script).triggerHandler('error', errorType || 'abort')
      },
      xhr = { abort: abort }, abortTimeout

    if (deferred) deferred.promise(xhr)

    $(script).on('load error', function(e, errorType){
      clearTimeout(abortTimeout)
      $(script).off().remove()

      if (e.type == 'error' || !responseData) {
        ajaxError(null, errorType || 'error', xhr, options, deferred)
      } else {
        ajaxSuccess(responseData[0], xhr, options, deferred)
      }

      window[callbackName] = originalCallback
      if (responseData && $.isFunction(originalCallback))
        originalCallback(responseData[0])

      originalCallback = responseData = undefined
    })

    if (ajaxBeforeSend(xhr, options) === false) {
      abort('abort')
      return xhr
    }

    window[callbackName] = function(){
      responseData = arguments
    }

    script.src = options.url.replace(/\?(.+)=\?/, '?$1=' + callbackName)
    document.head.appendChild(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
      abort('timeout')
    }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    // IIS returns Javascript as "application/x-javascript"
    accepts: {
      script: 'text/javascript, application/javascript, application/x-javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0,
    // Whether data should be serialized to string
    processData: true,
    // Whether the browser should be allowed to cache GET responses
    cache: true
  }

  function mimeToDataType(mime) {
    if (mime) mime = mime.split(';', 2)[0]
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    if (query == '') return url
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (options.processData && options.data && $.type(options.data) != "string")
      options.data = $.param(options.data, options.traditional)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data), options.data = undefined
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {}),
        deferred = $.Deferred && $.Deferred(),
        urlAnchor, hashIndex
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) {
      urlAnchor = document.createElement('a')
      urlAnchor.href = settings.url
      // cleans up URL for .href (IE only), see https://github.com/madrobby/zepto/pull/1049
      urlAnchor.href = urlAnchor.href
      settings.crossDomain = (originAnchor.protocol + '//' + originAnchor.host) !== (urlAnchor.protocol + '//' + urlAnchor.host)
    }

    if (!settings.url) settings.url = window.location.toString()
    if ((hashIndex = settings.url.indexOf('#')) > -1) settings.url = settings.url.slice(0, hashIndex)
    serializeData(settings)

    var dataType = settings.dataType, hasPlaceholder = /\?.+=\?/.test(settings.url)
    if (hasPlaceholder) dataType = 'jsonp'

    if (settings.cache === false || (
         (!options || options.cache !== true) &&
         ('script' == dataType || 'jsonp' == dataType)
        ))
      settings.url = appendQuery(settings.url, '_=' + Date.now())

    if ('jsonp' == dataType) {
      if (!hasPlaceholder)
        settings.url = appendQuery(settings.url,
          settings.jsonp ? (settings.jsonp + '=?') : settings.jsonp === false ? '' : 'callback=?')
      return $.ajaxJSONP(settings, deferred)
    }

    var mime = settings.accepts[dataType],
        headers = { },
        setHeader = function(name, value) { headers[name.toLowerCase()] = [name, value] },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = settings.xhr(),
        nativeSetHeader = xhr.setRequestHeader,
        abortTimeout

    if (deferred) deferred.promise(xhr)

    if (!settings.crossDomain) setHeader('X-Requested-With', 'XMLHttpRequest')
    setHeader('Accept', mime || '*/*')
    if (mime = settings.mimeType || mime) {
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
      setHeader('Content-Type', settings.contentType || 'application/x-www-form-urlencoded')

    if (settings.headers) for (name in settings.headers) setHeader(name, settings.headers[name])
    xhr.setRequestHeader = setHeader

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        xhr.onreadystatechange = empty
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(settings.mimeType || xhr.getResponseHeader('content-type'))

          if (xhr.responseType == 'arraybuffer' || xhr.responseType == 'blob')
            result = xhr.response
          else {
            result = xhr.responseText

            try {
              // http://perfectionkills.com/global-eval-what-are-the-options/
              if (dataType == 'script')    (1,eval)(result)
              else if (dataType == 'xml')  result = xhr.responseXML
              else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
            } catch (e) { error = e }

            if (error) return ajaxError(error, 'parsererror', xhr, settings, deferred)
          }

          ajaxSuccess(result, xhr, settings, deferred)
        } else {
          ajaxError(xhr.statusText || null, xhr.status ? 'error' : 'abort', xhr, settings, deferred)
        }
      }
    }

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      ajaxError(null, 'abort', xhr, settings, deferred)
      return xhr
    }

    if (settings.xhrFields) for (name in settings.xhrFields) xhr[name] = settings.xhrFields[name]

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async, settings.username, settings.password)

    for (name in headers) nativeSetHeader.apply(xhr, headers[name])

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings, deferred)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  // handle optional data/success arguments
  function parseArguments(url, data, success, dataType) {
    if ($.isFunction(data)) dataType = success, success = data, data = undefined
    if (!$.isFunction(success)) dataType = success, success = undefined
    return {
      url: url
    , data: data
    , success: success
    , dataType: dataType
    }
  }

  $.get = function(/* url, data, success, dataType */){
    return $.ajax(parseArguments.apply(null, arguments))
  }

  $.post = function(/* url, data, success, dataType */){
    var options = parseArguments.apply(null, arguments)
    options.type = 'POST'
    return $.ajax(options)
  }

  $.getJSON = function(/* url, data, success */){
    var options = parseArguments.apply(null, arguments)
    options.dataType = 'json'
    return $.ajax(options)
  }

  $.fn.load = function(url, data, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector,
        options = parseArguments(url, data, success),
        callback = options.success
    if (parts.length > 1) options.url = parts[0], selector = parts[1]
    options.success = function(response){
      self.html(selector ?
        $('<div>').html(response.replace(rscript, "")).find(selector)
        : response)
      callback && callback.apply(self, arguments)
    }
    $.ajax(options)
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var type, array = $.isArray(obj), hash = $.isPlainObject(obj)
    $.each(obj, function(key, value) {
      type = $.type(value)
      if (scope) key = traditional ? scope :
        scope + '[' + (hash || type == 'object' || type == 'array' ? key : '') + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (type == "array" || (!traditional && type == "object"))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(key, value) {
      if ($.isFunction(value)) value = value()
      if (value == null) value = ""
      this.push(escape(key) + '=' + escape(value))
    }
    serialize(params, obj, traditional)
    return params.join('&').replace(/%20/g, '+')
  }
})(Zepto)

//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($, undefined){
  var prefix = '', eventPrefix,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o' },
    testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    transform,
    transitionProperty, transitionDuration, transitionTiming, transitionDelay,
    animationName, animationDuration, animationTiming, animationDelay,
    cssReset = {}

  function dasherize(str) { return str.replace(/([a-z])([A-Z])/, '$1-$2').toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : name.toLowerCase() }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + vendor.toLowerCase() + '-'
      eventPrefix = event
      return false
    }
  })

  transform = prefix + 'transform'
  cssReset[transitionProperty = prefix + 'transition-property'] =
  cssReset[transitionDuration = prefix + 'transition-duration'] =
  cssReset[transitionDelay    = prefix + 'transition-delay'] =
  cssReset[transitionTiming   = prefix + 'transition-timing-function'] =
  cssReset[animationName      = prefix + 'animation-name'] =
  cssReset[animationDuration  = prefix + 'animation-duration'] =
  cssReset[animationDelay     = prefix + 'animation-delay'] =
  cssReset[animationTiming    = prefix + 'animation-timing-function'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    speeds: { _default: 400, fast: 200, slow: 600 },
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback, delay){
    if ($.isFunction(duration))
      callback = duration, ease = undefined, duration = undefined
    if ($.isFunction(ease))
      callback = ease, ease = undefined
    if ($.isPlainObject(duration))
      ease = duration.easing, callback = duration.complete, delay = duration.delay, duration = duration.duration
    if (duration) duration = (typeof duration == 'number' ? duration :
                    ($.fx.speeds[duration] || $.fx.speeds._default)) / 1000
    if (delay) delay = parseFloat(delay) / 1000
    return this.anim(properties, duration, ease, callback, delay)
  }

  $.fn.anim = function(properties, duration, ease, callback, delay){
    var key, cssValues = {}, cssProperties, transforms = '',
        that = this, wrappedCallback, endEvent = $.fx.transitionEnd,
        fired = false

    if (duration === undefined) duration = $.fx.speeds._default / 1000
    if (delay === undefined) delay = 0
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssValues[animationName] = properties
      cssValues[animationDuration] = duration + 's'
      cssValues[animationDelay] = delay + 's'
      cssValues[animationTiming] = (ease || 'linear')
      endEvent = $.fx.animationEnd
    } else {
      cssProperties = []
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) transforms += key + '(' + properties[key] + ') '
        else cssValues[key] = properties[key], cssProperties.push(dasherize(key))

      if (transforms) cssValues[transform] = transforms, cssProperties.push(transform)
      if (duration > 0 && typeof properties === 'object') {
        cssValues[transitionProperty] = cssProperties.join(', ')
        cssValues[transitionDuration] = duration + 's'
        cssValues[transitionDelay] = delay + 's'
        cssValues[transitionTiming] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, wrappedCallback)
      } else
        $(this).unbind(endEvent, wrappedCallback) // triggered by setTimeout

      fired = true
      $(this).css(cssReset)
      callback && callback.call(this)
    }
    if (duration > 0){
      this.bind(endEvent, wrappedCallback)
      // transitionEnd is not always firing on older Android phones
      // so make sure it gets fired
      setTimeout(function(){
        if (fired) return
        wrappedCallback.call(that)
      }, ((duration + delay) * 1000) + 25)
    }

    // trigger page reflow so new elements can animate
    this.size() && this.get(0).clientLeft

    this.css(cssValues)

    if (duration <= 0) setTimeout(function() {
      that.each(function(){ wrappedCallback.call(this) })
    }, 0)

    return this
  }

  testEl = null
})(Zepto)

;(function() {
/**
 * @file   iSlider, a simple, efficent mobile slider solution
 *
 * @author BEFE
 * Contact qbaty.qi@gmail.com
 *
 * LICENSE
 * https://github.com/BE-FE/iSlider/blob/master/LICENSE
 */
/**
 * @constructor
 * @param {Object}      opts                参数集
 * @param {Element}     opts.dom            外层元素        Outer wrapper
 * @param {Object}      opts.data           数据列表        Content data
 */
var iSlider, islider_core, plugins_islider_animate, plugins_islider_zoom, plugins_islider_button, plugins_islider_dot;
iSlider = function () {
  
  var iSlider = function (opts) {
    if (!opts.dom) {
      throw new Error('dom element can not be empty!');
    }
    if (!opts.data || !opts.data.length) {
      throw new Error('data must be an array and must have more than one element!');
    }
    this._opts = opts;
    this._setting();
    this._renderHTML();
    this._bindHandler();
  };
  // setting parameters for slider
  iSlider.prototype._setting = function () {
    var opts = this._opts;
    // dom element wrapping content
    this.wrap = opts.dom;
    // your data
    this.data = opts.data;
    // default type
    this.type = opts.type || 'pic';
    // default slide direction
    this.isVertical = opts.isVertical || false;
    // Overspread mode
    this.isOverspread = opts.isOverspread || false;
    // Play time gap
    this.duration = opts.duration || 2000;
    // start from initIndex or 0
    this.initIndex = opts.initIndex || 0;
    // touchstart prevent default to fixPage
    this.fixPage = opts.fixPage || true;
    if (this.initIndex > this.data.length - 1 || this.initIndex < 0) {
      this.initIndex = 0;
    }
    this.slideIndex = this.slideIndex || this.initIndex || 0;
    this.axis = this.isVertical ? 'Y' : 'X';
    this.reverseAxis = this.axis === 'Y' ? 'X' : 'Y';
    this.width = this.wrap.clientWidth;
    this.height = this.wrap.clientHeight;
    this.ratio = this.height / this.width;
    this.scale = opts.isVertical ? this.height : this.width;
    // Callback function when your finger is moving
    this.onslide = opts.onslide;
    // Callback function when your finger touch the screen
    this.onslidestart = opts.onslidestart;
    // Callback function when the finger move out of the screen
    this.onslideend = opts.onslideend;
    // Callback function when the finger move out of the screen
    this.onslidechange = opts.onslidechange;
    this.isLoading = opts.isLoading;
    this.offset = this.offset || {
      X: 0,
      Y: 0
    };
    this.useZoom = opts.useZoom || false;
    // looping logic adjust
    if (this.data.length < 2) {
      this.isLooping = false;
      this.isAutoPlay = false;
    } else {
      this.isLooping = opts.isLooping || false;
      this.isAutoplay = opts.isAutoplay || false;
    }
    // little trick set, when you chooce tear & vertical same time
    // iSlider overspread mode will be set true autometicly
    if (opts.animateType === 'card' && this.isVertical) {
      this.isOverspread = true;
    }
    // Autoplay mode
    if (this.isAutoplay) {
      this.play();
    }
    if (this.useZoom) {
      this._initZoom(opts);
    }
    // debug mode
    this.log = opts.isDebug ? function (str) {
      window.console.log(str);
    } : function () {
    };
    // set Damping function
    this._setUpDamping();
    // stop autoplay when window blur
    this._setPlayWhenFocus();
    // set animate Function
    this._animateFunc = opts.animateType in this._animateFuncs ? this._animateFuncs[opts.animateType] : this._animateFuncs['default'];
  };
  // fixed bug for android device
  iSlider.prototype._setPlayWhenFocus = function () {
    window.addEventListener('focus', this, false);
    window.addEventListener('blur', this, false);
  };
  /**
   * animation parmas:
   *
   * @param {Element}      dom             图片的外层<li>容器       Img wrapper
   * @param {String}       axis            动画方向                animate direction
   * @param {Number}       scale           容器宽度                Outer wrapper
   * @param {Number}       i               <li>容器index          Img wrapper's index
   * @param {Number}       offset          滑动距离                move distance
   */
  iSlider.prototype._animateFuncs = {
    'default': function (dom, axis, scale, i, offset) {
      dom.style.webkitTransform = 'translateZ(0) translate' + axis + '(' + (offset + scale * (i - 1)) + 'px)';
    }
  };
  /**
   *  enable damping when slider meet the edge
   */
  iSlider.prototype._setUpDamping = function () {
    var oneIn2 = this.scale >> 1;
    var oneIn4 = oneIn2 >> 1;
    var oneIn16 = oneIn4 >> 2;
    this._damping = function (distance) {
      var dis = Math.abs(distance);
      var result;
      if (dis < oneIn2) {
        result = dis >> 1;
      } else if (dis < oneIn2 + oneIn4) {
        result = oneIn4 + (dis - oneIn2 >> 2);
      } else {
        result = oneIn4 + oneIn16 + (dis - oneIn2 - oneIn4 >> 3);
      }
      return distance > 0 ? result : -result;
    };
  };
  /**
   * render single item html by idx
   * @param {element} el ..
   * @param {number}  i  ..
   */
  iSlider.prototype._renderItem = function (el, i) {
    var item;
    var html;
    var len = this.data.length;
    var self = this;
    var insertImg = function () {
      if(item.content=="../assest/res/banner/1.png"){
        html = item.height / item.width > self.ratio ? '<img height="' + self.height + '" src="' + item.content + '">' : '<a href="http://www.baidu.com">' + '<img width="' + self.width + '" src="' + item.content + '">' + '</a>';
        el.innerHTML = html;
      }else {
        html = item.height / item.width > self.ratio ? '<img height="' + self.height + '" src="' + item.content + '">' : '<img width="' + self.width + '" src="' + item.content + '">';
        el.innerHTML = html;
      }
    };
    // get the right item of data
    if (!this.isLooping) {
      item = this.data[i] || { empty: true };
    } else {
      if (i < 0) {
        item = this.data[len + i];
      } else if (i > len - 1) {
        item = this.data[i - len];
      } else {
        item = this.data[i];
      }
    }
    if (item.empty) {
      el.innerHTML = '';
      el.style.background = '';
      return;
    }
    if (this.type === 'pic') {
      if (!this.isOverspread) {
        if (item.height & item.width) {
          insertImg();
        } else {
          var currentImg = new Image();
          currentImg.src = item.content;
          currentImg.onload = function () {
            item.height = currentImg.height;
            item.width = currentImg.width;
            insertImg();
          };
        }
      } else {
        el.style.background = 'url(' + item.content + ') 50% 50% no-repeat';
        el.style.backgroundSize = 'cover';
      }
    } else if (this.type === 'dom') {
      el.innerHTML = item.content;
    }
  };
  /**
   * render list html
   */
  iSlider.prototype._renderHTML = function () {
    this.outer && (this.outer.innerHTML = '');
    // initail ul element
    var outer = this.outer || document.createElement('ul');
    outer.className = 'islider-outer';
    outer.style.cssText = 'height:' + this.height + 'px;width:' + this.width + 'px;margin:0;padding:0;list-style:none;';
    //loading
    if (this.type === 'pic' && !this.loader && this.isLoading) {
      var loader = document.createElement('div');
      loader.className = 'islider-loader';
      this.loader = loader;
      this.wrap.appendChild(loader);
    }
    // storage li elements, only store 3 elements to reduce memory usage
    this.els = [];
    for (var i = 0; i < 3; i++) {
      var li = document.createElement('li');
      li.className = this.type === 'dom' ? 'islider-dom' : 'islider-pic';
      li.style.cssText = 'height:' + this.height + 'px;width:' + this.width + 'px;';
      this.els.push(li);
      // prepare style animation
      this._animateFunc(li, this.axis, this.scale, i, 0);
      if (this.isVertical && (this._opts.animateType === 'rotate' || this._opts.animateType === 'flip')) {
        this._renderItem(li, 1 - i + this.slideIndex);
      } else {
        this._renderItem(li, i - 1 + this.slideIndex);
      }
      outer.appendChild(li);
    }
    this._initLoadImg();
    // append ul to div#canvas
    if (!this.outer) {
      this.outer = outer;
      this.wrap.appendChild(outer);
    }
  };
  /**
   *  preload img when slideChange
   *  @param {number} dataIndex means which image will be load
   */
  iSlider.prototype._preloadImg = function (dataIndex) {
    var len = this.data.length;
    var idx = dataIndex;
    var self = this;
    var loadImg = function (index) {
      if (index > -1 && !self.data[index].loaded) {
        var preloadImg = new Image();
        preloadImg.src = self.data[index].content;
        preloadImg.onload = function () {
          self.data[index].width = preloadImg.width;
          self.data[index].height = preloadImg.height;
        };
        self.data[index].loaded = 1;
      }
    };
    if (self.type !== 'dom') {
      var nextIndex = idx + 2 > len - 1 ? (idx + 2) % len : idx + 2;
      var prevIndex = idx - 2 < 0 ? len - 2 + idx : idx - 2;
      loadImg(nextIndex);
      loadImg(prevIndex);
    }
  };
  /**
   *  load extra imgs when renderHTML
   */
  iSlider.prototype._initLoadImg = function () {
    var data = this.data;
    var len = data.length;
    var idx = this.initIndex;
    var self = this;
    if (this.type !== 'dom' && len > 3) {
      var nextIndex = idx + 2 > len ? (idx + 1) % len : idx + 1;
      var prevIndex = idx - 1 < 0 ? len - 1 + idx : idx - 1;
      data[idx].loaded = 1;


      data[nextIndex].loaded = 1;
      if (self.isLooping) {
        data[prevIndex].loaded = 1;
      }
      setTimeout(function () {
        self._preloadImg(idx);
      }, 200);
    }
  };
  /**
   *  slide logical, goto data index
   *  @param {number} dataIndex the goto index
   */
  iSlider.prototype.slideTo = function (dataIndex) {
    var data = this.data;
    var els = this.els;
    var idx = dataIndex;
    var n = dataIndex - this.slideIndex;
    if (Math.abs(n) > 1) {
      var nextEls = n > 0 ? this.els[2] : this.els[0];
      this._renderItem(nextEls, idx);
    }
    // preload when slide
    this._preloadImg(idx);
    // get right item of data
    if (data[idx]) {
      this.slideIndex = idx;
    } else {
      if (this.isLooping) {
        this.slideIndex = n > 0 ? 0 : data.length - 1;
      } else {
        this.slideIndex = this.slideIndex;
        n = 0;
      }
    }
    this.log('pic idx:' + this.slideIndex);
    // keep the right order of items
    var sEle;
    if (this.isVertical && (this._opts.animateType === 'rotate' || this._opts.animateType === 'flip')) {
      if (n > 0) {
        sEle = els.pop();
        els.unshift(sEle);
      } else if (n < 0) {
        sEle = els.shift();
        els.push(sEle);
      }
    } else {
      if (n > 0) {
        sEle = els.shift();
        els.push(sEle);
      } else if (n < 0) {
        sEle = els.pop();
        els.unshift(sEle);
      }
    }
    // slidechange should render new item
    // and change new item style to fit animation
    if (n !== 0) {
      if (Math.abs(n) > 1) {
        this._renderItem(els[0], idx - 1);
        this._renderItem(els[2], idx + 1);
      } else if (Math.abs(n) === 1) {
        this._renderItem(sEle, idx + n);
      }
      sEle.style.webkitTransition = 'none';
      sEle.style.visibility = 'hidden';
      setTimeout(function () {
        sEle.style.visibility = 'visible';
      }, 200);
      this.onslidechange && this.onslidechange(this.slideIndex);
      this.dotchange && this.dotchange();
    }
    // do the trick animation
    for (var i = 0; i < 3; i++) {
      if (els[i] !== sEle) {
        els[i].style.webkitTransition = 'all .3s ease';
      }
      this._animateFunc(els[i], this.axis, this.scale, i, 0);
    }
    // stop playing when meet the end of data
    if (this.isAutoplay && !this.isLooping && this.slideIndex === data.length - 1) {
      this.pause();
    }
  };
  /**
   *  judge the device
   *  @return {Object} {}
   */
  iSlider.prototype._device = function () {
    var hasTouch = !!('ontouchstart' in window || window.DocumentTouch && document instanceof window.DocumentTouch);
    var startEvt = hasTouch ? 'touchstart' : 'mousedown';
    var moveEvt = hasTouch ? 'touchmove' : 'mousemove';
    var endEvt = hasTouch ? 'touchend' : 'mouseup';
    return {
      hasTouch: hasTouch,
      startEvt: startEvt,
      moveEvt: moveEvt,
      endEvt: endEvt
    };
  };
  /**
  * bind all event handler, when on PC, disable drag event。
  */
  iSlider.prototype._bindHandler = function () {
    var outer = this.outer;
    var device = this._device();
    if (!device.hasTouch) {
      outer.style.cursor = 'pointer';
      outer.ondragstart = function (evt) {
        if (evt) {
          return false;
        }
        return true;
      };
    }
    outer.addEventListener(device.startEvt, this);
    outer.addEventListener(device.moveEvt, this);
    outer.addEventListener(device.endEvt, this);
    window.addEventListener('orientationchange', this);
  };
  /**
  *  simple event delegate method
  *  @param {string}   evtType   event name
  *  @param {string}   selector  the simple css selector like jQuery
  *  @param {Function} callback  event callback
  */
  iSlider.prototype.bind = iSlider.prototype.delegate = function (evtType, selector, callback) {
    function handle(e) {
      var evt = window.event ? window.event : e;
      var target = evt.target;
      var eleArr = document.querySelectorAll(selector);
      for (var i = 0; i < eleArr.length; i++) {
        if (target === eleArr[i]) {
          callback.call(target);
          break;
        }
      }
    }
    this.wrap.addEventListener(evtType, handle, false);
  };
  /**
   *  removeEventListener to release the memory
   */
  iSlider.prototype.destroy = function () {
    var outer = this.outer;
    var device = this._device();
    outer.removeEventListener(device.startEvt, this);
    outer.removeEventListener(device.moveEvt, this);
    outer.removeEventListener(device.endEvt, this);
    window.removeEventListener('orientationchange', this);
    window.removeEventListener('focus', this);
    window.removeEventListener('blur', this);
    this.wrap.innerHTML = '';
  };
  /**
   *  uniformity admin event
   *  @param {Object}   evt   event obj
   */
  iSlider.prototype.handleEvent = function (evt) {
    var device = this._device();
    switch (evt.type) {
    case device.startEvt:
      this.startHandler(evt);
      break;
    case device.moveEvt:
      this.moveHandler(evt);
      break;
    case device.endEvt:
      this.endHandler(evt);
      break;
    case 'touchcancel':
      this.endHandler(evt);
      break;
    case 'orientationchange':
      this.orientationchangeHandler();
      break;
    case 'focus':
      this.isAutoplay && this.play();
      break;
    case 'blur':
      this.pause();
      break;
    }
  };
  /**
  *  touchstart callback
  *  @param {Object}   evt   event obj
  */
  iSlider.prototype.startHandler = function (evt) {
    if (this.fixPage) {
      var target = evt.target;
      if (target.tagName !== 'SELECT' && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        evt.preventDefault();
      }
    }
    var device = this._device();
    this.isMoving = true;
    this.pause();
    this.onslidestart && this.onslidestart();
    this.log('Event: beforeslide');
    this.startTime = new Date().getTime();
    this.startX = device.hasTouch ? evt.targetTouches[0].pageX : evt.pageX;
    this.startY = device.hasTouch ? evt.targetTouches[0].pageY : evt.pageY;
    this._startHandler && this._startHandler(evt);
  };
  /**
  *  touchmove callback
  *  @param {Object}   evt   event obj
  */
  iSlider.prototype.moveHandler = function (evt) {
    if (this.isMoving) {
      var device = this._device();
      var len = this.data.length;
      var axis = this.axis;
      var reverseAxis = this.reverseAxis;
      var offset = {
        X: device.hasTouch ? evt.targetTouches[0].pageX - this.startX : evt.pageX - this.startX,
        Y: device.hasTouch ? evt.targetTouches[0].pageY - this.startY : evt.pageY - this.startY
      };
      var res = this._moveHandler ? this._moveHandler(evt) : false;
      if (!res && Math.abs(offset[axis]) - Math.abs(offset[reverseAxis]) > 10) {
        evt.preventDefault();
        this.onslide && this.onslide(offset[axis]);
        this.log('Event: onslide');
        if (!this.isLooping) {
          if (offset[axis] > 0 && this.slideIndex === 0 || offset[axis] < 0 && this.slideIndex === len - 1) {
            offset[axis] = this._damping(offset[axis]);
          }
        }
        for (var i = 0; i < 3; i++) {
          var item = this.els[i];
          item.style.webkitTransition = 'all 0s';
          this._animateFunc(item, axis, this.scale, i, offset[axis]);
        }
      }
      this.offset = offset;
    }
  };
  /**
  *  touchend callback
  *  @param {Object}   evt   event obj
  */
  iSlider.prototype.endHandler = function (evt) {
    this.isMoving = false;
    var offset = this.offset;
    var axis = this.axis;
    var boundary = this.scale / 2;
    var endTime = new Date().getTime();
    // a quick slide time must under 300ms
    // a quick slide should also slide at least 14 px
    boundary = endTime - this.startTime > 300 ? boundary : 14;
    var res = this._endHandler ? this._endHandler(evt) : false;
    var absOffset = Math.abs(offset[axis]);
    var absReverseOffset = Math.abs(offset[this.reverseAxis]);
    var getLink = function (el) {
      if (el.tagName === 'A') {
        if (el.href) {
          window.location.href = el.href;
          return false;
        }
      } else if (el.className === 'islider-dom') {
        return false;
      } else {
        getLink(el.parentNode);
      }
    };
    if (!res && offset[axis] >= boundary && absReverseOffset < absOffset) {
      this.slideTo(this.slideIndex - 1);
    } else if (!res && offset[axis] < -boundary && absReverseOffset < absOffset) {
      this.slideTo(this.slideIndex + 1);
    } else if (!res) {
      this.slideTo(this.slideIndex);
    }
    // create tap event if offset < 10
    if (Math.abs(this.offset.X) < 10 && Math.abs(this.offset.Y) < 10) {
      this.tapEvt = document.createEvent('Event');
      this.tapEvt.initEvent('tap', true, true);
      if (this.fixPage && this.type === 'dom') {
        getLink(evt.target);
      }
      if (!evt.target.dispatchEvent(this.tapEvt)) {
        evt.preventDefault();
      }
    }
    this.offset.X = this.offset.Y = 0;
    this.isAutoplay && this.play();
    this.onslideend && this.onslideend(this.slideIndex);
    this.log('Event: afterslide');
  };
  /**
  *  orientationchange callback
  */
  iSlider.prototype.orientationchangeHandler = function () {
    setTimeout(function () {
      this.reset();
      this.log('Event: orientationchange');
    }, 100);
  };
  /**
  * reset & rerender
  */
  iSlider.prototype.reset = function () {
    this.pause();
    this._setting();
    this._renderHTML();
    this.isAutoplay && this.play();
  };
  /**
  * enable autoplay
  */
  iSlider.prototype.play = function () {
    var self = this;
    var duration = this.duration;
    clearInterval(this.autoPlayTimer);
    this.autoPlayTimer = setInterval(function () {
      self.slideTo(self.slideIndex + 1);
    }, duration);
  };
  /**
  * pause autoplay
  */
  iSlider.prototype.pause = function () {
    clearInterval(this.autoPlayTimer);
  };
  /**
  * plugin extend
  * @param {Object} plugin need to be set up
  * @param {Object} main iSlider prototype
  */
  iSlider.prototype.extend = function (plugin, main) {
    if (!main) {
      main = iSlider.prototype;
    }
    Object.keys(plugin).forEach(function (property) {
      Object.defineProperty(main, property, Object.getOwnPropertyDescriptor(plugin, property));
    });
  };
  return iSlider;
}();
islider_core = undefined;
plugins_islider_animate = function (iSlider) {
  var extendAnimation = {
    'rotate': function (dom, axis, scale, i, offset) {
      var rotateDirect = axis === 'X' ? 'Y' : 'X';
      var absoluteOffset = Math.abs(offset);
      var bdColor = window.getComputedStyle(this.wrap.parentNode, null).backgroundColor;
      if (this.isVertical) {
        offset = -offset;
      }
      this.wrap.style.webkitPerspective = scale * 4;
      if (i === 1) {
        dom.style.zIndex = scale - absoluteOffset;
      } else {
        dom.style.zIndex = offset > 0 ? (1 - i) * absoluteOffset : (i - 1) * absoluteOffset;
      }
      dom.style.cssText += '-webkit-backface-visibility:hidden; -webkit-transform-style:preserve-3d; ' + 'background-color:' + bdColor + '; position:absolute;';
      dom.style.webkitTransform = 'rotate' + rotateDirect + '(' + 90 * (offset / scale + i - 1) + 'deg) translateZ(' + 0.888 * scale / 2 + 'px) scale(0.888)';
    },
    'flip': function (dom, axis, scale, i, offset) {
      var rotateDirect = axis === 'X' ? 'Y' : 'X';
      var bdColor = window.getComputedStyle(this.wrap.parentNode, null).backgroundColor;
      if (this.isVertical) {
        offset = -offset;
      }
      this.wrap.style.webkitPerspective = scale * 4;
      if (offset > 0) {
        dom.style.visibility = i > 1 ? 'hidden' : 'visible';
      } else {
        dom.style.visibility = i < 1 ? 'hidden' : 'visible';
      }
      dom.style.cssText += 'position:absolute; -webkit-backface-visibility:hidden; background-color:' + bdColor + ';';
      dom.style.webkitTransform = 'translateZ(' + scale / 2 + 'px) rotate' + rotateDirect + '(' + 180 * (offset / scale + i - 1) + 'deg) scale(0.875)';
    },
    'depth': function (dom, axis, scale, i, offset) {
      var zoomScale = (4 - Math.abs(i - 1)) * 0.18;
      this.wrap.style.webkitPerspective = scale * 4;
      dom.style.zIndex = i === 1 ? 100 : offset > 0 ? 1 - i : i - 1;
      dom.style.webkitTransform = 'scale(' + zoomScale + ', ' + zoomScale + ') translateZ(0) translate' + axis + '(' + (offset + 1.3 * scale * (i - 1)) + 'px)';
    },
    'flow': function (dom, axis, scale, i, offset) {
      var absoluteOffset = Math.abs(offset);
      var rotateDirect = axis === 'X' ? 'Y' : 'X';
      var directAmend = axis === 'X' ? 1 : -1;
      var offsetRatio = Math.abs(offset / scale);
      this.wrap.style.webkitPerspective = scale * 4;
      if (i === 1) {
        dom.style.zIndex = scale - absoluteOffset;
      } else {
        dom.style.zIndex = offset > 0 ? (1 - i) * absoluteOffset : (i - 1) * absoluteOffset;
      }
      dom.style.webkitTransform = 'scale(0.7, 0.7) translateZ(' + (offsetRatio * 150 - 150) * Math.abs(i - 1) + 'px)' + 'translate' + axis + '(' + (offset + scale * (i - 1)) + 'px)' + 'rotate' + rotateDirect + '(' + directAmend * (30 - offsetRatio * 30) * (1 - i) + 'deg)';
    },
    'card': function (dom, axis, scale, i, offset) {
      var absoluteOffset = Math.abs(offset);
      if (i === 1) {
        dom.style.zIndex = scale - absoluteOffset;
        dom.cur = 1;
      } else {
        dom.style.zIndex = offset > 0 ? (1 - i) * absoluteOffset * 1000 : (i - 1) * absoluteOffset * 1000;
      }
      if (dom.cur && dom.cur !== i) {
        setTimeout(function () {
          dom.cur = null;
        }, 300);
      }
      var zoomScale = dom.cur ? 1 - 0.2 * Math.abs(i - 1) - Math.abs(0.2 * offset / scale).toFixed(6) : 1;
      dom.style.webkitTransform = 'scale(' + zoomScale + ', ' + zoomScale + ') translateZ(0) translate' + axis + '(' + ((1 + Math.abs(i - 1) * 0.2) * offset + scale * (i - 1)) + 'px)';
    }
  };
  iSlider.prototype.extend(extendAnimation, iSlider.prototype._animateFuncs);
}(iSlider);
plugins_islider_zoom = function (iSlider) {
  var has3d = 'WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix();
  var minScale = 1 / 2;
  var viewScope = {};
  function generateTranslate(x, y, z, scale) {
    return 'translate' + (has3d ? '3d(' : '(') + x + 'px,' + y + (has3d ? 'px,' + z + 'px)' : 'px)') + 'scale(' + scale + ')';
  }
  function getDistance(a, b) {
    var x, y;
    x = a.left - b.left;
    y = a.top - b.top;
    return Math.sqrt(x * x + y * y);
  }
  function generateTransformOrigin(x, y) {
    return x + 'px ' + y + 'px';
  }
  function getTouches(touches) {
    return Array.prototype.slice.call(touches).map(function (touch) {
      return {
        left: touch.pageX,
        top: touch.pageY
      };
    });
  }
  function calculateScale(start, end) {
    var startDistance = getDistance(start[0], start[1]);
    var endDistance = getDistance(end[0], end[1]);
    return endDistance / startDistance;
  }
  function getComputedTranslate(obj) {
    var result = {
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0
    };
    var offsetX = 0, offsetY = 0;
    if (!window.getComputedStyle || !obj)
      return result;
    var style = window.getComputedStyle(obj), transform, origin;
    transform = style.webkitTransform || style.mozTransform;
    origin = style.webkitTransformOrigin || style.mozTransformOrigin;
    var par = origin.match(/(.*)px\s+(.*)px/);
    if (par.length > 1) {
      offsetX = par[1] - 0;
      offsetY = par[2] - 0;
    }
    if (transform == 'none')
      return result;
    var mat3d = transform.match(/^matrix3d\((.+)\)$/);
    var mat2d = transform.match(/^matrix\((.+)\)$/);
    if (mat3d) {
      var str = mat3d[1].split(', ');
      result = {
        translateX: str[12] - 0,
        translateY: str[13] - 0,
        translateZ: str[14] - 0,
        offsetX: offsetX - 0,
        offsetY: offsetY - 0,
        scaleX: str[0] - 0,
        scaleY: str[5] - 0,
        scaleZ: str[10] - 0
      };
    } else if (mat2d) {
      var str = mat2d[1].split(', ');
      result = {
        translateX: str[4] - 0,
        translateY: str[5] - 0,
        offsetX: offsetX - 0,
        offsetY: offsetY - 0,
        scaleX: str[0] - 0,
        scaleY: str[3] - 0
      };
    }
    return result;
  }
  function getCenter(a, b) {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };
  }
  //初始化缩放参数等
  function initZoom(opts) {
    this.currentScale = 1;
    this.zoomFactor = opts.zoomFactor || 2;
  }
  function startHandler(evt) {
    if (this.useZoom) {
      var node = this.els[1].querySelector('img');
      var transform = getComputedTranslate(node);
      this.startTouches = getTouches(evt.targetTouches);
      this._startX = transform.translateX - 0;
      this._startY = transform.translateY - 0;
      this.currentScale = transform.scaleX;
      this.zoomNode = node;
      var pos = getPosition(node);
      if (evt.targetTouches.length == 2) {
        console.log('gesture');
        this.lastTouchStart = null;
        var touches = evt.touches;
        var touchCenter = getCenter({
          x: touches[0].pageX,
          y: touches[0].pageY
        }, {
          x: touches[1].pageX,
          y: touches[1].pageY
        });
        node.style.webkitTransformOrigin = generateTransformOrigin(touchCenter.x - pos.left, touchCenter.y - pos.top);
      } else if (evt.targetTouches.length === 1) {
        var time = new Date().getTime();
        this.gesture = 0;
        if (time - this.lastTouchStart < 300) {
          evt.preventDefault();
          this.gesture = 3;
        }
        this.lastTouchStart = time;
      }
    }
  }
  function moveHandler(evt) {
    var result = 0, node = this.zoomNode;
    var device = this._device();
    if (device.hasTouch) {
      if (evt.targetTouches.length === 2 && this.useZoom) {
        node.style.webkitTransitionDuration = '0';
        evt.preventDefault();
        this._scaleImage(evt);
        result = 2;
      } else if (evt.targetTouches.length == 1 && this.useZoom && this.currentScale > 1) {
        node.style.webkitTransitionDuration = '0';
        evt.preventDefault();
        this._moveImage(evt);
        result = 1;
      }
      this.gesture = result;
      return result;
    }
  }
  function handleDoubleTap(evt) {
    var zoomFactor = this.zoomFactor || 2;
    var node = this.zoomNode;
    var pos = getPosition(node);
    this.currentScale = this.currentScale == 1 ? zoomFactor : 1;
    node.style.webkitTransform = generateTranslate(0, 0, 0, this.currentScale);
    if (this.currentScale != 1)
      node.style.webkitTransformOrigin = generateTransformOrigin(evt.touches[0].pageX - pos.left, evt.touches[0].pageY - pos.top);
  }
  //缩放图片
  function scaleImage(evt) {
    var moveTouces = getTouches(evt.targetTouches);
    var scale = calculateScale(this.startTouches, moveTouces);
    evt.scale = evt.scale || scale;
    var node = this.zoomNode;
    scale = this.currentScale * evt.scale < minScale ? minScale : this.currentScale * evt.scale;
    node.style.webkitTransform = generateTranslate(0, 0, 0, scale);
  }
  function endHandler(evt) {
    var result = 0;
    if (this.gesture === 2) {
      //双手指 todo
      this._resetImage(evt);
      result = 2;
    } else if (this.gesture == 1) {
      //放大拖拽 todo
      this._resetImage(evt);
      result = 1;
    } else if (this.gesture === 3) {
      //双击
      this._handleDoubleTap(evt);
      this._resetImage(evt);
    }
    return result;
  }
  //拖拽图片
  function moveImage(evt) {
    var node = this.zoomNode;
    var device = this._device();
    var offset = {
      X: device.hasTouch ? evt.targetTouches[0].pageX - this.startX : evt.pageX - this.startX,
      Y: device.hasTouch ? evt.targetTouches[0].pageY - this.startY : evt.pageY - this.startY
    };
    this.moveOffset = {
      x: this._startX + offset.X - 0,
      y: this._startY + offset.Y - 0
    };
    node.style.webkitTransform = generateTranslate(this.moveOffset.x, this.moveOffset.y, 0, this.currentScale);
  }
  function getPosition(element) {
    var pos = {
      'left': 0,
      'top': 0
    };
    do {
      pos.top += element.offsetTop || 0;
      pos.left += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return pos;
  }
  function valueInViewScope(node, value, tag) {
    var min, max;
    var pos = getPosition(node);
    viewScope = {
      start: {
        left: pos.left,
        top: pos.top
      },
      end: {
        left: pos.left + node.clientWidth,
        top: pos.top + node.clientHeight
      }
    };
    var str = tag == 1 ? 'left' : 'top';
    min = viewScope.start[str];
    max = viewScope.end[str];
    return value >= min && value <= max;
  }
  function overFlow(node, obj1) {
    var result = 0;
    var isX1In = valueInViewScope(node, obj1.start.left, 1);
    var isX2In = valueInViewScope(node, obj1.end.left, 1);
    var isY1In = valueInViewScope(node, obj1.start.top, 0);
    var isY2In = valueInViewScope(node, obj1.end.top, 0);
    if (isX1In != isX2In && isY1In != isY2In) {
      if (isX1In && isY2In) {
        result = 1;
      } else if (isX1In && isY1In) {
        result = 2;
      } else if (isX2In && isY2In) {
        result = 3;
      } else {
        result = 4;
      }
    } else if (isX1In == isX2In) {
      if (!isY1In && isY2In) {
        result = 5;
      } else if (!isY2In && isY1In) {
        result = 6;
      }
    } else if (isY1In == isY2In) {
      if (!isX1In && isX2In) {
        result = 7;
      } else if (isX1In && !isX2In) {
        result = 8;
      }
    } else if (isY1In == isY2In == isX1In == isX2In) {
      result = 9;
    }
    return result;
  }
  function resetImage(evt) {
    if (this.currentScale == 1)
      return;
    var node = this.zoomNode, left, top, trans, w, h, pos, start, end, parent, flowTag;
    trans = getComputedTranslate(node);
    parent = node.parentNode;
    w = node.clientWidth * trans.scaleX;
    h = node.clientHeight * trans.scaleX;
    pos = getPosition(node);
    start = {
      left: (1 - trans.scaleX) * trans.offsetX + pos.left + trans.translateX,
      top: (1 - trans.scaleX) * trans.offsetY + pos.top + trans.translateY
    };
    end = {
      left: start.left + w,
      top: start.top + h
    };
    left = start.left;
    top = start.top;
    flowTag = overFlow(parent, {
      start: start,
      end: end
    });
    switch (flowTag) {
    case 1:
      left = viewScope.start.left;
      top = viewScope.end.top - h;
      break;
    case 2:
      left = viewScope.start.left;
      top = viewScope.start.top;
      break;
    case 3:
      left = viewScope.end.left - w;
      top = viewScope.end.top - h;
      break;
    case 4:
      left = viewScope.end.left - w;
      top = viewScope.start.top;
      break;
    case 5:
      top = viewScope.end.top - h;
      break;
    case 6:
      top = viewScope.start.top;
      break;
    case 7:
      left = viewScope.end.left - w;
      break;
    case 8:
      left = viewScope.start.left;
      break;
    }
    if (w < parent.clientWidth) {
      left = pos.left - (trans.scaleX - 1) * node.clientWidth / 2;
    }
    if (h < parent.clientHeight) {
      top = pos.top - (trans.scaleX - 1) * node.clientHeight / 2;
    }
    node.style.webkitTransitionDuration = '100ms';
    node.style.webkitTransform = generateTranslate(trans.translateX + left - start.left, trans.translateY + top - start.top, 0, trans.scaleX);
  }
  iSlider.prototype.extend({
    _initZoom: initZoom,
    _scaleImage: scaleImage,
    _moveImage: moveImage,
    _resetImage: resetImage,
    _handleDoubleTap: handleDoubleTap,
    _moveHandler: moveHandler,
    _endHandler: endHandler,
    _startHandler: startHandler
  });
}(iSlider);
plugins_islider_button = function (iSlider) {
  iSlider.prototype.extend({
    addBtn: function () {
      if (!this.isVertical) {
        var btnOuter = [];
        var btnInner = [];
        var self = this;
        for (var i = 0; i < 2; i++) {
          btnOuter[i] = document.createElement('div');
          btnOuter[i].className = 'islider-btn-outer';
          btnInner[i] = document.createElement('div');
          btnInner[i].className = 'islider-btn-inner';
          if (i === 0) {
            btnOuter[i].className += ' left';
            btnOuter[i].dir = -1;
          } else {
            btnOuter[i].className += ' right';
            btnOuter[i].dir = 1;
          }
          btnOuter[i].addEventListener('click', function () {
            var dir = parseInt(this.getAttribute('dir'), 10);
            self.slideTo(self.slideIndex + dir);
          });
          btnOuter[i].appendChild(btnInner[i]);
          this.wrap.appendChild(btnOuter[i], this.wrap.nextSibling);
        }
      }
    }
  });
}(iSlider);
plugins_islider_dot = function (iSlider) {
  iSlider.prototype.extend({
    addDot: function () {
      if (!this.isVertical) {
        var self = this;
        var data = this.data;
        var dots = [];
        var dotWrap = document.createElement('ul');
        dotWrap.className = 'islider-dot-wrap';
        var fregment = document.createDocumentFragment();
        for (var i = 0; i < data.length; i++) {
          dots[i] = document.createElement('li');
          dots[i].className = 'islider-dot';
          dots[i].setAttribute('index', i);
          if (i === this.slideIndex) {
            dots[i].className += ' active';
          }
          dots[i].addEventListener('click', function () {
            var index = parseInt(this.getAttribute('index'), 10);
            self.slideTo(index);
          });
          fregment.appendChild(dots[i]);
        }
        dotWrap.appendChild(fregment);
        this.wrap.parentNode.appendChild(dotWrap);
        this.dotchange = function () {
          for (var i = 0; i < data.length; i++) {
            dots[i].className = 'islider-dot';
            if (i === this.slideIndex) {
              dots[i].className += ' active';
            }
          }
        };
      }
    }
  });
}(iSlider);
window.iSlider = iSlider;
}());

(function(t,e){var i,n,s,r,o,h,u,a,f,c,l,d,p,g,y,v,x,m,S,T,E,b,w,C,_;g=void 0;f=null;m="x";T="y";S="xy";o="left";l="right";y="up";n="down";u=10;h=40;i=["webkit","moz","ms","o",""];c=/\-?[0-9]+\.?[0-9]*/g;r="ontouchend"in t;d=r?"touchstart":"mousedown";a=r?"touchmove":"mousemove";s=r?"touchend":"mouseup";v=t["innerHeight"];x=t["innerWidth"];b=function(){};w=function(t,e){var n,s,r,o,h;h=[];for(r=0,o=i.length;r<o;r++){s=i[r];n=s?""+s+"Transition":"transition";h.push(t.style[n]=e)}return h};C=function(t,e,n,s){var r,o,h,u,a;a=[];for(h=0,u=i.length;h<u;h++){o=i[h];r=o?""+o+"Transform":"transform";a.push(t.style[r]="translate3d("+(e||0)+"px, "+(n||0)+"px, "+(s||0)+"px)")}return a};E=function(t){var e,n,s,r,o,h,u;o=[];n="";e="";for(h=0,u=i.length;h<u;h++){r=i[h];s=r?""+r+"Transform":"transform";n=t.style[s];if(n&&typeof n==="string"){e=n.match(/\((.*)\)/g)[0];o=e&&e.match(c);break}}if(o.length){return{x:o[0]||0,y:o[1]||0,z:o[2]||0}}};p=function(){var t,e;e=[function(t){var e,i;i=t.touches&&(t.touches.length?t.touches:[t]);e=t.changedTouches&&t.changedTouches[0]||t.originalEvent&&t.originalEvent.changedTouches&&t.originalEvent.changedTouches[0]||i[0].originalEvent||i[0];return{x:e.clientX,y:e.clientY}},function(t){var e;e=t;return{x:e.clientX,y:e.clientY}}];t=r?e[0]:e[1];function i(t,e){this.ele=t;this.direction=e;this._isPressed=false;this.onStart=this.onMove=this.onEnd=b;this.coord=this.eventCoords=this.cacheCoords=this.finger=this.absFinger=f;this.orient=[];this.isSlider=false;this.isWebapp=false;this.duration="400"}i.prototype.start=function(t){return(this.onStart=t)&&this};i.prototype.move=function(t){return(this.onMove=t)&&this};i.prototype.end=function(t){return(this.onEnd=t)&&this};i.prototype.setCoord=function(t){var e,i,n;i=this.coord={x:t[m]||0,y:t[T]||0};n=this.ele;C(n,i[m],i[T]);for(e in i){n.setAttribute(e,i[e])}return this};i.prototype.onTouchStart=function(e){var i;this._isPressed=true;this.eventCoords=t(e);this.cacheCoords=this.coord;this.finger=this.absFinger=f;if(this.isSlider){this.onSliderStart(e)}return i=this.onStart.apply(this,[e])};i.prototype.onTouchMove=function(e){var i,s,r,a,f,c,d,p,g,v,x;e.preventDefault();if(!this._isPressed){return false}d=t(e);r=this.direction;c=this.finger={x:d.x-this.eventCoords.x,y:d.y-this.eventCoords.y};i=this.absFinger={x:Math.abs(c.x),y:Math.abs(c.y)};if(r!==S){p=r===m?T:m;if(i[r]<u||i[p]>h){return false}}g=[];if(i.x>u){g.push(c.x<0?o:l)}if(i.y>u){g.push(c.y<0?y:n)}this.orient=g;v=this.onMove.apply(this,[e]);if(v===false){return false}a=this.ele;f=this.coord={x:r.indexOf(m)<0?this.cacheCoords[m]:this.cacheCoords[m]-0+c.x,y:r.indexOf(T)<0?this.cacheCoords[T]:this.cacheCoords[T]-0+c.y};C(a,f[m],f[T]);x=[];for(s in f){x.push(a.setAttribute(s,f[s]))}return x};i.prototype.onTouchEnd=function(t){var e,i,n;this._isPressed=false;e=this.ele;if(this.isSlider){this.onSliderEnd(t)}i=this.onEnd.apply(this,[t]);n=E(this.ele);if(n){this.setCoord(n)}return this.orient=[]};i.prototype.onSliderStart=function(t){return w(this.ele,f)};i.prototype.onSliderEnd=function(t){var e,i,s,r,h,u,a,f,c,d,p,g,v;d=this.orient.join("");v=0;u=false;p=this.page;g=this.pageNum;s=this.ele;i=this.duration;e=this.absFinger;f=d.indexOf(y)>-1;r=d.indexOf(n)>-1;h=d.indexOf(o)>-1;a=d.indexOf(l)>-1;c=this.direction===T;if(c){if(f){p++}if(r){p--}}else{if(h){p++}if(a){p--}}if(p===g){p=g-1;u=true}if(p===-1){p=0;u=true}if(u===true){i*=c?e[T]/this.pageHeight:e[m]/this.pageWidth}w(s,"all "+i+"ms ease-in");if(c){v="-"+p*this.pageHeight;C(s,0,v,0)}else{v="-"+p*this.pageWidth;C(s,v,0,0)}return this.page=p};i.prototype.init=function(){var t,e,i,n,r,o,h;this.coord={x:0,y:0};h=this._onTouchStart=function(t){return function(e){return t.onTouchStart(e)}}(this);o=this._onTouchMove=function(t){return function(e){return t.onTouchMove(e)}}(this);r=this._onTouchEnd=function(t){return function(e){return t.onTouchEnd(e)}}(this);i=this.ele;i.addEventListener(d,h,false);i.addEventListener(a,o,false);i.addEventListener(s,r,false);n=this.coord={x:0,y:0};e=this.direction;C(i,n[m],n[T]);for(t in n){i.setAttribute(t,n[t])}return this};i.prototype.destroy=function(){var t;t=this.ele;t.removeEventListener(d,this._onTouchStart,false);t.removeEventListener(a,this._onTouchMove,false);t.removeEventListener(s,this._onTouchEnd,false);return this};i.prototype.slider=function(t){var e,i,n,s,r,h,u,a,f,c;r=this.ele;if(typeof t==="string"){t=r.querySelectorAll(t)}else if(!t){t=[];i=r.childNodes;for(u=0,f=i.length;u<f;u++){e=i[u];if(e.nodeType===1){t.push(e)}}}this.isSlider=true;this.page=0;this.elPages=t;s=t.length;h=this.pageNum=s?s:0;if(this.direction===m){for(a=0,c=t.length;a<c;a++){n=t[a];n.style.cssFloat=o}}return this};i.prototype.webapp=function(t){var e,i;this.isWebapp=true;this.slider(t).fullscreen();t=this.elPages;e=this.ele;i=this.pageNum;e.style.height=""+v*i+"px";this.height(v);if(this.direction===m){this.width(x)}return this};i.prototype.height=function(t){var e,i,n,s,r,o;n=this.ele;i=this.elPages;s=this.pageNum;t=String(t).replace("px","");if(t==="100%"){t=v}this.pageHeight=t;if(this.direction===m){n.style.height=""+t+"px"}for(r=0,o=i.length;r<o;r++){e=i[r];e.style.height=""+t+"px"}return this};i.prototype.width=function(t){var e,i,n,s,r,o;n=this.ele;i=this.elPages;s=this.pageNum;t=String(t).replace("px","");if(t==="100%"){t=x}this.pageWidth=t;if(this.direction===m){n.style.width=""+t*s+"px"}for(r=0,o=i.length;r<o;r++){e=i[r];e.style.width=""+t+"px"}return this};i.prototype.fullscreen=function(){var t,e,i;e=this.ele;t=e;while(i=t.parentNode){if(i.nodeType===1){i.style.height="100%";i.style.overflow="hidden"}t=i}return this};i.prototype.time=function(t){this.duration=String(t).replace("ms","");return this};return i}();_=function(t,e){var i;i=new p(t,e||m);return i.init()};return t.Slip=_})(window,document);
//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.
//    callbacks

;(function($){
  // Create a collection of callbacks to be fired in a sequence, with configurable behaviour
  // Option flags:
  //   - once: Callbacks fired at most one time.
  //   - memory: Remember the most recent context and arguments
  //   - stopOnFalse: Cease iterating over callback list
  //   - unique: Permit adding at most one instance of the same callback
  $.Callbacks = function(options) {
    options = $.extend({}, options)

    var memory, // Last fire value (for non-forgettable lists)
        fired,  // Flag to know if list was already fired
        firing, // Flag to know if list is currently firing
        firingStart, // First callback to fire (used internally by add and fireWith)
        firingLength, // End of the loop when firing
        firingIndex, // Index of currently firing callback (modified by remove if needed)
        list = [], // Actual callback list
        stack = !options.once && [], // Stack of fire calls for repeatable lists
        fire = function(data) {
          memory = options.memory && data
          fired = true
          firingIndex = firingStart || 0
          firingStart = 0
          firingLength = list.length
          firing = true
          for ( ; list && firingIndex < firingLength ; ++firingIndex ) {
            if (list[firingIndex].apply(data[0], data[1]) === false && options.stopOnFalse) {
              memory = false
              break
            }
          }
          firing = false
          if (list) {
            if (stack) stack.length && fire(stack.shift())
            else if (memory) list.length = 0
            else Callbacks.disable()
          }
        },

        Callbacks = {
          add: function() {
            if (list) {
              var start = list.length,
                  add = function(args) {
                    $.each(args, function(_, arg){
                      if (typeof arg === "function") {
                        if (!options.unique || !Callbacks.has(arg)) list.push(arg)
                      }
                      else if (arg && arg.length && typeof arg !== 'string') add(arg)
                    })
                  }
              add(arguments)
              if (firing) firingLength = list.length
              else if (memory) {
                firingStart = start
                fire(memory)
              }
            }
            return this
          },
          remove: function() {
            if (list) {
              $.each(arguments, function(_, arg){
                var index
                while ((index = $.inArray(arg, list, index)) > -1) {
                  list.splice(index, 1)
                  // Handle firing indexes
                  if (firing) {
                    if (index <= firingLength) --firingLength
                    if (index <= firingIndex) --firingIndex
                  }
                }
              })
            }
            return this
          },
          has: function(fn) {
            return !!(list && (fn ? $.inArray(fn, list) > -1 : list.length))
          },
          empty: function() {
            firingLength = list.length = 0
            return this
          },
          disable: function() {
            list = stack = memory = undefined
            return this
          },
          disabled: function() {
            return !list
          },
          lock: function() {
            stack = undefined;
            if (!memory) Callbacks.disable()
            return this
          },
          locked: function() {
            return !stack
          },
          fireWith: function(context, args) {
            if (list && (!fired || stack)) {
              args = args || []
              args = [context, args.slice ? args.slice() : args]
              if (firing) stack.push(args)
              else fire(args)
            }
            return this
          },
          fire: function() {
            return Callbacks.fireWith(this, arguments)
          },
          fired: function() {
            return !!fired
          }
        }

    return Callbacks
  }
})(Zepto)

//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.
//
//     Some code (c) 2005, 2013 jQuery Foundation, Inc. and other contributors

;(function($){
  var slice = Array.prototype.slice

  function Deferred(func) {
    var tuples = [
          // action, add listener, listener list, final state
          [ "resolve", "done", $.Callbacks({once:1, memory:1}), "resolved" ],
          [ "reject", "fail", $.Callbacks({once:1, memory:1}), "rejected" ],
          [ "notify", "progress", $.Callbacks({memory:1}) ]
        ],
        state = "pending",
        promise = {
          state: function() {
            return state
          },
          always: function() {
            deferred.done(arguments).fail(arguments)
            return this
          },
          then: function(/* fnDone [, fnFailed [, fnProgress]] */) {
            var fns = arguments
            return Deferred(function(defer){
              $.each(tuples, function(i, tuple){
                var fn = $.isFunction(fns[i]) && fns[i]
                deferred[tuple[1]](function(){
                  var returned = fn && fn.apply(this, arguments)
                  if (returned && $.isFunction(returned.promise)) {
                    returned.promise()
                      .done(defer.resolve)
                      .fail(defer.reject)
                      .progress(defer.notify)
                  } else {
                    var context = this === promise ? defer.promise() : this,
                        values = fn ? [returned] : arguments
                    defer[tuple[0] + "With"](context, values)
                  }
                })
              })
              fns = null
            }).promise()
          },

          promise: function(obj) {
            return obj != null ? $.extend( obj, promise ) : promise
          }
        },
        deferred = {}

    $.each(tuples, function(i, tuple){
      var list = tuple[2],
          stateString = tuple[3]

      promise[tuple[1]] = list.add

      if (stateString) {
        list.add(function(){
          state = stateString
        }, tuples[i^1][2].disable, tuples[2][2].lock)
      }

      deferred[tuple[0]] = function(){
        deferred[tuple[0] + "With"](this === deferred ? promise : this, arguments)
        return this
      }
      deferred[tuple[0] + "With"] = list.fireWith
    })

    promise.promise(deferred)
    if (func) func.call(deferred, deferred)
    return deferred
  }

  $.when = function(sub) {
    var resolveValues = slice.call(arguments),
        len = resolveValues.length,
        i = 0,
        remain = len !== 1 || (sub && $.isFunction(sub.promise)) ? len : 0,
        deferred = remain === 1 ? sub : Deferred(),
        progressValues, progressContexts, resolveContexts,
        updateFn = function(i, ctx, val){
          return function(value){
            ctx[i] = this
            val[i] = arguments.length > 1 ? slice.call(arguments) : value
            if (val === progressValues) {
              deferred.notifyWith(ctx, val)
            } else if (!(--remain)) {
              deferred.resolveWith(ctx, val)
            }
          }
        }

    if (len > 1) {
      progressValues = new Array(len)
      progressContexts = new Array(len)
      resolveContexts = new Array(len)
      for ( ; i < len; ++i ) {
        if (resolveValues[i] && $.isFunction(resolveValues[i].promise)) {
          resolveValues[i].promise()
            .done(updateFn(i, resolveContexts, resolveValues))
            .fail(deferred.reject)
            .progress(updateFn(i, progressContexts, progressValues))
        } else {
          --remain
        }
      }
    }
    if (!remain) deferred.resolveWith(resolveContexts, resolveValues)
    return deferred.promise()
  }

  $.Deferred = Deferred
})(Zepto)

//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($, undefined){
  var document = window.document, docElem = document.documentElement,
    origShow = $.fn.show, origHide = $.fn.hide, origToggle = $.fn.toggle

  function anim(el, speed, opacity, scale, callback) {
    if (typeof speed == 'function' && !callback) callback = speed, speed = undefined
    var props = { opacity: opacity }
    if (scale) {
      props.scale = scale
      el.css($.fx.cssPrefix + 'transform-origin', '0 0')
    }
    return el.animate(props, speed, null, callback)
  }

  function hide(el, speed, scale, callback) {
    return anim(el, speed, 0, scale, function(){
      origHide.call($(this))
      callback && callback.call(this)
    })
  }

  $.fn.show = function(speed, callback) {
    origShow.call(this)
    if (speed === undefined) speed = 0
    else this.css('opacity', 0)
    return anim(this, speed, 1, '1,1', callback)
  }

  $.fn.hide = function(speed, callback) {
    if (speed === undefined) return origHide.call(this)
    else return hide(this, speed, '0,0', callback)
  }

  $.fn.toggle = function(speed, callback) {
    if (speed === undefined || typeof speed == 'boolean')
      return origToggle.call(this, speed)
    else return this.each(function(){
      var el = $(this)
      el[el.css('display') == 'none' ? 'show' : 'hide'](speed, callback)
    })
  }

  $.fn.fadeTo = function(speed, opacity, callback) {
    return anim(this, speed, opacity, null, callback)
  }

  $.fn.fadeIn = function(speed, callback) {
    var target = this.css('opacity')
    if (target > 0) this.css('opacity', 0)
    else target = 1
    return origShow.call(this).fadeTo(speed, target, callback)
  }

  $.fn.fadeOut = function(speed, callback) {
    return hide(this, speed, null, callback)
  }

  $.fn.fadeToggle = function(speed, callback) {
    return this.each(function(){
      var el = $(this)
      el[
        (el.css('opacity') == 0 || el.css('display') == 'none') ? 'fadeIn' : 'fadeOut'
      ](speed, callback)
    })
  }

})(Zepto)
