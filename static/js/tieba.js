/**
 * Created by yangxiulong on 14-9-6.
 */


function getTieba() {
        var name = $("#name").val();
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
                console.log(data);
                var x = [], member = [], thread = [], tie = [];
                for (var i in data) {
                    x.push(data[i].hour);
                    member.push(data[i].member);
                    thread.push(data[i].thread);
                    tie.push(data[i].tie);
                }
                console.log(x)
                console.log(member)
                console.log(tie)

                var myChart = echarts.init(document.getElementById('canvas'));

                // 指定图表的配置项和数据
                var option = {
                    title: {
                        text: '贴吧数据增长'
                    },
                    tooltip: {
                        trigger: 'axis'
                    },
                    legend: {
                        data:['会员数', '主题贴数', '回复贴总数']
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
                        type: 'value'
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
                        },
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
            },  
            //请求出错的处理  
            error: function(){  
                alert("请求出错");  
            }
        });
    }