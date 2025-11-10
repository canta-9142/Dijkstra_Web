import p5 from "p5";
import { useEffect, useRef } from "react";
import { Utils } from "./Utils.ts";
import React from 'react';

const P5_CONFIG = (window as any).P5_CONFIG || {width: 211, height: 211, useAStar: false };
const { width, height } = P5_CONFIG;

const P5Sketch: React.FC<{ containerId?: string }> = ({ containerId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const p5InstanceRef = useRef<p5 | null>(null);

    useEffect(() => {
        const sketchDemo = (p: p5): void => {
            const gridSize = 9, gapSize = 1;
            const cols = 21, rows = 21;
            const grid: Utils.Node[][] = [];
            let phase: "maze" | "placing" | "search" | "path" | "done" = "placing"
            let heap: Utils.Heap = new Utils.Heap();
            let start: Utils.Node | null = null;
            let goal: Utils.Node | null = null;
            let trace: Utils.Node | null = null;

            const map: number[] = [22,23,24,25,26,28,29,30,31,32,33,34,35,36,37,38,39,40,43,49,53,57,61,64,65,66,67,68,69,70,72,74,76,77,78,80,82,85,89,91,93,95,101,103,106,108,110,112,113,114,116,118,119,120,122,124,127,129,131,135,139,141,143,148,150,151,152,154,155,156,158,159,160,162,163,164,165,166,169,171,175,181,190,192,194,196,197,198,200,201,202,203,204,205,206,208,211,215,217,219,221,223,225,229,232,233,234,236,237,238,240,242,244,246,248,249,250,255,257,259,261,267,269,271,274,276,278,280,282,283,284,285,286,288,289,290,292,295,299,305,311,313,316,317,318,319,320,322,323,324,325,326,327,328,329,330,332,334,343,345,349,353,358,359,360,361,362,363,364,366,367,368,370,372,374,375,376,379,387,391,393,395,400,401,402,403,404,405,406,408,409,410,412,413,414,415,416,417,418];

            function beginSearch(): void { // placing時、startとgoalを設置し終えてから呼び出す
                if (phase === "done") return;
                start!.state = Utils.Node.States.Discovered;
                start!.dist = 0;
                heap.push(start!);
                phase = "search";
                p.loop();
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
                    if (nRow != 0)      dStep(now, grid[nRow-1][nCol], now.dist + 1);
                    if (nRow != rows-1) dStep(now, grid[nRow+1][nCol], now.dist + 1);
                    if (nCol != 0)      dStep(now, grid[nRow][nCol-1], now.dist + 1);
                    if (nCol != cols-1) dStep(now, grid[nRow][nCol+1], now.dist + 1);
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

                grid.length = 0;
                for (let i = 0; i < rows; i++) {
                    let row: Utils.Node[] = [];
                    for (let j = 0; j < cols; j++) {
                        let node = new Utils.Node(i * cols + j);
                        row.push(node);
                    }
                    grid.push(row);
                }
                for (let i of map) {
                    let nRow = Math.floor(i / rows);
                    let nCol = i % cols;
                    if (!grid[nRow][nCol]) continue;
                    grid[nRow][nCol].state = Utils.Node.States.Undiscovered;
                }
                start = grid[1][1];
                goal = grid[19][19];

                drawGrid();
                p.noLoop();

                (p as any).beginSearch = beginSearch;
            };
            p.draw = (): void => {
                drawGrid();

                if (phase === "search") {
                    if (heap.n === 0) {
                        p.print("何らかのエラーにより、目的地を見つけられませんでした。");
                        phase = "done";
                        return;
                    }

                    if (stepSearch()) {
                        phase = "path"
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
                    return;
                }
                else {
                    p.noLoop();
                }
            };
        };

        const container = containerId ? document.getElementById(containerId) : containerRef.current;
        if (!container) return;

        const p5Instance = new p5(sketchDemo, container);
        p5InstanceRef.current = p5Instance;
        (window as any).P5_INSTANCE = p5Instance;

        const onSearch = () => (p5Instance as any).beginSearch();
        const searchBtn = document.getElementById("btn-search");
        searchBtn?.addEventListener("click", onSearch);

        return () => {
            searchBtn?.removeEventListener("click", onSearch);
            p5Instance.remove();
            delete (window as any).P5_INSTANCE;
        };
    }, [containerId]);
    return !containerId ? <div ref={containerRef}></div> : null;
};

export default P5Sketch;