/* eslint-disable no-console */
const LAND = '#';
const SHIP_VOLUME = 368;

let coordinateMatrix;
let homePort;
let sellPorts;
let moveCounter;
let shipState;
let pathsHomeToPort;
let profitableCoefficient;

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

  setVisited(value) {
    this.visited = value;
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

function createMatrix(rowCount, columnCount) {
  const matrix = [];
  for (let y = 0; y < rowCount; y += 1) {
    matrix[y] = [];
    for (let x = 0; x < columnCount; x += 1) {
      matrix[y][x] = -1;
    }
  }
  return matrix;
}

function createCoordinateMatrix(mapString) {
  let mapStr = mapString;
  const columnCount = mapString.indexOf('\n');
  const rowCount = mapString.match(/\n/g).length + 1;

  const map = createMatrix(rowCount, columnCount);

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
      if (map[y][x].type !== LAND) {
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

  throw new Error('WAIT Not Expected');
}

function bfs(startNode, targetY, targetX) {
  function resetVisited() {
    coordinateMatrix.forEach((row) => {
      row.forEach((column) => {
        column.setVisited(false);
      });
    });
  }

  const collection = [startNode];
  const previousMap = new Map();

  while (collection.length !== 0) {
    const node = collection.shift();

    node.children.forEach((child) => {
      if (child && !child.visited) {
        child.setVisited(true);
        collection.push(child);
        previousMap.set(child, node);
      }
    });
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

/* Создаёт объект коэффициэнтов(выгодность каждого хода) где в свойстве %name% товара
    хранится объект коэфицциентов для каждого порта */
function calculateProfitableCoefficient(goodsInPort, prices, paths) {
  const result = [];

  goodsInPort.forEach((good) => {
    const { name, amount, volume } = good;
    prices.forEach((portPrices) => {
      const { portId } = portPrices;
      Object.keys(portPrices).forEach((keyName) => {
        if (keyName !== 'portId' && keyName === name) {
          let maxPerIteration = Math.floor(SHIP_VOLUME / volume);
          let maxNumberOfIterations = Math.round(amount / maxPerIteration);
          if (maxNumberOfIterations <= 0) {
            maxNumberOfIterations = 1;
          }
          maxPerIteration = amount < maxPerIteration
            ? amount
            : maxPerIteration;
          const profit = maxPerIteration * portPrices[keyName];
          /* В путях содержатся отправные точки, но мы не отнимаем их колличество, так как
           два хода тратятся на загрузку и продажу товара */
          const coefficient = profit / (paths[portId].length * 2);
          const innerObject = {};
          innerObject.portId = portId;
          innerObject.coefficient = coefficient;
          innerObject.name = name;
          innerObject.maxIterations = maxNumberOfIterations;
          result.push(innerObject);
        }
      });
    });
  });

  result.sort((a, b) => a.coefficient - b.coefficient);
  result.reverse();

  return result;
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

  const { ports, goodsInPort, prices } = gameState;
  homePort = ports
    .filter((p) => p.isHome)
    .shift();

  pathsHomeToPort = [gameState.ports.length];

  sellPorts = ports.filter((p) => !p.isHome);

  // Кешируем пути от дома до каждого порта и сохраняем в матрицу по id порта
  sellPorts.forEach((port) => {
    const { x } = homePort;
    const { y } = homePort;
    pathsHomeToPort[port.portId] = bfs(coordinateMatrix[y][x], port.y, port.x);
  });

  profitableCoefficient = calculateProfitableCoefficient(goodsInPort, prices,
    pathsHomeToPort);

  Object.keys(profitableCoefficient);

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

  if (checkShipCoordinates(homePort.x, homePort.y)) {
    shipState.inHome = true;
  } else {
    shipState.inHome = false;
  }

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
    const { pirates } = gameState;
    const minRange = pirates.reduce((accumulator, currentValue) => {
      const range = bfs(coordinateMatrix[ship.y][ship.x], currentValue.y, currentValue.x).length;
      if (range < accumulator) {
        return range;
      }
      return accumulator;
    }, Number.MAX_SAFE_INTEGER);
    const isSameCoordinate = pirates.reduce((accumulator, currentValue) => {
      if (ship.x === currentValue.x || ship.y === currentValue.y) {
        return true;
      }
      return false;
    }, false);
    const isNextNodeDanger = pirates.reduce((accumulator, currentValue) => {
      if (shipState.route[1] && (((shipState.route[1].x === currentValue.x
        || shipState.route[1].x === currentValue.x + 1
        || shipState.route[1].x === currentValue.x - 1)
        && (shipState.route[1].y === currentValue.y
        || shipState.route[1].y === currentValue.y + 1
        || shipState.route[1].y === currentValue.y - 1))
        || ((shipState.route[1].x === currentValue.x
        || shipState.route[1].x === currentValue.x + 2
        || shipState.route[1].x === currentValue.x - 2)
        && (shipState.route[1].y === currentValue.y
        || shipState.route[1].y === currentValue.y + 2
        || shipState.route[1].y === currentValue.y - 2)))) {
        return true;
      }
      return false;
    }, false);

    if (!isNextNodeDanger) {
      return getShipMove(ship);
    }
    return 'WAIT';
  }

  if (ship.goods.length === 0 && shipState.inHome) {
    const goods = [...gameState.goodsInPort];
    if (profitableCoefficient[0].maxIterations < 1) {
      profitableCoefficient = profitableCoefficient.filter(
        (p) => p.name !== profitableCoefficient[0].name,
      );
    }

    const plannedRoute = profitableCoefficient[0];
    profitableCoefficient[0].maxIterations -= 1;

    const goodForLoad = goods.find((g) => g.name === plannedRoute.name);

    let goodsCount = Math.floor(SHIP_VOLUME / goodForLoad.volume);
    if (goodForLoad.ammount < goodsCount) {
      goodsCount = goodForLoad.ammount;
    }
    /* Присваеваем закешированный маршрут,убирая первый узел,
       так как это домашний порт. */
    shipState.route = [...pathsHomeToPort[plannedRoute.portId]];
    shipState.route.shift();
    shipState.moves = true;
    moveCounter += 1;
    return `LOAD ${goodForLoad.name} ${goodsCount}`;
  }
  if (shipState.inPort) {
    /* Присваеваем закешированный маршрут и делаем reverse,
       так как нам нужно наоборот вернуться в домашний порт. */
    const whatPort = gameState.ports.find((p) => checkShipCoordinates(p.x, p.y));
    shipState.route = [...pathsHomeToPort[whatPort.portId]].reverse();
    shipState.route.shift();
    shipState.moves = true;
    moveCounter += 1;
    return `SELL ${ship.goods[0].name} ${ship.goods[0].amount}`;
  }

  console.log(gameState);
  moveCounter += 1;
  throw new Error('WAIT Not Expected');
}
