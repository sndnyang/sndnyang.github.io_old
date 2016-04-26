/*global $, data: true, nodes: true, edges: true, network: true, vis, alert, updateData, console*/

function removeFromArray(list, value) {
    var i, numDeleteIndex = -1;
    for (i = 0; i < list.length; i += 1) {
        if (list[i] === value) {
            list.splice(i, 1);
            numDeleteIndex = i;
            break;
        }
    }
    return numDeleteIndex;
}

function data_swap(a, i, j) {
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
}

function indexof(list, e) {
    var i;
    for (i in list) {
        if (e == list[i]) {
            return i;
        }
    }
    return -1;
}

function canAddInBinaryTree(odds, sub_nodes, leafs, add_node_prob){
    return (odds > add_node_prob || !leafs.length) && sub_nodes.length <= 1;
}

function canAddInTree(odds, sub_nodes, leafs, add_node_prob){
    return odds > add_node_prob || !leafs.length;
}

function canAddInForest(odds, sub_nodes, leafs, add_node_prob){
    return odds > add_node_prob || !leafs.length;
}

function canAddNode(type, odds, sub_nodes, leafs) {
    var add_node_prob = Math.random(),
        checkMap = {'森林': canAddInForest,
                    '树': canAddInTree,
                    '二叉树': canAddInBinaryTree};

    var tmp = checkMap[type](odds, sub_nodes, leafs, add_node_prob);
    return tmp;
}

function generateTrees(length, type) {
    var i, j, u, v, odds = 1.3, sub_node = 0, 
        root_num = Math.floor(Math.random() * 5 + 1),
        lists = [], a = {}, leafs = [],
        root = Math.floor(Math.random() * length);

    if (type != "森林") {
        root_num = 1;
    }

    a[root] = [];

    for (i = 0; i < length; i += 1) {
        lists.push(i);
    }

    data_swap(lists, 0, root);

    for (i = 1; i < root_num; i += 1) {
        new_index = Math.floor(Math.random() * (length - i) + i);
        new_node = lists[new_index];
        data_swap(lists, i, new_index);
        leafs.push(new_node);
        a[new_index] = [];
    }

    for (i = root_num; i < length; i += 1) {
        var new_index, new_node;

        if (canAddNode(type, odds, a[root], leafs)) {
            new_index = Math.floor(Math.random() * (length - i) + i);
            new_node = lists[new_index];
            a[root].push(new_node);

            data_swap(lists, i, new_index);
            leafs.push(new_node);
            odds -= 0.3;
            sub_node += 1;
        } 
        else {
            root = leafs.shift();
            a[root] = [];
            if (!leafs.length){
                odds = 1;
            }
            i -= 1;
            sub_node = 0;
            odds = 0.8;
            continue;
        }
    }
    //console.log(a);

    return a;
}

function parseTreeRoot(points) {
    var i, j, u, v, no_list = [];
    for (i in points) {
        no_list.push(parseInt(i));
    }

    for (i in points) {
        for (j in points[i]) {
            removeFromArray(no_list, points[i][j]);
        }
    }

    return no_list;
}

function parseTreeData(points, type) {
    var i, j, node_list, edge_list, node, edge, u, v, root,
        odds = 1.3, sub_node = 0, no_list = [],
        leafs = parseTreeRoot(points);
    
    if (type !== "森林" && leafs.length > 1) {
        return null;                
    }

    length = 0;

    node_list = [];
    edge_list = [];

    for (i = 0; i < leafs.length; i += 1) {
        node = {
            id: length + 1, label: leafs[i],
            shape: 'circle', color: 'orange',
            level: 1
        }
        length += 1;
        node_list.push(node);
        no_list.push(leafs[i]);
    }

    while (leafs.length) {
        i = leafs.shift();
        if (type === "二叉树" && points[i] && points[i].length > 2) {
            return null;
        }

        u = parseInt(indexof(no_list, i));

        for (j in points[i]) {
            
            v = parseInt(indexof(no_list, points[i][j]))+1;
            if (0 == v) {
                node = {
                    id: length + 1, label: points[i][j],
                    shape: 'circle', color: 'orange',
                    level: node_list[u].level + 1
                }
                length += 1;
                v = length;
                node_list.push(node);
                no_list.push(points[i][j]);
                leafs.push(points[i][j]);
            }
            edge = {
                from: u+1,
                to: v
            };
            edge_list.push(edge);
        }
    }

    return {nodes: node_list, edges: edge_list};
}

var HashMap = function (container, length) {
    'use strict';
    var self = {};
    self.type = "散列表";
    self.container = container;
    self.length = length;
    self.dimension = [length, 1];

    self.options =  {
        nodes: {
            fixed: true
        }
    };

    self.extra = [{id: 999, x: 0, y: 0, shape: 'text'}, 
        {id: 998, x: 1000, y: self.dimension[0] * 50, shape: 'text'}];

    self.initData = function () {
        var a = generateTrees(self.length, "树");
        self.parseData(a);
    };

    self.parseData = function (points) {
        var i, j, u, v, node, edge, count;
        nodes = [];
        edges = [];
        length = 0;

        for (i in points) {
            node = {
                id: length + 1, 
                x: 25, y: parseInt(i) * 50 + 25,
                shape: 'text'
            }
            nodes.push(node);
            length += 1;

            u = length;

            count = 0;
            for (j in points[i]) {
                node = {
                    id: length + 1, label: points[i][j],
                    x: 150 + count * 100, 
                    y: 25 + parseInt(i) * 50,
                    shape: 'box', font: {size: 25}
                }
                length += 1;
                count += 1;
                v = length;
                nodes.push(node);

                edge = {
                    from: u,
                    to: v,
                    arrows: 'to'
                };
                edges.push(edge);
            }
        }

        nodeSet = new vis.DataSet(nodes);
        nodeSet.add(self.extra[0]);
        nodeSet.add(self.extra[1]);
        data = {
            nodes: nodeSet,
            edges: edges
        };
        self.draw();
    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
        network.on("afterDrawing", function (ctx) {
            var i;
            ctx.strokeStyle = '#294475';
            ctx.fillStyle = 'red';
            ctx.font="25px Verdana";
            ctx.lineWidth = 1;
            for (i = 0; i <= self.dimension[0]; i += 1) {
                ctx.moveTo(0, i * 50);
                ctx.lineTo(self.dimension[1] * 50, i * 50);
                if (i < self.dimension[0]) {
                    ctx.fillText(i, 25, i * 50 + 25);
                }
            }
            for (i = 0; i <= self.dimension[1]; i += 1) {
                ctx.moveTo(i * 50, 0);
                ctx.lineTo(i * 50, self.dimension[0] * 50);
            }
            ctx.stroke();
        });
    };

    self.setData = function (data) {
        network.setData(data);
    };

    self.initData();
    return self;
};

var Matrix = function (container, dimension) {
    'use strict';
    var self = {};
    self.type = "数组";
    self.container = container;
    self.length = dimension;
    self.dimension = dimension;

    self.options =  {
        nodes: {
            fixed: true
        }
    };

    self.extra = [{id: 999, x: 0, y: 0, shape: 'text'}, {id: 998, x:
        self.dimension[1] * 50, y: self.dimension[0] * 50, shape: 'text'}];

    self.initData = function () {
        self.parseData(null);
    };

    self.parseData = function (points) {
        nodes = [];
        edges = [];

        nodeSet = new vis.DataSet(nodes);
        nodeSet.add(self.extra[0]);
        nodeSet.add(self.extra[1]);
        data = {
            nodes: nodeSet,
            edges: []
        };
        self.draw();
    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
        network.on("afterDrawing", function (ctx) {
            var i;
            ctx.strokeStyle = '#294475';
            ctx.lineWidth = 1;
            ctx.fillStyle = '#A6D5F7';
            for (i = 0; i <= self.dimension[0]; i += 1) {
                ctx.moveTo(0, i * 50);
                ctx.lineTo(self.dimension[1] * 50, i * 50);
            }
            for (i = 0; i <= self.dimension[1]; i += 1) {
                ctx.moveTo(i * 50, 0);
                ctx.lineTo(i * 50, self.dimension[0] * 50);
            }
            ctx.stroke();
        });
    };

    self.setData = function (data) {
        network.setData(data);
    };

    self.initData();
    return self;
};

var LinkedList = function (container, length) {
    'use strict';
    var self = {};
    self.type = "链表";
    self.container = container;
    self.length = length;
    self.options =  {
        edges: {
            smooth: {
                type: 'straightCross'
            }
        }
    };

    self.initData = function () {
        var i, a = [];
        for (i = 0; i < self.length; i += 1) {
            a.push(Math.floor(Math.random() * 100));
        }
        self.parseData(a);
    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
    };

    self.parseData = function (points) {
        var i, node, edge;
        self.length = points.length;
        nodes = [];
        edges = [];

        for (i = 0; i < self.length; i += 1) {
            node = {
                id: i + 1,
                x: i * 80 + 40,
                y: 100,
                fixed: {x: true, y: true},
                label: points[i],
                shape: 'square',
                color: 'orange'
            };
            nodes.push(node);
        }

        for (i = 1; i < self.length; i += 1) {
            edge = {
                from: i,
                to: i + 1,
                arrows: 'to'
            };
            edges.push(edge);
        }

        nodeSet = new vis.DataSet(nodes);
        data = {
            nodes: nodeSet,
            edges: edges
        };

        self.draw();
    };

    self.setData = function (data) {
        network.setData(data);
    };

    self.initData();
    return self;
};

var Stack = function (container, length) {
    'use strict';
    var self = {};
    self.type = "栈";
    self.container = container;
    self.length = length;
    self.extra = [{id: 999, x: 0, y: 0, shape: 'text'},
        {id: 998, x: self.length * 80 + 120, y: 100, shape: 'text'}];

    self.options =  {
        nodes: {
            fixed: true
        }
    };
    
    self.initData = function () {
        var i, a = [];
        for (i = 0; i < self.length; i += 1) {
            a.push(Math.floor(Math.random() * 100));
        }
        self.parseData(a);
    };

    self.parseData = function (points) {
        var i, node, edge;
        self.length = points.length;
        self.extra[1].x = self.length * 80 + 120;

        nodes = [];
        edges = [];
        
        for (i = 0; i < self.length; i += 1) {
            node = {
                id: i + 1,
                x: i * 80 + 40,
                y: 100,
                label: Math.floor(Math.random() * 100),
                shape: 'square',
                color: 'orange'
            };
            nodes.push(node);
        }

        nodeSet = new vis.DataSet(nodes);
        nodeSet.add(self.extra[0]);
        nodeSet.add(self.extra[1]);

        data = {
            nodes: nodeSet,
            edges: edges
        };

        self.draw();
    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
        network.on("afterDrawing", function (ctx) {
            ctx.strokeStyle = '#294475';
            ctx.lineWidth = 2;
            ctx.fillStyle = '#A6D5F7';
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 200);
            ctx.moveTo(0, 25);
            ctx.lineTo(20 + 80 * self.length, 25);
            ctx.moveTo(0, 175);
            ctx.lineTo(20 + 80 * self.length, 175);
            ctx.stroke();
        });

    };

    self.pop = function () {

        if (!self.length) {
            alert('集合为空');
            return;
        }

        var e = nodes.pop();
        updateData();

        self.length -= 1;

        return e;
    };

    self.push = function (e) {

        var node = {
            id: self.length + 1,
            x: self.length * 80 + 40,
            y: 100,
            label: e,
            shape: 'square',
            color: 'orange'
        };
        self.length += 1;
        nodes.push(node);
        updateData();
    };

    self.setData = function (data) {
        network.setData(data);
    };

    self.initData();
    return self;
};

var Queue = function (container, length) {
    'use strict';
    var self = {};
    self.type = "队列";
    self.container = container;
    self.length = length;

    self.options =  {
        nodes: {
            fixed: true
        }
    };

    self.initData = function () {
        var i, a = [];
        for (i = 0; i < self.length; i += 1) {
            a.push(Math.floor(Math.random() * 100));
        }
        self.parseData(a);
    };

    self.parseData = function (points) {
        var i, node, edge;
        self.length = points.length;
        nodes = [];
        edges = [];

        for (i = 0; i < self.length; i += 1) {
            node = {
                id: i + 1,
                x: i * 80 + 50,
                y: 100,
                label: points[i],
                shape: 'square',
                color: 'orange'
            };
            nodes.push(node);
        }

        nodeSet = new vis.DataSet(nodes);
        data = {
            nodes: nodeSet,
            edges: edges
        };
        self.draw();
    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
        network.on("afterDrawing", function (ctx) {
            if (self.viewPosition) {
                this.moveTo({position: self.viewPosition});
            }

            ctx.strokeStyle = '#294475';
            ctx.lineWidth = 2;
            ctx.fillStyle = '#A6D5F7';
            ctx.moveTo(0, 25);
            ctx.lineTo(20 + 80 * self.length, 25);
            ctx.moveTo(0, 175);
            ctx.lineTo(20 + 80 * self.length, 175);
            ctx.stroke();
        });
    };

    self.dequeue = function () {
        var i, e;

        if (!self.length) {
            alert('集合为空');
            return;
        }

        e = nodes.shift();
        self.length -= 1;
        for (i = 0; i < self.length; i += 1) {
            nodes[i].x -= 80;
            nodes[i].id -= 1;
        }

        updateData();

        return e;
    };

    self.enqueue = function (e) {
        var node = {
            id: self.length + 1,
            x: self.length * 80 + 40,
            y: 100,
            label: e,
            shape: 'square',
            color: 'orange'
        };
        self.length += 1;
        nodes.push(node);
        updateData();
    };

    self.setData = function (data) {
        network.setData(data);
    };

    self.initData();
    return self;
};

var Forest = function (container, length) {
    'use strict';
    var self = {};
    self.type = "森林";
    self.container = container;
    self.length = length;

    self.options =  {
        nodes: {
            fixed: true
        },
        layout: {
            hierarchical: {
                direction: 'UD'
            }
        }
    };

    self.initData = function () {
        var a = generateTrees(self.length, self.type);
        self.parseData(a);
    };

    self.parseData = function (points) {
        
        var local_data = parseTreeData(points, self.type);
        if (!local_data) {
            alert("数据解析失败， 不符合森林格式");
            return;
        }

        nodes = local_data.nodes;
        edges = local_data.edges;

        nodeSet = new vis.DataSet(local_data.nodes);

        data = {
            nodes: nodeSet,
            edges: local_data.edges
        };
        self.draw();
    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
        network.on("afterDrawing", function (ctx) {
        });

    };

    self.setData = function (data) {
        network.setData(data);
    };

    self.initData();
    return self;
};

var Tree = function (container, length) {
    'use strict';
    var self = {};
    self.type = "树";
    self.container = container;
    self.length = length;

    self.options =  {
        edges: {
            smooth: {
                type: 'cubicBezier',
                forceDirection: 'horizontal'
            }
        },
        layout: {
            hierarchical: {
                direction: 'LR'
            }
        }
    };

    self.initData = function () {
        var a = generateTrees(self.length, self.type);
        self.parseData(a);
    };

    self.parseData = function (points) {
        
        var local_data = parseTreeData(points, self.type);
        if (!local_data) {
            alert("数据解析失败， 不符合树格式");
            return;
        }

        nodes = local_data.nodes;
        edges = local_data.edges;

        nodeSet = new vis.DataSet(local_data.nodes);

        data = {
            nodes: nodeSet,
            edges: local_data.edges
        };
        self.draw();
    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
        network.on("afterDrawing", function (ctx) {
            if (self.viewPosition) {
                this.moveTo({position: self.viewPosition});
            }
        });
    };

    self.setData = function (data) {
        network.setData(data);
    };

    self.initData();
    return self;
};

var BinaryTree = function (container, length) {
    'use strict';
    var self = {};
    self.type = "二叉树";
    self.container = container;
    self.length = length;

    self.options =  {
        layout: {
            hierarchical: {
                direction: 'UD'
            }
        }
    };

    self.initData = function () {
        var a = generateTrees(self.length, self.type);
        self.parseData(a);
    };

    self.parseData = function (points) {
        
        var local_data = parseTreeData(points, self.type);
        if (!local_data) {
            alert("数据解析失败， 不符合二叉树格式");
            return;
        }

        nodes = local_data.nodes;
        edges = local_data.edges;

        nodeSet = new vis.DataSet(local_data.nodes);

        data = {
            nodes: nodeSet,
            edges: local_data.edges
        };
        self.draw();
    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
        network.on("afterDrawing", function (ctx) {
        });
    };

    self.setData = function (data) {
        network.setData(data);
    };

    self.initData();
    return self;
};

var DGraph = function (container, length) {
    'use strict';
    var self = {};
    self.type = "有向图";
    self.container = container;
    self.length = length;
    self.density = 0.5;

    self.options =  {layout:{randomSeed:2}};

    self.setDensity = function (density) {
        self.density = density;
    };
    
    self.initData = function () {
        var i, j, u, v, lists = [], a = {};
        for (i = 0; i < self.length; i += 1) {
            lists.push(i);
        }
        //console.log(lists);

        for (i in lists) {
            u = lists[i];
            a[u] = [];
            for (j in lists) {
                v = lists[j];
                if (Math.random() > self.density) {
                    a[u].push(v);
                }
            }
        }
        self.parseData(a);
    };

    self.parseData = function (points) {
        var i, j, node, edge, u, v;
        var i, node, edge, odds = 1.3, no_list = [], leafs = [], 
            sub_node = 0;

        self.length = 0;
        nodes = [];
        edges = [];
        //console.log(points);

        for (i in points) {
            u = parseInt(indexof(no_list, i)) + 1;
            if (u == 0) {
                node = {
                    id: self.length + 1,
                    label: i,
                    shape: 'circle',
                    color: 'orange'
                }
                self.length += 1;
                nodes.push(node);
                u = self.length;
                no_list.push(i);
            }

            //console.log(i + ' id ' +  u + ' to ' + points[i]);

            for (j in points[i]) {
                v = parseInt(indexof(no_list, points[i][j]))+1;
                
                if (0 == v) {
                    node = {
                        id: self.length + 1,
                        label: points[i][j],
                        shape: 'circle',
                        color: 'orange'
                    }
                    self.length += 1;
                    v = self.length;
                    nodes.push(node);
                    no_list.push(points[i][j]);
                }
                //console.log(u + ' -> ' + v + ' ' + points[i][j]);
                edge = {
                    from: u,
                    to: v,
                    arrows: 'to'
                };
                edges.push(edge);
            }
        }

        nodeSet = new vis.DataSet(nodes);
        data = {
            nodes: nodeSet,
            edges: edges
        };
        self.draw();
    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
    };

    self.setData = function (data) {
        network.setData(data);
    };

    self.initData();
    return self;
}

var Graph = function (container, length) {
    'use strict';
    var self = {};
    self.type = "无向图";
    self.container = container;
    self.length = length;
    self.density = 0.5;

    self.options =  {layout:{
        randomSeed:2}
    };

    self.setDensity = function (density) {
        self.density = density;
    };
    
    self.initData = function () {
        var i, j, u, v, lists = [], a = {};
        for (i = 0; i < self.length; i += 1) {
            lists.push(i);
        }

        for (i = 0; i < lists.length; i += 1) {
            u = lists[i];
            a[u] = [];
            for (j = i+1; j < lists.length; j += 1) {
                v = lists[j];
                if (Math.random() > self.density) {
                    a[u].push(v);
                }
            }
        }
        self.parseData(a);
    };

    self.parseData = function (points) {
        var i, j, node, edge, u, v;
        var i, node, edge, odds = 1.3, no_list = new Array(), leafs = [], 
            sub_node = 0;

        self.length = 0;
        nodes = [];
        edges = [];
        //console.log(points);

        for (i in points) {
            u = parseInt(indexof(no_list, i)) + 1;
            if (u == 0) {
                node = {
                    id: self.length + 1,
                    label: i,
                    shape: 'circle',
                    color: 'orange'
                }
                self.length += 1;
                nodes.push(node);
                u = self.length;
                no_list.push(i);
            }

            for (j in points[i]) {
                v = parseInt(indexof(no_list, points[i][j]))+1;
                
                if (0 == v) {
                    node = {
                        id: self.length + 1,
                        label: points[i][j],
                        shape: 'circle',
                        color: 'orange'
                    }
                    self.length += 1;
                    v = self.length;
                    nodes.push(node);
                    no_list.push(points[i][j]);
                }
                edge = {
                    from: u,
                    to: v
                };
                edges.push(edge);
            }
        }

        nodeSet = new vis.DataSet(nodes);

        data = {
            nodes: nodeSet,
            edges: edges
        };
        self.draw();
    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
        network.on("afterDrawing", function (ctx) {
        });
    };

    self.setData = function (data) {
        network.setData(data);
    };

    self.initData();
    return self;
}
