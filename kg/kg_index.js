
var cntrlIsPressed = false;
$(document).keydown(function(event){
  if(event.which=="17")
      cntrlIsPressed = true;
});

$(document).keyup(function(){
  cntrlIsPressed = false;
});

/**
 * 回到顶部
 */
function backToTop() {
    //滚页面才显示返回顶部
    $(window).scroll(function() {
        var scroll = $(window).scrollTop();
        if (scroll > 100) {
            $("#top").fadeIn(500);
        } else {
            $("#top").fadeOut(500);
        }
    });
    //点击回到顶部
    $("#top").click(function() {
        $("html,body").animate({
            scrollTop: "0"
        }, 500);
    });
    
    $(".table-nav").css({top: $(window).scrollTop()+150});
}