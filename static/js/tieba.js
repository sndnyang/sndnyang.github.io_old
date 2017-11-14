/**
 * Created by yangxiulong on 14-9-6.
 */


function getTieba() {
        var name = "生个中泰"; //$("#name").val();
        var url = "http://tieba.baidu.com/suggestion?query="+name+"&ie=utf-8&_=1510564963999";
        if (name == "生个中泰") {
            url = "http://proxy.zhimind.com/static/data/tieba.json?v="+Math.random();
            // url = "http://localhost:8080/static/data/tieba.json";
        }
        $.ajax({  
            type: "get", //请求方式  
            url: url, //发送请求地址
            timeout: 30000,//超时时间：30秒
            dataType: "json",
            //请求成功后的回调函数 data为json格式  
            success:function(data){
                if (name != "生个中泰") {
                    var member_num = data['query_match']['search_data'][0]['member_num'];
                    var thread_num = data['query_match']['search_data'][0]['thread_num'];
                    $("#canvas").html("会员数：" + member_num + "  主题贴数：" + thread_num);
                    return;
                }
                var x = [], member = [], thread = [], tie = [];
                for (var i in data) {
                    x.push(data[i].hour);
                    member.push(data[i].member);
                    thread.push(data[i].thread);
                    tie.push(parseInt(data[i].tie));
                }
                var tie_offset = Math.min.apply(null, tie) * 2 - Math.max.apply(null, tie);
                var member_offset = Math.min.apply(null, member) * 2 - Math.max.apply(null, member);
                var thread_offset = Math.min.apply(null, thread) * 2 - Math.max.apply(null, thread);

                var myChart = echarts.init(document.getElementById('canvas-tie'));
                var myChart2 = echarts.init(document.getElementById('canvas-member'));
                var myChart3 = echarts.init(document.getElementById('canvas-thread'));
                // 指定图表的配置项和数据
                var option = {
                    title: {
                        text: '贴吧数据增长'
                    },
                    tooltip: {
                        trigger: 'axis'
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '3%',
                        containLabel: true
                    },
                    toolbox: {
                        feature: {
                            saveAsImage: {}
                        }
                    },
                    xAxis: {
                        type: 'category',
                        boundaryGap: false,
                        data: x
                    },
                    yAxis: {
                        type: 'value',
                        min: tie_offset
                    }
                };
                option.legend = { data:['回复贴总数'] };
                option.series = [ {
                            name:'回复贴总数',
                            type:'line',
                            stack: '总量',
                            data: tie
                        }
                    ];
                option.yAxis.min = tie_offset;

                // 使用刚指定的配置项和数据显示图表。
                myChart.setOption(option);

                option.legend = { data:['会员数'] };
                option.series = [ {
                            name:'会员数',
                            type:'line',
                            stack: '总量',
                            data: member
                        }
                    ];
                option.yAxis.min = member_offset;
                myChart2.setOption(option);

                option.legend = { data:['主题贴数'] };
                option.series = [ {
                            name:'主题贴数',
                            type:'line',
                            stack: '总量',
                            data: thread
                        }
                    ];
                option.yAxis.min = thread_offset;
                myChart3.setOption(option);
                $("#canvas-tie").show();
                $("#canvas-member").show();
                $("#canvas-thread").show();
                
            },  
            //请求出错的处理  
            error: function(){  
                alert("请求出错");  
            }
        });
    }