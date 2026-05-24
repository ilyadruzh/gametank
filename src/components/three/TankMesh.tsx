import { RoundedBox } from '@react-three/drei';
import type { TankStats } from '../../game/types';

export const TANK_S = 0.045; // масштаб игровых единиц в 3D

// Лицо-персонаж: глаза (+ зрачки), рот/зубы по faceId. Смотрит вперёд (+X).
function Face3D({ faceId, len, wid, hullH }: { faceId: string; len: number; wid: number; hullH: number }) {
  const fx = len * 0.42;
  const eyeY = hullH * 0.72;
  const eyeZ = wid * 0.2;
  const eyeR = Math.max(0.05, wid * 0.12);
  const angry = faceId === 'angry' || faceId === 'grumpy';
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[fx, eyeY, s * eyeZ]}>
          <mesh>
            <sphereGeometry args={[eyeR, 14, 14]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </mesh>
          <mesh position={[eyeR * 0.7, 0, 0]}>
            <sphereGeometry args={[eyeR * 0.5, 10, 10]} />
            <meshStandardMaterial color="#1a1714" />
          </mesh>
          {angry && (
            <mesh position={[0, eyeR * 1.1, 0]} rotation={[0, 0, s * -0.5]}>
              <boxGeometry args={[eyeR * 2.2, eyeR * 0.5, eyeR * 0.5]} />
              <meshStandardMaterial color="#1a1714" />
            </mesh>
          )}
        </group>
      ))}
      {faceId === 'fang' ? (
        <group position={[len * 0.46, hullH * 0.42, 0]}>
          <mesh>
            <boxGeometry args={[wid * 0.06, wid * 0.32, wid * 0.42]} />
            <meshStandardMaterial color="#5a1410" />
          </mesh>
          {[-1.5, -0.5, 0.5, 1.5].map((k) => (
            <mesh key={k} position={[wid * 0.04, wid * 0.08, k * wid * 0.09]}>
              <coneGeometry args={[wid * 0.04, wid * 0.16, 4]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      ) : (
        <mesh position={[len * 0.46, hullH * 0.42, 0]} rotation={[0, 0, angry ? Math.PI : 0]}>
          <torusGeometry args={[wid * 0.16, wid * 0.04, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#1a1714" />
        </mesh>
      )}
    </group>
  );
}

export default function TankMesh({ stats }: { stats: TankStats }) {
  const S = TANK_S;
  const len = stats.len * S;
  const wid = stats.wid * S;
  const hullH = wid * 0.5;
  const trackH = stats.thick * S * 1.6;
  const trackZ = wid / 2 + trackH * 0.3;
  const turretR = (stats.tsize / 1.6) * S;
  const turretH = turretR * 1.05;
  const turretX = -len * 0.05;
  const turretY = hullH + turretH / 2;
  const barrelLen = len / 2 + stats.blen * S;
  const barrelR = Math.max(0.03, (stats.bw / 2) * S);
  const wheelR = trackH * 0.5;
  const nWheels = 5;

  return (
    <group position={[0, -hullH * 0.25, 0]}>
      {/* корпус */}
      <RoundedBox args={[len, hullH, wid]} radius={Math.min(hullH, wid) * 0.18} smoothness={3} position={[0, hullH / 2, 0]} castShadow>
        <meshStandardMaterial color={stats.color} flatShading roughness={0.7} metalness={0.1} />
      </RoundedBox>
      {/* надгусеничные полки + полоса страны */}
      <mesh position={[0, hullH * 0.62, 0]}>
        <boxGeometry args={[len * 0.94, hullH * 0.16, wid * 1.05]} />
        <meshStandardMaterial color={stats.color2} flatShading roughness={0.8} />
      </mesh>

      {/* гусеницы + катки */}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * trackZ]}>
          <mesh position={[0, trackH / 2, 0]} castShadow>
            <boxGeometry args={[len * 1.08, trackH, trackH * 0.95]} />
            <meshStandardMaterial color="#2c2820" flatShading roughness={1} />
          </mesh>
          {Array.from({ length: nWheels }, (_, i) => {
            const x = -len * 0.46 + (i / (nWheels - 1)) * len * 0.92;
            return (
              <mesh key={i} position={[x, wheelR, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[wheelR, wheelR, trackH * 1.02, 12]} />
                <meshStandardMaterial color="#43403a" roughness={0.9} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* башня + люк + маска */}
      <group position={[turretX, turretY, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[turretR, turretR * 1.12, turretH, 16]} />
          <meshStandardMaterial color={stats.color2} flatShading roughness={0.65} metalness={0.15} />
        </mesh>
        <mesh position={[0, turretH * 0.55, 0]}>
          <cylinderGeometry args={[turretR * 0.45, turretR * 0.45, turretH * 0.25, 12]} />
          <meshStandardMaterial color={stats.color} roughness={0.7} />
        </mesh>
        {/* маска ствола */}
        <mesh position={[turretR * 0.8, 0, 0]}>
          <boxGeometry args={[turretR * 0.6, turretH * 0.7, turretR * 0.9]} />
          <meshStandardMaterial color="#5a564c" metalness={0.3} roughness={0.5} />
        </mesh>
      </group>

      {/* ствол + дульный тормоз */}
      <mesh position={[turretX + barrelLen / 2, turretY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[barrelR, barrelR, barrelLen, 12]} />
        <meshStandardMaterial color="#6f6a5d" metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[turretX + barrelLen - barrelR, turretY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[barrelR * 1.5, barrelR * 1.5, barrelR * 3, 10]} />
        <meshStandardMaterial color="#4a463c" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* антенна */}
      <mesh position={[-len * 0.42, hullH + turretR * 1.1, wid * 0.3]}>
        <cylinderGeometry args={[barrelR * 0.25, barrelR * 0.25, turretR * 2.2, 6]} />
        <meshStandardMaterial color="#1a1714" />
      </mesh>

      {stats.faceId && <Face3D faceId={stats.faceId} len={len} wid={wid} hullH={hullH} />}
    </group>
  );
}
