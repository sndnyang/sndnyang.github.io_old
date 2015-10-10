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

    //初始化tip
    $(function() {
        $('[data-toggle="tooltip"]').tooltip();
    });
}

init_mathjax = function() {
        if (window.MathJax) {
          // MathJax loaded
          MathJax.Hub.Config({
            TeX: {
              equationNumbers: {
                autoNumber: "AMS",
                useLabelIds: true
              }
            },
            tex2jax: {
              inlineMath: [ ['$','$'], ["\\(","\\)"] ],
              displayMath: [ ['$$','$$'], ["\\[","\\]"] ],
              processEscapes: true,
              processEnvironments: true
            },
            displayAlign: 'center',
            "HTML-CSS": {
              styles: {'.MathJax_Display': {"margin": 0}},
              linebreaks: { automatic: true }
            }
          });
          MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
        }
      }
