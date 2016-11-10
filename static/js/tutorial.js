
$(document).ready(function() {
    $(".small_step").keydown(function(e) {
        if(e.keyCode == 13) {
            console.log("small step enter to backend");
            var parent = $(this).parents(".process"),
                allStep = parent.children(".step-div").children(".small_step"),
                allValue = [];
            for (var i = 0; i < allStep.length; i++) {
                allValue.push(allStep[i].value);
            }
            console.log(allValue);
            //checkProcess(this, 10);
            
            var id = 10;
            var tutorial_url = document.URL.split('/')[4];
            $.ajax({
                method: "post",
                url : "/checkProcess",
                contentType: 'application/json',
                dataType: "json",
                data: JSON.stringify({'id': id, 'expression': allValue,
                        'url': tutorial_url}),
                success : function (result){
                    //console.log(result);
                    if (result.info) {
                        $('.hint').css('display', 'block');
                        $('.flashes').html('');
                        $('.flashes').append("<li>对不起</li>")
                        $('.flashes').append("<li>"+result.info+"</li>")
                        setTimeout("$('.hint').fadeOut('slow')", 5000)
                    } else if (result.comment) {
                        $('.hint').css('display', 'block');
                        $('.flashes').html('');
                        $('.flashes').append("<li>不对哦，再想想!</li>");
                        var comment = result.comment;
                        if (typeof(result.comment) !== "string") {
                            comment = result.comment[Math.min(error_times, result.comment.length)];
                        }
                        $('.flashes').append("<li>"+comment+"</li>")

                        error_times++;
                        setTimeout("$('.hint').fadeOut('slow')", 5000)
                    } else if(result.response) {
                        check_result(result.response, lesson_id, id);
                    }
                    return;
                }
            });

        }
    });
})

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

String.prototype.format = function() {
    var args = arguments;
    return this.replace(/\{(\d+)\}/g,
        function(m,i){
            return args[i];
        });
}

String.prototype.trim=function() {
    return this.replace(/(^\s*)|(\s*$)/g, "");
}

function checkProcess(obj, id) {
    var value,
        url = "/checkTextAnswer",
        tutorial_url = document.URL.split('/')[4],
        your_answer,
        back_check = false,
        eleparent = $(obj).parent(),
        ele = eleparent.children(".quiz"),
        type = ele.attr("type"),
        lesson_name = eleparent.parent()[0].className,
        lesson_id = parseInt(lesson_name.substr(13));

    if (type === "radio") {
        ele.each(function() {
            if ($(this).prop('checked') === true) {
                value = $(this).val();
            }
        });

        url = "/checkChoice";

    } else if (type === "checkbox") {

        value = '';

        ele.each(function() {
            if ($(this).prop('checked') === true) {
                value += $(this).val()+"@";
            }
        });

        value = value.substring(0, value.length-1);
        url = "/checkChoice";

    } else if (type === "text") {
        value = [];
        for (var i = 0; i < ele.length; i++) {
            value.push(ele[i].value)
        }

        if (ele.hasClass("formula")) url = "/cmp_math";
    } 

}

function update_meta(c) {
    var lines = c.split("\n");
    for (var i = 0; i < 10; i++) {
        var l = lines[i].toLowerCase(),
            content = l.split(":")[1];
        if (l.indexOf("title") === 0) {

            $("title").html(content.trim() + " 教程编辑");
        }
        else if (l.indexOf("summary") === 0) {

            $("meta[name=description]").attr("content", content.trim());
        }
        else if (l.indexOf("tags") === 0) {

            $("meta[name=keywords]").attr("content", content.trim());
        }
    }

}

function qa_parse(c) {
    var clists = [], type, stem, template, match,
        answer, qparts, submit, html = "", quiz_count = 0,
        p = /{%([\w\W]*?)%}/g,
        typep = /([\w\W]*?)\|/,
        stemp = /\|[\w\W]*/,
        submit = '<br><button onclick="checkQuiz(this, {0})">submit</button><br><br>';

    update_meta(c);

    while (match = p.exec(c)) {
        clists.push(match[0]);
        p.lastIndex = match.index + 1;
    }

    var start = 0;

    for (var i in clists) {
        var stemend, temp = clists[i],
            response = $('<div class="math-container"></div>');

        type = temp.match(typep)[0];
        type = type.substring(2, type.length-1).trim();
        //console.log('temp ' + temp);

        stem = temp.match(stemp)[0];
        stemend = stem.indexOf("@");


        if (stemend < 0)
            stemend = stem.length
        stem = stem.substring(1, stemend).trim();
        //console.log(type + ' stem ' + stem);
        if (stem.endsWith("%}")) {
            stem = stem.substring(0, stem.length-2).trim();
        }

        if (type == "radio" || type == "checkbox") {
            quiz_count++;
            qparts = stem.split("&");
            var div = $('<div class="process"></div>'), span = $("<span>{0}</span>".format(qparts[0]));
            template = '<input type="{0}" class="quiz" name="quiz" value="{1}">{2}</input>';
            span.append($("<br>"));
            for (var j = 1; j < qparts.length; j++) {
                var option = template.format(type, qparts[j], String.fromCharCode(64+j)
                        + ". " + qparts[j]) + '<br>';
                span.append($(option));
            }
            div.append(span);
            response.append(div);
        }
        else if (type == "text") {
            quiz_count++;
            var div = $('<div class="process"></div>'),
                blank = '<input type="text" class="quiz">';

            div.append($('<span>'+stem.replace(/_/g, blank)+'</span>'));

            response.append(div);
        }
        else if (type == "formula") {
            quiz_count++;
            var div = $('<div class="process"></div>');
            blank = '<input type="text" class="quiz formula" ';
            blank += 'onkeyup="Preview.Update(this)">'
            blank += '<br><div class="MathPreview"></div>';
            div.append($('<span>'+stem.replace(/_/g, blank)+'</span><br>'));
            response.append(div);
        } else if (type == "process") {
            quiz_count++;
            qparts = stem.split("$");
            var div = $('<div class="process"></div>'),
                step_div = $('<div class="step-div"></div>'),
                input = $('<input type="text" class="small_step"/>'),
                input3 = $('<input type="text" class="small_step"/>'),
                input2 = $('<input type="text" class="small_step"/>');

            input.attr("placeholder", "定理名或原理描述,回车验证");
            input.attr("onkeydown", "return checkProcess(this, event,"+quiz_count+")");

            div.append($('<p>{0}</p>'.format(qparts[0])));

            step_div.append($('<span style="float: left">根据：</span>'));
            step_div.append(input);
            div.append(step_div);

            step_div = $('<div class="step-div"></div>');
            step_div.append($('<span style="float: left">根据：</span>'));
            step_div.append(input2);
            div.append(step_div);

            step_div = $('<div class="step-div"></div>');
            step_div.append($('<span style="float: left">根据：</span>'));
            step_div.append(input3);
            div.append(step_div);

            for (var j = 1; j < qparts.length; j++) {
                var t = String.fromCharCode(64+j) + ".$" + qparts[j] + "$";
            }
            response.append(div);
        }

        response.append($(submit.format(quiz_count)));

        html += c.substring(start, c.indexOf(temp)) + response[0].outerHTML;
        start = c.indexOf(temp) + temp.length;
    }
    html += c.substring(start, c.length);

    return html;
}
