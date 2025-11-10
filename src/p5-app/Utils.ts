// NodeとHeapが入ってます
export namespace Utils {
    export class Node {
        index: number;
        dist: number;
        est: number;
        state: number;
        parent: Node | null = null;
        child: Node | null = null;
        left: Node = this;
        right: Node = this;
        prev: Node | null = null;
        degree: number;
        mark: boolean;

        static readonly States = {
            Undiscovered: 0,
            Discovered: 1,
            Visited: 2,
            Blocked: -1,
            Path: 3
        }

        constructor(index: number) {
            this.index = index;
            this.dist = Number.MAX_VALUE;
            this.est = Number.MAX_VALUE;
            this.state = Node.States.Blocked;
            this.parent = null;
            this.child = null;
            this.left = this;
            this.right = this;
            this.prev = null;
            this.degree = 0;
            this.mark = false;
        }

        public get totalCost() {
            return this.dist + this.est;
        }
        public insertLeft = (node: Node): void => {
            node.left = this.left;
            node.right = this;
            this.left!.right = node;
            this.left = node;
        }
        public removeMySelf = (): Node => {
            if (this.right !== this) {
                this.left!.right = this.right;
                this.right!.left = this.left;
            }
            this.left = this;
            this.right = this;
            return this;
        }
        public peel = (head: Node): void => {
            if (this.child === null) return;
            while (this.child.left != this.child) head.insertLeft(this.child.left!.removeMySelf());
            head.insertLeft(this.child);
            this.child.parent = null;
            this.child = null;
            this.degree = 0;
        }
        public insertChild = (node: Node): void => {
            if (this.child === null) this.child = node;
            else this.child.insertLeft(node);
        }
    }

    export class Heap {
        public head: Node | null = null;
        public n: number = 0;

        constructor() {}

        public push = (node: Node): void => {
            if (this.head === null) this.head = node;
            else this.head.insertLeft(node);
            if (node.totalCost < this.head.totalCost) this.head = node;
            this.n++;
        }
        public pop = (): Node | null => {
            if (this.head === null) return null;
            let min = this.head;
            let next = this.head.right!;
            this.head.peel(this.head);
            this.head.removeMySelf();
            this.n--;
            this.head = min === next ? null : next;
            this.setNewHead();
            return min;
        }
        protected setNewHead = (): void => {
            if (this.head === null) return;
            let cur = this.head;
            let temp = this.head;
            do {
                if (cur.totalCost < temp.totalCost) temp = cur;
                cur = cur.right!;
            } while (cur != this.head);
            this.head = temp;
        }
        public prioritize = (x: Node, newDist: number, newEst?: number): boolean => {
            if (typeof newEst === "number") {
                if (newDist + newEst >= x.totalCost) return false;
                x.dist = newDist;
                x.est = newEst;
                if (x.parent === null) {
                    if (x.totalCost < this.head!.totalCost) this.head = x;
                    return true;
                }
                this.cut(x);
                this.cascadingCut(x.parent);
                if (x.totalCost < this.head!.totalCost) this.head = x;
                return true;
            }
            else {
                if (newDist >= x.dist) return false;
                x.dist = newDist;
                if (x.parent === null) {
                    if (x.dist < this.head!.dist) this.head = x;
                    return true;
                }
                this.cut(x);
                this.cascadingCut(x.parent);
                if (x.dist < this.head!.dist) this.head = x;
                return true;
            }
        }
        private cut = (x: Node): void => {
            let y = x.parent;
            if (y!.child === x) y!.child = x.right == x ? null : x.right;
            y!.degree--;
            x.removeMySelf();
            x.parent = null;
            x.mark = false;
            this.head!.insertLeft(x);
        }
        private cascadingCut = (y: Node): void => {
            while (y !== null) {
                if(!y.mark) {
                    y.mark = true;
                    break;
                }
                if(y.parent === null) break;
                let z = y.parent;
                this.cut(y);
                y = z;
            }
        }
    }

    export class RandomHeap extends Heap { // prim法のためのheap。必ずoldestが一番最初にpushされたノード、二番目はその右というように続いていき、一番新しいものはoldestの左隣となる。
        private oldest: Node | null = null;
        override push = (node: Node): void => { // headの更新をしない
            if (this.head === null) {
                this.head = node;
                this.oldest = node;
            }
            else this.head.insertLeft(node);
            this.n++;
        }
        override setNewHead = (): void => { // ランダムにheadを指定
            if (this.head === null) return;

            // できるだけあとに追加されたものが優先されるようにheadを決める
            // 全体の高さの1/4までは入り込んで取り出せるスタックみたいなイメージ
            let r: number = Math.random(); // 0以上1未満
            let index: number = Math.floor(Math.pow(r - 0.5, 2) * this.n); // (0~0.25の乱数値 * 全体の要素数)の切り捨て。またこの乱数値は0の方に偏っている。
            let cur = this.head;
            for (let i = 0; i <= index; i++) {
                if (!cur.left) break;
                cur = cur.left;
            }
            this.head = cur;
        }
        override pop = (): Node | null => {
            if (this.head === null) return null;
            this.setNewHead();
            let min = this.head;
            this.head.peel(this.head);
            this.head.removeMySelf();
            this.n--;
            this.head = min === this.oldest ? null : this.oldest;
            return min;
        }
    }
}