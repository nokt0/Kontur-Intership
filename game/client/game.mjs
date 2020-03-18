/* eslint-disable no-console */
const LAND = '#';
const SHIP_VOLUME = 368;

let coordinateMatrix;
let homePort;
let sellPorts;
let moveCounter;
let shipState;
let pathsHomeToPort;

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

function checkState() {
  const {
    moves, route, inHome, inPort,
  } = shipState;

  if (homePort && inPort !== inHome && (moves !== true || route.length !== 0)) {
    return true;
  }
  return false;
}


function createCoordinateMatrix(mapString) {
  let mapStr = mapString;
  const columnCount = mapString.indexOf('\n');
  const rowCount = mapString.match(/\n/g).length + 1;

  const map = [];
  for (let y = 0; y < rowCount; y += 1) {
    map[y] = [];
    for (let x = 0; x < columnCount; x += 1) {
      map[y][x] = -1;
    }
  }

  mapStr = mapStr.replace(/\n/gim, '');

  for (let y = 0; y < rowCount; y += 1) {
    for (let x = 0; x < columnCount; x += 1) {
      const symbol = mapStr.charAt(x + y * columnCount);
      const node = new Node(y, x, symbol);
      map[y][x] = node;
    }
  }

  for (let y = 0; y < rowCount; y += 1) {
    for (let x = 0; x < columnCount; x += 1) {
      if (map[y][x].type === LAND) {
        continue;
      }
      if (x !== 0 && map[y][x - 1].type !== LAND) {
        map[y][x].add(map[y][x - 1]);
      }
      if (x !== columnCount - 1 && map[y][x + 1].type !== LAND) {
        map[y][x].add(map[y][x + 1]);
      }
      if (y !== 0 && map[y - 1][x].type !== LAND) {
        map[y][x].add(map[y - 1][x]);
      }
      if (y !== rowCount - 1 && map[y + 1][x].type !== LAND) {
        map[y][x].add(map[y + 1][x]);
      }
    }
  }
  console.log(map);

  return map;
}

function getShipMove(ship) {
  const { route } = shipState;

  if (route.length === 0) {
    shipState.moves = false;
    throw new Error('Route end');
  }

  const nodeToMove = shipState.route.shift();
  if (route.length === 0) {
    shipState.moves = false;
  }
  const xDifference = nodeToMove.x - ship.x;
  const yDifference = nodeToMove.y - ship.y;
  if (
    Math.abs(xDifference) > 1
        || Math.abs(yDifference) > 1
        || (Math.abs(xDifference) === 1 && Math.abs(yDifference) === 1)
  ) {
    console.log('Wrong Route node');
    throw new Error('Wrong Route node');
  } else {
    if (xDifference > 0) {
      return 'E';
    }
    if (xDifference < 0) {
      return 'W';
    }
    if (yDifference > 0) {
      return 'S';
    }
    if (yDifference < 0) {
      return 'N';
    }
  }

  return 'WAIT';
}

function bfs(startNode, targetY, targetX) {
  function resetVisited() {
    coordinateMatrix.forEach((row) => {
      row.forEach((column) => {
        column.visited = false;
      });
    });
  }

  const collection = [startNode];
  const previousMap = new Map();

  while (collection.length) {
    const node = collection.shift();

    for (const child of node.children) {
      if (child && !child.visited) {
        child.visited = true;
        collection.push(child);
        previousMap.set(child, node);
      }
    }
  }
  previousMap.set(startNode, null);
  const targetNode = coordinateMatrix[targetY][targetX];
  if (!targetNode.visited) {
    console.log('No path');
    return undefined;
  }
  let path = [];
  for (let nd = targetNode; nd != null; nd = previousMap.get(nd)) {
    path.push(nd);
  }
  path = path.reverse();

  resetVisited();
  return path;
}

export function startGame(levelMap, gameState) {
  coordinateMatrix = createCoordinateMatrix(levelMap);
  moveCounter = 0;
  shipState = {
    moves: false,
    route: [],
    inHome: false,
    inPort: false,
    homePort: undefined,
  };

  const { ports } = gameState;
  homePort = ports
    .filter((p) => p.isHome)
    .shift();

  pathsHomeToPort = [gameState.ports.length];

  // Кешируем пути от дома до каждого порта и сохраняем в матрицу по номеру id
  gameState.ports.forEach((port) => {
    const { x } = homePort;
    const { y } = homePort;
    pathsHomeToPort[port.portId] = bfs(coordinateMatrix[y][x], port.y, port.x);
  });

  sellPorts = ports.filter((p) => !p.isHome);

  console.log(homePort, sellPorts);
  console.log(gameState.prices);
  console.log(pathsHomeToPort);
}

export function getNextCommand(gameState) {
  const { ship } = gameState;

  console.log(shipState);

  function checkShipCoordinates(x, y) {
    return ship.x === x && ship.y === y;
  }

  checkShipCoordinates(homePort.x, homePort.y)
    ? (shipState.inHome = true)
    : (shipState.inHome = false);

  if (sellPorts.some((p) => checkShipCoordinates(p.x, p.y))) {
    shipState.inPort = true;
    shipState.inHome = false;
  } else {
    shipState.inPort = false;
  }

  if (!checkState) {
    throw new Error('Wrong State');
  }

  if (shipState.moves) {
    moveCounter += 1;
    return getShipMove(ship);
  }

  if (ship.goods.length === 0 && shipState.inHome) {
    const goods = [...gameState.goodsInPort];
    let goodsCount = Math.floor(SHIP_VOLUME / goods[0].volume);
    const goodForLoad = goods[0];
    if (goodForLoad.ammount < goodsCount) {
      goodsCount = goodForLoad.ammount;
    }
    /** Присваеваем закешированный маршрут,убирая первый узел,
     * так как это домашний порт. */
    shipState.route = [...pathsHomeToPort[sellPorts[0].portId]];
    shipState.route.shift();
    shipState.moves = true;
    moveCounter += 1;
    return `LOAD ${goodForLoad.name} ${goodsCount}`;
  }
  if (shipState.inPort) {
    /** Присваеваем закешированный маршрут и делаем reverse,
     *  так как нам нужно наоборот вернуться в домашний порт. */
    shipState.route = [...pathsHomeToPort[sellPorts[0].portId]].reverse();
    shipState.route.shift();
    shipState.moves = true;
    moveCounter += 1;
    return `SELL ${ship.goods[0].name} ${ship.goods[0].amount}`;
  }

  console.log(gameState);
  moveCounter += 1;
  return 'WAIT';
}
