function markNodes(nodes_list) {

    if (nodes_list.length == 0) {
        return;
    }

    for (var i = 0; i < nodes.length; i++) {
        nodes[i].color = "orange";
    }

    for (var i in nodes_list) {
        nodes[nodes_list[i]].color = "red";
    }

    var data = {
        nodes: nodes,
        edges: edges
    };

    network.setData(data);
    network.redraw();
}
