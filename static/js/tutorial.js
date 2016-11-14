var global_answers = null;
var global_comment = null;
var global_lesson_count = 0;
var error_times = 0,
    currentLesson = 1,
    global_link = 'currentLesson',
    match = {},
    option_match = {};

var md = window.markdownit({html:true})
        .use(window.markdownitMathjax)
        .use(window.markdownitEmoji);
md.renderer.rules.emoji = function(token, idx) {
  return twemoji.parse(token[idx].content);
};


var Preview = {
    preview: null,     // filled in by Init below
    Update: function (obj) {
        var ele = $(obj),
            parentdiv = ele.parent(),
            preview = parentdiv.children(".MathPreview").eq(0),
            pid = preview.attr("id"),
            previewEle = document.getElementById(pid),
            text = ele.val();
        MathJax.Hub.Config({
            messageStyle: "none"
        });
        preview.html("`" + text + "`");
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, previewEle]);
    }
};

function updateMastery() {
    var params = getRequest(),
        url = document.URL.split('/'),
        link = url[url.length-1].split('?')[0];

    if (!params) {
        return;
    }

    params.tutor_id = link;
    $.ajax({
        method: "post",
        url : "/update_mastery",
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(params),
        success : function (result){
            if (!result.status) {
                alert("更新掌握度失败! "+result.info);
            }
        },
        error: backendError
    });   
}

function display_comments(div, result) {
    var comment = result.comment, c = ".hidden";
    if (typeof(comment) !== "string") {
        if (error_times < comment.length) {
            comment = result.comment[error_times];
        } else {
            comment = ""
            for (var i = 0; i < result.comment.length; i++) {
                comment += result.comment[i];
                if (i < comment.length - 1) {
                    comment += "<br>";
                }
            }

        }
    }
    if (!comment.indexOf('{%')) {
        var new_div = renderQuestion(comment, -1),
            quiz_type = comment.substring(2, comment.indexOf('|')).trim();
        global_answers = parse_answer(comment, quiz_type);
        global_comment = parse_comment(comment);
        comment = new_div[0].outerHTML;
    }
    div.children(c).html(comment);
    div.children(".comment").html(comment);
    if (result.status) {
        div.children(c).attr('class', 'comment alert alert-success');
        div.children(".comment").attr('class', 'comment alert alert-success');
    }
    else {
        div.children(c).attr('class', 'comment alert alert-danger');
        div.children(".comment").attr('class', 'comment alert alert-danger');
    }
    error_times++;
}

function validateOption(obj) {
    if (obj.value.trim() === "") {
        alert("请填入有效内容");
        return false;
    }
    return true;
}

function find_right_next(s, i, n, c) {
    if (i >= s.length) {
        return i;
    }

    if ('{[('.indexOf(s[i]) >= 0) {
        return find_right_next(s, i + 1, n + 1, c)
    }
    else if (('%'+c).indexOf(s[i]) >= 0 && n == 0) {
        return i;
    }
    else if ('}])'.indexOf(s[i]) >= 0 && n > 0) {
        return find_right_next(s, i + 1, n - 1, c)
    }
    else {
        return find_right_next(s, i + 1, n, c)
    }
}

function finite_status_machine(s, c) {
    var start = 0, end = 0, lists = [];
    if (s.endsWith('%}')) {
        s = s.substr(0, s.length-2)
    }
    while (start < s.length) {
        end = find_right_next(s, start, 0, c);
        lists.push(s.substring(start, end));
        start = end+1;
    }
    return lists;
}

function parse_answer(line, quiz_type) {
    var obj = /@([^#]*)/.exec(line)
    if (!obj) {
        return null;
    }

    var lists = obj[1].split('@')
    var result = null;
    options = []

    for (var i in lists) {
        if (quiz_type !== 'process') {
            break;
        }

        var l = lists[i].replace(/\r|\n/,'');
        var t = finite_status_machine(l, ':')
        var lt = t.length

        answer_map = {}
        if (lt === 1) { answer_map[t[0]] = [[], '']}

        if (lt === 2) { 
            if (t[1][0] == '$' || t[1][0] == '!' || t[1][0] == '`') {
                answer_map[t[0]] = [[], t[1]];
                options.push(t[1]);
            }
            else {
                answer_map[t[0]] = [t[1].split(','), '']
            }
        }
        if (lt === 3) {
            answer_map[t[0]] = [t[1].split(','), t[2]]
            options.push(t[2]);
        } 
        if (!result) {
            result = answer_map;
            continue
        }
        for (var e in answer_map) {
            result[e] = answer_map[e];
        }

        result['options'] = options;
    }

    if (!result) {
        result = lists;
    }

    return result
    
}


function parse_comment(c) {
    c = c.substring(c.indexOf('#')+1)
    lists = finite_status_machine(c, '#%')
    result = [{},[]]

    for (var i in lists) {
        l = lists[i];
        if (l.indexOf(':') < 0) {
            result[1].push(l);
            continue;
        }

        var t = [], temp_list = finite_status_machine(l, '#,');

        for (var j in temp_list) {
            s = temp_list[j];
            key = s.substring(0, s.indexOf(':')).replace(/\r|\n/,'');
            value = s.substring(s.indexOf(':')+1).replace(/\r|\n/,'');
            result[0][key] = value;
        }
    }
    return result;
}

function renderQuestion(temp, quiz_count) {
    typep = /([\w\W]*?)\|/;
    stemp = /\|[\w\W]*/;

    div = $('<div class="process"></div>');
    feedback = $('<div class="hidden"></div>');
    response = $('<div class="math-container"></div>'),
    submit = $('<button class="btn btn-info">提交验证</button>');

    type = temp.match(typep)[0];
    type = type.substring(2, type.length-1).trim();

    stem = temp.match(stemp)[0];
    stemend = stem.indexOf("@");
    if (stemend < 0)
        stemend = stem.length
    stem = stem.substring(1, stemend).trim();
    if (stem.endsWith("%}")) {
        stem = stem.substring(0, stem.length-2).trim();
    }

    if (type == "radio" || type == "checkbox") {
        quiz_count++;
        qparts = stem.split("&");
        if (qparts[0].trim() !== "") {
            qparts[0] = "<br>" + qparts[0];
        }
        var span = $("<span>{0}</span>".format(qparts[0]));
        template = '<input type="{0}" class="quiz" name="quiz" value="{1}">{2}</input>';
        span.append($("<br>"));
        for (var j = 1; j < qparts.length; j++) {
            var option = template.format(type, qparts[j],
                String.fromCharCode(64+j) + ". " + qparts[j]) + '<br>';
            span.append($(option));
        }
        div.append(span);
    }
    else if (type == "text") {
        quiz_count++;
        var blank = $('<input type="text" class="quiz">');
        blank.attr("onkeydown", 'return enter_check(this, event, "quiz",'+quiz_count+")");
        div.append($('<br><span>'+stem.replace(/_/g, blank[0].outerHTML)+'</span><br>'));
    }
    else if (type == "formula") {
        quiz_count++;
        var blank = $('<input type="text" class="quiz formula">'),
            span;
        blank.attr("onkeydown", 'return enter_check(this, event, "quiz",'+quiz_count+")");
        span = $('<span>'+stem.replace(/_/g, blank[0].outerHTML)+'</span>');
        span.append($('<br><div class="MathPreview"></div><br>'));
        div.append("<br>")
        div.append(span);
    } else if (type == "process") {
        quiz_count++;
        qparts = stem.split("$");

        var step_div = addStepDiv('根据:', quiz_count, 'step-div'),
            mid_div = $('<div class="container"></div>');
            reason_div = $('<div class="col-xs-5 left"></div>'),
            option_div = $('<div class="col-xs-7 right"></div>');
        mid_div.attr("style", "min-height: 80px; width: 100%")
        reason_div.append(step_div);
        mid_div.append(reason_div);
        mid_div.append(option_div);
        div.append($('<p>{0}</p>'.format(qparts[0])));
        div.append(mid_div);
    }

    submit.attr("onclick", "check(this, '{0}', {1})".format(type, quiz_count));
    div.append('<br>');
    div.append(submit);
    div.append(feedback);

    response.append(div);

    return response;
}

function addStepDiv(quote, quiz_count, type) {
    var step_div = $('<div></div>'),
        input = $('<input type="text" class="small_step form-control"/>'),
        span = $('<span>{0}</span>'.format(quote));
    span.attr("style", "float: left; margin: 4px; width: 100%");

    if (type === "option") {
        input.attr("placeholder", '请从右侧选择，填写序号');
    }
    else {
        input.attr("placeholder", "定理名或文字描述,可回车");
        input.attr("onkeydown", "return enter_check(this, event, 'process'," +
                            quiz_count+")");

    }
    step_div.attr("class", type + " col-xs-12")
    step_div.append($(span));
    step_div.append(input);
    return step_div;
}

function qa_parse(c) {
    var end, lists = [], s, quiz_type,
        start = c.indexOf("{%"), html = '';

    while (start >= 0 && start < c.length) {
        end = find_right_next(c, start, 0, '\n')
        s = c.substring(start, end).trim()
        lists.push(s)
        start = c.indexOf("{%", end)
    }

    start = 0;

    for (var i in lists) {
        var temp = lists[i];
        renderQuestion(temp, i);
        html += c.substring(start, c.indexOf(temp, start)) + response[0].outerHTML;
        start = c.indexOf(temp) + temp.length;
    }
    html += c.substring(start, c.length);

    return html;
}

function check_text_online(obj, id, answers, comments) {
    console.log("check online");
    var value, your_answer,
        back_check = false,
        tutorial_url = document.URL.split('/')[4],
        problem = $($(obj).parents('.process')[0]),
        ele = problem.children().children(".quiz"),
        type = ele.attr("type");

//  console.log(problem[0]);
//  console.log(ele[0]);

    if (type === "radio") {
        ele.each(function() {
            if ($(this).prop('checked') === true) {
                value = $(this).val();
            }
        });
        if (value !== answers[0]) {
            for (var j in comments[0]) {
                if (value.indexOf(j) >= 0) {
                    console.log('key {0} OK {1}'.format(j, comments[0][j]));
                    result = {'comment': comments[0][j]};
                    break
                }
            }
            if (!result) {
                result = {'comment': comments[1]};
            }
            console.log(result.comment)
            display_comments(problem, result);
            return;
        }
        result = {'comment': '就是这样'}
        display_comments(problem, result);
    } else if (type === "checkbox") {

        value = '';

        ele.each(function() {
            if ($(this).prop('checked') === true) {
                value += $(this).val()+"@";
            }
        });

        value = value.substring(0, value.length-1);

    } else if (type === "text") {
        var result = null;
        for (var i = 0; i < ele.length; i++) {
            if (ele[i].value.indexOf(answers[i]) < 0) {
                for (var j in comments[0]) {
                    if (ele[i].value.indexOf(j) >= 0) {
                        console.log('key {0} OK {1}'.format(j, comments[0][j]));
                        result = {'comment': comments[0][j]};
                        break
                    }
                }
                if (!result) {
                    result = {'comment': comments[1]};
                }
                display_comments(problem, result);
                return;
            }
        }
        result = {'comment': '就是这样'}
        display_comments(problem, result);
    } 
}

function check(obj, type, id) {
    if (id === 0) {
        check_text_online(obj, id, global_answers, global_comment);
        return;
    }
    if (id > -1) {
        if (type === "process") {
            checkProcess(obj, id);
        } else {
            checkQuiz(obj, id);
        }
    }
}

function enter_check(obj, e, type, id) {
    if ($(obj).is(".formula")) {
        Preview.Update(obj);
    }
    if(e.keyCode == 13) {
        if (id === 0) {
            check_text_online(obj, id, global_answers, global_comment);
            return;
        }
        check(obj, type, id);
        return false;
    }
    return true;
}

function generate_lesson(div, html, root) {
    var count = 0, match, matches = [], 
        reg = /<h[1234]([\d\D]*?)<h[1234]/g; 

    if (root === "practice") {
        reg = /<h1>([\d\D]*?)<h1>/g;
    }

    while (match = reg.exec(html)) {
        matches.push(match[0]);
        reg.lastIndex = match.index + 1;
    }

    for (var i in matches) {
        count += 1;
        var lesson_div = $('<div></div>'),
            nextclick = 'onclick="updateLesson('+(count+1)+')"',
            prevclick = 'onclick="previousLesson('+(count-1)+')"',
            next_button = $('<button '+nextclick+'>下一段</button>'),
            prev_button = $('<button '+prevclick+'>上一段</button>'),
            lesson = matches[i].substring(0, matches[i].length-4);
        
        lesson_div.attr('class', 'lesson lesson'+count);
        lesson_div.html(lesson);
        if (root !== 'practice') {
            lesson_div.append(prev_button);
            if (lesson_div.find('button').length === 1) {
                lesson_div.append(next_button);
            }
        } 
        lesson_div.append($('<br>'));
        lesson_div.appendTo(div);
    }

    MathJax.Hub.Config({
        messageStyle: "none"
    });
    MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

    return count;
}

function loadTutorial(link) {
    'use strict';
    var root = document.URL.split('/')[3];

    $.ajax({
        url : "/convert/"+link+"?random="+Math.random(),
        contentType: 'application/json',
        dataType: "json",
        beforeSend : function(){
            var _PageWidth = document.documentElement.clientWidth,
                _PageHeight = document.documentElement.clientHeight,
                _LoadingTop = _PageHeight / 2,
                _LoadingLeft = _PageWidth > 215 ? (_PageWidth - 215) / 2 : 0,
                _LoadingHtml = $('<div></div>');
            _LoadingHtml.attr("id", "loadingDiv");
            _LoadingHtml.css("left", _LoadingLeft + 'px');
            _LoadingHtml.css("top", _LoadingTop + 'px');

            _LoadingHtml.html('教程加载中，请稍等...');

            //呈现loading效果
            $(".container-fluid").append(_LoadingHtml);
            //setTimeout("$('.loadingDiv').fadeOut('slow')", 5000);
        },
        success : function (data){
            var result = data,
                loadingMask = document.getElementById('loadingDiv');
            //console.log(data);
            loadingMask.parentNode.removeChild(loadingMask);

            if (!result) {
                alert(data.info);
                return;
            } 

            var tutorial = $("#tutorial"),
                html = md.render(qa_parse(result))+"<h1>";
            global_lesson_count = generate_lesson(tutorial, html, root);
            
            if (root === "practice") {
                draw();
            }
            initLesson(link);
        },
        error: backendError
    });

    backToTop();
}

function draw() {
    initData();
}

function renderOptions(div, options) {
    var right_div = div.children(".right");
    right_div.html('');
    option_match = {};
    for (var i in options) {
        var html = md.render(options[i]),
            t = String.fromCharCode(65+parseInt(i));
        option_match[t] = options[i];
        right_div.append($('<span>{0}</span>'.format(t + '.' + html)))
    }
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, right_div[0]]);
}

function right_and_freeze(obj) {
    obj.children("input").attr("readonly", "readonly");
    obj.append($('<i class="fa fa-check"></i>'))
}

function wrong_and_cross(obj){
    obj.append($('<i class="fa fa-times"></i>'));
}

function check_result(result, id, quiz_id) {

    if (result) {
        updateLesson(id+1);
        error_times = 0;
    } else {
        $('.hint').css('display', 'block');
        $('.flashes').html('');

        $('.flashes').append("<li>不对哦，再想想!</li>")
        $('.flashes').append("<li>"+result.comment+"</li>")

        error_times++;
        setTimeout("$('.hint').fadeOut('slow')", 5000)
    }
}
