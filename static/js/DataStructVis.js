/*global $, data: true, nodes: true, edges: true, network: true, vis, alert, updateData, console*/

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
        nodes = [];
        edges = [];
        nodes.push(self.extra[0]);
        nodes.push(self.extra[1]);

        data = {
            nodes: nodes,
            edges: []
        };
    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
        network.on("afterDrawing", function (ctx) {
            var i;
            if (self.viewPosition) {
                this.moveTo({position: self.viewPosition});
            }
            ctx.strokeStyle = '#294475';
            ctx.lineWidth = 1;
            ctx.fillStyle = '#A6D5F7';
            for (i = 0; i <= self.dimension[0]; i += 1) {
                ctx.moveTo(0, i * 50);
                ctx.lineTo(self.dimension[1] * 50, i * 50);
            }
            for (i = 0; i <= self.dimension[1]; i += 1) {
                ctx.moveTo(i * 50, 0);
                ctx.lineTo(i * 50, self.dimension[1] * 50);
            }
            ctx.stroke();
        });
    };

    self.parseData = function (data) {
        network.setData(data);
    };

    self.setData = function (data) {
        network.setData(data);
    };


    self.initData();
    self.draw();
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
        console.log(self.options);
        console.log(data);
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

        data = {
            nodes: nodes,
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


    self.parseData = function (points) {
        var i, node, edge;
        self.length = points.length;
        self.extra[1].x = self.length * 80 + 120;

        nodes = [];
        edges = [];
        nodes.push(self.extra[0]);
        nodes.push(self.extra[1]);
        
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

        data = {
            nodes: nodes,
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

        data = {
            nodes: nodes,
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

        e = nodes.splice(0, 1);
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

    self.initData = function (data) {
        var i, a = {};
        for (i = 0; i < self.length; i += 1) {
            a[i] = Math.floor(Math.random() * 100);
        }
        self.parseData(a);
    };

    self.parseData = function (points) {
        var i, j, node, edge;
        self.length = 0;
        nodes = [];
        edges = [];
        for (i in points) {
            node = {
                id: self.length + 1,
                x: self.length * 80 + 40,
                y: 100,
                label: points[i],
                shape: 'dot',
                color: 'orange'
            }
            self.length += 1;
            nodes.push(node);

            for (j in points[i]) {
                node = {
                    id: points[i][j],
                    x: i * 80 + 40,
                    y: 100,
                    label: points[i],
                    shape: 'dot',
                    color: 'orange'
                };
                self.length += 1
                nodes.push(node);
            }
        }

        data = {
            nodes: nodes,
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
    self.viewPosition = null;

    self.initData = function () {
        nodes = [];
        edges = [];
        var i, node, edge, no_list = [], odds = 1, leafs = [], 
            root = Math.floor(Math.random() * self.length);

        for (i = 0; i < self.length; i += 1) {
            no_list.push(i);
            node = {
                id: i + 1, shape: 'circle',
                label: Math.floor(Math.random() * 100),
                color: 'orange'
            };
            nodes.push(node);
        }

        data_swap(no_list, 0, root);
        nodes[root].level = 1;

        for (i = 1; i < self.length; i += 1) {
            var new_index, new_node, add_node_prob = Math.random();
            if (odds > add_node_prob || !leafs.length) {
                new_index = Math.floor(Math.random() * (self.length - i) + i);
                new_node = no_list[new_index];
                data_swap(no_list, i, new_index);
                nodes[new_node].level = nodes[root].level + 1;
                leafs.push(new_node);
                odds -= 0.2;
            } else {
                root = leafs.splice(0, 1)[0];
                if (!leafs.length){
                    odds = 1;
                }
                i -= 1;
                odds = 0.8;
                continue;
            }

            edge = {
                from: parseInt(root) + 1,
                to: parseInt(new_node) + 1
            };
            edges.push(edge);
        }

        data = {
            nodes: nodes,
            edges: edges
        };

    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
        network.on("afterDrawing", function (ctx) {
            if (self.viewPosition) {
                this.moveTo({position: self.viewPosition});
            }

        });

    };


    self.parseData = function (data) {
        network.setData(data);
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
        nodes = [];
        edges = [];
        var i, node, edge, odds = 1.3, no_list = [], leafs = [], 
            sub_node = 0, root = Math.floor(Math.random() * self.length);

        for (i = 0; i < self.length; i += 1) {
            no_list.push(i);
            node = {
                id: i + 1, shape: 'circle',
                label: Math.floor(Math.random() * 100),
                color: 'orange'
            };
            nodes.push(node);
        }

        data_swap(no_list, 0, root);
        nodes[root].level = 1;
        
        for (i = 1; i < self.length; i += 1) {
            var new_index, new_node, add_node_prob = Math.random();
            if ((odds > add_node_prob || !leafs.length) && sub_node <= 1) {
                new_index = Math.floor(Math.random() * (self.length - i) + i);
                new_node = no_list[new_index];
                data_swap(no_list, i, new_index);
                nodes[new_node].level = nodes[root].level + 1;
                leafs.push(new_node);
                odds -= 0.3;
                sub_node += 1;
            } else {
                root = leafs.splice(0, 1);
                if (!leafs.length){
                    odds = 1;
                }
                i -= 1;
                sub_node = 0;
                odds = 0.8;
                continue;
            }

            edge = {
                from: parseInt(root) + 1,
                to: parseInt(new_node) + 1
            };
            edges.push(edge);
        }

        data = {
            nodes: nodes,
            edges: edges
        };

    };

    self.draw = function () {
        network = new vis.Network(container, data, self.options);
        network.on("afterDrawing", function (ctx) {
        });

    };

    self.parseData = function (data) {
        network.setData(data);
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
        console.log(lists);

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
        var i, node, edge, odds = 1.3, no_list = new Array(), leafs = [], 
            sub_node = 0;

        self.length = 0;
        nodes = [];
        edges = [];
        console.log(points);

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

            console.log(i + ' id ' +  u + ' to ' + points[i]);

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
                console.log(u + ' -> ' + v + ' ' + points[i][j]);
                edge = {
                    from: u,
                    to: v,
                    arrows: 'to'
                };
                edges.push(edge);
            }
        }

        data = {
            nodes: nodes,
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
        console.log(points);

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

        nodes = new vis.DataSet(nodes);
        data = {
            nodes: nodes,
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
