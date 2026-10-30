// Adaptador integrado de Asesidoku. El motor original se conserva para compartir su generador determinista con React.
// @ts-nocheck
/**
 * MURDOKU — motor de generación y resolución
 * ------------------------------------------------------------
 * Este archivo no sabe nada de temas, nombres ni idiomas: solo entiende
 * de filas, columnas, habitaciones y muebles. Todo lo "narrativo" vive
 * en themes.js. Aquí vive la parte que garantiza que cada caso generado
 * tenga UNA y solo una solución posible.
 *
 * Funciona tanto en el navegador (adjunta `window.Murdoku`) como en
 * Node (exporta `module.exports`) para poder testear el motor de forma
 * aislada antes de tocar la interfaz.
 */
(function (root) {
  "use strict";

  const Murdoku = {};

  // ============================================================
  // 1. RNG determinista (para que un "código de caso" sea repetible)
  // ============================================================
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStringToSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0) ^ Date.now() & 0; // pure fn of str
  }
  function makeRng(seed) {
    if (typeof seed === "string") seed = hashStringToSeed(seed);
    if (typeof seed !== "number") seed = (Math.random() * 2 ** 32) >>> 0;
    return mulberry32(seed);
  }
  function randInt(rng, maxExclusive) {
    return Math.floor(rng() * maxExclusive);
  }
  function choice(rng, arr) {
    return arr[randInt(rng, arr.length)];
  }
  function shuffled(rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(rng, i + 1);
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }
  Murdoku.makeRng = makeRng;
  Murdoku.hashStringToSeed = hashStringToSeed;

  function key(r, c) {
    return r + "," + c;
  }

  // ============================================================
  // 2. Partición del tablero en habitaciones rectangulares
  //    (corte "guillotina": cada corte parte un rectángulo en dos)
  // ============================================================
  function generateRooms(rng, rows, cols, targetRooms, minDim) {
    minDim = minDim || 2;
    let rects = [{ r0: 0, c0: 0, r1: rows - 1, c1: cols - 1 }];

    function dims(rect) {
      return { h: rect.r1 - rect.r0 + 1, w: rect.c1 - rect.c0 + 1 };
    }
    function canSplit(rect) {
      const { h, w } = dims(rect);
      return h >= minDim * 2 || w >= minDim * 2;
    }

    let guard = 0;
    while (rects.length < targetRooms && guard++ < 200) {
      const splittable = rects.filter(canSplit);
      if (splittable.length === 0) break;
      splittable.sort((a, b) => {
        const da = dims(a), db = dims(b);
        return db.h * db.w - da.h * da.w;
      });
      const pool = splittable.slice(0, Math.min(3, splittable.length));
      const rect = choice(rng, pool);
      const { h, w } = dims(rect);
      const canH = h >= minDim * 2;
      const canW = w >= minDim * 2;
      const horizontal = canH && canW ? rng() < 0.5 : canH;

      rects = rects.filter((r) => r !== rect);
      if (horizontal) {
        const span = h - minDim * 2 + 1;
        const cut = rect.r0 + minDim + randInt(rng, span);
        rects.push({ r0: rect.r0, c0: rect.c0, r1: cut - 1, c1: rect.c1 });
        rects.push({ r0: cut, c0: rect.c0, r1: rect.r1, c1: rect.c1 });
      } else {
        const span = w - minDim * 2 + 1;
        const cut = rect.c0 + minDim + randInt(rng, span);
        rects.push({ r0: rect.r0, c0: rect.c0, r1: rect.r1, c1: cut - 1 });
        rects.push({ r0: rect.r0, c0: cut, r1: rect.r1, c1: rect.c1 });
      }
    }

    // Construir mapa celda -> índice de habitación
    const roomOf = Array.from({ length: rows }, () => new Array(cols).fill(-1));
    rects.forEach((rect, idx) => {
      for (let r = rect.r0; r <= rect.r1; r++) {
        for (let c = rect.c0; c <= rect.c1; c++) roomOf[r][c] = idx;
      }
    });

    const rooms = rects.map((rect, idx) => {
      const cells = [];
      for (let r = rect.r0; r <= rect.r1; r++)
        for (let c = rect.c0; c <= rect.c1; c++) cells.push([r, c]);
      return { id: idx, bounds: rect, cells };
    });

    return { rooms, roomOf };
  }
  Murdoku.generateRooms = generateRooms;

  // ============================================================
  // 3. Adyacencia — depende de la variante de reglas del caso
  // ============================================================
  const ADJACENCY = {
    // Reglas clásicas: arriba / abajo / izquierda / derecha
    orthogonal: [[-1, 0], [1, 0], [0, -1], [0, 1]],
    // Variante "Estrella": también cuentan las diagonales (8 direcciones)
    diagonal8: [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1],
    ],
    // Variante "Caballos": movimiento de caballo de ajedrez
    knight: [
      [-2, -1], [-2, 1], [2, -1], [2, 1],
      [-1, -2], [-1, 2], [1, -2], [1, 2],
    ],
  };
  Murdoku.ADJACENCY = ADJACENCY;

  function neighborsOf(r, c, rows, cols, mode) {
    const deltas = ADJACENCY[mode] || ADJACENCY.orthogonal;
    const out = [];
    for (const [dr, dc] of deltas) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);
    }
    return out;
  }
  Murdoku.neighborsOf = neighborsOf;

  // ============================================================
  // 4. Colocación de muebles
  //    occupiable = true  -> una persona puede estar EN esa celda
  //    occupiable = false -> la celda queda bloqueada para personas,
  //                          pero sirve como referencia ("junto a X")
  // ============================================================
  function placeFurniture(rng, rows, cols, roomOf, rooms, furnitureTypes, count) {
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([r, c]);
    const order = shuffled(rng, cells);

    // índice nombre-de-habitación para filtrar por roomIds
    const roomNameById = {};
    rooms.forEach((room) => { roomNameById[room.id] = room.name; });

    // cuántas instancias se han colocado de cada typeId
    const typeCount = new Map();

    // reparte el mobiliario intentando cubrir varias habitaciones
    const perRoomCount = new Map();
    const furniture = [];
    const used = new Set();
    let idx = 0;
    let attempts = 0;
    while (furniture.length < count && attempts < order.length * 2) {
      const [r, c] = order[idx % order.length];
      idx++;
      attempts++;
      const k = key(r, c);
      if (used.has(k)) continue;
      const roomId = roomOf[r][c];
      const already = perRoomCount.get(roomId) || 0;
      // como mucho ~2 muebles por habitación pequeña para no saturarla
      const room = rooms[roomId];
      const maxForRoom = Math.max(1, Math.floor(room.cells.length / 3));
      if (already >= maxForRoom && furniture.length < count - 1) continue;

      // filtrar tipos compatibles con esta celda:
      //   1. no han superado su límite de instancias (maxCount, por defecto 1)
      //   2. si pertenecen a un grupo con maxPerGroup, el grupo no está lleno
      //   3. si definen roomIds, esta habitación debe estar entre ellos
      // Calcular groupCount a partir del typeCount actual en este momento
      const groupCountNow = new Map();
      for (const [tid, cnt] of typeCount.entries()) {
        const ft = furnitureTypes.find((x) => x.id === tid);
        if (ft && ft.group) groupCountNow.set(ft.group, (groupCountNow.get(ft.group) || 0) + cnt);
      }
      const compatible = furnitureTypes.filter((t) => {
        const maxC = (t.maxCount != null && t.maxCount > 1) ? t.maxCount : 1;
        if ((typeCount.get(t.id) || 0) >= maxC) return false;
        if (t.group && t.maxPerGroup != null) {
          if ((groupCountNow.get(t.group) || 0) >= t.maxPerGroup) return false;
        }
        if (Array.isArray(t.roomIds) && t.roomIds.length > 0) {
          return t.roomIds.includes(roomNameById[roomId]);
        }
        return true;
      });
      if (compatible.length === 0) continue;

      const type = choice(rng, compatible);
      typeCount.set(type.id, (typeCount.get(type.id) || 0) + 1);
      furniture.push({
        id: furniture.length,
        typeId: type.id,
        occupiable: !!type.occupiable,
        image: type.image || null,   // ruta de imagen específica del tema
        r, c,
        roomId,
      });
      used.add(k);
      perRoomCount.set(roomId, already + 1);
    }
    return furniture;
  }
  Murdoku.placeFurniture = placeFurniture;

  // ============================================================
  // 5. Emparejamiento aleatorio fila<->columna evitando celdas
  //    bloqueadas (backtracking con orden aleatorio = robusto
  //    incluso si hay muchas celdas bloqueadas)
  // ============================================================
  function randomPerfectMatching(rng, n, blockedSet) {
    const colsOrder = Array.from({ length: n }, (_, i) => i);
    const rowOrder = shuffled(rng, Array.from({ length: n }, (_, i) => i));
    const assign = new Array(n).fill(-1);
    const usedCols = new Array(n).fill(false);

    function backtrack(i) {
      if (i === rowOrder.length) return true;
      const r = rowOrder[i];
      const candidates = shuffled(rng, colsOrder).filter(
        (c) => !usedCols[c] && !blockedSet.has(key(r, c))
      );
      for (const c of candidates) {
        usedCols[c] = true;
        assign[r] = c;
        if (backtrack(i + 1)) return true;
        usedCols[c] = false;
        assign[r] = -1;
      }
      return false;
    }
    const ok = backtrack(0);
    return ok ? assign : null;
  }
  Murdoku.randomPerfectMatching = randomPerfectMatching;

  // ============================================================
  // 6. Descripción de muebles (para saber si hace falta nombrar
  //    la habitación al referirse a ellos, por ambigüedad)
  // ============================================================
  function furnitureIsUniqueInGrid(furniture, typeId) {
    return furniture.filter((f) => f.typeId === typeId).length === 1;
  }
  function furnitureIsUniqueInRoom(furniture, typeId, roomId) {
    return furniture.filter((f) => f.typeId === typeId && f.roomId === roomId).length === 1;
  }
  Murdoku.furnitureIsUniqueInGrid = furnitureIsUniqueInGrid;
  Murdoku.furnitureIsUniqueInRoom = furnitureIsUniqueInRoom;

  // ============================================================
  // 7. Catálogo de HECHOS verdaderos sobre una persona dada su
  //    celda solución. Cada hecho trae su propio "candidateCells"
  //    (el conjunto de celdas del tablero compatibles con el
  //    hecho) para poder usarlo luego como restricción unaria.
  // ============================================================
  function computeFactCatalog(ctx, personIdx) {
    const { rows, cols, roomOf, rooms, furniture, adjacencyMode, solution, victimIdx } = ctx;
    const [r, c] = solution[personIdx];
    const roomId = roomOf[r][c];
    const room = rooms[roomId];
    const facts = [];
    // tablero completo, reutilizado por los hechos de exclusión/relación
    // (candidateCells que no restringen nada por sí solos, o que se
    // filtran a mano a partir de un conjunto excluido)
    const fullBoard = [];
    for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) fullBoard.push([rr, cc]);

    // -- estar en la habitación --
    facts.push({
      type: "room",
      roomId,
      weight: 1,
      candidateCells: room.cells,
    });

    // -- esquina de la habitación --
    const { r0, c0, r1, c1 } = room.bounds;
    const isCorner = (r === r0 || r === r1) && (c === c0 || c === c1) && (r1 > r0 || c1 > c0);
    if (isCorner) {
      const corners = [
        [r0, c0], [r0, c1], [r1, c0], [r1, c1],
      ].filter((cell, i, arr) => arr.findIndex((x) => x[0] === cell[0] && x[1] === cell[1]) === i);
      facts.push({
        type: "corner",
        roomId,
        weight: 2,
        candidateCells: corners,
      });
    }

    // -- cuántas otras personas comparten la habitación --
    const others = solution.filter((cell, i) => i !== personIdx && roomOf[cell[0]][cell[1]] === roomId);
    facts.push({
      type: "room_count",
      roomId,
      count: others.length,
      weight: others.length === 0 ? 3 : 2,
      candidateCells: room.cells,
    });

    // -- mobiliario: adyacencia / encima / misma fila / misma columna --
    // Solo se generan hechos que referencian un mueble CONCRETO si ese
    // tipo de mueble es único dentro de su habitación: así, al nombrar
    // la habitación en la frase, la referencia queda inequívoca.
    for (const f of furniture) {
      const sameCell = f.r === r && f.c === c;
      const uniqueEnough = furnitureIsUniqueInRoom(furniture, f.typeId, f.roomId);
      if (sameCell && f.occupiable && uniqueEnough) {
        const cellsOfType = furniture
          .filter((x) => x.typeId === f.typeId && x.occupiable)
          .map((x) => [x.r, x.c]);
        facts.push({
          type: "on",
          furnitureId: f.id,
          weight: 3,
          candidateCells: [[f.r, f.c]],
        });
        // ¿fue la única persona de todo el caso sobre este TIPO de mueble?
        const occupiedOfType = ctx.solution.filter(([sr, sc]) =>
          furniture.some((x) => x.typeId === f.typeId && x.occupiable && x.r === sr && x.c === sc)
        );
        if (occupiedOfType.length === 1) {
          facts.push({
            type: "on_unique",
            furnitureId: f.id,
            weight: 4,
            candidateCells: cellsOfType,
          });
        }
      }
      if (!sameCell && uniqueEnough) {
        const isNeighbor = neighborsOf(f.r, f.c, rows, cols, adjacencyMode).some(
          ([nr, nc]) => nr === r && nc === c
        );
        // "junto a" solo se cuenta dentro de la misma habitación
        if (isNeighbor && f.roomId === roomId) {
          const spots = neighborsOf(f.r, f.c, rows, cols, adjacencyMode).filter(
            ([nr, nc]) => roomOf[nr][nc] === f.roomId
          );
          facts.push({
            type: "adjacent",
            furnitureId: f.id,
            weight: 2,
            candidateCells: spots,
          });
        } else if (!isNeighbor && f.roomId === roomId) {
          // -- ausencia: NO estaba junto a este mueble (pista de exclusión) --
          const neighborCells = neighborsOf(f.r, f.c, rows, cols, adjacencyMode);
          const excluded = new Set(neighborCells.map(([nr, nc]) => key(nr, nc)));
          facts.push({
            type: "not_adjacent",
            furnitureId: f.id,
            weight: 1,
            candidateCells: fullBoard.filter(([rr, cc]) => !excluded.has(key(rr, cc))),
          });
        }
        if (f.r === r) {
          facts.push({
            type: "same_row",
            furnitureId: f.id,
            weight: 1,
            candidateCells: Array.from({ length: cols }, (_, cc) => [r, cc]).filter(
              ([, cc]) => !(cc === f.c)
            ),
          });
        }
        if (f.c === c) {
          facts.push({
            type: "same_col",
            furnitureId: f.id,
            weight: 1,
            candidateCells: Array.from({ length: rows }, (_, rr) => [rr, c]).filter(
              ([rr]) => !(rr === f.r)
            ),
          });
        }
        // -- misma diagonal que un mueble --
        const diagDr = r - f.r, diagDc = c - f.c;
        if (diagDr !== 0 && Math.abs(diagDr) === Math.abs(diagDc)) {
          const cellsOnDiag = [];
          if (diagDr === diagDc) {
            const constVal = f.r - f.c; // diagonal principal: r - c constante
            for (let rr = 0; rr < rows; rr++) {
              const cc = rr - constVal;
              if (cc >= 0 && cc < cols) cellsOnDiag.push([rr, cc]);
            }
          } else {
            const constVal = f.r + f.c; // anti-diagonal: r + c constante
            for (let rr = 0; rr < rows; rr++) {
              const cc = constVal - rr;
              if (cc >= 0 && cc < cols) cellsOnDiag.push([rr, cc]);
            }
          }
          facts.push({
            type: "same_diag",
            furnitureId: f.id,
            weight: 2,
            candidateCells: cellsOnDiag.filter(([rr, cc]) => !(rr === f.r && cc === f.c)),
          });
        }
      }
    }

    // -- exclusión: nunca estuvo sobre ningún mueble de este tipo --
    const occupiableTypeIds = [...new Set(furniture.filter((x) => x.occupiable).map((x) => x.typeId))];
    for (const typeId of occupiableTypeIds) {
      const cellsOfType = furniture
        .filter((x) => x.typeId === typeId && x.occupiable)
        .map((x) => [x.r, x.c]);
      const personIsOnType = cellsOfType.some(([tr, tc]) => tr === r && tc === c);
      if (!personIsOnType) {
        const excluded = new Set(cellsOfType.map(([tr, tc]) => key(tr, tc)));
        facts.push({
          type: "not_on_type",
          furnitureTypeId: typeId,
          weight: 1,
          candidateCells: fullBoard.filter(([rr, cc]) => !excluded.has(key(rr, cc))),
        });
      }
    }

    // -- exclusión: no estaba en tal otra habitación --
    for (const otherRoom of rooms) {
      if (otherRoom.id === roomId) continue;
      facts.push({
        type: "not_in_room",
        roomId: otherRoom.id,
        weight: 1,
        candidateCells: fullBoard.filter(([rr, cc]) => roomOf[rr][cc] !== otherRoom.id),
      });
    }

    // -- relación con otras personas (sospechosos y víctima) --
    // Estos hechos no tienen un candidateCells propio que los restrinja
    // (la posición de LA OTRA persona también es una incógnita), así que
    // aquí se listan con "todo el tablero" como candidateCells (no filtran
    // nada por sí solos) y es el propio solver (countSolutions, más abajo)
    // el que valida la relación real una vez que TODAS las posiciones
    // -incluida la de la víctima- quedan asignadas.
    for (let other = 0; other < solution.length; other++) {
      if (other === personIdx) continue;
      const [orow, ocol] = solution[other];
      const dr = orow - r;
      const dc = ocol - c;
      const otherIsVictim = victimIdx != null && other === victimIdx;

      if (dr !== 0) {
        facts.push({
          type: "row_offset_person",
          refPersonIdx: other,
          dr,
          weight: 2,
          candidateCells: fullBoard,
        });
      }
      if (dc !== 0) {
        facts.push({
          type: "col_offset_person",
          refPersonIdx: other,
          dc,
          weight: 2,
          candidateCells: fullBoard,
        });
      }
      if (dr !== 0 && Math.abs(dr) === Math.abs(dc)) {
        facts.push({
          type: "same_diag_person",
          refPersonIdx: other,
          weight: 2,
          candidateCells: fullBoard,
        });
      }
      // "compartía habitación con X" nunca se genera contra la víctima:
      // su habitación solo tiene sitio para ella y el asesino, así que
      // esa combinación delataría directamente la solución del caso.
      if (!otherIsVictim && roomOf[orow][ocol] === roomId) {
        facts.push({
          type: "same_room_person",
          refPersonIdx: other,
          weight: 2,
          candidateCells: fullBoard,
        });
      }
      const isNeighborPerson = neighborsOf(r, c, rows, cols, adjacencyMode).some(
        ([nr, nc]) => nr === orow && nc === ocol
      );
      if (!isNeighborPerson) {
        facts.push({
          type: "not_adjacent_person",
          refPersonIdx: other,
          weight: 1,
          candidateCells: fullBoard,
        });
      }
    }

    return facts;
  }
  Murdoku.computeFactCatalog = computeFactCatalog;

  // ============================================================
  // 8. Solver: cuenta soluciones compatibles con las pistas
  //    reveladas hasta el momento (con tope, para parar pronto).
  // ============================================================
  function countSolutions(ctx, revealed, cap) {
    // revealed: array (uno por sospechoso) de arrays de hechos elegidos
    const { rows, cols, roomOf, blockedSet, suspects, rooms, adjacencyMode, victimIdx } = ctx;
    const n = suspects.length; // sospechosos (sin la víctima)

    const candSets = suspects.map((sIdx, i) => {
      const factList = revealed[i];
      if (!factList || factList.length === 0) {
        // sin pistas: cualquier celda libre de mobiliario bloqueante
        const all = [];
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) if (!blockedSet.has(key(r, c))) all.push([r, c]);
        return all;
      }
      let set = null;
      for (const f of factList) {
        const s = new Set(f.candidateCells.map(([r, c]) => key(r, c)));
        set = set === null ? s : new Set([...set].filter((x) => s.has(x)));
      }
      return [...set].map((k) => k.split(",").map(Number)).filter(([r, c]) => !blockedSet.has(key(r, c)));
    });

    // heurística: intentar primero a los sospechosos con menos opciones
    const order = candSets
      .map((cands, i) => ({ i, len: cands.length }))
      .sort((a, b) => a.len - b.len)
      .map((x) => x.i);

    const usedRows = new Array(rows).fill(false);
    const usedCols = new Array(cols).fill(false);
    const assign = new Array(n).fill(null);
    let count = 0;

    // restricciones "de conteo por habitación" (alone / con K personas)
    const roomCountFacts = [];
    revealed.forEach((factList, i) => {
      (factList || []).forEach((f) => {
        if (f.type === "room_count") roomCountFacts.push({ suspectPos: i, ...f });
      });
    });

    // restricciones relacionales persona<->persona (o persona<->víctima):
    // se comprueban EN CUANTO ambos extremos de la relación están
    // fijados (normalmente dentro del propio backtracking, para podar
    // pronto en vez de esperar a tener el tablero entero relleno) y,
    // como red de seguridad final, las que solo se pueden resolver
    // contra la víctima se validan al completar la asignación.
    const RELATIONAL_TYPES = new Set([
      "row_offset_person", "col_offset_person", "same_diag_person",
      "same_room_person", "not_adjacent_person",
    ]);
    const personIdxToPos = new Map();
    suspects.forEach((personIdx, i) => personIdxToPos.set(personIdx, i));

    const relationalFacts = [];
    const relationalByOwnerPos = new Map();
    const relationalByTargetPos = new Map();
    revealed.forEach((factList, i) => {
      (factList || []).forEach((f) => {
        if (!RELATIONAL_TYPES.has(f.type)) return;
        const entry = { suspectPos: i, ...f };
        relationalFacts.push(entry);
        if (!relationalByOwnerPos.has(i)) relationalByOwnerPos.set(i, []);
        relationalByOwnerPos.get(i).push(entry);
        const targetPos = personIdxToPos.get(f.refPersonIdx);
        if (targetPos != null) {
          if (!relationalByTargetPos.has(targetPos)) relationalByTargetPos.set(targetPos, []);
          relationalByTargetPos.get(targetPos).push(entry);
        }
      });
    });

    function relationHolds(rf, mine, other) {
      const [mr, mc] = mine, [orow, ocol] = other;
      switch (rf.type) {
        case "row_offset_person": return (orow - mr) === rf.dr;
        case "col_offset_person": return (ocol - mc) === rf.dc;
        case "same_diag_person": return mr !== orow && Math.abs(orow - mr) === Math.abs(ocol - mc);
        case "same_room_person": return roomOf[mr][mc] === roomOf[orow][ocol];
        case "not_adjacent_person":
          return !neighborsOf(mr, mc, rows, cols, adjacencyMode).some(([nr, nc]) => nr === orow && nc === ocol);
        default: return true;
      }
    }

    // al asignar la posición `i`, comprueba toda relación (propia, o de
    // otro sospechoso ya colocado que apunte a `i`) cuyos DOS extremos
    // ya estén fijados; en cuanto una falla, se puede descartar la rama
    // entera sin seguir explorándola.
    function relationalOkAt(i) {
      const mine = assign[i];
      const owned = relationalByOwnerPos.get(i);
      if (owned) {
        for (const rf of owned) {
          const targetPos = personIdxToPos.get(rf.refPersonIdx);
          if (targetPos == null) continue; // apunta a la víctima: se valida al final
          const other = assign[targetPos];
          if (other && !relationHolds(rf, mine, other)) return false;
        }
      }
      const incoming = relationalByTargetPos.get(i);
      if (incoming) {
        for (const rf of incoming) {
          const owner = assign[rf.suspectPos];
          if (owner && !relationHolds(rf, owner, mine)) return false;
        }
      }
      return true;
    }

    function finalizeAndValidate() {
      // celda restante para la víctima
      let freeRow = -1, freeCol = -1;
      for (let r = 0; r < rows; r++) if (!usedRows[r]) freeRow = r;
      for (let c = 0; c < cols; c++) if (!usedCols[c]) freeCol = c;
      if (freeRow === -1 || freeCol === -1) return false;
      if (blockedSet.has(key(freeRow, freeCol))) return false;

      if (roomCountFacts.length > 0) {
        const allCells = assign.map((cell) => cell);
        allCells.push([freeRow, freeCol]); // víctima
        const roomMembers = new Map();
        allCells.forEach(([r, c]) => {
          const rid = roomOf[r][c];
          roomMembers.set(rid, (roomMembers.get(rid) || 0) + 1);
        });
        for (const rc of roomCountFacts) {
          const [r, c] = assign[rc.suspectPos];
          const rid = roomOf[r][c];
          const others = (roomMembers.get(rid) || 1) - 1;
          if (others !== rc.count) return false;
        }
      }

      // las relaciones sospechoso<->sospechoso ya se podaron durante el
      // backtracking (relationalOkAt); aquí solo falta comprobar las que
      // apuntan a la víctima, cuya celda solo se conoce al completar todo.
      if (relationalFacts.length > 0 && victimIdx != null) {
        const victimCell = [freeRow, freeCol];
        for (const rf of relationalFacts) {
          const targetPos = personIdxToPos.get(rf.refPersonIdx);
          if (targetPos != null) continue; // sospechoso<->sospechoso: ya validado
          const mine = assign[rf.suspectPos];
          if (!relationHolds(rf, mine, victimCell)) return false;
        }
      }
      return true;
    }

    function backtrack(depth) {
      if (count >= cap || nodeBudgetRef.n <= 0) return;
      nodeBudgetRef.n--;
      if (depth === n) {
        if (finalizeAndValidate()) count++;
        return;
      }
      const i = order[depth];
      for (const [r, c] of candSets[i]) {
        if (usedRows[r] || usedCols[c]) continue;
        usedRows[r] = usedCols[c] = true;
        assign[i] = [r, c];
        if (relationalOkAt(i)) backtrack(depth + 1);
        usedRows[r] = usedCols[c] = false;
        assign[i] = null;
        if (count >= cap || nodeBudgetRef.n <= 0) return;
      }
    }
    const nodeBudgetRef = { n: 250000 };
    backtrack(0);
    // si se agotó el presupuesto sin terminar de contar, tratamos el
    // resultado como "ambiguo" (>=2): es la postura conservadora, evita
    // quedarnos colgados en layouts patológicos y simplemente hace que
    // selectClues() añada una pista más en vez de darse por satisfecho.
    if (nodeBudgetRef.n <= 0 && count < cap) return Math.max(count, 2);
    return count;
  }
  Murdoku.countSolutions = countSolutions;

  // ============================================================
  // Utilidades varias exportadas
  // ============================================================
  Murdoku.key = key;
  Murdoku.choice = choice;
  Murdoku.shuffled = shuffled;
  Murdoku.randInt = randInt;

  // Export universal
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Murdoku;
  } else {
    root.Murdoku = Murdoku;
  }
})(typeof window !== "undefined" ? window : globalThis);
/**
 * MURDOKU — generador de casos
 * ------------------------------------------------------------
 * Toma un "theme" (de themes.js) + una dificultad + una semilla, y
 * produce un caso COMPLETO: tablero, habitaciones, mobiliario,
 * sospechosos con sus pistas y la solución. Verifica con el solver
 * de engine.js que la combinación de pistas reveladas tiene
 * EXACTAMENTE una solución antes de entregar el caso.
 */
(function (root) {
  "use strict";

  const M = typeof module !== "undefined" && module.exports ? require("./engine.js") : root.Murdoku;

  const DIFFICULTY_SIZE_RANGE = {
    facil: [5, 6],
    media: [6, 7],
    dificil: [7, 8],
    experto: [8, 9],
  };

  function pickSize(rng, difficultyKey) {
    const [lo, hi] = DIFFICULTY_SIZE_RANGE[difficultyKey] || [6, 7];
    return lo + M.randInt(rng, hi - lo + 1);
  }

  function buildContext(rng, theme, n, adjacencyMode) {
    const roomsTarget = Math.max(3, Math.min(theme.rooms.length, n - 1 + (n >= 8 ? 1 : 0)));
    const { rooms, roomOf } = M.generateRooms(rng, n, n, roomsTarget, 2);
    const furnitureCount = n + M.randInt(rng, 3) - 1; // n-1 .. n+1
    const furniture = M.placeFurniture(
      rng, n, n, roomOf, rooms, theme.furniture, Math.max(n - 1, furnitureCount)
    );
    const blockedSet = new Set(
      furniture.filter((f) => !f.occupiable).map((f) => M.key(f.r, f.c))
    );
    return { rows: n, cols: n, rooms, roomOf, furniture, blockedSet, adjacencyMode };
  }

  function tryGenerateStructure(rng, theme, n, adjacencyMode) {
    const ctx = buildContext(rng, theme, n, adjacencyMode);
    const colAssign = M.randomPerfectMatching(rng, n, ctx.blockedSet);
    if (!colAssign) return null;

    const solution = Array.from({ length: n }, (_, personIdx) => [personIdx, colAssign[personIdx]]);

    // contar personas por habitación en la solución real
    const roomMembers = new Map();
    solution.forEach(([r, c], personIdx) => {
      const rid = ctx.roomOf[r][c];
      if (!roomMembers.has(rid)) roomMembers.set(rid, []);
      roomMembers.get(rid).push(personIdx);
    });

    const candidateRooms = [...roomMembers.entries()].filter(([, members]) => members.length === 2);
    if (candidateRooms.length === 0) return null;

    const [victimRoomId, pair] = M.choice(rng, candidateRooms);
    const shuffledPair = M.shuffled(rng, pair);
    const victimIdx = shuffledPair[0];
    const murdererIdx = shuffledPair[1];

    return { ctx, solution, victimIdx, murdererIdx, victimRoomId };
  }

  function generateStructureWithRetries(rng, theme, n, adjacencyMode, maxTries) {
    for (let i = 0; i < maxTries; i++) {
      const res = tryGenerateStructure(rng, theme, n, adjacencyMode);
      if (res) return res;
    }
    return null;
  }

  // ------------------------------------------------------------
  // Selección de pistas: revela hechos hasta que el caso tenga
  // una única solución, dando a cada sospechoso al menos 1 pista,
  // y luego intenta podar pistas redundantes para que quede
  // elegante en vez de sobrecargado.
  // ------------------------------------------------------------
  const FACT_PRIORITY = [
    "room", "adjacent", "same_room_person", "corner",
    "row_offset_person", "col_offset_person", "same_diag_person",
    "same_row", "same_col", "same_diag",
    "not_adjacent_person", "not_adjacent", "not_in_room", "not_on_type",
    "on", "on_unique", "room_count",
  ];

  // tipos de pista "de exclusión" (ausencia) y "relacionales" (comparan a
  // dos personajes entre sí) — usados solo para garantizar variedad mínima
  // en selectClues(), ver forceQuota() más abajo.
  const EXCLUSION_TYPES = new Set(["not_in_room", "not_adjacent", "not_on_type", "not_adjacent_person"]);
  const RELATIONAL_TYPES = new Set([
    "row_offset_person", "col_offset_person", "same_diag_person",
    "same_room_person", "not_adjacent_person",
  ]);

  function factSortKey(f) {
    const idx = FACT_PRIORITY.indexOf(f.type);
    return idx === -1 ? 99 : idx;
  }

  function selectClues(rng, ctx, solution, suspectOrder, victimIdx, cap) {
    const n = solution.length;
    const catalogs = suspectOrder.map((personIdx) => M.computeFactCatalog(
      { ...ctx, solution, victimIdx }, personIdx
    ));

    const revealed = suspectOrder.map(() => []);
    const usedFactKeys = suspectOrder.map(() => new Set());

    function factIdOf(f) {
      return [
        f.type,
        f.furnitureId ?? "",
        f.roomId ?? "",
        f.count ?? "",
        f.refPersonIdx ?? "",
        f.dr ?? "",
        f.dc ?? "",
        f.furnitureTypeId ?? "",
      ].join(":");
    }

    function tryAddFact(i) {
      const catalog = M.shuffled(rng, catalogs[i])
        .filter((f) => !RELATIONAL_TYPES.has(f.type) && f.type !== "not_in_room")
        .sort((a, b) => factSortKey(a) - factSortKey(b));
      for (const f of catalog) {
        const id = factIdOf(f);
        if (usedFactKeys[i].has(id)) continue;
        usedFactKeys[i].add(id);
        revealed[i].push(f);
        return true;
      }
      return false;
    }

    // 1) una pista base para cada sospechoso (si es posible)
    for (let i = 0; i < suspectOrder.length; i++) tryAddFact(i);

    const solverCtx = { ...ctx, suspects: suspectOrder, victimIdx };

    let guard = 0;
    const SOFT_CAP = 4;
    while (M.countSolutions(solverCtx, revealed, 2) !== 1 && guard++ < 200) {
      // añade una pista más, priorizando al sospechoso con MENOS pistas
      // hasta ahora (para repartir la dificultad de forma pareja en vez
      // de sobrecargar siempre al mismo sospechoso)
      const byLoad = suspectOrder
        .map((_, i) => i)
        .sort((a, b) => revealed[a].length - revealed[b].length || rng() - 0.5);
      let added = false;
      for (const cap of [SOFT_CAP, Infinity]) {
        for (const i of byLoad) {
          if (revealed[i].length >= cap) continue;
          if (tryAddFact(i)) {
            added = true;
            break;
          }
        }
        if (added) break;
      }
      if (!added) break; // no quedan más hechos disponibles en todo el caso
    }

    const solved = M.countSolutions(solverCtx, revealed, 2) === 1;

    // 2) poda: intenta simplificar quitando pistas de más sin perder unicidad
    //    (varias rondas, hasta que ya no se pueda simplificar más)
    if (solved) {
      let improved = true;
      let rounds = 0;
      while (improved && rounds++ < 5) {
        improved = false;
        const idxWithExtra = suspectOrder
          .map((_, i) => i)
          .filter((i) => revealed[i].length > 1);
        for (const i of M.shuffled(rng, idxWithExtra)) {
          const sorted = [...revealed[i]].sort((a, b) => factSortKey(a) - factSortKey(b));
          for (let keep = sorted.length - 1; keep >= 1; keep--) {
            const backup = revealed[i];
            const candidate = sorted.slice(0, keep);
            if (candidate.length < backup.length) {
              revealed[i] = candidate;
              if (M.countSolutions(solverCtx, revealed, 2) === 1) {
                improved = true;
              } else {
                revealed[i] = backup;
                break;
              }
            }
          }
        }
      }
    }

    // foto de las pistas estrictamente necesarias para la unicidad, ANTES
    // de añadir la cuota de variedad: esas pistas extra solo AYUDAN al
    // jugador (nunca lo obligan a razonar más), así que no deben inflar
    // la dificultad — se calcula sobre esta foto, no sobre `revealed`.
    const revealedForDifficulty = revealed.map((list) => list.slice());

    // 3) cuota de variedad: garantiza al menos unas cuantas pistas de
    //    exclusión ("no estaba junto a...", "no estaba en...") y unas
    //    cuantas que relacionen a dos personajes entre sí ("N filas al
    //    norte de X", "compartía sala con Y"...). Añadir hechos aquí es
    //    SIEMPRE seguro: todo hecho del catálogo es una afirmación cierta
    //    sobre la solución real, así que sumar más nunca puede romper la
    //    unicidad ya conseguida (como mucho, la deja exactamente igual).
    if (solved) {
      const countByCategory = (typeSet) =>
        revealed.reduce((sum, list) => sum + list.filter((f) => typeSet.has(f.type)).length, 0);

      const forceQuota = (typeSet, minCount, hardCapPerSuspect) => {
        let guard = 0;
        while (countByCategory(typeSet) < minCount && guard++ < 60) {
          const byLoad = suspectOrder
            .map((_, i) => i)
            .filter((i) => revealed[i].length < hardCapPerSuspect)
            .sort((a, b) => {
              const ca = revealed[a].filter((f) => typeSet.has(f.type)).length;
              const cb = revealed[b].filter((f) => typeSet.has(f.type)).length;
              return ca - cb || rng() - 0.5;
            });
          let added = false;
          for (const i of byLoad) {
            const candidate = M.shuffled(rng, catalogs[i]).find(
              (f) => typeSet.has(f.type) && !usedFactKeys[i].has(factIdOf(f))
            );
            if (candidate) {
              usedFactKeys[i].add(factIdOf(candidate));
              revealed[i].push(candidate);
              added = true;
              break;
            }
          }
          if (!added) break; // no quedan más hechos de esta categoría en todo el caso
        }
      };

      forceQuota(EXCLUSION_TYPES, 3, 6);
      forceQuota(RELATIONAL_TYPES, 2, 6);
    }

    return { revealed, solved, revealedForDifficulty };
  }

  function difficultyLabel(n, revealed) {
    const totalFacts = revealed.reduce((s, f) => s + f.length, 0);
    const heavy = revealed.filter((f) => f.some((x) => x.type === "room_count" && x.count > 0)).length;
    const score = (n - 5) * 3 + totalFacts * 0.28 + heavy * 1.0;
    if (score < 6) return { key: "facil", label: "Fácil", stars: 1 };
    if (score < 10) return { key: "media", label: "Media", stars: 2 };
    if (score < 14) return { key: "dificil", label: "Difícil", stars: 3 };
    return { key: "experto", label: "Experto", stars: 4 };
  }

  function generatePuzzle(theme, difficultyKey, seedInput) {
    const seed = seedInput ?? Math.floor(Math.random() * 2 ** 32);
    const rng = M.makeRng(seed);
    const adjacencyMode = theme.adjacencyMode || "orthogonal";

    let structure = null;
    let n = pickSize(rng, difficultyKey);
    for (let attempt = 0; attempt < 8 && !structure; attempt++) {
      structure = generateStructureWithRetries(rng, theme, n, adjacencyMode, 60);
      if (!structure) n = Math.min(9, n + 1);
    }
    if (!structure) throw new Error("No se pudo generar la estructura del caso (reintentar con otra semilla).");

    const { ctx, solution, victimIdx, murdererIdx } = structure;
    const n_ = solution.length;
    const suspectOrder = M.shuffled(rng, Array.from({ length: n_ }, (_, i) => i).filter((i) => i !== victimIdx));

    const { revealed, solved, revealedForDifficulty } = selectClues(rng, ctx, solution, suspectOrder, victimIdx, 2);
    if (!solved) {
      // reintenta el caso completo con otra tirada si no se pudo cerrar
      return generatePuzzle(theme, difficultyKey, (seed + 1013904223) >>> 0);
    }

    // la dificultad se mide sobre las pistas estrictamente necesarias,
    // no sobre las de variedad añadidas después (esas solo ayudan)
    const difficulty = difficultyLabel(n_, revealedForDifficulty);

    // -------- adjuntar contenido narrativo del tema (nombres) --------
    const roomNamePool = M.shuffled(rng, theme.rooms);
    const namedRooms = ctx.rooms.map((room, i) => ({
      ...room,
      name: roomNamePool[i % roomNamePool.length],
    }));
    const roomNameById = {};
    namedRooms.forEach((r) => (roomNameById[r.id] = r.name));

    const furnitureTypeById = {};
    theme.furniture.forEach((t) => (furnitureTypeById[t.id] = t));
    const namedFurniture = ctx.furniture.map((f) => {
      const t = furnitureTypeById[f.typeId] || { label: f.typeId, icon: "❔" };
      return { ...f, label: t.label, icon: t.icon, image: t.image };
    });

    const needed = n_;
    let namePool = theme.names;
    if (namePool.length < needed) {
      // por si algún tema tuviera menos nombres que personas necesarias
      namePool = namePool.concat(namePool.map(([nm, g], i) => [`${nm} ${Math.ceil((i + 2))}`, g]));
    }
    const shuffledNames = M.shuffled(rng, namePool).slice(0, needed);

    const people = suspectOrder.map((personIdx, i) => ({
      personIdx,
      isVictim: false,
      isMurderer: personIdx === murdererIdx,
      cell: solution[personIdx],
      roomId: ctx.roomOf[solution[personIdx][0]][solution[personIdx][1]],
      facts: revealed[i],
    }));
    people.push({
      personIdx: victimIdx,
      isVictim: true,
      isMurderer: false,
      cell: solution[victimIdx],
      roomId: ctx.roomOf[solution[victimIdx][0]][solution[victimIdx][1]],
      facts: [],
    });
    // reordenar para que la víctima quede al final del reparto de nombres
    // (solo afecta a qué nombre visual recibe cada persona, no a la lógica)
    const peopleForNaming = [...people.filter((p) => !p.isVictim), people.find((p) => p.isVictim)];
    peopleForNaming.forEach((p, i) => {
      const [nm, gender] = shuffledNames[i];
      p.name = nm;
      p.gender = gender;
    });

    return {
      seed,
      themeId: theme.id,
      title: theme.name,
      tagline: theme.tagline,
      intro: theme.intro,
      n: n_,
      adjacencyMode,
      rooms: namedRooms,
      roomOf: ctx.roomOf,
      roomNameById,
      furniture: namedFurniture,
      people,
      difficulty,
      isDouble: !!theme.isDouble,
      doublePairId: theme.doublePairId || null,
    };
  }
  M.generatePuzzle = generatePuzzle;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = M;
  } else {
    root.Murdoku = M;
  }
})(typeof window !== "undefined" ? window : globalThis);
/**
 * MURDOKU — catálogo de temas ("casos")
 * ------------------------------------------------------------
 * Cada tema es puro CONTENIDO (nombres, habitaciones, mobiliario,
 * texto). El motor (engine.js / generator.js) no sabe nada de esto:
 * solo recibe `theme.furniture` y usa `theme.adjacencyMode`.
 *
 * Los 14 "casos nuevos" que pediste (trail, faro, cena, fútbol,
 * vecindario, estrella, oficina, hockey, pirata, doble, batalla de
 * estrellas, caballeros, asedio, fórmula 1) están recreados aquí de
 * forma ORIGINAL: las páginas de pmlemay.github.io/4color no se
 * pudieron cargar (404 / app cliente sin contenido accesible), así
 * que en vez de adivinar copié el ESPÍRITU de cada nombre y generé
 * contenido propio. Tres de ellos añaden además una variante de
 * regla real (ver `adjacencyMode` / `isDouble`), explicada en el
 * panel "Cómo resolver el caso" de la propia app.
 */
(function (root) {
  "use strict";

  const M = typeof module !== "undefined" && module.exports ? require("./generator.js") : root.Murdoku;

  function F(id, label, icon, occupiable) {
    return { id, label, icon, occupiable: !!occupiable };
  }

  const THEMES = [];

  // ------------------------------------------------------------
  // 1. Caso clásico — la escena de siempre (equivalente al "Beginner's
  //    Night" del PDF de referencia), para aprender las reglas.
  // ------------------------------------------------------------
  THEMES.push({
    id: "clasico",
    name: "La Primera Noche",
    tagline: "El caso ideal para aprender las reglas de Asesidoku.",
    intro: "¡Alguien fue asesinado anoche! Coloca a cada sospechoso en la escena del crimen para descubrir quién estaba solo con la víctima.",
    rooms: ["Salón", "Dormitorio Principal", "Habitación de Invitados", "Comedor", "Cocina", "Baño", "Despacho", "Recibidor"],
    furniture: [
      F("cama", "cama", "🛏️", true),
      F("silla", "silla", "🪑", true),
      F("alfombra", "alfombra", "🟧", true),
      F("planta", "planta", "🪴", false),
      F("ventana", "ventana", "🪟", false),
      F("tv", "TV", "📺", false),
      F("mesa", "mesa", "🍽️", false),
    ],
    names: [
      ["Axel", "m"], ["Cara", "f"], ["Bella", "f"], ["Douglas", "m"], ["Ella", "f"],
      ["Vincent", "m"], ["Heather", "f"], ["Gizelle", "f"], ["Bryce", "m"], ["Coralie", "f"],
      ["Daniel", "m"], ["Francine", "f"], ["Etienne", "m"], ["Henriette", "f"],
    ],
  });

  // ------------------------------------------------------------
  // 2. Sendero (trail-murdoku)
  // ------------------------------------------------------------
  THEMES.push({
    id: "sendero",
    name: "El Sendero Perdido",
    tagline: "Un grupo de excursionistas... uno no volvió del sendero.",
    intro: "El grupo de senderismo llegó al refugio, pero faltaba alguien al pasar lista. Reconstruye dónde estaba cada excursionista en el momento del extravío.",
    rooms: ["Mirador", "Puente Colgante", "Campamento", "Cascada", "Refugio", "Cruce de Caminos", "Bosque Alto", "Claro del Río"],
    furniture: [
      F("tronco", "tronco caído", "🪵", true),
      F("roca", "roca plana", "🪨", true),
      F("hoguera", "hoguera", "🔥", false),
      F("mochila", "mochila", "🎒", false),
      F("cartel", "cartel de ruta", "🪧", false),
      F("tienda", "tienda de campaña", "⛺", false),
    ],
    names: [
      ["Marina", "f"], ["Teo", "m"], ["Iris", "f"], ["Rafael", "m"], ["Nuria", "f"],
      ["Hugo", "m"], ["Carla", "f"], ["Simón", "m"], ["Valeria", "f"], ["Adrián", "m"],
      ["Lucía", "f"], ["Mateo", "m"], ["Olalla", "f"],
    ],
  });

  // ------------------------------------------------------------
  // 3. Faro encantado (haunted-lighthouse-murdoku)
  // ------------------------------------------------------------
  THEMES.push({
    id: "faro",
    name: "El Faro Encantado",
    tagline: "Dicen que el farero nunca se fue... y ahora hay un cuerpo más.",
    intro: "La tormenta aisló el faro durante toda la noche. Al amanecer, uno de los visitantes apareció muerto. Descubre quién estaba en cada rincón del faro.",
    rooms: ["Sala de la Linterna", "Escalera de Caracol", "Almacén", "Cocina", "Muelle", "Cuarto del Farero", "Sótano"],
    furniture: [
      F("baul", "baúl", "🧰", true),
      F("hamaca", "hamaca", "🛏️", true),
      F("farol", "farol de aceite", "🏮", false),
      F("ancla", "ancla", "⚓", false),
      F("mapa", "mapa náutico", "🗺️", false),
      F("reloj", "reloj de péndulo", "🕰️", false),
    ],
    names: [
      ["Amelia", "f"], ["Cornelius", "m"], ["Rosalind", "f"], ["Barnaby", "m"], ["Isadora", "f"],
      ["Thaddeus", "m"], ["Wren", "f"], ["Edmund", "m"], ["Marguerite", "f"], ["Silas", "m"],
      ["Odette", "f"], ["Ambrose", "m"],
    ],
  });

  // ------------------------------------------------------------
  // 4. Cena entre amigos (dinner-party-murdoku)
  // ------------------------------------------------------------
  THEMES.push({
    id: "cena",
    name: "La Cena que Terminó Mal",
    tagline: "Ocho invitados, una mesa larga... y un plato que nadie terminó.",
    intro: "La anfitriona había preparado la cena perfecta. Alguien no llegó al postre. Ubica a cada invitado para saber quién compartía mesa con la víctima.",
    rooms: ["Comedor", "Cocina", "Salón", "Terraza", "Bodega", "Vestíbulo", "Jardín"],
    furniture: [
      F("silla_cena", "silla de comedor", "🪑", true),
      F("sofa", "sofá", "🛋️", true),
      F("mesa_larga", "mesa larga", "🍽️", false),
      F("candelabro", "candelabro", "🕯️", false),
      F("piano", "piano", "🎹", false),
      F("jarron", "jarrón", "🏺", false),
    ],
    names: [
      ["Beatriz", "f"], ["Nicolás", "m"], ["Renata", "f"], ["Gustavo", "m"], ["Ines", "f"],
      ["Leandro", "m"], ["Paulina", "f"], ["Ramiro", "m"], ["Delia", "f"], ["Octavio", "m"],
      ["Celia", "f"], ["Fernando", "m"],
    ],
  });

  // ------------------------------------------------------------
  // 5. Partido de fútbol (soccer-game-murdoku)
  // ------------------------------------------------------------
  THEMES.push({
    id: "futbol",
    name: "El Once Titular",
    tagline: "El árbitro pitó el final... y encontraron a alguien tendido en el campo.",
    intro: "Todo el equipo estaba en el estadio cuando ocurrió. Reconstruye la posición de cada jugador para saber quién estaba junto a la víctima.",
    rooms: ["Campo de Juego", "Banquillo", "Vestuario", "Túnel", "Grada", "Sala de Prensa"],
    furniture: [
      F("baston", "banco", "🪑", true),
      F("balon", "balón", "⚽", false),
      F("trofeo", "trofeo", "🏆", false),
      F("porteria", "portería", "🥅", false),
      F("botiquin", "botiquín", "🩹", false),
      F("marcador", "marcador", "📟", false),
    ],
    // Personajes de Captain Tsubasa asociados uno a uno a los retratos de assets/portraits/futbol.
    // Hay once nombres porque cada caso usa diez jugadores y una víctima.
    names: [
      ["Oliver Atom", "m"], ["Benji Price", "m"], ["Mark Lenders", "m"], ["Bruce Harper", "m"],
      ["Ed Warner", "m"], ["Karl-Heinz Schneider", "m"], ["Carlos Santana", "m"], ["Danny Mellow", "m"],
      ["Phillip Callahan", "m"], ["Ted Carter", "m"], ["Rivaul", "m"],
    ],
  });

  // ------------------------------------------------------------
  // 6. Vigilancia vecinal (neighbourhood-watch-murdoku)
  // ------------------------------------------------------------
  THEMES.push({
    id: "vecindario",
    name: "Vigilancia Vecinal",
    tagline: "En esta calle nunca pasaba nada... hasta anoche.",
    intro: "La ronda de vigilancia vecinal terminó encontrando algo que nadie esperaba. Descubre dónde estaba cada vecino a esa hora.",
    rooms: ["Jardín Delantero", "Garaje", "Porche", "Parque Comunal", "Buzones", "Patio Trasero", "Calle Principal"],
    furniture: [
      F("banco_parque", "banco de parque", "🪑", true),
      F("cesped", "tumbona de césped", "🪴", true),
      F("farola", "farola", "💡", false),
      F("coche", "coche aparcado", "🚗", false),
      F("bici", "bicicleta", "🚲", false),
      F("buzon", "buzón", "📮", false),
    ],
    names: [
      ["Deborah", "f"], ["Norman", "m"], ["Patricia", "f"], ["Walter", "m"], ["Sheila", "f"],
      ["Gerald", "m"], ["Marlene", "f"], ["Trevor", "m"], ["Yolanda", "f"], ["Stanley", "m"],
      ["Roxanne", "f"], ["Melvin", "m"],
    ],
  });

  // ------------------------------------------------------------
  // 7. Noche de estrellas (star-murdoku) — variante: "junto a" también
  //    cuenta en diagonal (8 direcciones), como los picos de una estrella.
  // ------------------------------------------------------------
  THEMES.push({
    id: "estrella",
    name: "Noche de Estrellas",
    tagline: "Regla especial: aquí 'junto a' también cuenta en diagonal.",
    intro: "El observatorio celebraba su noche anual de estrellas. Cuidado: en este caso, 'estar junto a algo' también incluye las diagonales.",
    adjacencyMode: "diagonal8",
    rooms: ["Cúpula del Telescopio", "Terraza de Observación", "Biblioteca Astronómica", "Cafetería", "Planetario", "Recepción"],
    furniture: [
      F("telescopio_silla", "silla del telescopio", "🪑", true),
      F("puf", "puf reclinable", "🛋️", true),
      F("telescopio", "telescopio", "🔭", false),
      F("globo", "globo terráqueo", "🌐", false),
      F("mapa_estelar", "mapa estelar", "🗺️", false),
      F("cafe", "máquina de café", "☕", false),
    ],
    names: [
      ["Estela", "f"], ["Orión", "m"], ["Vega", "f"], ["Casiopea", "f"], ["Altair", "m"],
      ["Andrómeda", "f"], ["Régulus", "m"], ["Lyra", "f"], ["Draco", "m"], ["Nova", "f"],
      ["Sirio", "m"], ["Celeste", "f"],
    ],
  });

  // ------------------------------------------------------------
  // 8. Edificio de oficinas (the-office-building)
  // ------------------------------------------------------------
  THEMES.push({
    id: "oficina",
    name: "El Edificio de Oficinas",
    tagline: "Todos se quedaron hasta tarde. Solo uno no llegó a fichar la salida.",
    intro: "El guardia de seguridad encontró algo raro en la planta once. Reconstruye dónde estaba cada empleado esa noche.",
    rooms: ["Sala de Juntas", "Recepción", "Cocina de Oficina", "Cubículos", "Sala de Servidores", "Despacho de Dirección", "Archivo"],
    furniture: [
      F("silla_oficina", "silla de oficina", "🪑", true),
      F("sofa_recepcion", "sofá de recepción", "🛋️", true),
      F("impresora", "impresora", "🖨️", false),
      F("planta_oficina", "planta de oficina", "🪴", false),
      F("pizarra", "pizarra", "🗒️", false),
      F("cafetera", "cafetera", "☕", false),
    ],
    names: [
      ["Débora", "f"], ["Ricardo", "m"], ["Alicia", "f"], ["Norberto", "m"], ["Susana", "f"],
      ["Ernesto", "m"], ["Teresa", "f"], ["Aurelio", "m"], ["Manuela", "f"], ["Ismael", "m"],
      ["Cristina", "f"], ["Baltasar", "m"],
    ],
  });

  // ------------------------------------------------------------
  // 9. Partido de hockey (hockey-game-murdoku)
  // ------------------------------------------------------------
  THEMES.push({
    id: "hockey",
    name: "Sudden Death",
    tagline: "El partido se fue a la prórroga. Alguien no vio el final.",
    intro: "Entre el hielo, el banquillo y los vestuarios, algo ocurrió durante la prórroga. Ubica a cada jugador en la pista.",
    rooms: ["Pista de Hielo", "Banquillo", "Vestuario Local", "Vestuario Visitante", "Grada", "Zona de Penalización"],
    furniture: [
      F("banco_hockey", "banco del equipo", "🪑", true),
      F("camilla", "camilla", "🛏️", true),
      F("disco", "disco (puck)", "🏒", false),
      F("marcador_hockey", "marcador electrónico", "📟", false),
      F("porteria_hockey", "portería", "🥅", false),
      F("zamboni", "máquina pulidora de hielo", "🚜", false),
    ],
    names: [
      ["Erik", "m"], ["Nadia", "f"], ["Viktor", "m"], ["Sasha", "f"], ["Lars", "m"],
      ["Ingrid", "f"], ["Magnus", "m"], ["Freya", "f"], ["Gustaf", "m"], ["Solveig", "f"],
      ["Anders", "m"], ["Astrid", "f"],
    ],
  });

  // ------------------------------------------------------------
  // 10. Barco pirata (pirate-ship-murdoku)
  // ------------------------------------------------------------
  THEMES.push({
    id: "pirata",
    name: "El Motín del Marea Negra",
    tagline: "Un tesoro, una tripulación... y un capitán que no vio el amanecer.",
    intro: "La tripulación del Marea Negra despertó sin capitán. Reconstruye la posición de cada pirata a bordo.",
    rooms: ["Cubierta Principal", "Camarote del Capitán", "Bodega", "Timón", "Cocina del Barco", "Sala de Cañones", "Mástil Mayor"],
    furniture: [
      F("hamaca_pirata", "hamaca", "🛏️", true),
      F("barril_sentado", "barril volteado", "🪑", true),
      F("cofre", "cofre del tesoro", "🧰", false),
      F("cañon", "cañón", "💣", false),
      F("loro", "percha del loro", "🦜", false),
      F("timon_rueda", "rueda del timón", "☸️", false),
    ],
    names: [
      ["Morgana", "f"], ["Barbanegro Jr.", "m"], ["Escarlata", "f"], ["Tobías", "m"], ["Perla", "f"],
      ["Cornelio", "m"], ["Anaís", "f"], ["Roque", "m"], ["Dorotea", "f"], ["Jonás", "m"],
      ["Serafina", "f"], ["Wilfredo", "m"],
    ],
  });

  // ------------------------------------------------------------
  // 11. Doble Asesidoku (double-murdoku) — dos escenas ligadas: hay que
  //     resolver ambas para cerrar el caso. (isDouble se maneja en main.js)
  // ------------------------------------------------------------
  THEMES.push({
    id: "doble_a",
    name: "Doble Crimen — Planta Baja",
    tagline: "Dos crímenes, dos plantas, una sola noche. Empieza por la planta baja.",
    intro: "Ocurrieron dos incidentes la misma noche, en dos plantas distintas de la misma casa. Resuelve esta y luego la de arriba.",
    isDouble: true,
    doublePairId: "doble_b",
    rooms: ["Recibidor", "Salón", "Comedor", "Cocina", "Trastero", "Porche"],
    furniture: [
      F("cama_db", "sofá cama", "🛏️", true),
      F("silla_db", "silla", "🪑", true),
      F("planta_db", "planta", "🪴", false),
      F("mesa_db", "mesa", "🍽️", false),
      F("tv_db", "TV", "📺", false),
      F("ventana_db", "ventana", "🪟", false),
    ],
    names: [
      ["Aurora", "f"], ["Benito", "m"], ["Clara", "f"], ["Diego", "m"], ["Elvira", "f"],
      ["Fermín", "m"], ["Gala", "f"], ["Hilario", "m"], ["Idoia", "f"], ["Joaquín", "m"],
    ],
  });
  THEMES.push({
    id: "doble_b",
    name: "Doble Crimen — Planta Alta",
    tagline: "La segunda mitad del caso: el piso de arriba.",
    intro: "El desenlace de la misma noche, ahora en la planta alta de la casa.",
    isDouble: true,
    doublePairId: "doble_a",
    rooms: ["Dormitorio Principal", "Habitación de Invitados", "Baño", "Despacho", "Ático", "Balcón"],
    furniture: [
      F("cama_da", "cama", "🛏️", true),
      F("alfombra_da", "alfombra", "🟧", true),
      F("escritorio", "escritorio", "🗄️", false),
      F("espejo", "espejo", "🪞", false),
      F("lampara", "lámpara", "💡", false),
      F("baul_da", "baúl", "🧰", false),
    ],
    names: [
      ["Aurora", "f"], ["Benito", "m"], ["Clara", "f"], ["Diego", "m"], ["Elvira", "f"],
      ["Fermín", "m"], ["Gala", "f"], ["Hilario", "m"], ["Idoia", "f"], ["Joaquín", "m"],
    ],
  });

  // ------------------------------------------------------------
  // 12. Batalla de Estrellas (starbattle-murdoku) — variante: además de
  //     colocar sospechosos, dos celdas del tablero llevan una ✦ y NINGÚN
  //     sospechoso puede terminar sobre ellas (como las celdas prohibidas
  //     de Star Battle). Se implementa como mobiliario no ocupable fijo,
  //     ya soportado por el motor: no requiere código nuevo, solo tema.
  // ------------------------------------------------------------
  THEMES.push({
    id: "batalla_estrellas",
    name: "Batalla de Estrellas",
    tagline: "Regla especial: las casillas marcadas con ✦ nunca pueden ocuparse.",
    intro: "Un simulacro militar terminó en tragedia. Ten cuidado: las casillas con una estrella marcada en el suelo están fuera de los límites.",
    rooms: ["Sala de Mando", "Armería", "Barracones", "Comedor Militar", "Patio de Instrucción", "Torre de Vigilancia"],
    furniture: [
      F("catre", "catre", "🛏️", true),
      F("silla_mando", "silla de mando", "🪑", true),
      F("estrella_prohibida", "casilla marcada ✦", "✦", false),
      F("mapa_mando", "mapa táctico", "🗺️", false),
      F("radio", "radio", "📻", false),
      F("bandera", "bandera", "🚩", false),
    ],
    names: [
      ["Ariadna", "f"], ["Comandante Ruiz", "m"], ["Selene", "f"], ["Máximo", "m"], ["Bianca", "f"],
      ["Teodoro", "m"], ["Nayara", "f"], ["Custodio", "m"], ["Palmira", "f"], ["Anselmo", "m"],
    ],
  });

  // ------------------------------------------------------------
  // 13. Los Caballeros (knights-murdoku) — variante: "junto a" se mide
  //     con movimiento de caballo de ajedrez.
  // ------------------------------------------------------------
  THEMES.push({
    id: "caballeros",
    name: "El Torneo de los Caballeros",
    tagline: "Regla especial: aquí 'junto a' se mueve como el caballo del ajedrez.",
    intro: "Durante el gran torneo, algo pasó en el castillo. Atención: en este caso especial, las relaciones de cercanía se miden con un movimiento de caballo (en L), no en línea recta.",
    adjacencyMode: "knight",
    rooms: ["Salón del Trono", "Armería Real", "Establos", "Torre del Homenaje", "Capilla", "Patio de Armas"],
    furniture: [
      F("trono", "trono", "🪑", true),
      F("yacija", "yacija", "🛏️", true),
      F("armadura", "armadura", "🛡️", false),
      F("estandarte", "estandarte", "🚩", false),
      F("brasero", "brasero", "🔥", false),
      F("yelmo_mesa", "mesa de armas", "🍽️", false),
    ],
    names: [
      ["Sir Alaric", "m"], ["Lady Rowena", "f"], ["Sir Cedric", "m"], ["Lady Isolde", "f"], ["Sir Gareth", "m"],
      ["Lady Elowen", "f"], ["Sir Tristan", "m"], ["Lady Guinevere", "f"], ["Sir Percival", "m"], ["Lady Vivienne", "f"],
    ],
  });

  // ------------------------------------------------------------
  // 14. Asedio al castillo (castle-siege-murdoku)
  // ------------------------------------------------------------
  THEMES.push({
    id: "asedio",
    name: "El Asedio",
    tagline: "El castillo resistió el asedio... pero algo pasó dentro de sus muros.",
    intro: "Mientras el ejército enemigo acampaba fuera, alguien murió dentro del castillo. Ubica a cada habitante de la fortaleza.",
    rooms: ["Muralla Norte", "Torre de Vigía", "Gran Salón", "Mazmorra", "Cocina del Castillo", "Capilla del Castillo", "Foso"],
    furniture: [
      F("catre_asedio", "catre", "🛏️", true),
      F("banco_asedio", "banco de piedra", "🪑", true),
      F("catapulta", "maqueta de catapulta", "🏹", false),
      F("antorcha", "antorcha", "🔥", false),
      F("barril_asedio", "barril de provisiones", "🛢️", false),
      F("campana", "campana de alarma", "🔔", false),
    ],
    names: [
      ["Wilhelmina", "f"], ["Aldric", "m"], ["Godiva", "f"], ["Bertrand", "m"], ["Millicent", "f"],
      ["Osric", "m"], ["Adelina", "f"], ["Conrad", "m"], ["Editha", "f"], ["Rutger", "m"],
    ],
  });

  // ------------------------------------------------------------
  // 15. Fórmula 1 (formula1-murdoku)
  // ------------------------------------------------------------
  THEMES.push({
    id: "formula1",
    name: "Gran Premio Nocturno",
    tagline: "El equipo celebraba la pole position. La fiesta terminó en tragedia.",
    intro: "Todo el equipo estaba en el paddock la noche antes de la carrera. Reconstruye dónde estaba cada miembro del equipo.",
    rooms: ["Box de Equipo", "Sala de Estrategia", "Paddock Club", "Zona de Neumáticos", "Podio", "Sala de Prensa F1"],
    furniture: [
      F("silla_box", "silla de pit wall", "🪑", true),
      F("sofa_paddock", "sofá del paddock", "🛋️", true),
      F("neumatico", "neumático", "🛞", false),
      F("trofeo_f1", "trofeo del Gran Premio", "🏆", false),
      F("monitor_telemetria", "monitor de telemetría", "🖥️", false),
      F("bandera_cuadros", "bandera a cuadros", "🏁", false),
    ],
    names: [
      ["Lena", "f"], ["Rico", "m"], ["Talia", "f"], ["Dorian", "m"], ["Simone", "f"],
      ["Matteo", "m"], ["Priya", "f"], ["Kilian", "m"], ["Noor", "f"], ["Basti", "m"],
    ],
  });

  const THEME_BY_ID = {};
  THEMES.forEach((t) => (THEME_BY_ID[t.id] = t));

  M.THEMES = THEMES;
  M.THEME_BY_ID = THEME_BY_ID;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = M;
  } else {
    root.Murdoku = M;
  }
})(typeof window !== "undefined" ? window : globalThis);
/**
 * MURDOKU — frases en español
 * ------------------------------------------------------------
 * Convierte los "hechos" estructurados que genera engine.js en las
 * frases que ve el jugador en la ficha de cada sospechoso. No decide
 * NADA sobre qué pista mostrar (eso ya lo decidió generator.js);
 * solo las traduce a un español natural, variado y evocador, sin
 * revelar nunca la solución de forma directa.
 */
(function (root) {
  "use strict";

  const M = typeof module !== "undefined" && module.exports ? require("./themes.js") : root.Murdoku;

  // -- Diccionario de género por sustantivo "cabeza" de la frase --------
  // Suficiente para cubrir todas las habitaciones y muebles del catálogo
  // de temas. Si aparece una palabra nueva que no está aquí, se usa una
  // heurística razonable (ver spanishArticle).
  const GENDER = {
    // habitaciones
    salón: "el", dormitorio: "el", habitación: "la", comedor: "el", cocina: "la",
    baño: "el", despacho: "el", recibidor: "el", mirador: "el", puente: "el",
    campamento: "el", cascada: "la", refugio: "el", cruce: "el", bosque: "el",
    claro: "el", sala: "la", escalera: "la", almacén: "el", muelle: "el",
    cuarto: "el", sótano: "el", terraza: "la", bodega: "la", vestíbulo: "el",
    jardín: "el", campo: "el", banquillo: "el", vestuario: "el", túnel: "el",
    grada: "la", garaje: "el", porche: "el", parque: "el", buzones: "los",
    patio: "el", calle: "la", cúpula: "la", biblioteca: "la", cafetería: "la",
    planetario: "el", recepción: "la", cubículos: "los", archivo: "el",
    pista: "la", zona: "la", cubierta: "la", camarote: "el", timón: "el",
    mástil: "el", trastero: "el", ático: "el", balcón: "el", armería: "la",
    barracones: "los", torre: "la", establos: "los", capilla: "la",
    muralla: "la", mazmorra: "la", foso: "el", box: "el", podio: "el",
    club: "el", paddock: "el",
    // muebles
    cama: "la", silla: "la", alfombra: "la", planta: "la", ventana: "la",
    tv: "la", mesa: "la", tronco: "el", roca: "la", hoguera: "la",
    mochila: "la", cartel: "el", tienda: "la", baúl: "el", hamaca: "la",
    farol: "el", ancla: "el", mapa: "el", reloj: "el", sofá: "el",
    candelabro: "el", piano: "el", jarrón: "el", banco: "el", balón: "el",
    trofeo: "el", portería: "la", botiquín: "el", marcador: "el",
    tumbona: "la", farola: "la", coche: "el", bicicleta: "la", buzón: "el",
    puf: "el", telescopio: "el", globo: "el", máquina: "la", impresora: "la",
    pizarra: "la", cafetera: "la", camilla: "la", disco: "el", percha: "la",
    rueda: "la", cañón: "el", cofre: "el", barril: "el", escritorio: "el",
    espejo: "el", lámpara: "la", catre: "el", casilla: "la", radio: "la",
    bandera: "la", trono: "el", yacija: "la", armadura: "la", estandarte: "el",
    brasero: "el", antorcha: "la", campana: "la", neumático: "el", monitor: "el",
    zamboni: "la",
    // Dragon Ball
    nube: "la", bola: "la", radar: "el", nave: "la", anillos: "los",
    // Dragon Ball — objetos específicos para asegurar artículo correcto
    "nave goku": "la", "nave de trunks": "la",
    capsule: "la", dende: "el", arale: "la", ulong: "el",
    // "Tao Pai Pai" → primera palabra "tao", heurística → "el" (correcto)
  };

  function normalize(w) {
    return w.toLowerCase().replace(/[().,✦]/g, "");
  }

  function spanishArticle(phrase) {
    const words = phrase.split(/\s+/).map(normalize).filter(Boolean);
    if (words.length === 0) return "el";
    if (GENDER[words[0]]) return GENDER[words[0]];
    const last = words[words.length - 1];
    if (GENDER[last]) return GENDER[last];
    // heurística de respaldo
    const w = words[0];
    if (/(ción|sión|dad|tud|umbre|ie)$/.test(w)) return "la";
    if (/a$/.test(w)) return "la";
    return "el";
  }
  M.spanishArticle = M.spanishArticle || spanishArticle;

  function withArticle(name) {
    return `${spanishArticle(name)} ${name}`;
  }

  // "de" + artículo, con la contracción "del" cuando corresponde
  function deArticle(name) {
    const art = spanishArticle(name);
    return art === "el" ? `del ${name}` : `de ${art} ${name}`;
  }
  // "a" + artículo, con la contracción "al" cuando corresponde (uso interno)
  function aArticle(name) {
    const art = spanishArticle(name);
    return art === "el" ? `al ${name}` : `a ${art} ${name}`;
  }

  // -- Descripción de un mueble concreto (con artículo), con
  //    desambiguación por sala cuando hay más de uno del mismo tipo --
  function furniturePhrase(puzzle, furnitureId) {
    const f = puzzle.furniture.find((x) => x.id === furnitureId);
    if (!f) return "un elemento de la escena";
    const sameTypeCount = puzzle.furniture.filter((x) => x.typeId === f.typeId).length;
    if (sameTypeCount === 1) return f.label;
    const roomName = puzzle.roomNameById[f.roomId];
    return `${f.label} ${deArticle(roomName)}`;
  }
  // versión con artículo delante, para contextos sin contracción ("sobre X", "que X")
  function describeFurniture(puzzle, furnitureId) {
    const f = puzzle.furniture.find((x) => x.id === furnitureId);
    const art = f ? spanishArticle(f.label) : "el";
    return `${art} ${furniturePhrase(puzzle, furnitureId)}`;
  }
  // versión para pegar tras una preposición "a" o "de" (con contracción)
  function furnitureAfterPrep(puzzle, furnitureId, prep) {
    const f = puzzle.furniture.find((x) => x.id === furnitureId);
    const phrase = furniturePhrase(puzzle, furnitureId);
    const art = f ? spanishArticle(f.label) : "el";
    if (prep === "a") return art === "el" ? `al ${phrase}` : `a ${art} ${phrase}`;
    if (prep === "de") return art === "el" ? `del ${phrase}` : `de ${art} ${phrase}`;
    return `${prep} ${art} ${phrase}`;
  }

  function describeFurnitureType(puzzle, typeId) {
    const t = puzzle.furniture.find((x) => x.typeId === typeId);
    return t ? withArticle(t.label) : "un mueble";
  }
  // "ningún/ninguna X" (para pistas de exclusión sobre un tipo de mueble)
  function noneOfType(puzzle, typeId) {
    const t = puzzle.furniture.find((x) => x.typeId === typeId);
    const label = t ? t.label : "mueble";
    const art = spanishArticle(label);
    return `${art === "el" ? "ningún" : "ninguna"} ${label}`;
  }

  // -- Nombre de otra persona (sospechoso o víctima) a partir de su
  //    personIdx "en crudo" — usado por las pistas relacionales --
  function personName(puzzle, personIdx) {
    const p = puzzle.people && puzzle.people.find((x) => x.personIdx === personIdx);
    return p ? p.name : "otra persona presente en el caso";
  }

  // -- Selección determinista de una plantilla entre varias -------------
  // Con la misma semilla de caso, el mismo hecho SIEMPRE produce la misma
  // frase (para que un código de caso compartido se vea igual al abrirlo),
  // pero hechos distintos —o casos distintos— varían con naturalidad.
  function templateChoice(puzzle, seedKey, options) {
    if (options.length === 1) return options[0];
    const seed = M.hashStringToSeed(`${puzzle.seed}|${seedKey}`);
    const rng = M.makeRng(seed);
    return options[Math.floor(rng() * options.length)];
  }

  // -- Verbo/acción según el tipo de mueble (por icono, agrupa "mobiliario
  //    para tumbarse", "para sentarse" y el resto) — aporta variedad de
  //    tipo "acción o estado" sin inventar datos que no estén en el tema --
  function actionTemplatesFor(icon) {
    if (icon === "🛏️") return ["Estaba tumbada/o en {X}.", "Descansaba en {X}.", "Reposaba en {X}."];
    if (icon === "🪑" || icon === "🛋️") return ["Estaba sentada/o en {X}.", "Ocupaba {X}.", "Se había acomodado en {X}."];
    if (icon === "☁️") return ["Volaba sobre {X}.", "Surcaba el cielo en {X}.", "Se desplazaba en {X}."];
    if (icon === "🚀" || icon === "🛸") return ["Viajaba a bordo de {X}.", "Estaba dentro de {X}.", "Se encontraba en {X}."];
    if (icon === "📡") return ["Manejaba {X}.", "Rastreaba las bolas con {X}.", "Estaba junto a {X}."];
    if (icon === "💍") return ["Llevaba {X}.", "Portaba {X}.", "Sostenía {X}."];
    return ["Estaba sobre {X}.", "Se encontraba sobre {X}.", "Permanecía sobre {X}."];
  }
  function actionUniqueTemplatesFor(icon) {
    if (icon === "🛏️") return ["tumbada/o en", "descansando en"];
    if (icon === "🪑" || icon === "🛋️") return ["sentada/o en", "acomodada/o en"];
    if (icon === "☁️") return ["volando en", "surcando el cielo en"];
    if (icon === "🚀" || icon === "🛸") return ["a bordo de", "viajando en"];
    if (icon === "📡") return ["manejando", "rastreando con"];
    if (icon === "💍") return ["portando", "llevando"];
    return ["sobre", "junto a"];
  }

  function pluralize(word, n) {
    return n === 1 ? word : `${word}s`;
  }

  // -- Un hecho -> una frase --------------------------------------------
  function factSentence(puzzle, fact) {
    const roomName = fact.roomId != null ? puzzle.roomNameById[fact.roomId] : null;
    const seedKey = `${fact.type}:${fact.furnitureId ?? ""}:${fact.roomId ?? ""}:${fact.count ?? ""}:${fact.refPersonIdx ?? ""}:${fact.dr ?? ""}:${fact.dc ?? ""}:${fact.furnitureTypeId ?? ""}`;
    const pick = (options) => templateChoice(puzzle, seedKey, options);

    switch (fact.type) {
      // -- Ubicación concreta --------------------------------------
      case "room":
        return pick([
          `Estaba en ${withArticle(roomName)}.`,
          `Se encontraba en ${withArticle(roomName)}.`,
          `La situaban en ${withArticle(roomName)} en el momento de los hechos.`,
        ]);
      case "corner":
        return pick([
          `Estaba en una esquina ${deArticle(roomName)}.`,
          `Se había quedado en un rincón ${deArticle(roomName)}.`,
        ]);
      case "room_count":
        if (fact.count === 0) {
          return pick([
            `Estaba solo/a en ${withArticle(roomName)}.`,
            `Nadie más la/lo acompañaba en ${withArticle(roomName)}.`,
          ]);
        }
        if (fact.count === 1) return `Estaba en ${withArticle(roomName)} con otra persona.`;
        return `Estaba en ${withArticle(roomName)} con otras ${numberWord(fact.count)} personas.`;

      // -- Objeto / superficie + acción o estado --------------------
      case "adjacent": {
        if (puzzle.adjacencyMode === "knight") {
          return `Estaba a un movimiento de caballo de ajedrez ${furnitureAfterPrep(puzzle, fact.furnitureId, "de")}.`;
        }
        const suffix = puzzle.adjacencyMode === "diagonal8" ? " (aquí también cuentan las diagonales)" : "";
        return pick([
          `Estaba junto ${furnitureAfterPrep(puzzle, fact.furnitureId, "a")}${suffix}.`,
          `Se encontraba al lado ${furnitureAfterPrep(puzzle, fact.furnitureId, "de")}${suffix}.`,
        ]);
      }
      case "on": {
        const f = puzzle.furniture.find((x) => x.id === fact.furnitureId);
        const templates = actionTemplatesFor(f ? f.icon : "");
        return pick(templates).replace("{X}", describeFurniture(puzzle, fact.furnitureId));
      }
      case "on_unique": {
        const f = puzzle.furniture.find((x) => x.id === fact.furnitureId);
        const typeId = f ? f.typeId : null;
        const verb = pick(actionUniqueTemplatesFor(f ? f.icon : ""));
        return pick([
          `Era la única persona de todo el caso ${verb} ${describeFurnitureType(puzzle, typeId)}.`,
          `Nadie más en todo el caso estaba ${verb} ${describeFurnitureType(puzzle, typeId)}.`,
        ]);
      }

      // -- Posición relativa / diagonal-columna, respecto a un mueble --
      case "same_row":
        return pick([
          `Estaba en la misma fila que ${describeFurniture(puzzle, fact.furnitureId)}.`,
          `Compartía fila con ${describeFurniture(puzzle, fact.furnitureId)}.`,
        ]);
      case "same_col":
        return pick([
          `Estaba en la misma columna que ${describeFurniture(puzzle, fact.furnitureId)}.`,
          `Compartía columna con ${describeFurniture(puzzle, fact.furnitureId)}.`,
        ]);
      case "same_diag":
        return pick([
          `Estaba en la misma diagonal que ${describeFurniture(puzzle, fact.furnitureId)}.`,
          `Quedaba alineada/o en diagonal con ${describeFurniture(puzzle, fact.furnitureId)}.`,
        ]);

      // -- Exclusión ---------------------------------------------------
      case "not_adjacent":
        return pick([
          `No estaba junto ${furnitureAfterPrep(puzzle, fact.furnitureId, "a")}.`,
          `No se encontraba cerca ${furnitureAfterPrep(puzzle, fact.furnitureId, "de")}.`,
        ]);
      case "not_in_room":
        return pick([
          `No estaba en ${withArticle(puzzle.roomNameById[fact.roomId])}.`,
          `No fue vista/o en ${withArticle(puzzle.roomNameById[fact.roomId])}.`,
          `Se puede descartar ${withArticle(puzzle.roomNameById[fact.roomId])} en su caso.`,
        ]);
      case "not_on_type":
        return pick([
          `No estaba sobre ${noneOfType(puzzle, fact.furnitureTypeId)}.`,
          `No se la/lo vio sobre ${noneOfType(puzzle, fact.furnitureTypeId)}.`,
        ]);

      // -- Compañía / relación entre personajes ------------------------
      case "same_room_person":
        return pick([
          `Compartía habitación con ${personName(puzzle, fact.refPersonIdx)}.`,
          `Estaba en la misma sala que ${personName(puzzle, fact.refPersonIdx)}.`,
        ]);
      case "not_adjacent_person":
        return pick([
          `No estaba junto a ${personName(puzzle, fact.refPersonIdx)}.`,
          `No se encontraba cerca de ${personName(puzzle, fact.refPersonIdx)}.`,
        ]);
      case "same_diag_person":
        return pick([
          `Estaba en la misma diagonal que ${personName(puzzle, fact.refPersonIdx)}.`,
          `Compartía diagonal con ${personName(puzzle, fact.refPersonIdx)}.`,
        ]);
      case "row_offset_person": {
        const dir = fact.dr > 0 ? "norte" : "sur";
        const mag = Math.abs(fact.dr);
        const magWord = numberWord(mag);
        const filaWord = pluralize("fila", mag);
        return pick([
          `Estaba ${magWord} ${filaWord} al ${dir} de ${personName(puzzle, fact.refPersonIdx)}.`,
          `A ${magWord} ${filaWord} al ${dir} de ${personName(puzzle, fact.refPersonIdx)}, ahí estaba.`,
        ]);
      }
      case "col_offset_person": {
        const dir = fact.dc > 0 ? "oeste" : "este";
        const mag = Math.abs(fact.dc);
        const magWord = numberWord(mag);
        const colWord = pluralize("columna", mag);
        return pick([
          `Estaba ${magWord} ${colWord} al ${dir} de ${personName(puzzle, fact.refPersonIdx)}.`,
          `A ${magWord} ${colWord} al ${dir} de ${personName(puzzle, fact.refPersonIdx)}, ahí estaba.`,
        ]);
      }

      default:
        return "";
    }
  }

  function numberWord(n) {
    const words = ["cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho"];
    return words[n] || String(n);
  }

  function clueTextFor(puzzle, person) {
    if (person.isVictim) return "Fue hallada/o en la última posición restante, tras ubicar a todos los demás.";
    if (!person.facts || person.facts.length === 0) return "Sin pista directa: se deduce por eliminación.";
    return person.facts.map((f) => factSentence(puzzle, f)).filter(Boolean).join(" ");
  }

  M.describeFurniture = describeFurniture;
  M.clueTextFor = clueTextFor;
  M.factSentence = factSentence;
  void aArticle; // reservado por si se necesita fuera de furnitureAfterPrep

  if (typeof module !== "undefined" && module.exports) {
    module.exports = M;
  } else {
    root.Murdoku = M;
  }
})(typeof window !== "undefined" ? window : globalThis);

export const asesidoku = (globalThis as any).Murdoku;
