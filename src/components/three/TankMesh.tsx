import { RoundedBox } from '@react-three/drei';
import type { Group } from 'three';
import type { TankStats } from '../../game/types';

export const TANK_S = 0.045; // масштаб игровых единиц в 3D

// Лицо-персонаж: глаза (+ зрачки), рот/зубы по faceId. Смотрит вперёд (+X).
function Face3D({ faceId, len, wid, hullH }: { faceId: string; len: number; wid: number; hullH: number }) {
  const fx = len * 0.42;
  const eyeY = hullH * 0.72;
  const eyeZ = wid * 0.2;
  const eyeR = Math.max(0.05, wid * 0.12);
  const angry = faceId === 'angry' || faceId === 'grumpy';
  const cool = faceId === 'cool';
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[fx, eyeY, s * eyeZ]}>
          {cool ? (
            <mesh>
              <boxGeometry args={[eyeR * 0.6, eyeR * 1.6, eyeR * 1.8]} />
              <meshStandardMaterial color="#1a1714" />
            </mesh>
          ) : (
            <>
              <mesh>
                <sphereGeometry args={[eyeR, 14, 14]} />
                <meshStandardMaterial color="#ffffff" roughness={0.5} />
              </mesh>
              <mesh position={[eyeR * 0.7, 0, 0]}>
                <sphereGeometry args={[eyeR * 0.5, 10, 10]} />
                <meshStandardMaterial color="#1a1714" />
              </mesh>
            </>
          )}
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

function Tracks({ trackId, len, wid, trackH }: { trackId: string; len: number; wid: number; trackH: number }) {
  const trackZ = wid / 2 + trackH * 0.3;
  const wheelR = trackH * 0.5;
  const counts: Record<string, number> = { sport: 2, light: 7, medium: 5, heavy: 5, siege: 6 };
  const nWheels = counts[trackId] ?? 5;
  const bigWheel = trackId === 'sport' || trackId === 'heavy';
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * trackZ]}>
          <mesh position={[0, trackH / 2, 0]} castShadow>
            <boxGeometry args={[len * 1.08, trackH, trackH * (trackId === 'siege' ? 1.25 : 0.95)]} />
            <meshStandardMaterial color="#2c2820" flatShading roughness={1} />
          </mesh>
          {Array.from({ length: nWheels }, (_, i) => {
            const x = nWheels === 1 ? 0 : -len * 0.46 + (i / (nWheels - 1)) * len * 0.92;
            const r = bigWheel ? wheelR * 1.35 : wheelR;
            return (
              <mesh key={i} position={[x, r, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[r, r, trackH * 1.05, 12]} />
                <meshStandardMaterial color="#43403a" roughness={0.9} />
              </mesh>
            );
          })}
        </group>
      ))}
    </>
  );
}

function Hull({ hullId, len, wid, hullH, color, color2 }: { hullId: string; len: number; wid: number; hullH: number; color: string; color2: string }) {
  const sharp = hullId === 'bunker' || hullId === 'fortress';
  const radius = hullId === 'glass' ? Math.min(hullH, wid) * 0.32 : hullId === 'standard' || hullId === 'scout' ? Math.min(hullH, wid) * 0.18 : 0.02;
  const bolt = (x: number, z: number) => (
    <mesh position={[x, hullH * 0.5, z]}>
      <sphereGeometry args={[wid * 0.05, 8, 8]} />
      <meshStandardMaterial color="#1a1714" />
    </mesh>
  );
  return (
    <group>
      {sharp ? (
        <mesh position={[0, hullH / 2, 0]} castShadow>
          <boxGeometry args={[len, hullH, wid]} />
          <meshStandardMaterial color={color} flatShading roughness={0.8} metalness={0.1} />
        </mesh>
      ) : (
        <RoundedBox args={[len, hullH, wid]} radius={radius} smoothness={3} position={[0, hullH / 2, 0]} castShadow>
          <meshStandardMaterial color={color} flatShading roughness={0.7} metalness={0.1} />
        </RoundedBox>
      )}

      {/* надгусеничная полоса страны */}
      <mesh position={[0, hullH * 0.62, 0]}>
        <boxGeometry args={[len * 0.94, hullH * 0.16, wid * 1.05]} />
        <meshStandardMaterial color={color2} flatShading roughness={0.8} />
      </mesh>

      {hullId === 'scout' && (
        <mesh position={[len * 0.5, hullH * 0.5, 0]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[len * 0.18, hullH * 0.9, wid * 0.98]} />
          <meshStandardMaterial color={color} flatShading roughness={0.7} />
        </mesh>
      )}
      {hullId === 'glass' && (
        <mesh position={[-len * 0.08, hullH * 0.85, 0]}>
          <sphereGeometry args={[wid * 0.28, 16, 12]} />
          <meshStandardMaterial color="#bfe6ff" transparent opacity={0.55} roughness={0.1} metalness={0.2} />
        </mesh>
      )}
      {sharp && (
        <>
          {bolt(len * 0.42, wid * 0.4)}
          {bolt(len * 0.42, -wid * 0.4)}
          {bolt(-len * 0.42, wid * 0.4)}
          {bolt(-len * 0.42, -wid * 0.4)}
        </>
      )}
      {hullId === 'fortress' &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[0, hullH * 0.5, s * (wid / 2 + wid * 0.04)]}>
            <boxGeometry args={[len * 0.7, hullH * 0.7, wid * 0.06]} />
            <meshStandardMaterial color={color2} flatShading roughness={0.85} />
          </mesh>
        ))}
    </group>
  );
}

function Turret({ turretId, turretR, turretH, color, color2 }: { turretId: string; turretR: number; turretH: number; color: string; color2: string }) {
  if (turretId === 'twin') {
    return (
      <group scale={[1.3, 0.8, 0.95]}>
        <mesh castShadow>
          <cylinderGeometry args={[turretR, turretR * 1.05, turretH, 16]} />
          <meshStandardMaterial color={color2} flatShading roughness={0.65} metalness={0.15} />
        </mesh>
      </group>
    );
  }
  if (turretId === 'big') {
    return (
      <group>
        <mesh castShadow>
          <cylinderGeometry args={[turretR * 1.15, turretR * 1.25, turretH * 1.2, 6]} />
          <meshStandardMaterial color={color2} flatShading roughness={0.6} metalness={0.18} />
        </mesh>
        <mesh position={[-turretR * 0.3, turretH * 0.65, 0]}>
          <cylinderGeometry args={[turretR * 0.4, turretR * 0.4, turretH * 0.3, 12]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[turretR * 0.9, 0, 0]}>
          <boxGeometry args={[turretR * 0.6, turretH * 0.8, turretR * 1.0]} />
          <meshStandardMaterial color="#5a564c" metalness={0.3} roughness={0.5} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh castShadow>
      <cylinderGeometry args={[turretR, turretR * 1.12, turretH, 16]} />
      <meshStandardMaterial color={color2} flatShading roughness={0.65} metalness={0.15} />
    </mesh>
  );
}

function Barrel({ kind, cannon, baseX, y, barrelLen, barrelR }: { kind: string; cannon: string; baseX: number; y: number; barrelLen: number; barrelR: number }) {
  const mid = baseX + barrelLen / 2;
  const tip = baseX + barrelLen;
  if (kind === 'flame') {
    return (
      <group>
        <mesh position={[mid, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[barrelR * 0.8, barrelR * 0.8, barrelLen, 10]} />
          <meshStandardMaterial color="#6f6a5d" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[tip, y, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[barrelR * 2.2, barrelR * 3, 12]} />
          <meshStandardMaterial color="#b5482a" roughness={0.6} />
        </mesh>
        <mesh position={[baseX + barrelR, y + barrelR * 2, 0]}>
          <sphereGeometry args={[barrelR * 1.6, 10, 10]} />
          <meshStandardMaterial color="#c0392b" roughness={0.6} />
        </mesh>
      </group>
    );
  }
  if (kind === 'electric') {
    return (
      <group>
        <mesh position={[mid, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[barrelR * 0.7, barrelR * 0.7, barrelLen, 10]} />
          <meshStandardMaterial color="#4a463c" metalness={0.4} roughness={0.4} />
        </mesh>
        {[0.5, 0.7, 0.9].map((f) => (
          <mesh key={f} position={[baseX + barrelLen * f, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[barrelR * 1.8, barrelR * 0.35, 8, 16]} />
            <meshStandardMaterial color="#7fc7e6" emissive="#2a6f8f" emissiveIntensity={0.5} metalness={0.3} />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === 'fart') {
    return (
      <group>
        <mesh position={[baseX + barrelLen * 0.3, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[barrelR, barrelR, barrelLen * 0.6, 10]} />
          <meshStandardMaterial color="#6f6a5d" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[tip - barrelLen * 0.1, y, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[barrelR * 2.6, barrelR * 3.2, 14, 1, true]} />
          <meshStandardMaterial color="#9bc24a" roughness={0.7} side={2} />
        </mesh>
      </group>
    );
  }
  if (kind === 'chicken') {
    return (
      <group>
        <mesh position={[baseX + barrelLen * 0.28, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[barrelR * 0.8, barrelR * 0.8, barrelLen * 0.55, 8]} />
          <meshStandardMaterial color="#6f6a5d" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[tip - barrelLen * 0.12, y, 0]}>
          <boxGeometry args={[barrelLen * 0.45, barrelR * 4, barrelR * 4]} />
          <meshStandardMaterial color="#d8b25a" flatShading roughness={0.8} />
        </mesh>
      </group>
    );
  }
  if (cannon === 'mg') {
    return (
      <mesh position={[mid, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[barrelR * 0.55, barrelR * 0.55, barrelLen * 1.05, 10]} />
        <meshStandardMaterial color="#6f6a5d" metalness={0.4} roughness={0.45} />
      </mesh>
    );
  }
  if (cannon === 'howitzer') {
    return (
      <group>
        <mesh position={[baseX + barrelLen * 0.38, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[barrelR * 1.5, barrelR * 1.5, barrelLen * 0.76, 12]} />
          <meshStandardMaterial color="#6f6a5d" metalness={0.4} roughness={0.45} />
        </mesh>
        <mesh position={[tip - barrelLen * 0.12, y, 0]}>
          <boxGeometry args={[barrelLen * 0.22, barrelR * 3.4, barrelR * 3.4]} />
          <meshStandardMaterial color="#4a463c" metalness={0.3} roughness={0.5} />
        </mesh>
      </group>
    );
  }
  // gun
  return (
    <group>
      <mesh position={[mid, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[barrelR, barrelR, barrelLen, 12]} />
        <meshStandardMaterial color="#6f6a5d" metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[tip - barrelR, y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[barrelR * 1.5, barrelR * 1.5, barrelR * 3, 10]} />
        <meshStandardMaterial color="#4a463c" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

export const TURRET_MAX_ELEV = 0.55; // макс. возвышение ствола (рад)

interface Dims {
  len: number;
  wid: number;
  hullH: number;
  trackH: number;
  turretR: number;
  turretH: number;
  barrelLen: number;
  barrelR: number;
  hullY: number;
}
function dims(stats: TankStats): Dims {
  const S = TANK_S;
  const len = stats.len * S;
  const wid = stats.wid * S;
  const hullH = wid * 0.5;
  const turretR = (stats.tsize / 1.6) * S;
  const turretH = turretR * 1.05;
  return {
    len,
    wid,
    hullH,
    trackH: stats.thick * S * 1.6,
    turretR,
    turretH,
    barrelLen: len / 2 + stats.blen * S - turretR * 0.8,
    barrelR: Math.max(0.03, (stats.bw / 2) * S),
    hullY: -hullH * 0.25,
  };
}

/** Точка крепления башни (по Y) в мировом масштабе 3D. */
export function turretMountY(stats: TankStats): number {
  const d = dims(stats);
  return d.hullY + d.hullH + d.turretH / 2;
}

/** Корпус, гусеницы, антенна и лицо (вращается с корпусом). */
export function HullMesh({ stats }: { stats: TankStats }) {
  const d = dims(stats);
  return (
    <group position={[0, d.hullY, 0]}>
      <Hull hullId={stats.hullId} len={d.len} wid={d.wid} hullH={d.hullH} color={stats.color} color2={stats.color2} />
      <Tracks trackId={stats.trackId} len={d.len} wid={d.wid} trackH={d.trackH} />
      <mesh position={[-d.len * 0.42, d.hullH + d.turretR * 1.1, d.wid * 0.3]}>
        <cylinderGeometry args={[d.barrelR * 0.25, d.barrelR * 0.25, d.turretR * 2.2, 6]} />
        <meshStandardMaterial color="#1a1714" />
      </mesh>
      {stats.faceId && <Face3D faceId={stats.faceId} len={d.len} wid={d.wid} hullH={d.hullH} />}
    </group>
  );
}

/** Башня + ствол (вращается независимо). `barrelRef` — группа ствола для возвышения. */
export function TurretMesh({ stats, barrelRef }: { stats: TankStats; barrelRef?: React.Ref<Group> }) {
  const d = dims(stats);
  return (
    <group>
      <Turret turretId={stats.turretId} turretR={d.turretR} turretH={d.turretH} color={stats.color} color2={stats.color2} />
      <group ref={barrelRef}>
        <Barrel kind={stats.cannonKind} cannon={stats.cannon} baseX={d.turretR * 0.8} y={0} barrelLen={d.barrelLen} barrelR={d.barrelR} />
      </group>
    </group>
  );
}

export default function TankMesh({ stats }: { stats: TankStats }) {
  const d = dims(stats);
  return (
    <group>
      <HullMesh stats={stats} />
      <group position={[-d.len * 0.05, turretMountY(stats), 0]}>
        <TurretMesh stats={stats} />
      </group>
    </group>
  );
}
