import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { WORLD_H, WORLD_W, type BattleEngine } from '../game/engine';
import { computeStats } from '../game/stats';
import type { CannonKind, PlayerConfig } from '../game/types';
import { HullMesh, TurretMesh, TANK_S, TURRET_MAX_ELEV, turretMountY } from './three/TankMesh';

const S = TANK_S;
const WX = (ax: number) => (ax - WORLD_W / 2) * S;
const WZ = (ay: number) => (ay - WORLD_H / 2) * S;
const BULLET_POOL = 80;

const BULLET_COLOR: Record<CannonKind, string> = {
  normal: '#ffcf6b',
  flame: '#ff7b1a',
  electric: '#bfeaff',
  fart: '#9bc24a',
  chicken: '#fff7e0',
};

type Eng = BattleEngine;

function Scene({ engineRef, players, night }: { engineRef: React.MutableRefObject<Eng | null>; players: [PlayerConfig, PlayerConfig]; night: boolean }) {
  const hullRefs = useRef<(Group | null)[]>([]);
  const turretRefs = useRef<(Group | null)[]>([]);
  const barrelRefs = useRef<(Group | null)[]>([]);
  const bullets = useRef<(Mesh | null)[]>([]);
  const obstacleRefs = useRef<(Mesh | null)[]>([]);
  const mineRefs = useRef<(Group | null)[]>([]);

  const { camera } = useThree();
  const stats = useMemo(() => players.map((p) => computeStats(p)), [players]);
  // статичные объекты берём из первого снапшота движка (позиции не меняются)
  const initial = useMemo(() => engineRef.current?.snapshot() ?? { obstacles: [], mines: [] }, [engineRef]);

  useFrame(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const snap = eng.snapshot();

    // камера следит за серединой танков, отъезжая по расстоянию между ними
    const alive = snap.tanks.filter((t) => t.hp > 0);
    if (alive.length) {
      const mx = alive.reduce((s2, t) => s2 + t.x, 0) / alive.length;
      const my = alive.reduce((s2, t) => s2 + t.y, 0) / alive.length;
      let sep = 0;
      if (alive.length === 2) sep = Math.hypot(alive[0].x - alive[1].x, alive[0].y - alive[1].y);
      const tx = WX(mx);
      const tz = WZ(my);
      const dist = Math.max(16, Math.min(60, sep * S * 1.5 + 16));
      camera.position.set(tx, dist * 0.95, tz + dist * 0.95);
      camera.lookAt(tx, 0, tz);
    }

    snap.tanks.forEach((t) => {
      const hull = hullRefs.current[t.i];
      const turret = turretRefs.current[t.i];
      const barrel = barrelRefs.current[t.i];
      if (hull) {
        hull.visible = t.hp > 0;
        hull.position.set(WX(t.x), 0, WZ(t.y));
        hull.rotation.y = -t.angle;
      }
      if (turret) turret.rotation.y = t.angle - t.turretAngle; // мировой угол = -turretAngle
      if (barrel) barrel.rotation.z = t.elevation * TURRET_MAX_ELEV; // возвышение ствола
    });

    const pool = bullets.current;
    for (let i = 0; i < pool.length; i++) {
      const m = pool[i];
      if (!m) continue;
      const b = snap.bullets[i];
      if (b) {
        m.visible = true;
        m.position.set(WX(b.x), 0.45, WZ(b.y));
        m.scale.setScalar(Math.max(0.05, b.size * S));
        (m.material as MeshStandardMaterial).color.set(BULLET_COLOR[b.kind]);
      } else {
        m.visible = false;
      }
    }

    const okeys = new Set(snap.obstacles.map((o) => `${o.x},${o.y}`));
    initial.obstacles.forEach((o, i) => {
      const m = obstacleRefs.current[i];
      if (m) m.visible = okeys.has(`${o.x},${o.y}`);
    });
    const mkeys = new Set(snap.mines.map((m) => `${m.x},${m.y}`));
    initial.mines.forEach((mn, i) => {
      const g = mineRefs.current[i];
      if (g) g.visible = mkeys.has(`${mn.x},${mn.y}`);
    });
  });

  return (
    <>
      <hemisphereLight intensity={night ? 0.3 : 0.6} groundColor={night ? '#0e1420' : '#cdbf9a'} />
      <ambientLight intensity={night ? 0.25 : 0.4} />
      <directionalLight position={[12, 26, 10]} intensity={night ? 0.8 : 1.2} castShadow shadow-mapSize={[2048, 2048]} />

      {/* земля под размер мира */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[WORLD_W * S + 4, WORLD_H * S + 4]} />
        <meshStandardMaterial color={night ? '#12181f' : '#e7d9b6'} roughness={1} />
      </mesh>

      {stats.map((st, i) => (
        <group key={i} ref={(g) => (hullRefs.current[i] = g)}>
          <HullMesh stats={st} />
          <group ref={(g) => (turretRefs.current[i] = g)} position={[0, turretMountY(st), 0]}>
            <TurretMesh stats={st} barrelRef={(g: Group | null) => (barrelRefs.current[i] = g)} />
          </group>
        </group>
      ))}

      {initial.obstacles.map((o, i) => (
        <mesh
          key={i}
          ref={(m) => (obstacleRefs.current[i] = m)}
          position={[WX(o.x), o.r * S * 0.6, WZ(o.y)]}
          castShadow
        >
          {o.type === 'box' ? (
            <boxGeometry args={[o.r * 2 * S, o.r * 1.4 * S, o.r * 2 * S]} />
          ) : (
            <dodecahedronGeometry args={[o.r * S]} />
          )}
          <meshStandardMaterial color={o.type === 'box' ? '#cdb37e' : '#b9b2a3'} flatShading roughness={0.95} />
        </mesh>
      ))}

      {initial.mines.map((mn, i) => (
        <group key={i} ref={(g) => (mineRefs.current[i] = g)} position={[WX(mn.x), 0.12, WZ(mn.y)]}>
          <mesh>
            <cylinderGeometry args={[mn.r * S, mn.r * S, 0.18, 12]} />
            <meshStandardMaterial color="#3a352b" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}

      {Array.from({ length: BULLET_POOL }, (_, i) => (
        <mesh key={i} ref={(m) => (bullets.current[i] = m)} visible={false}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="#ffcf6b" emissive="#000000" />
        </mesh>
      ))}
    </>
  );
}

export default function Battle3D({
  engineRef,
  players,
  night,
}: {
  engineRef: React.MutableRefObject<Eng | null>;
  players: [PlayerConfig, PlayerConfig];
  night: boolean;
}) {
  return (
    <div className="battle3d" data-testid="battle3d">
      <Canvas shadows camera={{ position: [0, 42, 40], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={[night ? '#0f141c' : '#f3ead2']} />
        <Scene engineRef={engineRef} players={players} night={night} />
      </Canvas>
    </div>
  );
}
