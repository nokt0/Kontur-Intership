
let adjacencyMatrix;
export function startGame(levelMap, gameState) {
    adjacencyMatrix = createAdjacencyMatrix(levelMap);
    
}

export function getNextCommand(gameState) {
    console.log(bfs(adjacencyMatrix[12][10], 1, 9));
    return 'WAIT';
}

const LAND = '#';
const WATER = '~';
const PORT = 'O';
const HOME = 'H';


class Node {
    constructor(y, x, type) {
        this.y = y;
        this.x = x;
        this.type = type;
        this.children = [];
        this.visited = false;
    }

    add(node) {
        this.children.push(node);
    }
}

function bfs(startNode, targetX, targetY) {
    let collection = [startNode];
    let previousMap = new Map();
    

    while (collection.length) {
        let node = collection.shift()

        for (let child of node.children) {
            if (child && !child.visited) {
                child.visited = true;
                collection.push(child);
                previousMap.set(child, node);
                
            }
        }
    }
    previousMap.set(startNode,null);    
    let targetNode = adjacencyMatrix[targetY][targetX];
    if (!targetNode.visited) {
        console.log("No path");
        return undefined;
    } else {
        let path = [];
        for (let nd = targetNode; nd != null; nd = previousMap.get(nd))
            path.push(nd);
        path = path.reverse();
        return path;
    }
}

function createAdjacencyMatrix(mapString) {
    let mapStr = mapString;
    const columnCount = mapString.indexOf('\n');
    const rowCount = mapString.match(/\n/g).length + 1;
    console.log(rowCount, columnCount);

    let map = [];
    for (let y = 0; y < rowCount; y++) {
        map[y] = [];
        for (let x = 0; x < columnCount; x++) {
            map[y][x] = -1;
        }
    }

    mapStr = mapStr.replace(/\n/gim, '');

    for (let y = 0; y < rowCount; y++) {
        for (let x = 0; x < columnCount; x++) {
            let symbol = mapStr.charAt(x + y * rowCount);
            let node = new Node(y, x, symbol);
            map[y][x] = node;
        }
    }

    for (let y = 0; y < rowCount; y++) {
        for (let x = 0; x < columnCount; x++) {
            if (map[y][x].type == LAND) {
                continue;
            }
            if (x != 0 && map[y][x - 1].type != LAND) {
                map[y][x].add(map[y][x - 1]);
            }
            if (x != columnCount - 1 && map[y][x + 1].type != LAND) {
                map[y][x].add(map[y][x + 1])
            }
            if (y != 0 && map[y - 1][x].type != LAND) {
                map[y][x].add(map[y - 1][x]);
            }
            if (y != rowCount - 1 && map[y + 1][x].type != LAND) {
                map[y][x].add(map[y + 1][x]);
            }
        }
    }
    console.log(map)

    return map;
}