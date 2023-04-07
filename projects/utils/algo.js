export class PriorityQueue {
    constructor(priority = (_) => _) {
        this._heap = [];
        this._gt = (a, b) => priority(a) > priority(b);
        this._lt = (a, b) => priority(a) < priority(b);
    }

    top() {
        if (this._heap.length === 0) {
            return null;
        }
        return this._heap[0];
    }

    pop() {
        if (this._heap.length === 0) {
            return null;
        }
        const item = this._heap[0];
        this._heap[0] = this._heap[this._heap.length - 1];
        this._heap.pop();
        this._heapifyDown();
        return item;
    }

    push(item) {
        this._heap.push(item);
        this._heapifyUp();
    }

    _heapifyUp() {
        let index = this._heap.length - 1;
        while (this._hasParent(index) && this._gt(this._parent(index), this._heap[index])) {
            this._swap(this._getParentIndex(index), index);
            index = this._getParentIndex(index);
        }
    }

    _heapifyDown() {
        let index = 0;
        while (this._hasLeftChild(index)) {
            let smallerChildIndex = this._getLeftChildIndex(index);
            if (this._hasRightChild(index) && this._lt(this._rightChild(index), this._leftChild(index))) {
                smallerChildIndex = this._getRightChildIndex(index);
            }
            if (this._heap[index] < this._heap[smallerChildIndex]) {
                break;
            } else {
                this._swap(index, smallerChildIndex);
            }
            index = smallerChildIndex;
        }
    }

    _getLeftChildIndex(parentIndex) {
        return 2 * parentIndex + 1;
    }

    _getRightChildIndex(parentIndex) {
        return 2 * parentIndex + 2;
    }

    _getParentIndex(childIndex) {
        return Math.floor((childIndex - 1) / 2);
    }

    _hasLeftChild(index) {
        return this._getLeftChildIndex(index) < this._heap.length;
    }

    _hasRightChild(index) {
        return this._getRightChildIndex(index) < this._heap.length;
    }

    _hasParent(index) {
        return this._getParentIndex(index) >= 0;
    }

    _leftChild(index) {
        return this._heap[this._getLeftChildIndex(index)];
    }

    _rightChild(index) {
        return this._heap[this._getRightChildIndex(index)];
    }

    _parent(index) {
        return this._heap[this._getParentIndex(index)];
    }

    _swap(indexOne, indexTwo) {
        const temp = this._heap[indexOne];
        this._heap[indexOne] = this._heap[indexTwo];
        this._heap[indexTwo] = temp;
    }
}

export function minimum_spanning_tree(edges) {
    const tree_edges = [];
    const vertex = [];
    const lookup = new PriorityQueue((_) => _.d);
    function addNode(iv) {
        if (vertex.includes(iv)) return;
        vertex.push(iv);
        edges.forEach(([ia, ib, d], ie) => {
            if (ia === iv || ib === iv)
                lookup.push({ ie, d });
        });
    }
    addNode(0);
    while (lookup.top()) {
        const { ie } = lookup.pop();
        const [ia, ib] = edges[ie];
        const a_ = vertex.includes(ia);
        const b_ = vertex.includes(ib);
        if (a_ && b_) continue;
        if (a_) addNode(ib);
        if (b_) addNode(ia);
        tree_edges.push(ie);
    }
    return tree_edges;
}