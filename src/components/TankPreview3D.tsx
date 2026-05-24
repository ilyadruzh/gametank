import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Group } from 'three';
import type { TankStats } from '../game/types';
import { useGame } from '../store/gameStore';

const S = 0.045; // масштаб игровых единиц в 3D

function TankModel({ stats }: { stats: TankStats }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.5;
  });

  const len = stats.len * S;
  const wid = stats.wid * S;
  const trackH = stats.thick * S * 1.4;
  const hullH = wid * 0.55;
  const turretR = (stats.tsize / 1.6) * S;
  const barrelLen = (stats.len / 2 + stats.blen) * S;
  const barrelR = (stats.bw / 2) * S;

  return (
    <group ref={group} position={[0, -hullH * 0.3, 0]}>
      {/* корпус */}
      <mesh castShadow position={[0, hullH / 2, 0]}>
        <boxGeometry args={[len, hullH, wid]} />
        <meshStandardMaterial color={stats.color} flatShading roughness={0.85} />
      </mesh>
      {/* акцентная полоса страны */}
      <mesh position={[0, hullH * 0.55, 0]}>
        <boxGeometry args={[len * 0.92, hullH * 0.18, wid * 1.02]} />
        <meshStandardMaterial color={stats.color2} flatShading roughness={0.9} />
      </mesh>
      {/* гусеницы */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, trackH / 2, side * (wid / 2 + trackH * 0.35)]} castShadow>
          <boxGeometry args={[len * 1.06, trackH, trackH * 0.9]} />
          <meshStandardMaterial color="#2c2820" flatShading roughness={1} />
        </mesh>
      ))}
      {/* башня */}
      <mesh position={[-len * 0.05, hullH + turretR * 0.5, 0]} castShadow>
        <cylinderGeometry args={[turretR, turretR * 1.1, turretR * 1.1, 14]} />
        <meshStandardMaterial color={stats.color2} flatShading roughness={0.8} />
      </mesh>
      {/* ствол */}
      <mesh position={[barrelLen / 2 - len * 0.05, hullH + turretR * 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[barrelR, barrelR, barrelLen, 10]} />
        <meshStandardMaterial color="#6f6a5d" metalness={0.2} roughness={0.6} />
      </mesh>
    </group>
  );
}

export default function TankPreview3D({ stats }: { stats: TankStats }) {
  const night = useGame((s) => s.theme) === 'night';
  return (
    <div className="preview-3d" data-testid="preview-3d">
      <Canvas shadows camera={{ position: [3.4, 2.6, 4.2], fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={[night ? '#161c26' : '#fffdf4']} />
        <ambientLight intensity={night ? 0.4 : 0.7} />
        <directionalLight position={[4, 7, 5]} intensity={night ? 0.8 : 1.1} castShadow shadow-mapSize={[1024, 1024]} />
        <TankModel stats={stats} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} receiveShadow>
          <planeGeometry args={[14, 14]} />
          <meshStandardMaterial color={night ? '#1d2530' : '#efe3c6'} roughness={1} />
        </mesh>
        <OrbitControls enablePan={false} minDistance={3} maxDistance={9} enableDamping />
      </Canvas>
    </div>
  );
}
