import p5 from "p5";
import { useEffect, useRef } from "react";
import { Utils } from "./Utils.ts";
import React from 'react';

const P5_CONFIG = (window as any).P5_CONFIG || {width: 111, height: 111, useAStar: false };
const { width, height } = P5_CONFIG;

const P5Sketch: React.FC<{ containerId?: string }> = ({ containerId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const p5InstanceRef = useRef<p5 | null>(null);

    useEffect(() => {
        const sketch = (p: p5): void => {
            const gridSize = 9, gapSize = 1;
            const cols = Math.floor((width - gapSize) / (gridSize + gapSize)), rows = Math.floor((height - gapSize) / (gridSize + gapSize));
            const grid: Utils.Node[][] = [];
            let phase: "maze" | "placing" | "search" | "path" | "done" = "maze"
            let heap: Utils.Heap;
            let rHeap: Utils.RandomHeap;
            let start: Utils.Node | null = null;
            let goal: Utils.Node | null = null;
            let trace: Utils.Node | null = null;
            let aStar = false;

            function createGrid(): void {
                grid.length = 0;
                for (let i = 0; i < cols; i++) {
                    let row: Utils.Node[] = [];
                    for (let j = 0; j < rows; j++) {
                        let node = new Utils.Node(i * cols + j);
                        row.push(node);
                    }
                    grid.push(row);
                }
                heap = new Utils.Heap();
                rHeap = new Utils.RandomHeap();
                start = null;
                goal = null;
                trace = null;

                let i = Math.floor(p.random(0, rows - 2) / 2) * 2 + 1;
                let j = Math.floor(p.random(0, cols - 2) / 2) * 2 + 1;
                rHeap.push(grid[i][j]);
            }
            function resetGrid(): void { // gridのリセットのみを行う
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        const n = grid[i][j];
                        if (n.state !== Utils.Node.States.Blocked) n.state = Utils.Node.States.Undiscovered;
                        n.prev = null;
                        n.dist = Number.MAX_VALUE;
                        n.est = Number.MAX_VALUE;
                        n.parent = null;
                        n.child = null;
                        n.left = n;
                        n.right = n;
                        n.degree = 0;
                        n.mark = false;
                    }
                }
                heap = new Utils.Heap();
                start = null;
                goal = null;
                trace = null;
                drawGrid();
            }
            function beginGenerating(): void {
                createGrid();
                phase = "maze";
                console.log("phase: maze");
                p.loop();
            }
            function beginPlacing(): void { // done時に呼び出す
                resetGrid();
                phase = "placing";
                console.log("phase: placing");
                p.loop();
            }
            function beginSearch(): void { // placing時、startとgoalを設置し終えてから呼び出す
                if (!start || !goal) {
                    beginPlacing();
                    return;
                }
                start.state = Utils.Node.States.Discovered;
                start.dist = 0;
                heap.push(start);

                aStar = (window as any).P5_CONFIG.useAStar ?? false;
                phase = "search";
                console.log("phase: search");
            }

            function prim(): boolean {
                let now = rHeap.pop();
                if (now === null) return false;

                let nRow = Math.floor(now.index / cols);
                let nCol = now.index % cols;

                if (now.prev === null) now.state = Utils.Node.States.Undiscovered;
                else {
                    let between = Math.floor((now.index + now.prev.index) / 2);
                    now.state = Utils.Node.States.Undiscovered;
                    now.prev.state = Utils.Node.States.Undiscovered;
                    grid[Math.floor(between/cols)][between%cols].state = Utils.Node.States.Undiscovered;
                }

                const neighbors: Utils.Node[] = [];// 上下左右の候補を配列にまとめる
                if (nRow >= 2) neighbors.push(grid[nRow - 2][nCol]);
                if (nRow <= rows - 3) neighbors.push(grid[nRow + 2][nCol]);
                if (nCol >= 2) neighbors.push(grid[nRow][nCol - 2]);
                if (nCol <= cols - 3) neighbors.push(grid[nRow][nCol + 2]);

                for (let i = neighbors.length - 1; i > 0; i--) { // シャッフル(Fisher-Yates shuffle)
                    const j = Math.floor(Math.random() * (i + 1));
                    [neighbors[i],neighbors[j]] = [neighbors[j], neighbors[i]];
                }
                for (const neighbor of neighbors) pStep(now, neighbor);

                return rHeap.n === 0;
            }
            function pStep(cur: Utils.Node, next: Utils.Node): void {
                if(next.prev === null) {
                    rHeap.push(next);
                }
                next.prev = cur; // なぜかわからんがこいつをif文の外側に出すと迷路がいい感じになる
            }

            function stepSearch(): boolean {
                let now = heap.pop();
                if (now === null) return false;

                let nRow = Math.floor(now.index / cols);
                let nCol = now.index % cols;
                if (now.state === Utils.Node.States.Visited || now.state === Utils.Node.States.Blocked) return false;
                now.state = Utils.Node.States.Visited;

                if (now === goal) return true;
                else {
                    if (aStar) {
                        if (nRow != 0)      aStep(now, grid[nRow-1][nCol], now.dist + 1);
                        if (nRow != rows-1) aStep(now, grid[nRow+1][nCol], now.dist + 1);
                        if (nCol != 0)      aStep(now, grid[nRow][nCol-1], now.dist + 1);
                        if (nCol != cols-1) aStep(now, grid[nRow][nCol+1], now.dist + 1);
                    }
                    else {
                        if (nRow != 0)      dStep(now, grid[nRow-1][nCol], now.dist + 1);
                        if (nRow != rows-1) dStep(now, grid[nRow+1][nCol], now.dist + 1);
                        if (nCol != 0)      dStep(now, grid[nRow][nCol-1], now.dist + 1);
                        if (nCol != cols-1) dStep(now, grid[nRow][nCol+1], now.dist + 1);
                    }
                }
                return false;
            }
            function dStep(cur: Utils.Node, next: Utils.Node, newDist: number): void {
                if (next.state === Utils.Node.States.Visited || next.state === Utils.Node.States.Blocked) return;

                if (next.state !== Utils.Node.States.Discovered) {
                    next.dist = newDist;
                    next.prev = cur;
                    next.state = Utils.Node.States.Discovered;
                    heap.push(next);
                }
                else {
                    if (heap.prioritize(next, newDist)) next.prev = cur;
                }
            }
            function aStep(cur: Utils.Node, next: Utils.Node, newDist: number): void {
                if (next.state === Utils.Node.States.Visited || next.state === Utils.Node.States.Blocked) return;


                const est = estimate(next);
                if (next.state !== Utils.Node.States.Discovered) {
                    next.dist = newDist;
                    next.est = est;
                    next.prev = cur;
                    next.state = Utils.Node.States.Discovered;
                    heap.push(next);
                }
                else {
                    if (heap.prioritize(next, newDist, est)) next.prev = cur;
                }
            }
            function estimate(next: Utils.Node): number {
                let dx = Math.abs(next.index % cols - goal!.index % cols);
                let dy = Math.abs(next.index / cols - goal!.index / cols);
                return dx + dy;
            }

            function drawGrid(): void {
                p.background(10);
                for(let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        const node = grid[i][j];
                        if (node === start) p.fill(255,100,0);
                        else if (node === goal) p.fill(255,255,0);
                        else {
                            switch(node.state) {
                                case Utils.Node.States.Undiscovered: p.fill(50,50,50); break;
                                case Utils.Node.States.Discovered: p.fill(255,0,0); break;
                                case Utils.Node.States.Visited: p.fill(0,255,0); break;
                                case Utils.Node.States.Path: p.fill(0,0,255); break;
                                case Utils.Node.States.Blocked: p.fill(180,130,80); break;
                            }
                        }
                        p.rect(
                            j * (gridSize + gapSize) + gapSize,
                            i * (gridSize + gapSize) + gapSize,
                            gridSize,
                            gridSize
                        );
                    }
                }
            }

            p.setup = (): void => {
                p.createCanvas(width, height);
                createGrid();
                p.noLoop();

                (p as any).beginGenerating = beginGenerating;
                (p as any).beginPlacing = beginPlacing;
            };
            p.draw = (): void => {
                drawGrid();

                if (phase === "maze") {
                    if (prim()) {
                        beginPlacing();
                        return;
                    }
                }
                else if (phase === "placing") {
                    // p.mousePressed()内に記述している
                }
                else if (phase === "search") {
                    if (heap.n === 0) {
                        p.print("何らかのエラーにより、目的地を見つけられませんでした。");
                        phase = "done";
                        return;
                    }

                    if (stepSearch()) {
                        phase = "path"
                        console.log("phase: path");
                        trace = goal;
                    }
                    return;
                }
                else if (phase === "path") {
                    while (trace != start) {
                        if (trace!.prev === null) break;
                        trace!.prev.state = Utils.Node.States.Path;
                        trace = trace!.prev;
                    }
                    phase = "done";
                    console.log("phase: done");
                    return;
                }
                else {
                    p.noLoop();
                }
            };
            p.mousePressed = ():void => {
                if (phase !== "placing") return;

                const i = Math.floor(p.mouseY / (gridSize + gapSize));
                const j = Math.floor(p.mouseX / (gridSize + gapSize));
                if (i < 0 || i >= rows || j < 0 || j >= cols) return;
                const node = grid[i][j];
                if (node.state == Utils.Node.States.Blocked) return;

                if (!start) {
                    start = node;
                }
                else if (!goal && node !== start) {
                    goal = node;
                    beginSearch();
                }
            };
        };

        const container = containerId ? document.getElementById(containerId) : containerRef.current;
        if (!container) return;

        const p5Instance = new p5(sketch, container);
        p5InstanceRef.current = p5Instance;
        (window as any).P5_INSTANCE = p5Instance;

        const onGenerate = () => (p5Instance as any).beginGenerating();
        const onReset = () => (p5Instance as any).beginPlacing();
        const onChange = (e: Event) => {
            const useAStar = (e.target as HTMLInputElement).checked;
            window.P5_CONFIG = {
                width: window.P5_CONFIG!.width,
                height: window.P5_CONFIG!.height,
                useAStar: useAStar,
            };
        };

        const generateBtn = document.getElementById("btn-generate");
        const resetBtn = document.getElementById("btn-reset");
        const checkbox = document.getElementById("astar-checkbox");

        generateBtn?.addEventListener("click", onGenerate);
        resetBtn?.addEventListener("click", onReset);
        checkbox?.addEventListener("change", onChange);

        return () => {
            generateBtn?.removeEventListener("click", onGenerate);
            resetBtn?.removeEventListener("click", onReset);
            checkbox?.removeEventListener("change", onChange);
            p5Instance.remove();
            delete (window as any).P5_INSTANCE;
        };
    }, [containerId]);
    return !containerId ? <div ref={containerRef}></div> : null;
};

export default P5Sketch;