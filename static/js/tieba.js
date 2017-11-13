/**
 * Created by yangxiulong on 14-9-6.
 */


function getTieba() {
        var name = "生个中泰"; //$("#name").val();
        var url = "http://tieba.baidu.com/suggestion?query="+name+"&ie=utf-8&_=1510564963999";
        if (name == "生个中泰") {
            url = "http://proxy.zhimind.com/static/data/tieba.json";
            //url = "http://localhost:8080/static/data/tieba.json";
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
                var member_offset = Math.floor(Math.min.apply(null, member) / 2);

                var myChart = echarts.init(document.getElementById('canvas'));
                var myChart2 = echarts.init(document.getElementById('canvas-small'));
                // 指定图表的配置项和数据
                var option = {
                    title: {
                        text: '贴吧数据增长'
                    },
                    tooltip: {
                        trigger: 'axis'
                    },
                    legend: {
                        data:['回复贴总数']
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
                    },
                    series: [
                        {
                            name:'回复贴总数',
                            type:'line',
                            stack: '总量',
                            data: tie
                        }
                    ]
                };

                // 使用刚指定的配置项和数据显示图表。
                myChart.setOption(option);

                option = {
                    title: {
                        text: '贴吧数据增长'
                    },
                    tooltip: {
                        trigger: 'axis'
                    },
                    legend: {
                        data:['会员数', '主题贴数']
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
                        min: member_offset
                    },
                    series: [
                        {
                            name:'会员数',
                            type:'line',
                            stack: '总量',
                            data: member
                        },
                        {
                            name:'主题贴数',
                            type:'line',
                            stack: '总量',
                            data: thread
                        }
                    ]
                };
                myChart2.setOption(option);
                $("#canvas").show();
                $("#canvas-small").show();
            },  
            //请求出错的处理  
            error: function(){  
                alert("请求出错");  
            }
        });
    }