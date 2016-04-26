var nodes = [];
var edges = [];
var nodeSet = null;
var network = null;
var data = null;
var stepLog = new Array();
var index = 0;

function execute() {
    var code = document.getElementById('code').value;
    var obj;
    /* jslint evil:true */
    obj = eval("({next:function() {" + code + "}})");
    console.log("Code is", obj);
    obj.next();
}

function initNetwork() {
    
    var demo, container, length = $("#lenth").val();
    console.log(length);
    var conta1ner = document.getElementById('Matrix');
    var conta2ner = document.getElementById('LinedList');
    var conta3ner = document.getElementById('Stack');
    var conta4ner = document.getElementById('Queue');
    var conta5ner = document.getElementById('Forest');
    var conta6ner = document.getElementById('Tree');
    var conta7ner = document.getElementById('BinaryTree');
    var conta8ner = document.getElementById('Graph');
    var conta9ner = document.getElementById('DGraph');
    var conta0ner = document.getElementById('HashMap');

    var dem1 = Matrix(conta1ner, [length, length]);
    var dem2 = LinkedList(conta2ner, length);
    var dem3 = Stack(conta3ner, length);
    var dem4 = Queue(conta4ner, length);
    var dem5 = Forest(conta5ner, length);
    var dem6 = Tree(conta6ner, length);
    var dem7 = BinaryTree(conta7ner, length);
    var dem8 = Graph(conta8ner, length);
    var dem9 = DGraph(conta9ner, length);
    var dem0 = HashMap(conta0ner, length);
}

function next() {
    if (stepLog.length == 0) {
        alert("步骤长度为0， 应该尚未执行算法");
        return;
    }

    if (stepLog.length == index) {
        alert("执行完毕");
        return;
    }

    var step = stepLog[index];
    var j = step.index;
    
    markNodes([j-1, j]);

    if (step.swap == true) {
        var label = nodes[j].label;
        nodes[j].label = nodes[j-1].label;
        nodes[j-1].label = label;
    }

    updateData(); 
    index++;
}

function start() {
    var len = nodes.length;

    var v = new Array();

    for (var i = 0; i < len; i++) {
        v.push(nodes[i].label);
    }

    for (var i = 0; i < len; i++) {
        for (var j = 1; j < len-i; j++) {
            var step = {index:j};
            if (v[j] < v[j-1]) {
                step.swap = true;
                var tmp = v[j];
                v[j] = v[j-1];
                v[j-1] = tmp;
            }
            else {
                step.swap = false
            }
            stepLog.push(step);
        }
    }
    console.log('log size ' + stepLog.length);
    console.log(v);

    index = 0;
}

function draw() {
    var len = document.getElementById('lenth').value;
    nodes = new Array();

    for (var i = 0; i < len; i++) {
        var node = {id: i+1,  font:{size:10}, 
            fixed: {x:true, y:true }, 
            label: Math.floor(Math.random()*100), 
            shape: 'square', 
            color: 'orange'
        };
        nodes.push(node);
    }

    edges = [];
    initNetwork();
}
