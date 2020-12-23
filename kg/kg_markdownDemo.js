(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
Syntax highlighting with language autodetection.
https://highlightjs.org/
*/

(function(factory) {

  // Find the global object for export to both the browser and web workers.
  var globalObject = typeof window === 'object' && window ||
                     typeof self === 'object' && self;

  // Setup highlight.js for different environments. First is Node.js or
  // CommonJS.
  if(typeof exports !== 'undefined') {
    factory(exports);
  } else if(globalObject) {
    // Export hljs globally even when using AMD for cases when this script
    // is loaded with others that may still expect a global hljs.
    globalObject.hljs = factory({});

    // Finally register the global hljs with AMD.
    if(typeof define === 'function' && define.amd) {
      define([], function() {
        return globalObject.hljs;
      });
    }
  }

}(function(hljs) {
  // Convenience variables for build-in objects
  var ArrayProto = [],
      objectKeys = Object.keys;

  // Global internal variables used within the highlight.js library.
  var languages = {},
      aliases   = {};

  // Regular expressions used throughout the highlight.js library.
  var noHighlightRe    = /^(no-?highlight|plain|text)$/i,
      languagePrefixRe = /\blang(?:uage)?-([\w-]+)\b/i,
      fixMarkupRe      = /((^(<[^>]+>|\t|)+|(?:\n)))/gm;

  var spanEndTag = '</span>';

  // Global options used when within external APIs. This is modified when
  // calling the `hljs.configure` function.
  var options = {
    classPrefix: 'hljs-',
    tabReplace: null,
    useBR: false,
    languages: undefined
  };

  // Object map that is used to escape some common HTML characters.
  var escapeRegexMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  };

  /* Utility functions */

  function escape(value) {
    return value.replace(/[&<>]/gm, function(character) {
      return escapeRegexMap[character];
    });
  }

  function tag(node) {
    return node.nodeName.toLowerCase();
  }

  function testRe(re, lexeme) {
    var match = re && re.exec(lexeme);
    return match && match.index === 0;
  }

  function isNotHighlighted(language) {
    return noHighlightRe.test(language);
  }

  function blockLanguage(block) {
    var i, match, length, _class;
    var classes = block.className + ' ';

    classes += block.parentNode ? block.parentNode.className : '';

    // language-* takes precedence over non-prefixed class names.
    match = languagePrefixRe.exec(classes);
    if (match) {
      return getLanguage(match[1]) ? match[1] : 'no-highlight';
    }

    classes = classes.split(/\s+/);

    for (i = 0, length = classes.length; i < length; i++) {
      _class = classes[i]

      if (isNotHighlighted(_class) || getLanguage(_class)) {
        return _class;
      }
    }
  }

  function inherit(parent, obj) {
    var key;
    var result = {};

    for (key in parent)
      result[key] = parent[key];
    if (obj)
      for (key in obj)
        result[key] = obj[key];
    return result;
  }

  /* Stream merging */

  function nodeStream(node) {
    var result = [];
    (function _nodeStream(node, offset) {
      for (var child = node.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === 3)
          offset += child.nodeValue.length;
        else if (child.nodeType === 1) {
          result.push({
            event: 'start',
            offset: offset,
            node: child
          });
          offset = _nodeStream(child, offset);
          // Prevent void elements from having an end tag that would actually
          // double them in the output. There are more void elements in HTML
          // but we list only those realistically expected in code display.
          if (!tag(child).match(/br|hr|img|input/)) {
            result.push({
              event: 'stop',
              offset: offset,
              node: child
            });
          }
        }
      }
      return offset;
    })(node, 0);
    return result;
  }

  function mergeStreams(original, highlighted, value) {
    var processed = 0;
    var result = '';
    var nodeStack = [];

    function selectStream() {
      if (!original.length || !highlighted.length) {
        return original.length ? original : highlighted;
      }
      if (original[0].offset !== highlighted[0].offset) {
        return (original[0].offset < highlighted[0].offset) ? original : highlighted;
      }

      /*
      To avoid starting the stream just before it should stop the order is
      ensured that original always starts first and closes last:

      if (event1 == 'start' && event2 == 'start')
        return original;
      if (event1 == 'start' && event2 == 'stop')
        return highlighted;
      if (event1 == 'stop' && event2 == 'start')
        return original;
      if (event1 == 'stop' && event2 == 'stop')
        return highlighted;

      ... which is collapsed to:
      */
      return highlighted[0].event === 'start' ? original : highlighted;
    }

    function open(node) {
      function attr_str(a) {return ' ' + a.nodeName + '="' + escape(a.value) + '"';}
      result += '<' + tag(node) + ArrayProto.map.call(node.attributes, attr_str).join('') + '>';
    }

    function close(node) {
      result += '</' + tag(node) + '>';
    }

    function render(event) {
      (event.event === 'start' ? open : close)(event.node);
    }

    while (original.length || highlighted.length) {
      var stream = selectStream();
      result += escape(value.substr(processed, stream[0].offset - processed));
      processed = stream[0].offset;
      if (stream === original) {
        /*
        On any opening or closing tag of the original markup we first close
        the entire highlighted node stack, then render the original tag along
        with all the following original tags at the same offset and then
        reopen all the tags on the highlighted stack.
        */
        nodeStack.reverse().forEach(close);
        do {
          render(stream.splice(0, 1)[0]);
          stream = selectStream();
        } while (stream === original && stream.length && stream[0].offset === processed);
        nodeStack.reverse().forEach(open);
      } else {
        if (stream[0].event === 'start') {
          nodeStack.push(stream[0].node);
        } else {
          nodeStack.pop();
        }
        render(stream.splice(0, 1)[0]);
      }
    }
    return result + escape(value.substr(processed));
  }

  /* Initialization */

  function compileLanguage(language) {

    function reStr(re) {
        return (re && re.source) || re;
    }

    function langRe(value, global) {
      return new RegExp(
        reStr(value),
        'm' + (language.case_insensitive ? 'i' : '') + (global ? 'g' : '')
      );
    }

    function compileMode(mode, parent) {
      if (mode.compiled)
        return;
      mode.compiled = true;

      mode.keywords = mode.keywords || mode.beginKeywords;
      if (mode.keywords) {
        var compiled_keywords = {};

        var flatten = function(className, str) {
          if (language.case_insensitive) {
            str = str.toLowerCase();
          }
          str.split(' ').forEach(function(kw) {
            var pair = kw.split('|');
            compiled_keywords[pair[0]] = [className, pair[1] ? Number(pair[1]) : 1];
          });
        };

        if (typeof mode.keywords === 'string') { // string
          flatten('keyword', mode.keywords);
        } else {
          objectKeys(mode.keywords).forEach(function (className) {
            flatten(className, mode.keywords[className]);
          });
        }
        mode.keywords = compiled_keywords;
      }
      mode.lexemesRe = langRe(mode.lexemes || /\w+/, true);

      if (parent) {
        if (mode.beginKeywords) {
          mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')\\b';
        }
        if (!mode.begin)
          mode.begin = /\B|\b/;
        mode.beginRe = langRe(mode.begin);
        if (!mode.end && !mode.endsWithParent)
          mode.end = /\B|\b/;
        if (mode.end)
          mode.endRe = langRe(mode.end);
        mode.terminator_end = reStr(mode.end) || '';
        if (mode.endsWithParent && parent.terminator_end)
          mode.terminator_end += (mode.end ? '|' : '') + parent.terminator_end;
      }
      if (mode.illegal)
        mode.illegalRe = langRe(mode.illegal);
      if (mode.relevance == null)
        mode.relevance = 1;
      if (!mode.contains) {
        mode.contains = [];
      }
      var expanded_contains = [];
      mode.contains.forEach(function(c) {
        if (c.variants) {
          c.variants.forEach(function(v) {expanded_contains.push(inherit(c, v));});
        } else {
          expanded_contains.push(c === 'self' ? mode : c);
        }
      });
      mode.contains = expanded_contains;
      mode.contains.forEach(function(c) {compileMode(c, mode);});

      if (mode.starts) {
        compileMode(mode.starts, parent);
      }

      var terminators =
        mode.contains.map(function(c) {
          return c.beginKeywords ? '\\.?(' + c.begin + ')\\.?' : c.begin;
        })
        .concat([mode.terminator_end, mode.illegal])
        .map(reStr)
        .filter(Boolean);
      mode.terminators = terminators.length ? langRe(terminators.join('|'), true) : {exec: function(/*s*/) {return null;}};
    }

    compileMode(language);
  }

  /*
  Core highlighting function. Accepts a language name, or an alias, and a
  string with the code to highlight. Returns an object with the following
  properties:

  - relevance (int)
  - value (an HTML string with highlighting markup)

  */
  function highlight(name, value, ignore_illegals, continuation) {

    function subMode(lexeme, mode) {
      var i, length;

      for (i = 0, length = mode.contains.length; i < length; i++) {
        if (testRe(mode.contains[i].beginRe, lexeme)) {
          return mode.contains[i];
        }
      }
    }

    function endOfMode(mode, lexeme) {
      if (testRe(mode.endRe, lexeme)) {
        while (mode.endsParent && mode.parent) {
          mode = mode.parent;
        }
        return mode;
      }
      if (mode.endsWithParent) {
        return endOfMode(mode.parent, lexeme);
      }
    }

    function isIllegal(lexeme, mode) {
      return !ignore_illegals && testRe(mode.illegalRe, lexeme);
    }

    function keywordMatch(mode, match) {
      var match_str = language.case_insensitive ? match[0].toLowerCase() : match[0];
      return mode.keywords.hasOwnProperty(match_str) && mode.keywords[match_str];
    }

    function buildSpan(classname, insideSpan, leaveOpen, noPrefix) {
      var classPrefix = noPrefix ? '' : options.classPrefix,
          openSpan    = '<span class="' + classPrefix,
          closeSpan   = leaveOpen ? '' : spanEndTag

      openSpan += classname + '">';

      return openSpan + insideSpan + closeSpan;
    }

    function processKeywords() {
      var keyword_match, last_index, match, result;

      if (!top.keywords)
        return escape(mode_buffer);

      result = '';
      last_index = 0;
      top.lexemesRe.lastIndex = 0;
      match = top.lexemesRe.exec(mode_buffer);

      while (match) {
        result += escape(mode_buffer.substr(last_index, match.index - last_index));
        keyword_match = keywordMatch(top, match);
        if (keyword_match) {
          relevance += keyword_match[1];
          result += buildSpan(keyword_match[0], escape(match[0]));
        } else {
          result += escape(match[0]);
        }
        last_index = top.lexemesRe.lastIndex;
        match = top.lexemesRe.exec(mode_buffer);
      }
      return result + escape(mode_buffer.substr(last_index));
    }

    function processSubLanguage() {
      var explicit = typeof top.subLanguage === 'string';
      if (explicit && !languages[top.subLanguage]) {
        return escape(mode_buffer);
      }

      var result = explicit ?
                   highlight(top.subLanguage, mode_buffer, true, continuations[top.subLanguage]) :
                   highlightAuto(mode_buffer, top.subLanguage.length ? top.subLanguage : undefined);

      // Counting embedded language score towards the host language may be disabled
      // with zeroing the containing mode relevance. Usecase in point is Markdown that
      // allows XML everywhere and makes every XML snippet to have a much larger Markdown
      // score.
      if (top.relevance > 0) {
        relevance += result.relevance;
      }
      if (explicit) {
        continuations[top.subLanguage] = result.top;
      }
      return buildSpan(result.language, result.value, false, true);
    }

    function processBuffer() {
      result += (top.subLanguage != null ? processSubLanguage() : processKeywords());
      mode_buffer = '';
    }

    function startNewMode(mode) {
      result += mode.className? buildSpan(mode.className, '', true): '';
      top = Object.create(mode, {parent: {value: top}});
    }

    function processLexeme(buffer, lexeme) {

      mode_buffer += buffer;

      if (lexeme == null) {
        processBuffer();
        return 0;
      }

      var new_mode = subMode(lexeme, top);
      if (new_mode) {
        if (new_mode.skip) {
          mode_buffer += lexeme;
        } else {
          if (new_mode.excludeBegin) {
            mode_buffer += lexeme;
          }
          processBuffer();
          if (!new_mode.returnBegin && !new_mode.excludeBegin) {
            mode_buffer = lexeme;
          }
        }
        startNewMode(new_mode, lexeme);
        return new_mode.returnBegin ? 0 : lexeme.length;
      }

      var end_mode = endOfMode(top, lexeme);
      if (end_mode) {
        var origin = top;
        if (origin.skip) {
          mode_buffer += lexeme;
        } else {
          if (!(origin.returnEnd || origin.excludeEnd)) {
            mode_buffer += lexeme;
          }
          processBuffer();
          if (origin.excludeEnd) {
            mode_buffer = lexeme;
          }
        }
        do {
          if (top.className) {
            result += spanEndTag;
          }
          if (!top.skip) {
            relevance += top.relevance;
          }
          top = top.parent;
        } while (top !== end_mode.parent);
        if (end_mode.starts) {
          startNewMode(end_mode.starts, '');
        }
        return origin.returnEnd ? 0 : lexeme.length;
      }

      if (isIllegal(lexeme, top))
        throw new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.className || '<unnamed>') + '"');

      /*
      Parser should not reach this point as all types of lexemes should be caught
      earlier, but if it does due to some bug make sure it advances at least one
      character forward to prevent infinite looping.
      */
      mode_buffer += lexeme;
      return lexeme.length || 1;
    }

    var language = getLanguage(name);
    if (!language) {
      throw new Error('Unknown language: "' + name + '"');
    }

    compileLanguage(language);
    var top = continuation || language;
    var continuations = {}; // keep continuations for sub-languages
    var result = '', current;
    for(current = top; current !== language; current = current.parent) {
      if (current.className) {
        result = buildSpan(current.className, '', true) + result;
      }
    }
    var mode_buffer = '';
    var relevance = 0;
    try {
      var match, count, index = 0;
      while (true) {
        top.terminators.lastIndex = index;
        match = top.terminators.exec(value);
        if (!match)
          break;
        count = processLexeme(value.substr(index, match.index - index), match[0]);
        index = match.index + count;
      }
      processLexeme(value.substr(index));
      for(current = top; current.parent; current = current.parent) { // close dangling modes
        if (current.className) {
          result += spanEndTag;
        }
      }
      return {
        relevance: relevance,
        value: result,
        language: name,
        top: top
      };
    } catch (e) {
      if (e.message && e.message.indexOf('Illegal') !== -1) {
        return {
          relevance: 0,
          value: escape(value)
        };
      } else {
        throw e;
      }
    }
  }

  /*
  Highlighting with language detection. Accepts a string with the code to
  highlight. Returns an object with the following properties:

  - language (detected language)
  - relevance (int)
  - value (an HTML string with highlighting markup)
  - second_best (object with the same structure for second-best heuristically
    detected language, may be absent)

  */
  function highlightAuto(text, languageSubset) {
    languageSubset = languageSubset || options.languages || objectKeys(languages);
    var result = {
      relevance: 0,
      value: escape(text)
    };
    var second_best = result;
    languageSubset.filter(getLanguage).forEach(function(name) {
      var current = highlight(name, text, false);
      current.language = name;
      if (current.relevance > second_best.relevance) {
        second_best = current;
      }
      if (current.relevance > result.relevance) {
        second_best = result;
        result = current;
      }
    });
    if (second_best.language) {
      result.second_best = second_best;
    }
    return result;
  }

  /*
  Post-processing of the highlighted markup:

  - replace TABs with something more useful
  - replace real line-breaks with '<br>' for non-pre containers

  */
  function fixMarkup(value) {
    return !(options.tabReplace || options.useBR)
      ? value
      : value.replace(fixMarkupRe, function(match, p1) {
          if (options.useBR && match === '\n') {
            return '<br>';
          } else if (options.tabReplace) {
            return p1.replace(/\t/g, options.tabReplace);
          }
      });
  }

  function buildClassName(prevClassName, currentLang, resultLang) {
    var language = currentLang ? aliases[currentLang] : resultLang,
        result   = [prevClassName.trim()];

    if (!prevClassName.match(/\bhljs\b/)) {
      result.push('hljs');
    }

    if (prevClassName.indexOf(language) === -1) {
      result.push(language);
    }

    return result.join(' ').trim();
  }

  /*
  Applies highlighting to a DOM node containing code. Accepts a DOM node and
  two optional parameters for fixMarkup.
  */
  function highlightBlock(block) {
    var node, originalStream, result, resultNode, text;
    var language = blockLanguage(block);

    if (isNotHighlighted(language))
        return;

    if (options.useBR) {
      node = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      node.innerHTML = block.innerHTML.replace(/\n/g, '').replace(/<br[ \/]*>/g, '\n');
    } else {
      node = block;
    }
    text = node.textContent;
    result = language ? highlight(language, text, true) : highlightAuto(text);

    originalStream = nodeStream(node);
    if (originalStream.length) {
      resultNode = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      resultNode.innerHTML = result.value;
      result.value = mergeStreams(originalStream, nodeStream(resultNode), text);
    }
    result.value = fixMarkup(result.value);

    block.innerHTML = result.value;
    block.className = buildClassName(block.className, language, result.language);
    block.result = {
      language: result.language,
      re: result.relevance
    };
    if (result.second_best) {
      block.second_best = {
        language: result.second_best.language,
        re: result.second_best.relevance
      };
    }
  }

  /*
  Updates highlight.js global options with values passed in the form of an object.
  */
  function configure(user_options) {
    options = inherit(options, user_options);
  }

  /*
  Applies highlighting to all <pre><code>..</code></pre> blocks on a page.
  */
  function initHighlighting() {
    if (initHighlighting.called)
      return;
    initHighlighting.called = true;

    var blocks = document.querySelectorAll('pre code');
    ArrayProto.forEach.call(blocks, highlightBlock);
  }

  /*
  Attaches highlighting to the page load event.
  */
  function initHighlightingOnLoad() {
    addEventListener('DOMContentLoaded', initHighlighting, false);
    addEventListener('load', initHighlighting, false);
  }

  function registerLanguage(name, language) {
    var lang = languages[name] = language(hljs);
    if (lang.aliases) {
      lang.aliases.forEach(function(alias) {aliases[alias] = name;});
    }
  }

  function listLanguages() {
    return objectKeys(languages);
  }

  function getLanguage(name) {
    name = (name || '').toLowerCase();
    return languages[name] || languages[aliases[name]];
  }

  /* Interface definition */

  hljs.highlight = highlight;
  hljs.highlightAuto = highlightAuto;
  hljs.fixMarkup = fixMarkup;
  hljs.highlightBlock = highlightBlock;
  hljs.configure = configure;
  hljs.initHighlighting = initHighlighting;
  hljs.initHighlightingOnLoad = initHighlightingOnLoad;
  hljs.registerLanguage = registerLanguage;
  hljs.listLanguages = listLanguages;
  hljs.getLanguage = getLanguage;
  hljs.inherit = inherit;

  // Common regexps
  hljs.IDENT_RE = '[a-zA-Z]\\w*';
  hljs.UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
  hljs.NUMBER_RE = '\\b\\d+(\\.\\d+)?';
  hljs.C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
  hljs.BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
  hljs.RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

  // Common modes
  hljs.BACKSLASH_ESCAPE = {
    begin: '\\\\[\\s\\S]', relevance: 0
  };
  hljs.APOS_STRING_MODE = {
    className: 'string',
    begin: '\'', end: '\'',
    illegal: '\\n',
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  hljs.QUOTE_STRING_MODE = {
    className: 'string',
    begin: '"', end: '"',
    illegal: '\\n',
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  hljs.PHRASAL_WORDS_MODE = {
    begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|like)\b/
  };
  hljs.COMMENT = function (begin, end, inherits) {
    var mode = hljs.inherit(
      {
        className: 'comment',
        begin: begin, end: end,
        contains: []
      },
      inherits || {}
    );
    mode.contains.push(hljs.PHRASAL_WORDS_MODE);
    mode.contains.push({
      className: 'doctag',
      begin: '(?:TODO|FIXME|NOTE|BUG|XXX):',
      relevance: 0
    });
    return mode;
  };
  hljs.C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$');
  hljs.C_BLOCK_COMMENT_MODE = hljs.COMMENT('/\\*', '\\*/');
  hljs.HASH_COMMENT_MODE = hljs.COMMENT('#', '$');
  hljs.NUMBER_MODE = {
    className: 'number',
    begin: hljs.NUMBER_RE,
    relevance: 0
  };
  hljs.C_NUMBER_MODE = {
    className: 'number',
    begin: hljs.C_NUMBER_RE,
    relevance: 0
  };
  hljs.BINARY_NUMBER_MODE = {
    className: 'number',
    begin: hljs.BINARY_NUMBER_RE,
    relevance: 0
  };
  hljs.CSS_NUMBER_MODE = {
    className: 'number',
    begin: hljs.NUMBER_RE + '(' +
      '%|em|ex|ch|rem'  +
      '|vw|vh|vmin|vmax' +
      '|cm|mm|in|pt|pc|px' +
      '|deg|grad|rad|turn' +
      '|s|ms' +
      '|Hz|kHz' +
      '|dpi|dpcm|dppx' +
      ')?',
    relevance: 0
  };
  hljs.REGEXP_MODE = {
    className: 'regexp',
    begin: /\//, end: /\/[gimuy]*/,
    illegal: /\n/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      {
        begin: /\[/, end: /\]/,
        relevance: 0,
        contains: [hljs.BACKSLASH_ESCAPE]
      }
    ]
  };
  hljs.TITLE_MODE = {
    className: 'title',
    begin: hljs.IDENT_RE,
    relevance: 0
  };
  hljs.UNDERSCORE_TITLE_MODE = {
    className: 'title',
    begin: hljs.UNDERSCORE_IDENT_RE,
    relevance: 0
  };
  hljs.METHOD_GUARD = {
    // excludes method names from keyword processing
    begin: '\\.\\s*' + hljs.UNDERSCORE_IDENT_RE,
    relevance: 0
  };

  return hljs;
}));

},{}],54:[function(require,module,exports){
// Enclose abbreviations in <abbr> tags
//
'use strict';


module.exports = function sub_plugin(md) {
  var escapeRE        = md.utils.escapeRE,
      arrayReplaceAt  = md.utils.arrayReplaceAt;

  // ASCII characters in Cc, Sc, Sm, Sk categories we should terminate on;
  // you can check character classes here:
  // http://www.unicode.org/Public/UNIDATA/UnicodeData.txt
  var OTHER_CHARS      = ' \r\n$+<=>^`|~';

  var UNICODE_PUNCT_RE = md.utils.lib.ucmicro.P.source;
  var UNICODE_SPACE_RE = md.utils.lib.ucmicro.Z.source;


  function abbr_def(state, startLine, endLine, silent) {
    var label, title, ch, labelStart, labelEnd,
        pos = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    if (pos + 2 >= max) { return false; }

    if (state.src.charCodeAt(pos++) !== 0x2A/* * */) { return false; }
    if (state.src.charCodeAt(pos++) !== 0x5B/* [ */) { return false; }

    labelStart = pos;

    for (; pos < max; pos++) {
      ch = state.src.charCodeAt(pos);
      if (ch === 0x5B /* [ */) {
        return false;
      } else if (ch === 0x5D /* ] */) {
        labelEnd = pos;
        break;
      } else if (ch === 0x5C /* \ */) {
        pos++;
      }
    }

    if (labelEnd < 0 || state.src.charCodeAt(labelEnd + 1) !== 0x3A/* : */) {
      return false;
    }

    if (silent) { return true; }

    label = state.src.slice(labelStart, labelEnd).replace(/\\(.)/g, '$1');
    title = state.src.slice(labelEnd + 2, max).trim();
    if (label.length === 0) { return false; }
    if (title.length === 0) { return false; }
    if (!state.env.abbreviations) { state.env.abbreviations = {}; }
    // prepend ':' to avoid conflict with Object.prototype members
    if (typeof state.env.abbreviations[':' + label] === 'undefined') {
      state.env.abbreviations[':' + label] = title;
    }

    state.line = startLine + 1;
    return true;
  }


  function abbr_replace(state) {
    var i, j, l, tokens, token, text, nodes, pos, reg, m, regText, regSimple,
        currentToken,
        blockTokens = state.tokens;

    if (!state.env.abbreviations) { return; }

    regSimple = new RegExp('(?:' +
      Object.keys(state.env.abbreviations).map(function (x) {
        return x.substr(1);
      }).sort(function (a, b) {
        return b.length - a.length;
      }).map(escapeRE).join('|') +
    ')');

    regText = '(^|' + UNICODE_PUNCT_RE + '|' + UNICODE_SPACE_RE +
                    '|[' + OTHER_CHARS.split('').map(escapeRE).join('') + '])'
            + '(' + Object.keys(state.env.abbreviations).map(function (x) {
                      return x.substr(1);
                    }).sort(function (a, b) {
                      return b.length - a.length;
                    }).map(escapeRE).join('|') + ')'
            + '($|' + UNICODE_PUNCT_RE + '|' + UNICODE_SPACE_RE +
                    '|[' + OTHER_CHARS.split('').map(escapeRE).join('') + '])';

    reg = new RegExp(regText, 'g');

    for (j = 0, l = blockTokens.length; j < l; j++) {
      if (blockTokens[j].type !== 'inline') { continue; }
      tokens = blockTokens[j].children;

      // We scan from the end, to keep position when new tags added.
      for (i = tokens.length - 1; i >= 0; i--) {
        currentToken = tokens[i];
        if (currentToken.type !== 'text') { continue; }

        pos = 0;
        text = currentToken.content;
        reg.lastIndex = 0;
        nodes = [];

        // fast regexp run to determine whether there are any abbreviated words
        // in the current token
        if (!regSimple.test(text)) { continue; }

        while ((m = reg.exec(text))) {
          if (m.index > 0 || m[1].length > 0) {
            token         = new state.Token('text', '', 0);
            token.content = text.slice(pos, m.index + m[1].length);
            nodes.push(token);
          }

          token         = new state.Token('abbr_open', 'abbr', 1);
          token.attrs   = [ [ 'title', state.env.abbreviations[':' + m[2]] ] ];
          nodes.push(token);

          token         = new state.Token('text', '', 0);
          token.content = m[2];
          nodes.push(token);

          token         = new state.Token('abbr_close', 'abbr', -1);
          nodes.push(token);

          reg.lastIndex -= m[3].length;
          pos = reg.lastIndex;
        }

        if (!nodes.length) { continue; }

        if (pos < text.length) {
          token         = new state.Token('text', '', 0);
          token.content = text.slice(pos);
          nodes.push(token);
        }

        // replace current node
        blockTokens[j].children = tokens = arrayReplaceAt(tokens, i, nodes);
      }
    }
  }

  md.block.ruler.before('reference', 'abbr_def', abbr_def, { alt: [ 'paragraph', 'reference' ] });

  md.core.ruler.after('linkify', 'abbr_replace', abbr_replace);
};

},{}],55:[function(require,module,exports){
// Process block-level custom containers
//
'use strict';


module.exports = function container_plugin(md, name, options) {

  function validateDefault(params) {
    return params.trim().split(' ', 2)[0] === name;
  }

  function renderDefault(tokens, idx, _options, env, self) {

    // add a class to the opening tag
    if (tokens[idx].nesting === 1) {
      tokens[idx].attrPush([ 'class', name ]);
    }

    return self.renderToken(tokens, idx, _options, env, self);
  }

  options = options || {};

  var min_markers = 3,
      marker_str  = options.marker || ':',
      marker_char = marker_str.charCodeAt(0),
      marker_len  = marker_str.length,
      validate    = options.validate || validateDefault,
      render      = options.render || renderDefault;

  function container(state, startLine, endLine, silent) {
    var pos, nextLine, marker_count, markup, params, token,
        old_parent, old_line_max,
        auto_closed = false,
        start = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    // Check out the first character quickly,
    // this should filter out most of non-containers
    //
    if (marker_char !== state.src.charCodeAt(start)) { return false; }

    // Check out the rest of the marker string
    //
    for (pos = start + 1; pos <= max; pos++) {
      if (marker_str[(pos - start) % marker_len] !== state.src[pos]) {
        break;
      }
    }

    marker_count = Math.floor((pos - start) / marker_len);
    if (marker_count < min_markers) { return false; }
    pos -= (pos - start) % marker_len;

    markup = state.src.slice(start, pos);
    params = state.src.slice(pos, max);
    if (!validate(params)) { return false; }

    // Since start is found, we can report success here in validation mode
    //
    if (silent) { return true; }

    // Search for the end of the block
    //
    nextLine = startLine;

    for (;;) {
      nextLine++;
      if (nextLine >= endLine) {
        // unclosed block should be autoclosed by end of document.
        // also block seems to be autoclosed by end of parent
        break;
      }

      start = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];

      if (start < max && state.sCount[nextLine] < state.blkIndent) {
        // non-empty line with negative indent should stop the list:
        // - ```
        //  test
        break;
      }

      if (marker_char !== state.src.charCodeAt(start)) { continue; }

      if (state.sCount[nextLine] - state.blkIndent >= 4) {
        // closing fence should be indented less than 4 spaces
        continue;
      }

      for (pos = start + 1; pos <= max; pos++) {
        if (marker_str[(pos - start) % marker_len] !== state.src[pos]) {
          break;
        }
      }

      // closing code fence must be at least as long as the opening one
      if (Math.floor((pos - start) / marker_len) < marker_count) { continue; }

      // make sure tail has spaces only
      pos -= (pos - start) % marker_len;
      pos = state.skipSpaces(pos);

      if (pos < max) { continue; }

      // found!
      auto_closed = true;
      break;
    }

    old_parent = state.parentType;
    old_line_max = state.lineMax;
    state.parentType = 'container';

    // this will prevent lazy continuations from ever going past our end marker
    state.lineMax = nextLine;

    token        = state.push('container_' + name + '_open', 'div', 1);
    token.markup = markup;
    token.block  = true;
    token.info   = params;
    token.map    = [ startLine, nextLine ];

    state.md.block.tokenize(state, startLine + 1, nextLine);

    token        = state.push('container_' + name + '_close', 'div', -1);
    token.markup = state.src.slice(start, pos);
    token.block  = true;

    state.parentType = old_parent;
    state.lineMax = old_line_max;
    state.line = nextLine + (auto_closed ? 1 : 0);

    return true;
  }

  md.block.ruler.before('fence', 'container_' + name, container, {
    alt: [ 'paragraph', 'reference', 'blockquote', 'list' ]
  });
  md.renderer.rules['container_' + name + '_open'] = render;
  md.renderer.rules['container_' + name + '_close'] = render;
};

},{}],56:[function(require,module,exports){
// Process definition lists
//
'use strict';


module.exports = function deflist_plugin(md) {
  var isSpace = md.utils.isSpace;

  // Search `[:~][\n ]`, returns next pos after marker on success
  // or -1 on fail.
  function skipMarker(state, line) {
    var pos, marker,
        start = state.bMarks[line] + state.tShift[line],
        max = state.eMarks[line];

    if (start >= max) { return -1; }

    // Check bullet
    marker = state.src.charCodeAt(start++);
    if (marker !== 0x7E/* ~ */ && marker !== 0x3A/* : */) { return -1; }

    pos = state.skipSpaces(start);

    // require space after ":"
    if (start === pos) { return -1; }

    // no empty definitions, e.g. "  : "
    if (pos >= max) { return -1; }

    return start;
  }

  function markTightParagraphs(state, idx) {
    var i, l,
        level = state.level + 2;

    for (i = idx + 2, l = state.tokens.length - 2; i < l; i++) {
      if (state.tokens[i].level === level && state.tokens[i].type === 'paragraph_open') {
        state.tokens[i + 2].hidden = true;
        state.tokens[i].hidden = true;
        i += 2;
      }
    }
  }

  function deflist(state, startLine, endLine, silent) {
    var ch,
        contentStart,
        ddLine,
        dtLine,
        itemLines,
        listLines,
        listTokIdx,
        max,
        nextLine,
        offset,
        oldDDIndent,
        oldIndent,
        oldParentType,
        oldSCount,
        oldTShift,
        oldTight,
        pos,
        prevEmptyEnd,
        tight,
        token;

    if (silent) {
      // quirk: validation mode validates a dd block only, not a whole deflist
      if (state.ddIndent < 0) { return false; }
      return skipMarker(state, startLine) >= 0;
    }

    nextLine = startLine + 1;
    if (state.isEmpty(nextLine)) {
      if (++nextLine > endLine) { return false; }
    }

    if (state.sCount[nextLine] < state.blkIndent) { return false; }
    contentStart = skipMarker(state, nextLine);
    if (contentStart < 0) { return false; }

    // Start list
    listTokIdx = state.tokens.length;
    tight = true;

    token     = state.push('dl_open', 'dl', 1);
    token.map = listLines = [ startLine, 0 ];

    //
    // Iterate list items
    //

    dtLine = startLine;
    ddLine = nextLine;

    // One definition list can contain multiple DTs,
    // and one DT can be followed by multiple DDs.
    //
    // Thus, there is two loops here, and label is
    // needed to break out of the second one
    //
    /*eslint no-labels:0,block-scoped-var:0*/
    OUTER:
    for (;;) {
      prevEmptyEnd = false;

      token          = state.push('dt_open', 'dt', 1);
      token.map      = [ dtLine, dtLine ];

      token          = state.push('inline', '', 0);
      token.map      = [ dtLine, dtLine ];
      token.content  = state.getLines(dtLine, dtLine + 1, state.blkIndent, false).trim();
      token.children = [];

      token          = state.push('dt_close', 'dt', -1);

      for (;;) {
        token     = state.push('dd_open', 'dd', 1);
        token.map = itemLines = [ nextLine, 0 ];

        pos = contentStart;
        max = state.eMarks[ddLine];
        offset = state.sCount[ddLine] + contentStart - (state.bMarks[ddLine] + state.tShift[ddLine]);

        while (pos < max) {
          ch = state.src.charCodeAt(pos);

          if (isSpace(ch)) {
            if (ch === 0x09) {
              offset += 4 - offset % 4;
            } else {
              offset++;
            }
          } else {
            break;
          }

          pos++;
        }

        contentStart = pos;

        oldTight = state.tight;
        oldDDIndent = state.ddIndent;
        oldIndent = state.blkIndent;
        oldTShift = state.tShift[ddLine];
        oldSCount = state.sCount[ddLine];
        oldParentType = state.parentType;
        state.blkIndent = state.ddIndent = state.sCount[ddLine] + 2;
        state.tShift[ddLine] = contentStart - state.bMarks[ddLine];
        state.sCount[ddLine] = offset;
        state.tight = true;
        state.parentType = 'deflist';

        state.md.block.tokenize(state, ddLine, endLine, true);

        // If any of list item is tight, mark list as tight
        if (!state.tight || prevEmptyEnd) {
          tight = false;
        }
        // Item become loose if finish with empty line,
        // but we should filter last element, because it means list finish
        prevEmptyEnd = (state.line - ddLine) > 1 && state.isEmpty(state.line - 1);

        state.tShift[ddLine] = oldTShift;
        state.sCount[ddLine] = oldSCount;
        state.tight = oldTight;
        state.parentType = oldParentType;
        state.blkIndent = oldIndent;
        state.ddIndent = oldDDIndent;

        token = state.push('dd_close', 'dd', -1);

        itemLines[1] = nextLine = state.line;

        if (nextLine >= endLine) { break OUTER; }

        if (state.sCount[nextLine] < state.blkIndent) { break OUTER; }
        contentStart = skipMarker(state, nextLine);
        if (contentStart < 0) { break; }

        ddLine = nextLine;

        // go to the next loop iteration:
        // insert DD tag and repeat checking
      }

      if (nextLine >= endLine) { break; }
      dtLine = nextLine;

      if (state.isEmpty(dtLine)) { break; }
      if (state.sCount[dtLine] < state.blkIndent) { break; }

      ddLine = dtLine + 1;
      if (ddLine >= endLine) { break; }
      if (state.isEmpty(ddLine)) { ddLine++; }
      if (ddLine >= endLine) { break; }

      if (state.sCount[ddLine] < state.blkIndent) { break; }
      contentStart = skipMarker(state, ddLine);
      if (contentStart < 0) { break; }

      // go to the next loop iteration:
      // insert DT and DD tags and repeat checking
    }

    // Finilize list
    token = state.push('dl_close', 'dl', -1);

    listLines[1] = nextLine;

    state.line = nextLine;

    // mark paragraphs tight if needed
    if (tight) {
      markTightParagraphs(state, listTokIdx);
    }

    return true;
  }


  md.block.ruler.before('paragraph', 'deflist', deflist, { alt: [ 'paragraph', 'reference' ] });
};

},{}],57:[function(require,module,exports){
'use strict';


var emojies_defs      = require('./lib/data/full.json');
var emojies_shortcuts = require('./lib/data/shortcuts');
var emoji_html        = require('./lib/render');
var emoji_replace     = require('./lib/replace');
var normalize_opts    = require('./lib/normalize_opts');


module.exports = function emoji_plugin(md, options) {
  var defaults = {
    defs: emojies_defs,
    shortcuts: emojies_shortcuts,
    enabled: []
  };

  var opts = normalize_opts(md.utils.assign({}, defaults, options || {}));

  md.renderer.rules.emoji = emoji_html;

  md.core.ruler.push('emoji', emoji_replace(md, opts.defs, opts.shortcuts, opts.scanRE, opts.replaceRE));
};

},{"./lib/data/full.json":58,"./lib/data/shortcuts":59,"./lib/normalize_opts":60,"./lib/render":61,"./lib/replace":62}],58:[function(require,module,exports){
module.exports={
  "100": "💯",
  "1234": "🔢",
  "grinning": "😀",
  "grimacing": "😬",
  "grin": "😁",
  "joy": "😂",
  "smiley": "😃",
  "smile": "😄",
  "sweat_smile": "😅",
  "laughing": "😆",
  "satisfied": "😆",
  "innocent": "😇",
  "wink": "😉",
  "blush": "😊",
  "slightly_smiling_face": "🙂",
  "upside_down_face": "🙃",
  "relaxed": "☺️",
  "yum": "😋",
  "relieved": "😌",
  "heart_eyes": "😍",
  "kissing_heart": "😘",
  "kissing": "😗",
  "kissing_smiling_eyes": "😙",
  "kissing_closed_eyes": "😚",
  "stuck_out_tongue_winking_eye": "😜",
  "stuck_out_tongue_closed_eyes": "😝",
  "stuck_out_tongue": "😛",
  "money_mouth_face": "🤑",
  "nerd_face": "🤓",
  "sunglasses": "😎",
  "hugs": "🤗",
  "smirk": "😏",
  "no_mouth": "😶",
  "neutral_face": "😐",
  "expressionless": "😑",
  "unamused": "😒",
  "roll_eyes": "🙄",
  "thinking": "🤔",
  "flushed": "😳",
  "disappointed": "😞",
  "worried": "😟",
  "angry": "😠",
  "rage": "😡",
  "pout": "😡",
  "pensive": "😔",
  "confused": "😕",
  "slightly_frowning_face": "🙁",
  "frowning_face": "☹️",
  "persevere": "😣",
  "confounded": "😖",
  "tired_face": "😫",
  "weary": "😩",
  "triumph": "😤",
  "open_mouth": "😮",
  "scream": "😱",
  "fearful": "😨",
  "cold_sweat": "😰",
  "hushed": "😯",
  "frowning": "😦",
  "anguished": "😧",
  "cry": "😢",
  "disappointed_relieved": "😥",
  "sleepy": "😪",
  "sweat": "😓",
  "sob": "😭",
  "dizzy_face": "😵",
  "astonished": "😲",
  "zipper_mouth_face": "🤐",
  "mask": "😷",
  "face_with_thermometer": "🤒",
  "face_with_head_bandage": "🤕",
  "sleeping": "😴",
  "zzz": "💤",
  "hankey": "💩",
  "poop": "💩",
  "shit": "💩",
  "smiling_imp": "😈",
  "imp": "👿",
  "japanese_ogre": "👹",
  "japanese_goblin": "👺",
  "ghost": "👻",
  "skull": "💀",
  "skull_and_crossbones": "☠️",
  "alien": "👽",
  "space_invader": "👾",
  "robot": "🤖",
  "smiley_cat": "😺",
  "smile_cat": "😸",
  "joy_cat": "😹",
  "heart_eyes_cat": "😻",
  "smirk_cat": "😼",
  "kissing_cat": "😽",
  "scream_cat": "🙀",
  "crying_cat_face": "😿",
  "pouting_cat": "😾",
  "raised_hands": "🙌",
  "clap": "👏",
  "+1": "👍",
  "thumbsup": "👍",
  "-1": "👎",
  "thumbsdown": "👎",
  "facepunch": "👊",
  "punch": "👊",
  "fist": "✊",
  "wave": "👋",
  "point_left": "👈",
  "point_right": "👉",
  "point_up_2": "👆",
  "point_down": "👇",
  "ok_hand": "👌",
  "point_up": "☝️",
  "v": "✌️",
  "hand": "✋",
  "raised_hand": "✋",
  "raised_hand_with_fingers_splayed": "🖐",
  "open_hands": "👐",
  "muscle": "💪",
  "pray": "🙏",
  "vulcan_salute": "🖖",
  "metal": "🤘",
  "middle_finger": "🖕",
  "fu": "🖕",
  "writing_hand": "✍️",
  "nail_care": "💅",
  "lips": "👄",
  "tongue": "👅",
  "ear": "👂",
  "nose": "👃",
  "eye": "👁",
  "eyes": "👀",
  "speaking_head": "🗣",
  "bust_in_silhouette": "👤",
  "busts_in_silhouette": "👥",
  "baby": "👶",
  "boy": "👦",
  "girl": "👧",
  "man": "👨",
  "woman": "👩",
  "blonde_woman": "👱‍♀️",
  "blonde_man": "👱",
  "person_with_blond_hair": "👱",
  "older_man": "👴",
  "older_woman": "👵",
  "man_with_gua_pi_mao": "👲",
  "woman_with_turban": "👳‍♀️",
  "man_with_turban": "👳",
  "policewoman": "👮‍♀️",
  "policeman": "👮",
  "cop": "👮",
  "construction_worker_woman": "👷‍♀️",
  "construction_worker_man": "👷",
  "construction_worker": "👷",
  "guardswoman": "💂‍♀️",
  "guardsman": "💂",
  "female_detective": "🕵️‍♀️",
  "male_detective": "🕵️",
  "detective": "🕵️",
  "santa": "🎅",
  "princess": "👸",
  "bride_with_veil": "👰",
  "angel": "👼",
  "bowing_woman": "🙇‍♀️",
  "bowing_man": "🙇",
  "bow": "🙇",
  "tipping_hand_woman": "💁",
  "information_desk_person": "💁",
  "tipping_hand_man": "💁‍♂️",
  "no_good_woman": "🙅",
  "no_good": "🙅",
  "ng_woman": "🙅",
  "no_good_man": "🙅‍♂️",
  "ng_man": "🙅‍♂️",
  "ok_woman": "🙆",
  "ok_man": "🙆‍♂️",
  "raising_hand_woman": "🙋",
  "raising_hand": "🙋",
  "raising_hand_man": "🙋‍♂️",
  "pouting_woman": "🙎",
  "person_with_pouting_face": "🙎",
  "pouting_man": "🙎‍♂️",
  "frowning_woman": "🙍",
  "person_frowning": "🙍",
  "frowning_man": "🙍‍♂️",
  "haircut_woman": "💇",
  "haircut": "💇",
  "haircut_man": "💇‍♂️",
  "massage_woman": "💆",
  "massage": "💆",
  "massage_man": "💆‍♂️",
  "dancer": "💃",
  "dancing_women": "👯",
  "dancers": "👯",
  "dancing_men": "👯‍♂️",
  "walking_woman": "🚶‍♀️",
  "walking_man": "🚶",
  "walking": "🚶",
  "running_woman": "🏃‍♀️",
  "running_man": "🏃",
  "runner": "🏃",
  "running": "🏃",
  "couple": "👫",
  "two_women_holding_hands": "👭",
  "two_men_holding_hands": "👬",
  "couple_with_heart_woman_man": "💑",
  "couple_with_heart": "💑",
  "couple_with_heart_woman_woman": "👩‍❤️‍👩",
  "couple_with_heart_man_man": "👨‍❤️‍👨",
  "couplekiss_man_woman": "💏",
  "couplekiss_woman_woman": "👩‍❤️‍💋‍👩",
  "couplekiss_man_man": "👨‍❤️‍💋‍👨",
  "family_man_woman_boy": "👪",
  "family": "👪",
  "family_man_woman_girl": "👨‍👩‍👧",
  "family_man_woman_girl_boy": "👨‍👩‍👧‍👦",
  "family_man_woman_boy_boy": "👨‍👩‍👦‍👦",
  "family_man_woman_girl_girl": "👨‍👩‍👧‍👧",
  "family_woman_woman_boy": "👩‍👩‍👦",
  "family_woman_woman_girl": "👩‍👩‍👧",
  "family_woman_woman_girl_boy": "👩‍👩‍👧‍👦",
  "family_woman_woman_boy_boy": "👩‍👩‍👦‍👦",
  "family_woman_woman_girl_girl": "👩‍👩‍👧‍👧",
  "family_man_man_boy": "👨‍👨‍👦",
  "family_man_man_girl": "👨‍👨‍👧",
  "family_man_man_girl_boy": "👨‍👨‍👧‍👦",
  "family_man_man_boy_boy": "👨‍👨‍👦‍👦",
  "family_man_man_girl_girl": "👨‍👨‍👧‍👧",
  "family_woman_boy": "👩‍👦",
  "family_woman_girl": "👩‍👧",
  "family_woman_girl_boy": "👩‍👧‍👦",
  "family_woman_boy_boy": "👩‍👦‍👦",
  "family_woman_girl_girl": "👩‍👧‍👧",
  "family_man_boy": "👨‍👦",
  "family_man_girl": "👨‍👧",
  "family_man_girl_boy": "👨‍👧‍👦",
  "family_man_boy_boy": "👨‍👦‍👦",
  "family_man_girl_girl": "👨‍👧‍👧",
  "womans_clothes": "👚",
  "shirt": "👕",
  "tshirt": "👕",
  "jeans": "👖",
  "necktie": "👔",
  "dress": "👗",
  "bikini": "👙",
  "kimono": "👘",
  "lipstick": "💄",
  "kiss": "💋",
  "footprints": "👣",
  "high_heel": "👠",
  "sandal": "👡",
  "boot": "👢",
  "mans_shoe": "👞",
  "shoe": "👞",
  "athletic_shoe": "👟",
  "womans_hat": "👒",
  "tophat": "🎩",
  "mortar_board": "🎓",
  "crown": "👑",
  "rescue_worker_helmet": "⛑",
  "school_satchel": "🎒",
  "pouch": "👝",
  "purse": "👛",
  "handbag": "👜",
  "briefcase": "💼",
  "eyeglasses": "👓",
  "dark_sunglasses": "🕶",
  "ring": "💍",
  "closed_umbrella": "🌂",
  "dog": "🐶",
  "cat": "🐱",
  "mouse": "🐭",
  "hamster": "🐹",
  "rabbit": "🐰",
  "bear": "🐻",
  "panda_face": "🐼",
  "koala": "🐨",
  "tiger": "🐯",
  "lion": "🦁",
  "cow": "🐮",
  "pig": "🐷",
  "pig_nose": "🐽",
  "frog": "🐸",
  "octopus": "🐙",
  "monkey_face": "🐵",
  "see_no_evil": "🙈",
  "hear_no_evil": "🙉",
  "speak_no_evil": "🙊",
  "monkey": "🐒",
  "chicken": "🐔",
  "penguin": "🐧",
  "bird": "🐦",
  "baby_chick": "🐤",
  "hatching_chick": "🐣",
  "hatched_chick": "🐥",
  "wolf": "🐺",
  "boar": "🐗",
  "horse": "🐴",
  "unicorn": "🦄",
  "bee": "🐝",
  "honeybee": "🐝",
  "bug": "🐛",
  "snail": "🐌",
  "beetle": "🐞",
  "ant": "🐜",
  "spider": "🕷",
  "scorpion": "🦂",
  "crab": "🦀",
  "snake": "🐍",
  "turtle": "🐢",
  "tropical_fish": "🐠",
  "fish": "🐟",
  "blowfish": "🐡",
  "dolphin": "🐬",
  "flipper": "🐬",
  "whale": "🐳",
  "whale2": "🐋",
  "crocodile": "🐊",
  "leopard": "🐆",
  "tiger2": "🐅",
  "water_buffalo": "🐃",
  "ox": "🐂",
  "cow2": "🐄",
  "dromedary_camel": "🐪",
  "camel": "🐫",
  "elephant": "🐘",
  "goat": "🐐",
  "ram": "🐏",
  "sheep": "🐑",
  "racehorse": "🐎",
  "pig2": "🐖",
  "rat": "🐀",
  "mouse2": "🐁",
  "rooster": "🐓",
  "turkey": "🦃",
  "dove": "🕊",
  "dog2": "🐕",
  "poodle": "🐩",
  "cat2": "🐈",
  "rabbit2": "🐇",
  "chipmunk": "🐿",
  "feet": "🐾",
  "paw_prints": "🐾",
  "dragon": "🐉",
  "dragon_face": "🐲",
  "cactus": "🌵",
  "christmas_tree": "🎄",
  "evergreen_tree": "🌲",
  "deciduous_tree": "🌳",
  "palm_tree": "🌴",
  "seedling": "🌱",
  "herb": "🌿",
  "shamrock": "☘",
  "four_leaf_clover": "🍀",
  "bamboo": "🎍",
  "tanabata_tree": "🎋",
  "leaves": "🍃",
  "fallen_leaf": "🍂",
  "maple_leaf": "🍁",
  "ear_of_rice": "🌾",
  "hibiscus": "🌺",
  "sunflower": "🌻",
  "rose": "🌹",
  "tulip": "🌷",
  "blossom": "🌼",
  "cherry_blossom": "🌸",
  "bouquet": "💐",
  "mushroom": "🍄",
  "chestnut": "🌰",
  "jack_o_lantern": "🎃",
  "shell": "🐚",
  "spider_web": "🕸",
  "earth_americas": "🌎",
  "earth_africa": "🌍",
  "earth_asia": "🌏",
  "full_moon": "🌕",
  "waning_gibbous_moon": "🌖",
  "last_quarter_moon": "🌗",
  "waning_crescent_moon": "🌘",
  "new_moon": "🌑",
  "waxing_crescent_moon": "🌒",
  "first_quarter_moon": "🌓",
  "moon": "🌔",
  "waxing_gibbous_moon": "🌔",
  "new_moon_with_face": "🌚",
  "full_moon_with_face": "🌝",
  "first_quarter_moon_with_face": "🌛",
  "last_quarter_moon_with_face": "🌜",
  "sun_with_face": "🌞",
  "crescent_moon": "🌙",
  "star": "⭐️",
  "star2": "🌟",
  "dizzy": "💫",
  "sparkles": "✨",
  "comet": "☄️",
  "sunny": "☀️",
  "sun_behind_small_cloud": "🌤",
  "partly_sunny": "⛅️",
  "sun_behind_large_cloud": "🌥",
  "sun_behind_rain_cloud": "🌦",
  "cloud": "☁️",
  "cloud_with_rain": "🌧",
  "cloud_with_lightning_and_rain": "⛈",
  "cloud_with_lightning": "🌩",
  "zap": "⚡️",
  "fire": "🔥",
  "boom": "💥",
  "collision": "💥",
  "snowflake": "❄️",
  "cloud_with_snow": "🌨",
  "snowman_with_snow": "☃️",
  "snowman": "⛄️",
  "wind_face": "🌬",
  "dash": "💨",
  "tornado": "🌪",
  "fog": "🌫",
  "open_umbrella": "☂️",
  "umbrella": "☔️",
  "droplet": "💧",
  "sweat_drops": "💦",
  "ocean": "🌊",
  "green_apple": "🍏",
  "apple": "🍎",
  "pear": "🍐",
  "tangerine": "🍊",
  "orange": "🍊",
  "mandarin": "🍊",
  "lemon": "🍋",
  "banana": "🍌",
  "watermelon": "🍉",
  "grapes": "🍇",
  "strawberry": "🍓",
  "melon": "🍈",
  "cherries": "🍒",
  "peach": "🍑",
  "pineapple": "🍍",
  "tomato": "🍅",
  "eggplant": "🍆",
  "hot_pepper": "🌶",
  "corn": "🌽",
  "sweet_potato": "🍠",
  "honey_pot": "🍯",
  "bread": "🍞",
  "cheese": "🧀",
  "poultry_leg": "🍗",
  "meat_on_bone": "🍖",
  "fried_shrimp": "🍤",
  "egg": "🍳",
  "hamburger": "🍔",
  "fries": "🍟",
  "hotdog": "🌭",
  "pizza": "🍕",
  "spaghetti": "🍝",
  "taco": "🌮",
  "burrito": "🌯",
  "ramen": "🍜",
  "stew": "🍲",
  "fish_cake": "🍥",
  "sushi": "🍣",
  "bento": "🍱",
  "curry": "🍛",
  "rice_ball": "🍙",
  "rice": "🍚",
  "rice_cracker": "🍘",
  "oden": "🍢",
  "dango": "🍡",
  "shaved_ice": "🍧",
  "ice_cream": "🍨",
  "icecream": "🍦",
  "cake": "🍰",
  "birthday": "🎂",
  "custard": "🍮",
  "candy": "🍬",
  "lollipop": "🍭",
  "chocolate_bar": "🍫",
  "popcorn": "🍿",
  "doughnut": "🍩",
  "cookie": "🍪",
  "beer": "🍺",
  "beers": "🍻",
  "wine_glass": "🍷",
  "cocktail": "🍸",
  "tropical_drink": "🍹",
  "champagne": "🍾",
  "sake": "🍶",
  "tea": "🍵",
  "coffee": "☕️",
  "baby_bottle": "🍼",
  "fork_and_knife": "🍴",
  "plate_with_cutlery": "🍽",
  "soccer": "⚽️",
  "basketball": "🏀",
  "football": "🏈",
  "baseball": "⚾️",
  "tennis": "🎾",
  "volleyball": "🏐",
  "rugby_football": "🏉",
  "8ball": "🎱",
  "ping_pong": "🏓",
  "badminton": "🏸",
  "ice_hockey": "🏒",
  "field_hockey": "🏑",
  "cricket": "🏏",
  "bow_and_arrow": "🏹",
  "golf": "⛳️",
  "fishing_pole_and_fish": "🎣",
  "ice_skate": "⛸",
  "ski": "🎿",
  "skier": "⛷",
  "snowboarder": "🏂",
  "weight_lifting_woman": "🏋️‍♀️",
  "weight_lifting_man": "🏋️",
  "basketball_woman": "⛹️‍♀️",
  "basketball_man": "⛹️",
  "golfing_woman": "🏌️‍♀️",
  "golfing_man": "🏌️",
  "surfing_woman": "🏄‍♀️",
  "surfing_man": "🏄",
  "surfer": "🏄",
  "swimming_woman": "🏊‍♀️",
  "swimming_man": "🏊",
  "swimmer": "🏊",
  "rowing_woman": "🚣‍♀️",
  "rowing_man": "🚣",
  "rowboat": "🚣",
  "horse_racing": "🏇",
  "biking_woman": "🚴‍♀️",
  "biking_man": "🚴",
  "bicyclist": "🚴",
  "mountain_biking_woman": "🚵‍♀️",
  "mountain_biking_man": "🚵",
  "mountain_bicyclist": "🚵",
  "bath": "🛀",
  "business_suit_levitating": "🕴",
  "reminder_ribbon": "🎗",
  "running_shirt_with_sash": "🎽",
  "medal_sports": "🏅",
  "medal_military": "🎖",
  "trophy": "🏆",
  "rosette": "🏵",
  "dart": "🎯",
  "ticket": "🎫",
  "tickets": "🎟",
  "performing_arts": "🎭",
  "art": "🎨",
  "circus_tent": "🎪",
  "clapper": "🎬",
  "microphone": "🎤",
  "headphones": "🎧",
  "musical_score": "🎼",
  "musical_keyboard": "🎹",
  "saxophone": "🎷",
  "trumpet": "🎺",
  "guitar": "🎸",
  "violin": "🎻",
  "video_game": "🎮",
  "slot_machine": "🎰",
  "game_die": "🎲",
  "bowling": "🎳",
  "car": "🚗",
  "red_car": "🚗",
  "taxi": "🚕",
  "blue_car": "🚙",
  "bus": "🚌",
  "trolleybus": "🚎",
  "racing_car": "🏎",
  "police_car": "🚓",
  "ambulance": "🚑",
  "fire_engine": "🚒",
  "minibus": "🚐",
  "truck": "🚚",
  "articulated_lorry": "🚛",
  "tractor": "🚜",
  "motorcycle": "🏍",
  "bike": "🚲",
  "rotating_light": "🚨",
  "oncoming_police_car": "🚔",
  "oncoming_bus": "🚍",
  "oncoming_automobile": "🚘",
  "oncoming_taxi": "🚖",
  "aerial_tramway": "🚡",
  "mountain_cableway": "🚠",
  "suspension_railway": "🚟",
  "railway_car": "🚃",
  "train": "🚋",
  "monorail": "🚝",
  "bullettrain_side": "🚄",
  "bullettrain_front": "🚅",
  "light_rail": "🚈",
  "mountain_railway": "🚞",
  "steam_locomotive": "🚂",
  "train2": "🚆",
  "metro": "🚇",
  "tram": "🚊",
  "station": "🚉",
  "helicopter": "🚁",
  "small_airplane": "🛩",
  "airplane": "✈️",
  "flight_departure": "🛫",
  "flight_arrival": "🛬",
  "boat": "⛵️",
  "sailboat": "⛵️",
  "motor_boat": "🛥",
  "speedboat": "🚤",
  "ferry": "⛴",
  "passenger_ship": "🛳",
  "rocket": "🚀",
  "artificial_satellite": "🛰",
  "seat": "💺",
  "anchor": "⚓️",
  "construction": "🚧",
  "fuelpump": "⛽️",
  "busstop": "🚏",
  "vertical_traffic_light": "🚦",
  "traffic_light": "🚥",
  "world_map": "🗺",
  "ship": "🚢",
  "ferris_wheel": "🎡",
  "roller_coaster": "🎢",
  "carousel_horse": "🎠",
  "building_construction": "🏗",
  "foggy": "🌁",
  "tokyo_tower": "🗼",
  "factory": "🏭",
  "fountain": "⛲️",
  "rice_scene": "🎑",
  "mountain": "⛰",
  "mountain_snow": "🏔",
  "mount_fuji": "🗻",
  "volcano": "🌋",
  "japan": "🗾",
  "camping": "🏕",
  "tent": "⛺️",
  "national_park": "🏞",
  "motorway": "🛣",
  "railway_track": "🛤",
  "sunrise": "🌅",
  "sunrise_over_mountains": "🌄",
  "desert": "🏜",
  "beach_umbrella": "🏖",
  "desert_island": "🏝",
  "city_sunrise": "🌇",
  "city_sunset": "🌆",
  "cityscape": "🏙",
  "night_with_stars": "🌃",
  "bridge_at_night": "🌉",
  "milky_way": "🌌",
  "stars": "🌠",
  "sparkler": "🎇",
  "fireworks": "🎆",
  "rainbow": "🌈",
  "houses": "🏘",
  "european_castle": "🏰",
  "japanese_castle": "🏯",
  "stadium": "🏟",
  "statue_of_liberty": "🗽",
  "house": "🏠",
  "house_with_garden": "🏡",
  "derelict_house": "🏚",
  "office": "🏢",
  "department_store": "🏬",
  "post_office": "🏣",
  "european_post_office": "🏤",
  "hospital": "🏥",
  "bank": "🏦",
  "hotel": "🏨",
  "convenience_store": "🏪",
  "school": "🏫",
  "love_hotel": "🏩",
  "wedding": "💒",
  "classical_building": "🏛",
  "church": "⛪️",
  "mosque": "🕌",
  "synagogue": "🕍",
  "kaaba": "🕋",
  "shinto_shrine": "⛩",
  "watch": "⌚️",
  "iphone": "📱",
  "calling": "📲",
  "computer": "💻",
  "keyboard": "⌨️",
  "desktop_computer": "🖥",
  "printer": "🖨",
  "computer_mouse": "🖱",
  "trackball": "🖲",
  "joystick": "🕹",
  "clamp": "🗜",
  "minidisc": "💽",
  "floppy_disk": "💾",
  "cd": "💿",
  "dvd": "📀",
  "vhs": "📼",
  "camera": "📷",
  "camera_flash": "📸",
  "video_camera": "📹",
  "movie_camera": "🎥",
  "film_projector": "📽",
  "film_strip": "🎞",
  "telephone_receiver": "📞",
  "phone": "☎️",
  "telephone": "☎️",
  "pager": "📟",
  "fax": "📠",
  "tv": "📺",
  "radio": "📻",
  "studio_microphone": "🎙",
  "level_slider": "🎚",
  "control_knobs": "🎛",
  "stopwatch": "⏱",
  "timer_clock": "⏲",
  "alarm_clock": "⏰",
  "mantelpiece_clock": "🕰",
  "hourglass_flowing_sand": "⏳",
  "hourglass": "⌛️",
  "satellite": "📡",
  "battery": "🔋",
  "electric_plug": "🔌",
  "bulb": "💡",
  "flashlight": "🔦",
  "candle": "🕯",
  "wastebasket": "🗑",
  "oil_drum": "🛢",
  "money_with_wings": "💸",
  "dollar": "💵",
  "yen": "💴",
  "euro": "💶",
  "pound": "💷",
  "moneybag": "💰",
  "credit_card": "💳",
  "gem": "💎",
  "balance_scale": "⚖",
  "wrench": "🔧",
  "hammer": "🔨",
  "hammer_and_pick": "⚒",
  "hammer_and_wrench": "🛠",
  "pick": "⛏",
  "nut_and_bolt": "🔩",
  "gear": "⚙",
  "chains": "⛓",
  "gun": "🔫",
  "bomb": "💣",
  "hocho": "🔪",
  "knife": "🔪",
  "dagger": "🗡",
  "crossed_swords": "⚔",
  "shield": "🛡",
  "smoking": "🚬",
  "coffin": "⚰",
  "funeral_urn": "⚱",
  "amphora": "🏺",
  "crystal_ball": "🔮",
  "prayer_beads": "📿",
  "barber": "💈",
  "alembic": "⚗",
  "telescope": "🔭",
  "microscope": "🔬",
  "hole": "🕳",
  "pill": "💊",
  "syringe": "💉",
  "thermometer": "🌡",
  "toilet": "🚽",
  "shower": "🚿",
  "bathtub": "🛁",
  "bellhop_bell": "🛎",
  "key": "🔑",
  "old_key": "🗝",
  "door": "🚪",
  "couch_and_lamp": "🛋",
  "sleeping_bed": "🛌",
  "bed": "🛏",
  "framed_picture": "🖼",
  "parasol_on_ground": "⛱",
  "moyai": "🗿",
  "shopping": "🛍",
  "gift": "🎁",
  "balloon": "🎈",
  "flags": "🎏",
  "ribbon": "🎀",
  "confetti_ball": "🎊",
  "tada": "🎉",
  "wind_chime": "🎐",
  "izakaya_lantern": "🏮",
  "lantern": "🏮",
  "dolls": "🎎",
  "email": "✉️",
  "envelope": "✉️",
  "envelope_with_arrow": "📩",
  "incoming_envelope": "📨",
  "e-mail": "📧",
  "love_letter": "💌",
  "inbox_tray": "📥",
  "outbox_tray": "📤",
  "package": "📦",
  "label": "🏷",
  "bookmark": "🔖",
  "mailbox_closed": "📪",
  "mailbox": "📫",
  "mailbox_with_mail": "📬",
  "mailbox_with_no_mail": "📭",
  "postbox": "📮",
  "postal_horn": "📯",
  "scroll": "📜",
  "page_with_curl": "📃",
  "page_facing_up": "📄",
  "bookmark_tabs": "📑",
  "bar_chart": "📊",
  "chart_with_upwards_trend": "📈",
  "chart_with_downwards_trend": "📉",
  "spiral_notepad": "🗒",
  "spiral_calendar": "🗓",
  "calendar": "📆",
  "date": "📅",
  "card_index": "📇",
  "card_file_box": "🗃",
  "ballot_box": "🗳",
  "file_cabinet": "🗄",
  "clipboard": "📋",
  "file_folder": "📁",
  "open_file_folder": "📂",
  "card_index_dividers": "🗂",
  "newspaper_roll": "🗞",
  "newspaper": "📰",
  "notebook": "📓",
  "notebook_with_decorative_cover": "📔",
  "ledger": "📒",
  "closed_book": "📕",
  "green_book": "📗",
  "blue_book": "📘",
  "orange_book": "📙",
  "books": "📚",
  "book": "📖",
  "open_book": "📖",
  "link": "🔗",
  "paperclip": "📎",
  "paperclips": "🖇",
  "triangular_ruler": "📐",
  "straight_ruler": "📏",
  "scissors": "✂️",
  "pushpin": "📌",
  "round_pushpin": "📍",
  "triangular_flag_on_post": "🚩",
  "crossed_flags": "🎌",
  "white_flag": "🏳️",
  "black_flag": "🏴",
  "checkered_flag": "🏁",
  "rainbow_flag": "🏳️‍🌈",
  "paintbrush": "🖌",
  "crayon": "🖍",
  "pen": "🖊",
  "fountain_pen": "🖋",
  "black_nib": "✒️",
  "memo": "📝",
  "pencil": "📝",
  "pencil2": "✏️",
  "lock_with_ink_pen": "🔏",
  "closed_lock_with_key": "🔐",
  "lock": "🔒",
  "unlock": "🔓",
  "mag": "🔍",
  "mag_right": "🔎",
  "heart": "❤️",
  "yellow_heart": "💛",
  "green_heart": "💚",
  "blue_heart": "💙",
  "purple_heart": "💜",
  "broken_heart": "💔",
  "heavy_heart_exclamation": "❣️",
  "two_hearts": "💕",
  "revolving_hearts": "💞",
  "heartbeat": "💓",
  "heartpulse": "💗",
  "sparkling_heart": "💖",
  "cupid": "💘",
  "gift_heart": "💝",
  "heart_decoration": "💟",
  "peace_symbol": "☮️",
  "latin_cross": "✝️",
  "star_and_crescent": "☪️",
  "om": "🕉",
  "wheel_of_dharma": "☸️",
  "star_of_david": "✡️",
  "six_pointed_star": "🔯",
  "menorah": "🕎",
  "yin_yang": "☯️",
  "orthodox_cross": "☦️",
  "place_of_worship": "🛐",
  "ophiuchus": "⛎",
  "aries": "♈️",
  "taurus": "♉️",
  "gemini": "♊️",
  "cancer": "♋️",
  "leo": "♌️",
  "virgo": "♍️",
  "libra": "♎️",
  "scorpius": "♏️",
  "sagittarius": "♐️",
  "capricorn": "♑️",
  "aquarius": "♒️",
  "pisces": "♓️",
  "id": "🆔",
  "atom_symbol": "⚛",
  "radioactive": "☢️",
  "biohazard": "☣️",
  "mobile_phone_off": "📴",
  "vibration_mode": "📳",
  "eight_pointed_black_star": "✴️",
  "vs": "🆚",
  "accept": "🉑",
  "white_flower": "💮",
  "ideograph_advantage": "🉐",
  "secret": "㊙️",
  "congratulations": "㊗️",
  "u6e80": "🈵",
  "a": "🅰️",
  "b": "🅱️",
  "ab": "🆎",
  "cl": "🆑",
  "o2": "🅾️",
  "sos": "🆘",
  "no_entry": "⛔️",
  "name_badge": "📛",
  "no_entry_sign": "🚫",
  "x": "❌",
  "o": "⭕️",
  "anger": "💢",
  "hotsprings": "♨️",
  "no_pedestrians": "🚷",
  "do_not_litter": "🚯",
  "no_bicycles": "🚳",
  "non-potable_water": "🚱",
  "underage": "🔞",
  "no_mobile_phones": "📵",
  "exclamation": "❗️",
  "heavy_exclamation_mark": "❗️",
  "grey_exclamation": "❕",
  "question": "❓",
  "grey_question": "❔",
  "bangbang": "‼️",
  "interrobang": "⁉️",
  "low_brightness": "🔅",
  "high_brightness": "🔆",
  "trident": "🔱",
  "fleur_de_lis": "⚜",
  "part_alternation_mark": "〽️",
  "warning": "⚠️",
  "children_crossing": "🚸",
  "beginner": "🔰",
  "recycle": "♻️",
  "chart": "💹",
  "sparkle": "❇️",
  "eight_spoked_asterisk": "✳️",
  "negative_squared_cross_mark": "❎",
  "white_check_mark": "✅",
  "globe_with_meridians": "🌐",
  "m": "Ⓜ️",
  "diamond_shape_with_a_dot_inside": "💠",
  "cyclone": "🌀",
  "loop": "➿",
  "atm": "🏧",
  "sa": "🈂️",
  "passport_control": "🛂",
  "customs": "🛃",
  "baggage_claim": "🛄",
  "left_luggage": "🛅",
  "wheelchair": "♿️",
  "no_smoking": "🚭",
  "wc": "🚾",
  "parking": "🅿️",
  "potable_water": "🚰",
  "mens": "🚹",
  "womens": "🚺",
  "baby_symbol": "🚼",
  "restroom": "🚻",
  "put_litter_in_its_place": "🚮",
  "cinema": "🎦",
  "signal_strength": "📶",
  "koko": "🈁",
  "abc": "🔤",
  "abcd": "🔡",
  "capital_abcd": "🔠",
  "symbols": "🔣",
  "information_source": "ℹ️",
  "ng": "🆖",
  "ok": "🆗",
  "up": "🆙",
  "cool": "🆒",
  "new": "🆕",
  "free": "🆓",
  "zero": "0️⃣",
  "one": "1️⃣",
  "two": "2️⃣",
  "three": "3️⃣",
  "four": "4️⃣",
  "five": "5️⃣",
  "six": "6️⃣",
  "seven": "7️⃣",
  "eight": "8️⃣",
  "nine": "9️⃣",
  "keycap_ten": "🔟",
  "hash": "#️⃣",
  "asterisk": "*️⃣",
  "arrow_forward": "▶️",
  "pause_button": "⏸",
  "play_or_pause_button": "⏯",
  "stop_button": "⏹",
  "record_button": "⏺",
  "next_track_button": "⏭",
  "previous_track_button": "⏮",
  "fast_forward": "⏩",
  "rewind": "⏪",
  "arrow_double_up": "⏫",
  "arrow_double_down": "⏬",
  "arrow_backward": "◀️",
  "arrow_up_small": "🔼",
  "arrow_down_small": "🔽",
  "arrow_right": "➡️",
  "arrow_left": "⬅️",
  "arrow_up": "⬆️",
  "arrow_down": "⬇️",
  "arrow_upper_right": "↗️",
  "arrow_lower_right": "↘️",
  "arrow_lower_left": "↙️",
  "arrow_upper_left": "↖️",
  "arrow_up_down": "↕️",
  "left_right_arrow": "↔️",
  "arrow_right_hook": "↪️",
  "leftwards_arrow_with_hook": "↩️",
  "arrow_heading_up": "⤴️",
  "arrow_heading_down": "⤵️",
  "twisted_rightwards_arrows": "🔀",
  "repeat": "🔁",
  "repeat_one": "🔂",
  "arrows_counterclockwise": "🔄",
  "arrows_clockwise": "🔃",
  "musical_note": "🎵",
  "notes": "🎶",
  "wavy_dash": "〰️",
  "curly_loop": "➰",
  "heavy_check_mark": "✔️",
  "heavy_plus_sign": "➕",
  "heavy_minus_sign": "➖",
  "heavy_division_sign": "➗",
  "heavy_multiplication_x": "✖️",
  "heavy_dollar_sign": "💲",
  "currency_exchange": "💱",
  "tm": "™️",
  "copyright": "©️",
  "registered": "®️",
  "end": "🔚",
  "back": "🔙",
  "on": "🔛",
  "top": "🔝",
  "soon": "🔜",
  "ballot_box_with_check": "☑️",
  "radio_button": "🔘",
  "white_circle": "⚪️",
  "black_circle": "⚫️",
  "red_circle": "🔴",
  "large_blue_circle": "🔵",
  "small_red_triangle": "🔺",
  "small_red_triangle_down": "🔻",
  "small_orange_diamond": "🔸",
  "small_blue_diamond": "🔹",
  "large_orange_diamond": "🔶",
  "large_blue_diamond": "🔷",
  "white_square_button": "🔳",
  "black_square_button": "🔲",
  "black_small_square": "▪️",
  "white_small_square": "▫️",
  "black_medium_small_square": "◾️",
  "white_medium_small_square": "◽️",
  "black_medium_square": "◼️",
  "white_medium_square": "◻️",
  "black_large_square": "⬛️",
  "white_large_square": "⬜️",
  "mute": "🔇",
  "speaker": "🔈",
  "sound": "🔉",
  "loud_sound": "🔊",
  "no_bell": "🔕",
  "bell": "🔔",
  "mega": "📣",
  "loudspeaker": "📢",
  "eye_speech_bubble": "👁‍🗨",
  "speech_balloon": "💬",
  "thought_balloon": "💭",
  "right_anger_bubble": "🗯",
  "black_joker": "🃏",
  "mahjong": "🀄️",
  "flower_playing_cards": "🎴",
  "spades": "♠️",
  "clubs": "♣️",
  "hearts": "♥️",
  "diamonds": "♦️",
  "clock1": "🕐",
  "clock2": "🕑",
  "clock3": "🕒",
  "clock4": "🕓",
  "clock5": "🕔",
  "clock6": "🕕",
  "clock7": "🕖",
  "clock8": "🕗",
  "clock9": "🕘",
  "clock10": "🕙",
  "clock11": "🕚",
  "clock12": "🕛",
  "clock130": "🕜",
  "clock230": "🕝",
  "clock330": "🕞",
  "clock430": "🕟",
  "clock530": "🕠",
  "clock630": "🕡",
  "clock730": "🕢",
  "clock830": "🕣",
  "clock930": "🕤",
  "clock1030": "🕥",
  "clock1130": "🕦",
  "clock1230": "🕧",
  "cn": "🇨🇳",
  "uk": "🇬🇧",
  "us": "🇺🇸",
}
},{}],59:[function(require,module,exports){
// Emoticons -> Emoji mapping.
//
// (!) Some patterns skipped, to avoid collisions
// without increase matcher complicity. Than can change in future.
//
// Places to look for more emoticons info:
//
// - http://en.wikipedia.org/wiki/List_of_emoticons#Western
// - https://github.com/wooorm/emoticon/blob/master/Support.md
// - http://factoryjoe.com/projects/emoticons/
//
'use strict';

module.exports = {
  angry:            [ '>:(', '>:-(' ],
  blush:            [ ':")', ':-")' ],
  broken_heart:     [ '</3', '<\\3' ],
  // :\ and :-\ not used because of conflict with markdown escaping
  confused:         [ ':/', ':-/' ], // twemoji shows question
  cry:              [ ":'(", ":'-(", ':,(', ':,-(' ],
  frowning:         [ ':(', ':-(' ],
  heart:            [ '<3' ],
  imp:              [ ']:(', ']:-(' ],
  innocent:         [ 'o:)', 'O:)', 'o:-)', 'O:-)', '0:)', '0:-)' ],
  joy:              [ ":')", ":'-)", ':,)', ':,-)', ":'D", ":'-D", ':,D', ':,-D' ],
  kissing:          [ ':*', ':-*' ],
  laughing:         [ 'x-)', 'X-)' ],
  neutral_face:     [ ':|', ':-|' ],
  open_mouth:       [ ':o', ':-o', ':O', ':-O' ],
  rage:             [ ':@', ':-@' ],
  smile:            [ ':D', ':-D' ],
  smiley:           [ ':)', ':-)' ],
  smiling_imp:      [ ']:)', ']:-)' ],
  sob:              [ ":,'(", ":,'-(", ';(', ';-(' ],
  stuck_out_tongue: [ ':P', ':-P' ],
  sunglasses:       [ '8-)', 'B-)' ],
  sweat:            [ ',:(', ',:-(' ],
  sweat_smile:      [ ',:)', ',:-)' ],
  unamused:         [ ':s', ':-S', ':z', ':-Z', ':$', ':-$' ],
  wink:             [ ';)', ';-)' ]
};

},{}],60:[function(require,module,exports){
// Convert input options to more useable format
// and compile search regexp

'use strict';


function quoteRE (str) {
  return str.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&');
}


module.exports = function normalize_opts(options) {
  var emojies = options.defs,
      shortcuts;

  // Filter emojies by whitelist, if needed
  if (options.enabled.length) {
    emojies = Object.keys(emojies).reduce(function (acc, key) {
      if (options.enabled.indexOf(key) >= 0) {
        acc[key] = emojies[key];
      }
      return acc;
    }, {});
  }

  // Flatten shortcuts to simple object: { alias: emoji_name }
  shortcuts = Object.keys(options.shortcuts).reduce(function (acc, key) {
    // Skip aliases for filtered emojies, to reduce regexp
    if (!emojies[key]) { return acc; }

    if (Array.isArray(options.shortcuts[key])) {
      options.shortcuts[key].forEach(function (alias) {
        acc[alias] = key;
      });
      return acc;
    }

    acc[options.shortcuts[key]] = key;
    return acc;
  }, {});

  // Compile regexp
  var names = Object.keys(emojies)
                .map(function (name) { return ':' + name + ':'; })
                .concat(Object.keys(shortcuts))
                .sort()
                .reverse()
                .map(function (name) { return quoteRE(name); })
                .join('|');
  var scanRE = RegExp(names);
  var replaceRE = RegExp(names, 'g');

  return {
    defs: emojies,
    shortcuts: shortcuts,
    scanRE: scanRE,
    replaceRE: replaceRE
  };
};

},{}],61:[function(require,module,exports){
'use strict';

module.exports = function emoji_html(tokens, idx /*, options, env */) {
  return tokens[idx].content;
};

},{}],62:[function(require,module,exports){
// Emojies & shortcuts replacement logic.
//
// Note: In theory, it could be faster to parse :smile: in inline chain and
// leave only shortcuts here. But, who care...
//

'use strict';


module.exports = function create_rule(md, emojies, shortcuts, scanRE, replaceRE) {
  var arrayReplaceAt = md.utils.arrayReplaceAt,
      ucm = md.utils.lib.ucmicro,
      ZPCc = new RegExp([ ucm.Z.source, ucm.P.source, ucm.Cc.source ].join('|'));

  function splitTextToken(text, level, Token) {
    var token, last_pos = 0, nodes = [];

    text.replace(replaceRE, function(match, offset, src) {
      var emoji_name;
      // Validate emoji name
      if (shortcuts.hasOwnProperty(match)) {
        // replace shortcut with full name
        emoji_name = shortcuts[match];

        // Don't allow letters before any shortcut (as in no ":/" in http://)
        if (offset > 0 && !ZPCc.test(src[offset - 1])) {
          return;
        }

        // Don't allow letters after any shortcut
        if (offset + match.length < src.length && !ZPCc.test(src[offset + match.length])) {
          return;
        }
      } else {
        emoji_name = match.slice(1, -1);
      }

      // Add new tokens to pending list
      if (offset > last_pos) {
        token         = new Token('text', '', 0);
        token.content = text.slice(last_pos, offset);
        nodes.push(token);
      }

      token         = new Token('emoji', '', 0);
      token.markup  = emoji_name;
      token.content = emojies[emoji_name];
      nodes.push(token);

      last_pos = offset + match.length;
    });

    if (last_pos < text.length) {
      token         = new Token('text', '', 0);
      token.content = text.slice(last_pos);
      nodes.push(token);
    }

    return nodes;
  }

  return function emoji_replace(state) {
    var i, j, l, tokens, token,
        blockTokens = state.tokens,
        autolinkLevel = 0;

    for (j = 0, l = blockTokens.length; j < l; j++) {
      if (blockTokens[j].type !== 'inline') { continue; }
      tokens = blockTokens[j].children;

      // We scan from the end, to keep position when new tags added.
      // Use reversed logic in links start/end match
      for (i = tokens.length - 1; i >= 0; i--) {
        token = tokens[i];

        if (token.type === 'link_open' || token.type === 'link_close') {
          if (token.info === 'auto') { autolinkLevel -= token.nesting; }
        }

        if (token.type === 'text' && scanRE.test(token.content) && autolinkLevel === 0) {
          // replace current node
          blockTokens[j].children = tokens = arrayReplaceAt(
            tokens, i, splitTextToken(token.content, token.level, state.Token)
          );
        }
      }
    }
  };
};

},{}],63:[function(require,module,exports){
// Process footnotes
//
'use strict';

////////////////////////////////////////////////////////////////////////////////
// Renderer partials

function render_footnote_anchor_name(tokens, idx, options, env/*, slf*/) {
  var n = Number(tokens[idx].meta.id + 1).toString();
  var prefix = '';

  if (typeof env.docId === 'string') {
    prefix = '-' + env.docId + '-';
  }

  return prefix + n;
}

function render_footnote_caption(tokens, idx/*, options, env, slf*/) {
  var n = Number(tokens[idx].meta.id + 1).toString();

  if (tokens[idx].meta.subId > 0) {
    n += ':' + tokens[idx].meta.subId;
  }

  return '[' + n + ']';
}

function render_footnote_ref(tokens, idx, options, env, slf) {
  var id      = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
  var caption = slf.rules.footnote_caption(tokens, idx, options, env, slf);
  var refid   = id;

  if (tokens[idx].meta.subId > 0) {
    refid += ':' + tokens[idx].meta.subId;
  }

  return '<sup class="footnote-ref"><a href="#fn' + id + '" id="fnref' + refid + '">' + caption + '</a></sup>';
}

function render_footnote_block_open(tokens, idx, options) {
  return (options.xhtmlOut ? '<hr class="footnotes-sep" />\n' : '<hr class="footnotes-sep">\n') +
         '<section class="footnotes">\n' +
         '<ol class="footnotes-list">\n';
}

function render_footnote_block_close() {
  return '</ol>\n</section>\n';
}

function render_footnote_open(tokens, idx, options, env, slf) {
  var id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);

  if (tokens[idx].meta.subId > 0) {
    id += ':' + tokens[idx].meta.subId;
  }

  return '<li id="fn' + id + '" class="footnote-item">';
}

function render_footnote_close() {
  return '</li>\n';
}

function render_footnote_anchor(tokens, idx, options, env, slf) {
  var id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);

  if (tokens[idx].meta.subId > 0) {
    id += ':' + tokens[idx].meta.subId;
  }

  /* ? with escape code to prevent display as Apple Emoji on iOS */
  return ' <a href="#fnref' + id + '" class="footnote-backref">\u21a9\uFE0E</a>';
}


module.exports = function footnote_plugin(md) {
  var parseLinkLabel = md.helpers.parseLinkLabel,
      isSpace = md.utils.isSpace;

  md.renderer.rules.footnote_ref          = render_footnote_ref;
  md.renderer.rules.footnote_block_open   = render_footnote_block_open;
  md.renderer.rules.footnote_block_close  = render_footnote_block_close;
  md.renderer.rules.footnote_open         = render_footnote_open;
  md.renderer.rules.footnote_close        = render_footnote_close;
  md.renderer.rules.footnote_anchor       = render_footnote_anchor;

  // helpers (only used in other rules, no tokens are attached to those)
  md.renderer.rules.footnote_caption      = render_footnote_caption;
  md.renderer.rules.footnote_anchor_name  = render_footnote_anchor_name;

  // Process footnote block definition
  function footnote_def(state, startLine, endLine, silent) {
    var oldBMark, oldTShift, oldSCount, oldParentType, pos, label, token,
        initial, offset, ch, posAfterColon,
        start = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    // line should be at least 5 chars - "[^x]:"
    if (start + 4 > max) { return false; }

    if (state.src.charCodeAt(start) !== 0x5B/* [ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5E/* ^ */) { return false; }

    for (pos = start + 2; pos < max; pos++) {
      if (state.src.charCodeAt(pos) === 0x20) { return false; }
      if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
        break;
      }
    }

    if (pos === start + 2) { return false; } // no empty footnote labels
    if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x3A /* : */) { return false; }
    if (silent) { return true; }
    pos++;

    if (!state.env.footnotes) { state.env.footnotes = {}; }
    if (!state.env.footnotes.refs) { state.env.footnotes.refs = {}; }
    label = state.src.slice(start + 2, pos - 2);
    state.env.footnotes.refs[':' + label] = -1;

    token       = new state.Token('footnote_reference_open', '', 1);
    token.meta  = { label: label };
    token.level = state.level++;
    state.tokens.push(token);

    oldBMark = state.bMarks[startLine];
    oldTShift = state.tShift[startLine];
    oldSCount = state.sCount[startLine];
    oldParentType = state.parentType;

    posAfterColon = pos;
    initial = offset = state.sCount[startLine] + pos - (state.bMarks[startLine] + state.tShift[startLine]);

    while (pos < max) {
      ch = state.src.charCodeAt(pos);

      if (isSpace(ch)) {
        if (ch === 0x09) {
          offset += 4 - offset % 4;
        } else {
          offset++;
        }
      } else {
        break;
      }

      pos++;
    }

    state.tShift[startLine] = pos - posAfterColon;
    state.sCount[startLine] = offset - initial;

    state.bMarks[startLine] = posAfterColon;
    state.blkIndent += 4;
    state.parentType = 'footnote';

    if (state.sCount[startLine] < state.blkIndent) {
      state.sCount[startLine] += state.blkIndent;
    }

    state.md.block.tokenize(state, startLine, endLine, true);

    state.parentType = oldParentType;
    state.blkIndent -= 4;
    state.tShift[startLine] = oldTShift;
    state.sCount[startLine] = oldSCount;
    state.bMarks[startLine] = oldBMark;

    token       = new state.Token('footnote_reference_close', '', -1);
    token.level = --state.level;
    state.tokens.push(token);

    return true;
  }

  // Process inline footnotes (^[...])
  function footnote_inline(state, silent) {
    var labelStart,
        labelEnd,
        footnoteId,
        token,
        tokens,
        max = state.posMax,
        start = state.pos;

    if (start + 2 >= max) { return false; }
    if (state.src.charCodeAt(start) !== 0x5E/* ^ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5B/* [ */) { return false; }

    labelStart = start + 2;
    labelEnd = parseLinkLabel(state, start + 1);

    // parser failed to find ']', so it's not a valid note
    if (labelEnd < 0) { return false; }

    // We found the end of the link, and know for a fact it's a valid link;
    // so all that's left to do is to call tokenizer.
    //
    if (!silent) {
      if (!state.env.footnotes) { state.env.footnotes = {}; }
      if (!state.env.footnotes.list) { state.env.footnotes.list = []; }
      footnoteId = state.env.footnotes.list.length;

      state.md.inline.parse(
        state.src.slice(labelStart, labelEnd),
        state.md,
        state.env,
        tokens = []
      );

      token      = state.push('footnote_ref', '', 0);
      token.meta = { id: footnoteId };

      state.env.footnotes.list[footnoteId] = { tokens: tokens };
    }

    state.pos = labelEnd + 1;
    state.posMax = max;
    return true;
  }

  // Process footnote references ([^...])
  function footnote_ref(state, silent) {
    var label,
        pos,
        footnoteId,
        footnoteSubId,
        token,
        max = state.posMax,
        start = state.pos;

    // should be at least 4 chars - "[^x]"
    if (start + 3 > max) { return false; }

    if (!state.env.footnotes || !state.env.footnotes.refs) { return false; }
    if (state.src.charCodeAt(start) !== 0x5B/* [ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5E/* ^ */) { return false; }

    for (pos = start + 2; pos < max; pos++) {
      if (state.src.charCodeAt(pos) === 0x20) { return false; }
      if (state.src.charCodeAt(pos) === 0x0A) { return false; }
      if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
        break;
      }
    }

    if (pos === start + 2) { return false; } // no empty footnote labels
    if (pos >= max) { return false; }
    pos++;

    label = state.src.slice(start + 2, pos - 1);
    if (typeof state.env.footnotes.refs[':' + label] === 'undefined') { return false; }

    if (!silent) {
      if (!state.env.footnotes.list) { state.env.footnotes.list = []; }

      if (state.env.footnotes.refs[':' + label] < 0) {
        footnoteId = state.env.footnotes.list.length;
        state.env.footnotes.list[footnoteId] = { label: label, count: 0 };
        state.env.footnotes.refs[':' + label] = footnoteId;
      } else {
        footnoteId = state.env.footnotes.refs[':' + label];
      }

      footnoteSubId = state.env.footnotes.list[footnoteId].count;
      state.env.footnotes.list[footnoteId].count++;

      token      = state.push('footnote_ref', '', 0);
      token.meta = { id: footnoteId, subId: footnoteSubId, label: label };
    }

    state.pos = pos;
    state.posMax = max;
    return true;
  }

  // Glue footnote tokens to end of token stream
  function footnote_tail(state) {
    var i, l, j, t, lastParagraph, list, token, tokens, current, currentLabel,
        insideRef = false,
        refTokens = {};

    if (!state.env.footnotes) { return; }

    state.tokens = state.tokens.filter(function (tok) {
      if (tok.type === 'footnote_reference_open') {
        insideRef = true;
        current = [];
        currentLabel = tok.meta.label;
        return false;
      }
      if (tok.type === 'footnote_reference_close') {
        insideRef = false;
        // prepend ':' to avoid conflict with Object.prototype members
        refTokens[':' + currentLabel] = current;
        return false;
      }
      if (insideRef) { current.push(tok); }
      return !insideRef;
    });

    if (!state.env.footnotes.list) { return; }
    list = state.env.footnotes.list;

    token = new state.Token('footnote_block_open', '', 1);
    state.tokens.push(token);

    for (i = 0, l = list.length; i < l; i++) {
      token      = new state.Token('footnote_open', '', 1);
      token.meta = { id: i, label: list[i].label };
      state.tokens.push(token);

      if (list[i].tokens) {
        tokens = [];

        token          = new state.Token('paragraph_open', 'p', 1);
        token.block    = true;
        tokens.push(token);

        token          = new state.Token('inline', '', 0);
        token.children = list[i].tokens;
        token.content  = '';
        tokens.push(token);

        token          = new state.Token('paragraph_close', 'p', -1);
        token.block    = true;
        tokens.push(token);

      } else if (list[i].label) {
        tokens = refTokens[':' + list[i].label];
      }

      state.tokens = state.tokens.concat(tokens);
      if (state.tokens[state.tokens.length - 1].type === 'paragraph_close') {
        lastParagraph = state.tokens.pop();
      } else {
        lastParagraph = null;
      }

      t = list[i].count > 0 ? list[i].count : 1;
      for (j = 0; j < t; j++) {
        token      = new state.Token('footnote_anchor', '', 0);
        token.meta = { id: i, subId: j, label: list[i].label };
        state.tokens.push(token);
      }

      if (lastParagraph) {
        state.tokens.push(lastParagraph);
      }

      token = new state.Token('footnote_close', '', -1);
      state.tokens.push(token);
    }

    token = new state.Token('footnote_block_close', '', -1);
    state.tokens.push(token);
  }

  md.block.ruler.before('reference', 'footnote_def', footnote_def, { alt: [ 'paragraph', 'reference' ] });
  md.inline.ruler.after('image', 'footnote_inline', footnote_inline);
  md.inline.ruler.after('footnote_inline', 'footnote_ref', footnote_ref);
  md.core.ruler.after('inline', 'footnote_tail', footnote_tail);
};

},{}],64:[function(require,module,exports){
'use strict';


module.exports = function ins_plugin(md) {
  // Insert each marker as a separate text token, and add it to delimiter list
  //
  function tokenize(state, silent) {
    var i, scanned, token, len, ch,
        start = state.pos,
        marker = state.src.charCodeAt(start);

    if (silent) { return false; }

    if (marker !== 0x2B/* + */) { return false; }

    scanned = state.scanDelims(state.pos, true);
    len = scanned.length;
    ch = String.fromCharCode(marker);

    if (len < 2) { return false; }

    if (len % 2) {
      token         = state.push('text', '', 0);
      token.content = ch;
      len--;
    }

    for (i = 0; i < len; i += 2) {
      token         = state.push('text', '', 0);
      token.content = ch + ch;

      state.delimiters.push({
        marker: marker,
        jump:   i,
        token:  state.tokens.length - 1,
        level:  state.level,
        end:    -1,
        open:   scanned.can_open,
        close:  scanned.can_close
      });
    }

    state.pos += scanned.length;

    return true;
  }


  // Walk through delimiter list and replace text tokens with tags
  //
  function postProcess(state) {
    var i, j,
        startDelim,
        endDelim,
        token,
        loneMarkers = [],
        delimiters = state.delimiters,
        max = state.delimiters.length;

    for (i = 0; i < max; i++) {
      startDelim = delimiters[i];

      if (startDelim.marker !== 0x2B/* + */) {
        continue;
      }

      if (startDelim.end === -1) {
        continue;
      }

      endDelim = delimiters[startDelim.end];

      token         = state.tokens[startDelim.token];
      token.type    = 'ins_open';
      token.tag     = 'ins';
      token.nesting = 1;
      token.markup  = '++';
      token.content = '';

      token         = state.tokens[endDelim.token];
      token.type    = 'ins_close';
      token.tag     = 'ins';
      token.nesting = -1;
      token.markup  = '++';
      token.content = '';

      if (state.tokens[endDelim.token - 1].type === 'text' &&
          state.tokens[endDelim.token - 1].content === '+') {

        loneMarkers.push(endDelim.token - 1);
      }
    }

    // If a marker sequence has an odd number of characters, it's splitted
    // like this: `~~~~~` -> `~` + `~~` + `~~`, leaving one marker at the
    // start of the sequence.
    //
    // So, we have to move all those markers after subsequent s_close tags.
    //
    while (loneMarkers.length) {
      i = loneMarkers.pop();
      j = i + 1;

      while (j < state.tokens.length && state.tokens[j].type === 'ins_close') {
        j++;
      }

      j--;

      if (i !== j) {
        token = state.tokens[j];
        state.tokens[j] = state.tokens[i];
        state.tokens[i] = token;
      }
    }
  }

  md.inline.ruler.before('emphasis', 'ins', tokenize);
  md.inline.ruler2.before('emphasis', 'ins', postProcess);
};

},{}],65:[function(require,module,exports){
'use strict';


module.exports = function ins_plugin(md) {
  // Insert each marker as a separate text token, and add it to delimiter list
  //
  function tokenize(state, silent) {
    var i, scanned, token, len, ch,
        start = state.pos,
        marker = state.src.charCodeAt(start);

    if (silent) { return false; }

    if (marker !== 0x3D/* = */) { return false; }

    scanned = state.scanDelims(state.pos, true);
    len = scanned.length;
    ch = String.fromCharCode(marker);

    if (len < 2) { return false; }

    if (len % 2) {
      token         = state.push('text', '', 0);
      token.content = ch;
      len--;
    }

    for (i = 0; i < len; i += 2) {
      token         = state.push('text', '', 0);
      token.content = ch + ch;

      state.delimiters.push({
        marker: marker,
        jump:   i,
        token:  state.tokens.length - 1,
        level:  state.level,
        end:    -1,
        open:   scanned.can_open,
        close:  scanned.can_close
      });
    }

    state.pos += scanned.length;

    return true;
  }


  // Walk through delimiter list and replace text tokens with tags
  //
  function postProcess(state) {
    var i, j,
        startDelim,
        endDelim,
        token,
        loneMarkers = [],
        delimiters = state.delimiters,
        max = state.delimiters.length;

    for (i = 0; i < max; i++) {
      startDelim = delimiters[i];

      if (startDelim.marker !== 0x3D/* = */) {
        continue;
      }

      if (startDelim.end === -1) {
        continue;
      }

      endDelim = delimiters[startDelim.end];

      token         = state.tokens[startDelim.token];
      token.type    = 'mark_open';
      token.tag     = 'mark';
      token.nesting = 1;
      token.markup  = '==';
      token.content = '';

      token         = state.tokens[endDelim.token];
      token.type    = 'mark_close';
      token.tag     = 'mark';
      token.nesting = -1;
      token.markup  = '==';
      token.content = '';

      if (state.tokens[endDelim.token - 1].type === 'text' &&
          state.tokens[endDelim.token - 1].content === '=') {

        loneMarkers.push(endDelim.token - 1);
      }
    }

    // If a marker sequence has an odd number of characters, it's splitted
    // like this: `~~~~~` -> `~` + `~~` + `~~`, leaving one marker at the
    // start of the sequence.
    //
    // So, we have to move all those markers after subsequent s_close tags.
    //
    while (loneMarkers.length) {
      i = loneMarkers.pop();
      j = i + 1;

      while (j < state.tokens.length && state.tokens[j].type === 'mark_close') {
        j++;
      }

      j--;

      if (i !== j) {
        token = state.tokens[j];
        state.tokens[j] = state.tokens[i];
        state.tokens[i] = token;
      }
    }
  }

  md.inline.ruler.before('emphasis', 'mark', tokenize);
  md.inline.ruler2.before('emphasis', 'mark', postProcess);
};

},{}],66:[function(require,module,exports){
// Process ~subscript~

'use strict';

// same as UNESCAPE_MD_RE plus a space
var UNESCAPE_RE = /\\([ \\!"#$%&'()*+,.\/:;<=>?@[\]^_`{|}~-])/g;


function subscript(state, silent) {
  var found,
      content,
      token,
      max = state.posMax,
      start = state.pos;

  if (state.src.charCodeAt(start) !== 0x7E/* ~ */) { return false; }
  if (silent) { return false; } // don't run any pairs in validation mode
  if (start + 2 >= max) { return false; }

  state.pos = start + 1;

  while (state.pos < max) {
    if (state.src.charCodeAt(state.pos) === 0x7E/* ~ */) {
      found = true;
      break;
    }

    state.md.inline.skipToken(state);
  }

  if (!found || start + 1 === state.pos) {
    state.pos = start;
    return false;
  }

  content = state.src.slice(start + 1, state.pos);

  // don't allow unescaped spaces/newlines inside
  if (content.match(/(^|[^\\])(\\\\)*\s/)) {
    state.pos = start;
    return false;
  }

  // found!
  state.posMax = state.pos;
  state.pos = start + 1;

  // Earlier we checked !silent, but this implementation does not need it
  token         = state.push('sub_open', 'sub', 1);
  token.markup  = '~';

  token         = state.push('text', '', 0);
  token.content = content.replace(UNESCAPE_RE, '$1');

  token         = state.push('sub_close', 'sub', -1);
  token.markup  = '~';

  state.pos = state.posMax + 1;
  state.posMax = max;
  return true;
}


module.exports = function sub_plugin(md) {
  md.inline.ruler.after('emphasis', 'sub', subscript);
};

},{}],67:[function(require,module,exports){
// Process ^superscript^

'use strict';

// same as UNESCAPE_MD_RE plus a space
var UNESCAPE_RE = /\\([ \\!"#$%&'()*+,.\/:;<=>?@[\]^_`{|}~-])/g;

function superscript(state, silent) {
  var found,
      content,
      token,
      max = state.posMax,
      start = state.pos;

  if (state.src.charCodeAt(start) !== 0x5E/* ^ */) { return false; }
  if (silent) { return false; } // don't run any pairs in validation mode
  if (start + 2 >= max) { return false; }

  state.pos = start + 1;

  while (state.pos < max) {
    if (state.src.charCodeAt(state.pos) === 0x5E/* ^ */) {
      found = true;
      break;
    }

    state.md.inline.skipToken(state);
  }

  if (!found || start + 1 === state.pos) {
    state.pos = start;
    return false;
  }

  content = state.src.slice(start + 1, state.pos);

  // don't allow unescaped spaces/newlines inside
  if (content.match(/(^|[^\\])(\\\\)*\s/)) {
    state.pos = start;
    return false;
  }

  // found!
  state.posMax = state.pos;
  state.pos = start + 1;

  // Earlier we checked !silent, but this implementation does not need it
  token         = state.push('sup_open', 'sup', 1);
  token.markup  = '^';

  token         = state.push('text', '', 0);
  token.content = content.replace(UNESCAPE_RE, '$1');

  token         = state.push('sup_close', 'sup', -1);
  token.markup  = '^';

  state.pos = state.posMax + 1;
  state.posMax = max;
  return true;
}


module.exports = function sup_plugin(md) {
  md.inline.ruler.after('emphasis', 'sup', superscript);
};

},{}],68:[function(require,module,exports){

'use strict';


/* eslint-disable no-bitwise */

var decodeCache = {};

function getDecodeCache(exclude) {
  var i, ch, cache = decodeCache[exclude];
  if (cache) { return cache; }

  cache = decodeCache[exclude] = [];

  for (i = 0; i < 128; i++) {
    ch = String.fromCharCode(i);
    cache.push(ch);
  }

  for (i = 0; i < exclude.length; i++) {
    ch = exclude.charCodeAt(i);
    cache[ch] = '%' + ('0' + ch.toString(16).toUpperCase()).slice(-2);
  }

  return cache;
}


// Decode percent-encoded string.
//
function decode(string, exclude) {
  var cache;

  if (typeof exclude !== 'string') {
    exclude = decode.defaultChars;
  }

  cache = getDecodeCache(exclude);

  return string.replace(/(%[a-f0-9]{2})+/gi, function(seq) {
    var i, l, b1, b2, b3, b4, chr,
        result = '';

    for (i = 0, l = seq.length; i < l; i += 3) {
      b1 = parseInt(seq.slice(i + 1, i + 3), 16);

      if (b1 < 0x80) {
        result += cache[b1];
        continue;
      }

      if ((b1 & 0xE0) === 0xC0 && (i + 3 < l)) {
        // 110xxxxx 10xxxxxx
        b2 = parseInt(seq.slice(i + 4, i + 6), 16);

        if ((b2 & 0xC0) === 0x80) {
          chr = ((b1 << 6) & 0x7C0) | (b2 & 0x3F);

          if (chr < 0x80) {
            result += '\ufffd\ufffd';
          } else {
            result += String.fromCharCode(chr);
          }

          i += 3;
          continue;
        }
      }

      if ((b1 & 0xF0) === 0xE0 && (i + 6 < l)) {
        // 1110xxxx 10xxxxxx 10xxxxxx
        b2 = parseInt(seq.slice(i + 4, i + 6), 16);
        b3 = parseInt(seq.slice(i + 7, i + 9), 16);

        if ((b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
          chr = ((b1 << 12) & 0xF000) | ((b2 << 6) & 0xFC0) | (b3 & 0x3F);

          if (chr < 0x800 || (chr >= 0xD800 && chr <= 0xDFFF)) {
            result += '\ufffd\ufffd\ufffd';
          } else {
            result += String.fromCharCode(chr);
          }

          i += 6;
          continue;
        }
      }

      if ((b1 & 0xF8) === 0xF0 && (i + 9 < l)) {
        // 111110xx 10xxxxxx 10xxxxxx 10xxxxxx
        b2 = parseInt(seq.slice(i + 4, i + 6), 16);
        b3 = parseInt(seq.slice(i + 7, i + 9), 16);
        b4 = parseInt(seq.slice(i + 10, i + 12), 16);

        if ((b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80 && (b4 & 0xC0) === 0x80) {
          chr = ((b1 << 18) & 0x1C0000) | ((b2 << 12) & 0x3F000) | ((b3 << 6) & 0xFC0) | (b4 & 0x3F);

          if (chr < 0x10000 || chr > 0x10FFFF) {
            result += '\ufffd\ufffd\ufffd\ufffd';
          } else {
            chr -= 0x10000;
            result += String.fromCharCode(0xD800 + (chr >> 10), 0xDC00 + (chr & 0x3FF));
          }

          i += 9;
          continue;
        }
      }

      result += '\ufffd';
    }

    return result;
  });
}


decode.defaultChars   = ';/?:@&=+$,#';
decode.componentChars = '';


module.exports = decode;

},{}],69:[function(require,module,exports){

'use strict';


var encodeCache = {};


// Create a lookup array where anything but characters in `chars` string
// and alphanumeric chars is percent-encoded.
//
function getEncodeCache(exclude) {
  var i, ch, cache = encodeCache[exclude];
  if (cache) { return cache; }

  cache = encodeCache[exclude] = [];

  for (i = 0; i < 128; i++) {
    ch = String.fromCharCode(i);

    if (/^[0-9a-z]$/i.test(ch)) {
      // always allow unencoded alphanumeric characters
      cache.push(ch);
    } else {
      cache.push('%' + ('0' + i.toString(16).toUpperCase()).slice(-2));
    }
  }

  for (i = 0; i < exclude.length; i++) {
    cache[exclude.charCodeAt(i)] = exclude[i];
  }

  return cache;
}


// Encode unsafe characters with percent-encoding, skipping already
// encoded sequences.
//
//  - string       - string to encode
//  - exclude      - list of characters to ignore (in addition to a-zA-Z0-9)
//  - keepEscaped  - don't encode '%' in a correct escape sequence (default: true)
//
function encode(string, exclude, keepEscaped) {
  var i, l, code, nextCode, cache,
      result = '';

  if (typeof exclude !== 'string') {
    // encode(string, keepEscaped)
    keepEscaped  = exclude;
    exclude = encode.defaultChars;
  }

  if (typeof keepEscaped === 'undefined') {
    keepEscaped = true;
  }

  cache = getEncodeCache(exclude);

  for (i = 0, l = string.length; i < l; i++) {
    code = string.charCodeAt(i);

    if (keepEscaped && code === 0x25 /* % */ && i + 2 < l) {
      if (/^[0-9a-f]{2}$/i.test(string.slice(i + 1, i + 3))) {
        result += string.slice(i, i + 3);
        i += 2;
        continue;
      }
    }

    if (code < 128) {
      result += cache[code];
      continue;
    }

    if (code >= 0xD800 && code <= 0xDFFF) {
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < l) {
        nextCode = string.charCodeAt(i + 1);
        if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
          result += encodeURIComponent(string[i] + string[i + 1]);
          i++;
          continue;
        }
      }
      result += '%EF%BF%BD';
      continue;
    }

    result += encodeURIComponent(string[i]);
  }

  return result;
}

encode.defaultChars   = ";/?:@&=+$,-_.!~*'()#";
encode.componentChars = "-_.!~*'()";


module.exports = encode;

},{}],70:[function(require,module,exports){

'use strict';


module.exports = function format(url) {
  var result = '';

  result += url.protocol || '';
  result += url.slashes ? '//' : '';
  result += url.auth ? url.auth + '@' : '';

  if (url.hostname && url.hostname.indexOf(':') !== -1) {
    // ipv6 address
    result += '[' + url.hostname + ']';
  } else {
    result += url.hostname || '';
  }

  result += url.port ? ':' + url.port : '';
  result += url.pathname || '';
  result += url.search || '';
  result += url.hash || '';

  return result;
};

},{}],71:[function(require,module,exports){
'use strict';


module.exports.encode = require('./encode');
module.exports.decode = require('./decode');
module.exports.format = require('./format');
module.exports.parse  = require('./parse');

},{"./decode":68,"./encode":69,"./format":70,"./parse":72}],72:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

//
// Changes from joyent/node:
//
// 1. No leading slash in paths,
//    e.g. in `url.parse('http://foo?bar')` pathname is ``, not `/`
//
// 2. Backslashes are not replaced with slashes,
//    so `http:\\example.org\` is treated like a relative path
//
// 3. Trailing colon is treated like a part of the path,
//    i.e. in `http://example.org:foo` pathname is `:foo`
//
// 4. Nothing is URL-encoded in the resulting object,
//    (in joyent/node some chars in auth and paths are encoded)
//
// 5. `url.parse()` does not have `parseQueryString` argument
//
// 6. Removed extraneous result properties: `host`, `path`, `query`, etc.,
//    which can be constructed using other parts of the url.
//


function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.pathname = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = [ '<', '>', '"', '`', ' ', '\r', '\n', '\t' ],

    // RFC 2396: characters not allowed for various reasons.
    unwise = [ '{', '}', '|', '\\', '^', '`' ].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = [ '\'' ].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = [ '%', '/', '?', ';', '#' ].concat(autoEscape),
    hostEndingChars = [ '/', '?', '#' ],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    /* eslint-disable no-script-url */
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    };
    /* eslint-enable no-script-url */

function urlParse(url, slashesDenoteHost) {
  if (url && url instanceof Url) { return url; }

  var u = new Url();
  u.parse(url, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, slashesDenoteHost) {
  var i, l, lowerProto, hec, slashes,
      rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    lowerProto = proto.toLowerCase();
    this.protocol = proto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (i = 0; i < hostEndingChars.length; i++) {
      hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) {
        hostEnd = hec;
      }
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = auth;
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (i = 0; i < nonHostChars.length; i++) {
      hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) {
        hostEnd = hec;
      }
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1) {
      hostEnd = rest.length;
    }

    if (rest[hostEnd - 1] === ':') { hostEnd--; }
    var host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost(host);

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) { continue; }
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    }

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
    }
  }

  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    rest = rest.slice(0, qm);
  }
  if (rest) { this.pathname = rest; }
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '';
  }

  return this;
};

Url.prototype.parseHost = function(host) {
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) { this.hostname = host; }
};

module.exports = urlParse;

},{}],73:[function(require,module,exports){
'use strict';

/*eslint-env browser*/
/*global $, _*/

var mdurl = require('mdurl');

var hljs = require('highlight.js/lib/highlight.js');

var mdHtml, mdSrc, permalink, scrollMap;

var defaults = {
  html:         true,        // Enable HTML tags in source
  xhtmlOut:     false,        // Use '/' to close single tags (<br />)
  breaks:       false,        // Convert '\n' in paragraphs into <br>
  langPrefix:   'language-',  // CSS language prefix for fenced blocks
  linkify:      false,         // autoconvert URL-like texts to links
  typographer:  false,         // Enable smartypants and other sweet transforms

  // options below are for demo only
  _highlight: false,
  _strict: false,
  _view: 'html'               // html / src / debug
};

defaults.highlight = function (str, lang) {
  var esc = mdHtml.utils.escapeHtml;

  try {
    if (!defaults._highlight) {
      throw 'highlighting disabled';
    }

    if (lang && lang !== 'auto' && hljs.getLanguage(lang)) {

      return '<pre class="hljs language-' + esc(lang.toLowerCase()) + '"><code>' +
             hljs.highlight(lang, str, true).value +
             '</code></pre>';

    } else if (lang === 'auto') {

      var result = hljs.highlightAuto(str);

      /*eslint-disable no-console*/
      console.log('highlight language: ' + result.language + ', relevance: ' + result.relevance);

      return '<pre class="hljs language-' + esc(result.language) + '"><code>' +
             result.value +
             '</code></pre>';
    }
  } catch (__) { /**/ }

  return '<pre class="hljs"><code>' + esc(str) + '</code></pre>';
};

function setOptionClass(name, val) {
  if (val) {
    $('body').addClass('opt_' + name);
  } else {
    $('body').removeClass('opt_' + name);
  }
}

function setResultView(val) {
  $('body').removeClass('result-as-html');
  $('body').removeClass('result-as-src');
  $('body').removeClass('result-as-debug');
  $('body').addClass('result-as-' + val);
  defaults._view = val;
}

function mdInit() {
  if (defaults._strict) {
    mdHtml = window.markdownit('commonmark');
    mdSrc = window.markdownit('commonmark');
  } else {
    mdHtml = window.markdownit(defaults)
                .use(require('markdown-it-abbr'))
                .use(require('markdown-it-container'), 'warning')
                .use(require('markdown-it-deflist'))
                .use(require('markdown-it-emoji'))
                .use(require('markdown-it-footnote'))
                .use(require('markdown-it-ins'))
                .use(require('markdown-it-mark'))
                .use(require('markdown-it-sub'))
                .use(window.markdownitMathjax)
                .use(require('markdown-it-sup'));
    mdSrc = window.markdownit(defaults)
                .use(require('markdown-it-abbr'))
                .use(require('markdown-it-container'), 'warning')
                .use(require('markdown-it-deflist'))
                .use(require('markdown-it-emoji'))
                .use(require('markdown-it-footnote'))
                .use(require('markdown-it-ins'))
                .use(require('markdown-it-mark'))
                .use(require('markdown-it-sub'))
                .use(window.markdownitMathjax)
                .use(require('markdown-it-sup'));
  }

  // Beautify output of parser for html content
  mdHtml.renderer.rules.table_open = function () {
    return '<table class="table table-striped">\n';
  };
  // Replace emoji codes with images
  mdHtml.renderer.rules.emoji = function (token, idx) {
    return window.twemoji.parse(token[idx].content);
  };


  //
  // Inject line numbers for sync scroll. Notes:
  //
  // - We track only headings and paragraphs on first level. That's enough.
  // - Footnotes content causes jumps. Level limit filter it automatically.
  function injectLineNumbers(tokens, idx, options, env, slf) {
    var line;
    if (tokens[idx].map && tokens[idx].level === 0) {
      line = tokens[idx].map[0];
      tokens[idx].attrJoin('class', 'line');
      tokens[idx].attrSet('data-line', String(line));
    }
    return slf.renderToken(tokens, idx, options, env, slf);
  }

  mdHtml.renderer.rules.paragraph_open = mdHtml.renderer.rules.heading_open = injectLineNumbers;
}

function setHighlightedlContent(selector, content, lang) {
  if (window.hljs) {
    $(selector).html(window.hljs.highlight(lang, content).value);
  } else {
    $(selector).text(content);
  }
}

function updateResult(source) {
    console.log(source.length);
    var html = mdHtml.render(source)+"<h1>";
    return html;
}

// Build offsets for each line (lines can be wrapped)
// That's a bit dirty to process each line everytime, but ok for demo.
// Optimizations are required only for big texts.
function buildScrollMap() {
  var i, offset, nonEmptyList, pos, a, b, lineHeightMap, linesCount,
      acc, sourceLikeDiv, textarea = $('.source'),
      _scrollMap;

  sourceLikeDiv = $('<div />').css({
    position: 'absolute',
    visibility: 'hidden',
    height: 'auto',
    width: textarea[0].clientWidth,
    'font-size': textarea.css('font-size'),
    'font-family': textarea.css('font-family'),
    'line-height': textarea.css('line-height'),
    'white-space': textarea.css('white-space')
  }).appendTo('body');

  offset = $('.result-html').scrollTop() - $('.result-html').offset().top;
  _scrollMap = [];
  nonEmptyList = [];
  lineHeightMap = [];

  acc = 0;
  textarea.val().split('\n').forEach(function (str) {
    var h, lh;

    lineHeightMap.push(acc);

    if (str.length === 0) {
      acc++;
      return;
    }

    sourceLikeDiv.text(str);
    h = parseFloat(sourceLikeDiv.css('height'));
    lh = parseFloat(sourceLikeDiv.css('line-height'));
    acc += Math.round(h / lh);
  });
  sourceLikeDiv.remove();
  lineHeightMap.push(acc);
  linesCount = acc;

  for (i = 0; i < linesCount; i++) { _scrollMap.push(-1); }

  nonEmptyList.push(0);
  _scrollMap[0] = 0;

  $('.line').each(function (n, el) {
    var $el = $(el), t = $el.data('line');
    if (t === '') { return; }
    t = lineHeightMap[t];
    if (t !== 0) { nonEmptyList.push(t); }
    _scrollMap[t] = Math.round($el.offset().top + offset);
  });

  nonEmptyList.push(linesCount);
  _scrollMap[linesCount] = $('.result-html')[0].scrollHeight;

  pos = 0;
  for (i = 1; i < linesCount; i++) {
    if (_scrollMap[i] !== -1) {
      pos++;
      continue;
    }

    a = nonEmptyList[pos];
    b = nonEmptyList[pos + 1];
    _scrollMap[i] = Math.round((_scrollMap[b] * (i - a) + _scrollMap[a] * (b - i)) / (b - a));
  }

  return _scrollMap;
}

// Synchronize scroll position from source to result
var syncResultScroll = _.debounce(function () {
  var textarea   = $('.source'),
      lineHeight = parseFloat(textarea.css('line-height')),
      lineNo, posTo;

  lineNo = Math.floor(textarea.scrollTop() / lineHeight);
  if (!scrollMap) { scrollMap = buildScrollMap(); }
  posTo = scrollMap[lineNo];
  $('.result-html').stop(true).animate({
    scrollTop: posTo
  }, 100, 'linear');
}, 50, { maxWait: 50 });

// Synchronize scroll position from result to source
var syncSrcScroll = _.debounce(function () {
  var resultHtml = $('.result-html'),
      scrollTop  = resultHtml.scrollTop(),
      textarea   = $('.source'),
      lineHeight = parseFloat(textarea.css('line-height')),
      lines,
      i,
      line;

  if (!scrollMap) { scrollMap = buildScrollMap(); }

  lines = Object.keys(scrollMap);

  if (lines.length < 1) {
    return;
  }

  line = lines[0];

  for (i = 1; i < lines.length; i++) {
    if (scrollMap[lines[i]] < scrollTop) {
      line = lines[i];
      continue;
    }

    break;
  }

  textarea.stop(true).animate({
    scrollTop: lineHeight * line
  }, 100, 'linear');
}, 50, { maxWait: 50 });


function loadPermalink() {

  if (!location.hash) { return; }

  var cfg, opts;

  try {

    if (/^#md3=/.test(location.hash)) {
      cfg = JSON.parse(mdurl.decode(location.hash.slice(5), mdurl.decode.componentChars));

    } else if (/^#md64=/.test(location.hash)) {
      cfg = JSON.parse(window.atob(location.hash.slice(6)));

    } else if (/^#md=/.test(location.hash)) {
      cfg = JSON.parse(decodeURIComponent(location.hash.slice(4)));

    } else {
      return;
    }

    if (_.isString(cfg.source)) {
      $('.source').val(cfg.source);
    }
  } catch (__) {
    return;
  }

  opts = _.isObject(cfg.defaults) ? cfg.defaults : {};

  // copy config to defaults, but only if key exists
  // and value has the same type
  _.forOwn(opts, function (val, key) {
    if (!_.has(defaults, key)) { return; }

    // Legacy, for old links
    if (key === '_src') {
      defaults._view = val ? 'src' : 'html';
      return;
    }

    if ((_.isBoolean(defaults[key]) && _.isBoolean(val)) ||
        (_.isString(defaults[key]) && _.isString(val))) {
      defaults[key] = val;
    }
  });

  // sanitize for sure
  if ([ 'html', 'src', 'debug' ].indexOf(defaults._view) === -1) {
    defaults._view = 'html';
  }
}

//////////////////////////////////////////////////////////////////////////////
// Init on page load
//
$(function () {
  // highlight snippet
  if (window.hljs) {
    $('pre.code-sample code').each(function (i, block) {
      window.hljs.highlightBlock(block);
    });
  }
  
  // Activate tooltips
  $('._tip').tooltip({ container: 'body' });

  // Set default option values and option listeners
  _.forOwn(defaults, function (val, key) {
    if (key === 'highlight') { return; }

    var el = document.getElementById(key);

    if (!el) { return; }

    var $el = $(el);

    if (_.isBoolean(val)) {
      $el.prop('checked', val);
      $el.on('change', function () {
        var value = Boolean($el.prop('checked'));
        setOptionClass(key, value);
        defaults[key] = value;
        mdInit();
      });
      setOptionClass(key, val);

    } else {
      $(el).val(val);
      $el.on('change update keyup', function () {
        defaults[key] = String($(el).val());
        mdInit();
      });
    }
  });

  setResultView(defaults._view);

  mdInit();

  // Need to recalculate line positions on window resize
  $(window).on('resize', function () {
    scrollMap = null;
  });

  function fixdata(data) {
  var o = "", l = 0, w = 10240;
  for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
  o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(l*w)));
  return o;
}

function getExtensionFileName(pathfilename)
{
    var reg = /(\\+)/g;
    var pfn = pathfilename.replace(reg, "#");
    var arrpfn = pfn.split("#");
    var fn = arrpfn[arrpfn.length - 1];
    var arrfn = fn.split(".");
    return arrfn[arrfn.length - 1];
}

function uploadFiles(files) {
    if (files.length) 
    {
        //显示
        for (var i = 0; i < files.length; i++) 
        {
            uploadFile(files[i]);
        }
    }
}

function init() {
    var dropbox = document.getElementById('dropbox');
    if (dropbox === null) {
        return;
    }
    document.addEventListener("dragenter", function(e){  
        dropbox.style.borderColor = 'gray';  
    }, false);  

    document.addEventListener("dragleave", function(e){  
        dropbox.style.borderColor = 'silver';  
    }, false);  

    dropbox.addEventListener("dragenter", function(e){  
        dropbox.style.borderColor = 'gray';  
        dropbox.style.backgroundColor = 'white';  
    }, false);  

    dropbox.addEventListener("dragleave", function(e){  
        dropbox.style.backgroundColor = 'transparent';  
    }, false);  

    dropbox.addEventListener("dragenter", function(e){  
        e.stopPropagation();  
        e.preventDefault();  
    }, false);  

    dropbox.addEventListener("dragover", function(e){  
        e.stopPropagation();  
        e.preventDefault();  
    }, false);  

    dropbox.addEventListener("drop", function(e){  
        e.stopPropagation();  
        e.preventDefault();  
           
        uploadFiles(e.dataTransfer.files);  
    }, false);  
  }


  init();

  function searchKeyword() {
    var keyword = $("#keywordsearch").val(), text = $("#grade").val();

    console.log(keyword);
    var text = $("#grade").val();
    var j_obj = JSON.parse(text);
    var nodes = j_obj.data.nodes;
    var keep_nodes = [];
    for (var i in nodes) {
      var keywords = nodes[i].keywords; 
      for (var j in keywords) {
          if (keywords[j].indexOf(keyword) > -1) {
            keep_nodes.push(nodes[i]);
          }
      }
    }
    
    j_obj.data.nodes = keep_nodes;
    app = new igraph.GraphNavigator(document.getElementById('graphArea'), 'LIGHT');
    app.loadGsonObj(j_obj, {
        "onGetNodeDescription": function (node) { return showNode(node);}
    }, function () {});;
  }

  // $("#keywordsearch").on('click', searchKeyword());

  $("#examples").on('change', function () { 
      var t = $("#examples").val();
      
      if (t === 'json') {
        app = new igraph.GraphNavigator(document.getElementById('graphArea'), 'LIGHT');
        if ($("#graphArea").css("display") !== "none") {
          app.loadGson("kg.json", {
              "onGetNodeDescription": function (node) { return showNode(node);}
            }, function () { });
          }
          $.get("kg.json", { t: new Date().getTime() }, function (data) {
            $("#grade").val(data);
          }, "text");

      } else if (t === 'bib') {
          $.get("ml.bib?t=" + Math.random(), { t: new Date().getTime() }, function (data) {
            var text = bib_2_json(data);

            $("#grade").val(text);
            app = new igraph.GraphNavigator(document.getElementById('graphArea'), 'LIGHT');
            app.loadGsonString(text, {
              "onGetNodeDescription": function (node) { return showNode(node);}
            }, function () {});;
          }, "text");
      }

  });
  $("#keywordsearchbutton").on('click', function () { searchKeyword(); });

  function split_comma_field(l) {
      if (typeof l === 'undefined') 
          return [];
      var list = [], es = l.split(',');
      for (var i in es) {
          list.push(es[i].trim());
      }
      return list;
  }

  function bib_2_json(text) {
      var entries = bibtexParse.toJSON(text);   
      var nodes = [], edges = [];
      for (var i in entries) {
          var entry_d = entries[i];
          var entry = entry_d.entryTags
          var node = {'id': entry_d.citationKey};
          node.label = entry.title;
          node.keywords = split_comma_field(entry.keywords);
          node.cite = split_comma_field(entry.cite);
          node.cited = split_comma_field(entry.cited);
          node.link = entry.link;
          node.video_link = entry.link;
          node.links = split_comma_field(entry.links);
          if ('group' in entry) {
            node.group = entry.group;
          }
          nodes.push(node);
          for (var j in node.cite) {
              edges.push({"from": entry_d.citationKey, "to": node.cite[j]})
          }
      }
      var json = {'data': {'nodes': nodes, 'edges': edges}};
      return JSON.stringify(json);
  }

  function uploadFile(file) {
    var reader = new FileReader();
    var ext = getExtensionFileName(file.name);
    var xls = ['xls', 'xlsx'];

    reader.onload = function (e) {
        var text = '';
        if (xls.indexOf(ext) == -1) {
            text = this.result;
        } else {
            var data = e.target.result;
            var wb = XLSX.read(btoa(fixdata(data)), {//手动转化
                            type: 'base64'
                        });
            text = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
        }

        $("#graphDiv").show();
        $("#graphArea").show();
        $(".keywordpanel").show();

        if (ext === 'json') {
          $("#grade").val(text);
          app = new igraph.GraphNavigator(document.getElementById('graphArea'), 'LIGHT');
          app.loadGsonString(text, {
              "onGetNodeDescription": function (node) { return showNode(node);}
          }, function () {});;
        } else if (ext == 'csv') {
            console.log(text.split('\n').length);
            var entries = text.split('\n');
            
            var nodes = [], edges = [];
            for (var i in entries) {
                var line = entries[i];
                if (line.trim() === "") {
                  continue;
                }
                var l = line.split('@');
                var node = {'id': parseInt(i) + 1};
                node.label = l[0];
                node.keywords = split_comma_field(l[1]);
                node.cite = split_comma_field(l[2]);
                node.cited = split_comma_field(l[3]);
                node.link = '';
                node.video_link = '';
                node.links = [];
                if (l.length > 4) {
                    node.link = l[4];
                }
              if (l.length > 5) {
                node.video_link = l[5];
              }
              nodes.push(node);
              for (var j in node.cite) {
                 edges.push({"from": parseInt(i) + 1, "to": node.cite[j]})
              }
            }
          var json = {'data': {'nodes': nodes, 'edges': edges}};
            text = JSON.stringify(json);

          $("#grade").val(text);
          app = new igraph.GraphNavigator(document.getElementById('graphArea'), 'LIGHT');
          app.loadGsonString(text, {
            "onGetNodeDescription": function (node) { return showNode(node);}
          }, function () {});;
        } else if (ext == 'bib'){
          text = bib_2_json(text);

          $("#grade").val(text);
          app = new igraph.GraphNavigator(document.getElementById('graphArea'), 'LIGHT');
          app.loadGsonString(text, {
            "onGetNodeDescription": function (node) { return showNode(node);}
          }, function () {});;
        }else {
            alert("Only support JSON and CSV file. CSV should separated by '@'")
        }
    }
    if (xls.indexOf(ext) == -1) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
}

  
  function showNode(node) {
        console.log(node)
        var description = "<p align=center>";
        if (node.image !== undefined) {
          description += "<img src='" + node.image + "' width=150/><br>";
        }
        description += "<b>" + node.label + "</b>" + "[" + node.id + "]";
        description += "</p>";
        description += "<hr>";
        if (node.info !== undefined) {
          description += "<p align=left>" + node.info + "</p>";
        }
        if (node.keywords[0] !== "") {
          description += "<p align=left>" + node.keywords + "</p>";
        }
        if (node.video_link !== "" && typeof node.video_link !== "undefined") {
          description += "<p align=left><a href='" + node.video_link + "'>论文解读视频</a></p>";
        }
  
        if (node.link !== "" && typeof node.link !== "undefined") {
          description += "<p align=left><a href='" + node.link + "'>论文要点</a></p>";
        }
  
        description += "<hr>";
  
        $.get({
          url: node.link,
          data: { t: new Date().getTime() },
          success: function (data) {
            description += updateResult(data);
          },
          async: false,
          dataType: "text"
        });
  
        return description;
  }

  igraph.i18n.setLanguage("chs");
  var app = new igraph.GraphNavigator(document.getElementById('graphArea'), 'LIGHT');
  $.get("ml.bib?t=" + Math.random(), { t: new Date().getTime() }, function (data) {
    var text = bib_2_json(data);

    $("#grade").val(text);
    app = new igraph.GraphNavigator(document.getElementById('graphArea'), 'LIGHT');
    app.loadGsonString(text, {
      "onGetNodeDescription": function (node) { return showNode(node);}
    }, function () {});;
  }, "text");
});

},{"highlight.js/lib/highlight.js":1,"markdown-it-abbr":54,"markdown-it-container":55,"markdown-it-deflist":56,"markdown-it-emoji":57,"markdown-it-footnote":63,"markdown-it-ins":64,"markdown-it-mark":65,"markdown-it-sub":66,"markdown-it-sup":67,"mdurl":71}]},{},[73]);
