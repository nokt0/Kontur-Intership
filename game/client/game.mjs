const LAND = '#';
const WATER = '~';
const PORT = 'O';
const HOME = 'H';
const SHIP_VOLUME = 368;

let adjacencyMatrix;
let moveCount = 0;

let ShipState = {
    moves: false,
    route: []
}

export function startGame(levelMap, gameState) {
    adjacencyMatrix = createAdjacencyMatrix(levelMap);

}

export function getNextCommand(gameState) {
    let ship = gameState.ship;
    let homePort = gameState.ports.filter(p => {
        return p.isHome && p.x === ship.x
            && p.y === ship.y;
    })[0];
    let sellPort = gameState.ports.filter(p => {
        return !p.isHome;
    })

    if (!ShipState.moves && ship.goods.length === 0) {

        let goods = [...gameState.goodsInPort];
        let goodsCount = Math.floor(SHIP_VOLUME / goods[0].volume);
        let goodForLoad = goods[0];
        if (goodForLoad.ammount < goodsCount) {
            goodsCount = goodForLoad.ammount;
        }

        ShipState.route = bfs(adjacencyMatrix[ship.y][ship.x], sellPort[0].y, sellPort[0].x);
        ShipState.moves = true;
        moveCount++;
        return `LOAD ${goodForLoad.name} ${goodsCount}`
    }
    if (ShipState.moves) {
        moveCount++;
        return getShipMove(ship);
    }
    if (ship.goods.length !== 0 && !ShipState.moves) {
        if (ship.x == sellPort[0].x && ship.y == sellPort[0].y) {
            ShipState.route = bfs(adjacencyMatrix[ship.y][ship.x],homePort.y,homePort.x);
            ShipState.moves = true;
            moveCount++;
            return `LOAD ${ship.goods[0].name} ${ship.goods[0].amount}`;
        }
    }
    console.log(gameState);
    moveCount++;
    return 'WAIT';
}

function getShipMove(ship) {
    if (ShipState.route.length == 0) {
        ShipState.moves = false;
        console.log("Route ended");
        return 'WAIT';
    }
    let nodeToMove = ShipState.route.shift();
    let xDifference = nodeToMove.x - ship.x;
    let yDifference = nodeToMove.y - ship.y;
    if (Math.abs(xDifference) > 1 || Math.abs(yDifference) > 1
        || (Math.abs(xDifference) === 1 && Math.abs(yDifference) === 1)) {
        console.log("Wrong Route")
        throw new Error("Wrong Route");
    }
    else {
        if (xDifference > 0) {
            return 'E';
        }
        if (xDifference < 0) {
            return 'W';
        }
        if (yDifference > 0) {
            return 'N';
        }
        if (yDifference < 0) {
            return 'S';
        }
    }
}

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

function bfs(startNode, targetY, targetX) {
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
    previousMap.set(startNode, null);
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