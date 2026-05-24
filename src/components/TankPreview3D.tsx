import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import type { Group } from 'three';
import type { TankStats } from '../game/types';
import { useGame } from '../store/gameStore';
import TankMesh from './three/TankMesh';

function SpinningTank({ stats }: { stats: TankStats }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.5;
  });
  return (
    <group ref={group}>
      <TankMesh stats={stats} />
    </group>
  );
}

export default function TankPreview3D({ stats }: { stats: TankStats }) {
  const night = useGame((s) => s.theme) === 'night';
  return (
    <div className="preview-3d" data-testid="preview-3d">
      <Canvas shadows camera={{ position: [3.6, 2.8, 4.4], fov: 40 }} dpr={[1, 2]}>
        <color attach="background" args={[night ? '#161c26' : '#fffdf4']} />
        <hemisphereLight intensity={night ? 0.25 : 0.55} groundColor={night ? '#0e1420' : '#d8cba8'} />
        <ambientLight intensity={night ? 0.3 : 0.45} />
        <directionalLight
          position={[5, 8, 4]}
          intensity={night ? 0.9 : 1.25}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <SpinningTank stats={stats} />
        <ContactShadows position={[0, -0.55, 0]} opacity={night ? 0.5 : 0.35} scale={9} blur={2.4} far={4} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.56, 0]} receiveShadow>
          <planeGeometry args={[16, 16]} />
          <meshStandardMaterial color={night ? '#161d28' : '#efe3c6'} roughness={1} />
        </mesh>
        <OrbitControls enablePan={false} minDistance={3} maxDistance={9} enableDamping />
      </Canvas>
    </div>
  );
}
