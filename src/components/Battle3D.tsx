import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { ARENA_H, ARENA_W, type BattleEngine } from '../game/engine';
import { computeStats } from '../game/stats';
import type { CannonKind, PlayerConfig } from '../game/types';
import TankMesh, { TANK_S } from './three/TankMesh';

const S = TANK_S;
const WX = (ax: number) => (ax - ARENA_W / 2) * S;
const WZ = (ay: number) => (ay - ARENA_H / 2) * S;
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
  const tank0 = useRef<Group>(null);
  const tank1 = useRef<Group>(null);
  const bullets = useRef<(Mesh | null)[]>([]);
  const obstacleRefs = useRef<(Mesh | null)[]>([]);
  const mineRefs = useRef<(Group | null)[]>([]);

  const stats = useMemo(() => players.map((p) => computeStats(p)), [players]);
  // статичные объекты берём из первого снапшота движка (позиции не меняются)
  const initial = useMemo(() => engineRef.current?.snapshot() ?? { obstacles: [], mines: [] }, [engineRef]);

  useFrame(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const snap = eng.snapshot();

    const refs = [tank0.current, tank1.current];
    snap.tanks.forEach((t) => {
      const g = refs[t.i];
      if (!g) return;
      g.visible = t.hp > 0;
      g.position.set(WX(t.x), 0, WZ(t.y));
      g.rotation.y = -t.angle;
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

      {/* земля под размер арены */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[ARENA_W * S + 4, ARENA_H * S + 4]} />
        <meshStandardMaterial color={night ? '#12181f' : '#e7d9b6'} roughness={1} />
      </mesh>

      <group ref={tank0}>
        <TankMesh stats={stats[0]} />
      </group>
      <group ref={tank1}>
        <TankMesh stats={stats[1]} />
      </group>

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
