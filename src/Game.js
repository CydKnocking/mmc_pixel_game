// 游戏所需库说明：
// - 使用 React 作为前端框架
// - 使用 Tailwind CSS 简化样式（已内置）
// - 使用 requestAnimationFrame 管理游戏主循环
//
// 注意：你需要将元素资源放在 public/elements 路径下以便访问
// 示例路径：public/elements/chara_move/mmc_go_up.gif

import React, { useEffect, useRef, useState } from "react";

const TILE_SIZE = 160;
const MAP_WIDTH = 16;
const MAP_HEIGHT = 16;
const VIEWPORT = 640; // 可视区域大小

const SPEED = 0.1;
const MULI_SPEED = 0.0001;

const directions = {
  up: { dx: 0, dy: -SPEED },
  down: { dx: 0, dy: SPEED },
  left: { dx: -SPEED, dy: 0 },
  right: { dx: SPEED, dy: 0 },
};

const muli_direction_grid = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const getRandomDirection = () => {
  const keys = Object.keys(directions);
  return keys[Math.floor(Math.random() * keys.length)];
};

function Game() {
  const canvasRef = useRef(null);
  const [mmcPos, setMmcPos] = useState({ x: 8, y: 8 });
  const mmcPosRef = useRef(mmcPos);
  const [mmcDir, setMmcDir] = useState("down");
  const mmcDirRef = useRef(mmcDir);
  const [mmcMoving, setMmcMoving] = useState(false);
  const mmcMovingRef = useRef(mmcMoving);
  const [mmcIdleTime, setMmcIdleTime] = useState(0);
  const mmcIdleTimeRef = useRef(mmcIdleTime);
  const [keysPressed, setKeysPressed] = useState({});
  const keysPressedRef = useRef(keysPressed);
  const [mulis, setMulis] = useState(() => {
    return Array.from({ length: 3 }, () => createRandomMuli());
  });

  // 计算缩放比例
  const [scale, setScale] = useState(1);

  function createRandomMuli(x = Math.floor(Math.random() * MAP_WIDTH), y = Math.floor(Math.random() * MAP_HEIGHT)) {
    return {
      id: Math.random().toString(36).slice(2),
      x,
      y,
      dir: "down",
      state: "prepare_idle", // 状态机初始状态
      t_cooldown: 0,
      target: null,
    };
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        keysPressedRef.current = { ...keysPressedRef.current, [key]: true };
        setKeysPressed(keysPressedRef.current);
        mmcIdleTimeRef.current = 0;
        setMmcIdleTime(0);
      }
    };
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current = { ...keysPressedRef.current, [key]: false };
      setKeysPressed(keysPressedRef.current);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // 游戏主循环
  useEffect(() => {
    let lastTime = performance.now();

    // 用于保存 mmc 的最新状态
    mmcPosRef.current = mmcPos;
    mmcDirRef.current = mmcDir;
    mmcMovingRef.current = mmcMoving;
    mmcIdleTimeRef.current = mmcIdleTime;

    function gameLoop(time) {
      const delta = time - lastTime;
      lastTime = time;

      // 主人公逻辑
      let dir = null;
      const keys = keysPressedRef.current;
      if (keys["w"] || keys["arrowup"]) dir = "up";
      else if (keys["s"] || keys["arrowdown"]) dir = "down";
      else if (keys["a"] || keys["arrowleft"]) dir = "left";
      else if (keys["d"] || keys["arrowright"]) dir = "right";

      let newMmcPos = { ...mmcPosRef.current };
      let newMmcDir = mmcDirRef.current;
      let newMmcMoving = false;
      let newMmcIdleTime = mmcIdleTimeRef.current;

      if (dir) {
        const move = directions[dir];
        newMmcDir = dir;
        newMmcPos.x = Math.max(0, Math.min(MAP_WIDTH - 1, newMmcPos.x + move.dx));
        newMmcPos.y = Math.max(0, Math.min(MAP_HEIGHT - 1, newMmcPos.y + move.dy));
        newMmcMoving = true;
        newMmcIdleTime = 0;
      } else {
        newMmcMoving = false;
        newMmcIdleTime += delta;
      }

      // 更新 mmc 状态
      mmcPosRef.current = newMmcPos;
      mmcDirRef.current = newMmcDir;
      mmcMovingRef.current = newMmcMoving;
      mmcIdleTimeRef.current = newMmcIdleTime;
      setMmcPos(newMmcPos);
      setMmcDir(newMmcDir);
      setMmcMoving(newMmcMoving);
      setMmcIdleTime(newMmcIdleTime);

      // 小怪逻辑
      setMulis((prev) =>
        prev.map((muli) => {
          // ...existing muli 状态机逻辑...
          if (muli.dying) return muli;
          switch (muli.state) {
            case "prepare_idle": {
              return { ...muli, state: "idle", t_cooldown: 2000 };
            }
            case "idle": {
              const nextCooldown = muli.t_cooldown - delta;
              if (nextCooldown <= 0) {
                return { ...muli, state: "motivation", t_cooldown: 0 };
              } else {
                return { ...muli, t_cooldown: nextCooldown };
              }
            }
            case "motivation": {
              if (Math.random() < 0.3) {
                return { ...muli, state: "prepare_idle" };
              } else {
                return { ...muli, state: "direction" };
              }
            }
            case "direction": {
              const possibleDirs = [];
              if (muli.y > 0) possibleDirs.push("up");
              if (muli.y < MAP_HEIGHT - 1) possibleDirs.push("down");
              if (muli.x > 0) possibleDirs.push("left");
              if (muli.x < MAP_WIDTH - 1) possibleDirs.push("right");
              const dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
              const move = muli_direction_grid[dir];
              const target = { x: muli.x + move.dx, y: muli.y + move.dy };
              return { ...muli, state: "moving", dir, target };
            }
            case "moving": {
              if (!muli.target) return { ...muli, state: "motivation" };
              let { x, y } = muli;
              const { x: tx, y: ty } = muli.target;
              let reached = false;
              if (x < tx) {
                x = Math.min(x + MULI_SPEED * TILE_SIZE * delta, tx);
              } else if (x > tx) {
                x = Math.max(x - MULI_SPEED * TILE_SIZE * delta, tx);
              }
              if (y < ty) {
                y = Math.min(y + MULI_SPEED * TILE_SIZE * delta, ty);
              } else if (y > ty) {
                y = Math.max(y - MULI_SPEED * TILE_SIZE * delta, ty);
              }
              if (Math.abs(x - tx) < 0.01 && Math.abs(y - ty) < 0.01) {
                x = tx;
                y = ty;
                reached = true;
              }
              if (reached) {
                return { ...muli, x, y, state: "motivation", target: null };
              } else {
                return { ...muli, x, y };
              }
            }
            default:
              return muli;
          }
        })
      );

      // 检测碰撞
      setMulis((prev) =>
        prev.map((muli) => {
          if (Math.round(muli.x) === Math.round(mmcPosRef.current.x) && Math.round(muli.y) === Math.round(mmcPosRef.current.y)) {
            return { ...muli, dying: true, dyingTime: 1000 };
          }
          if (muli.dying) {
            if (muli.dyingTime <= delta) {
              return createRandomMuli();
            } else {
              return { ...muli, dyingTime: muli.dyingTime - delta };
            }
          }
          return muli;
        })
      );

      requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
    // eslint-disable-next-line
  }, []);

  const getMmcGif = () => {
    if (mmcMoving) return `/elements/chara_move/mmc_go_${mmcDir}.gif`;
    if (mmcIdleTime < 2000) return `/elements/chara_move/mmc_face_${mmcDir}.gif`;
    return "/elements/chara_move/mmc_stand_front.gif";
  };

  const getMuliGif = (muli) => {
    // 如果是上下方向，随机用 left 或 right 的 gif
    let dir = muli.dir;
    if (dir === "up" || dir === "down") {
      dir = muli.lastLRDir || (Math.random() > 0.5 ? "left" : "right");
    }
    if (muli.dying) return `/elements/chara_move/muli_die_${dir}.gif`;
    return `/elements/chara_move/muli_go_${dir}.gif`;
  };

  // 计算缩放比例
  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const ratio = Math.min(w / 5940, h / 3240);
      setScale(ratio);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center"
      style={{ position: "relative" }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 5940,
          height: 3240,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center", // 关键修正
        }}
      >
        {/* 背景地图 */}
        <img
          src={process.env.PUBLIC_URL + "/elements/map.png"}
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: 5940,
            height: 3240,
            zIndex: 0,
            objectFit: "cover", // 或 "contain" 看你需求
          }}
          alt="map"
        />

        {/* UI 叠加图层 */}
        <img
          src={process.env.PUBLIC_URL + "/elements/map_ui.png"}
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: 5940,
            height: 3240,
            zIndex: 0,
          }}
          alt="ui"
        />

        {/* mmc 主角 */}
        <img
          src={process.env.PUBLIC_URL + getMmcGif()}
          style={{
            position: "absolute",
            width: TILE_SIZE,
            height: TILE_SIZE,
            top: `calc(50% + ${(mmcPos.y + 1.5625) * TILE_SIZE}px)`,   // 0.0625 * 160 是一个像素格的大小
            left: 3240 / 2 + (mmcPos.x + 0.4375) * TILE_SIZE,
            zIndex: 10,
          }}
          alt="mmc"
        />

        {/* muli 小怪 */}
        {mulis.map((muli) => (
          <img
            key={muli.id}
            src={process.env.PUBLIC_URL + getMuliGif(muli)}
            style={{
              position: "absolute",
              width: TILE_SIZE,
              height: TILE_SIZE,
              top: `calc(50% + ${(muli.y + 1.5625) * TILE_SIZE}px)`,
              left: 3240 / 2 + (muli.x + 0.4375) * TILE_SIZE,
              zIndex: 10,
            }}
            alt="muli"
          />
        ))}
      </div>
    </div>
  );
}

export default Game;
