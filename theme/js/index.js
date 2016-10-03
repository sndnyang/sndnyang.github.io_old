/**
 * 回到顶部
 */
function backToTop() {
    //滚页面才显示返回顶部
    $(window).scroll(function() {
        if ($(window).scrollTop() > 100) {
            $("#top").fadeIn(500);
        } else {
            $("#top").fadeOut(500);
        }
    });
    //点击回到顶部
    $("#top").click(function() {
        $("body").animate({
            scrollTop: "0"
        }, 500);
    });
    
}

var error_times = 0;

function checkQuiz(obj, id) {
    var value,
        your_answer,
        back_check = false,
        eleparent = $(obj).parent(),
        ele = eleparent.children(".quiz"),
        type = ele.attr("type"),
        lesson_name = eleparent.parent()[0].className,
        lesson_id = parseInt(lesson_name.substr(13)),
        correct = eleparent.children(".answers").val(),
        comments = eleparent.children(".comments");

    if (type === "radio") {
        ele.each(function() {
            if ($(this).prop('checked') === true) {
                value = $(this).val();
            }
        });
    } else if (type === "checkbox") {

        value = '';

        ele.each(function() {
            if ($(this).prop('checked') === true) {
                value += $(this).val()+"@";
            }
        });

        value = value.substring(0, value.length-1);

    } else if (type === "text") {
        value = ele.val();
    }

    if (type === "text" && ele.hasClass("formula")) {
        var expression = ele.val();
        console.log("暂不支持公式");
    } else {
        your_answer = $.md5(value);

        if (your_answer === correct) {
            $('.hint').css('display', 'block');
            $('.flashes').html("<li>恭喜答案正确</li>");
            error_times = 0;
            setTimeout("$('.hint').fadeOut('slow')", 5000)
        } else {
            $('.hint').css('display', 'block');
            $('.flashes').html('');
            $('.flashes').append("<li>对不起， 答案错误</li>")
            $('.flashes').append("<li>提示:</li>")

            if (comments === "undefined") {
                comments = "无提示";
            }
            else {
                comments = comments.val();
            }

            comments = comments.split('#');
            if (error_times >= comments.length)
                $('.flashes').append("<li>"+comments+"</li>");
            else
                $('.flashes').append("<li>"+comments[error_times]+"</li>");
            error_times++;
            setTimeout("$('.hint').fadeOut('slow')", 5000)
        }
    }
}

