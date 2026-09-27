// ─────────────────────────────────────────────────────────────────────────────
// GARAGE ENVIRONMENT — room shell, floor, props and the three lighting rigs.
//
// Realism budget, in order of payoff:
//   1. An environment map made of Lightformers that MATCH the visible fixtures.
//      Car paint is mostly reflection; this is what makes it read as paint.
//   2. A reflective floor (MeshReflectorMaterial) that grounds the cars.
//   3. Soft shadow-casting spots + ContactShadows under the tyres.
//   4. Ambient occlusion and bloom in the post stack (GarageCanvas.jsx).
// Everything reads the store, so the customiser updates it live.
// ─────────────────────────────────────────────────────────────────────────────
import { useLayoutEffect, useMemo, useRef } from 'react'
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { useGarageStore } from '../state/useGarageStore'
import { FLOORS, ROOM } from '../config/garagePresets'
import { VEHICLES } from '../config/vehicles'
import { floorTexture } from '../three/textures'

// Rect-area lights need their LTC lookup tables registered once.
RectAreaLightUniformsLib.init()

const W = ROOM.width, D = ROOM.depth, H = ROOM.height
const CAR_XS = VEHICLES.map((v) => v.position[0])

export default function GarageEnvironment() {
  const garage = useGarageStore((s) => s.garage)
  const high = garage.quality === 'high'
  return (
    <>
      <Floor floorId={garage.floor} high={high} />
      <Shell wallColor={garage.wallColor} />
      <Props />

      <hemisphereLight args={['#dfe6f0', '#2a2622', 0.35 * garage.brightness]} />
      {garage.lights.spots && <SpotRig brightness={garage.brightness} high={high} />}
      {garage.lights.panels && <PanelRig brightness={garage.brightness} />}
      {garage.lights.neon && <NeonRig brightness={garage.brightness} color={garage.neonColor} />}

      <ReflectionMap garage={garage} />

      <ContactShadows position={[0, 0.004, 0]} scale={[W - 2, D - 2]} resolution={high ? 1024 : 512}
        far={1.6} blur={2.4} opacity={0.85} color="#000000" />
    </>
  )
}

// ── Floor ─────────────────────────────────────────────────────────────────────
function Floor({ floorId, high }) {
  const f = FLOORS[floorId] ?? FLOORS['polished-concrete']
  const map = useMemo(() => floorTexture(f.texture, f.repeat), [f.texture, f.repeat])
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[W, D]} />
      {high ? (
        // Real-time planar reflection, blurred by roughness. Re-keyed on floor
        // change because some of its props are only read at construction.
        <MeshReflectorMaterial
          key={floorId}
          map={map}
          color={f.color}
          roughness={f.roughness}
          metalness={f.metalness}
          mirror={0}
          mixStrength={f.mirror}
          mixBlur={1}
          blur={f.blur}
          resolution={1024}
          depthScale={0.8}
          minDepthThreshold={0.6}
          maxDepthThreshold={1.3}
          depthToBlurRatioBias={0.25}
        />
      ) : (
        <meshStandardMaterial map={map} color={f.color} roughness={f.roughness} metalness={f.metalness} />
      )}
    </mesh>
  )
}

// ── Walls, ceiling, garage doors ─────────────────────────────────────────────
function Shell({ wallColor }) {
  const walls = [
    { pos: [0, H / 2, -D / 2], rot: [0, 0, 0], size: [W, H] },
    { pos: [-W / 2, H / 2, 0], rot: [0, Math.PI / 2, 0], size: [D, H] },
    { pos: [W / 2, H / 2, 0], rot: [0, -Math.PI / 2, 0], size: [D, H] },
    { pos: [0, H / 2, D / 2], rot: [0, Math.PI, 0], size: [W, H] },
  ]
  return (
    <group>
      {walls.map((w, i) => (
        <mesh key={i} position={w.pos} rotation={w.rot} receiveShadow>
          <planeGeometry args={w.size} />
          <meshStandardMaterial color={wallColor} roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[0, H, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#2b2d31" roughness={0.95} />
      </mesh>

      {/* Baseboard around the perimeter. */}
      {walls.map((w, i) => (
        <mesh key={`b${i}`} position={[w.pos[0] * 0.998, 0.07, w.pos[2] * 0.998]} rotation={w.rot}>
          <boxGeometry args={[w.size[0], 0.14, 0.03]} />
          <meshStandardMaterial color="#1b1c1f" roughness={0.6} />
        </mesh>
      ))}

      {/* Two sectional roll-up doors on the front wall (behind the default camera). */}
      {[-3.4, 3.4].map((x) => (
        <group key={x} position={[x, 0, D / 2 - 0.03]}>
          {Array.from({ length: 5 }, (_, i) => (
            <RoundedBox key={i} args={[4.6, 0.5, 0.05]} radius={0.015} position={[0, 0.27 + i * 0.52, 0]}>
              <meshStandardMaterial color="#c9ccd1" roughness={0.45} metalness={0.3} />
            </RoundedBox>
          ))}
        </group>
      ))}

      {/* Yellow bay divider painted on the floor. */}
      <mesh rotation-x={-Math.PI / 2} position={[(CAR_XS[0] + CAR_XS[1]) / 2, 0.002, 0]}>
        <planeGeometry args={[0.1, 7]} />
        <meshStandardMaterial color="#e2b007" roughness={0.6} />
      </mesh>
    </group>
  )
}

// ── Set dressing: workbench, tool chest, tyre rack ───────────────────────────
function Props() {
  const z = -D / 2 + 0.45
  return (
    <group>
      <group position={[-3.2, 0, z]}>
        <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.06, 0.75]} />
          <meshStandardMaterial color="#8a6a45" roughness={0.7} />
        </mesh>
        {[[-1.2, -0.3], [1.2, -0.3], [-1.2, 0.3], [1.2, 0.3]].map(([x, dz], i) => (
          <mesh key={i} position={[x, 0.45, dz]} castShadow>
            <boxGeometry args={[0.06, 0.9, 0.06]} />
            <meshStandardMaterial color="#2d2f33" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 1.75, -0.33]} receiveShadow>
          <boxGeometry args={[2.6, 1.2, 0.03]} />
          <meshStandardMaterial color="#3a3d42" roughness={0.8} />
        </mesh>
      </group>

      {/* Rolling tool chest: stacked drawers with dark seams and chrome pulls. */}
      <group position={[-6.6, 0, z + 0.05]}>
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} position={[0, 0.16 + i * 0.16, 0]}>
            <RoundedBox args={[1.3, 0.145, 0.6]} radius={0.01} castShadow receiveShadow>
              <meshPhysicalMaterial color="#a3161a" roughness={0.3} metalness={0.4} clearcoat={0.8} />
            </RoundedBox>
            <mesh position={[0, 0.02, 0.305]}>
              <boxGeometry args={[1.0, 0.018, 0.02]} />
              <meshStandardMaterial color="#e5e5e5" metalness={1} roughness={0.1} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Wall-mounted tyre rack on the right wall. */}
      <group position={[W / 2 - 0.35, 1.5, -3]}>
        {[-0.9, -0.3, 0.3, 0.9].map((dz) => (
          <mesh key={dz} position={[0, 0, dz]} rotation-y={Math.PI / 2} castShadow>
            <torusGeometry args={[0.28, 0.1, 16, 40]} />
            <meshStandardMaterial color="#151515" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.5, 0.04, 2.4]} />
          <meshStandardMaterial color="#2d2f33" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>
    </group>
  )
}

// ── Lighting rigs ────────────────────────────────────────────────────────────
// Spot positions double as Lightformer positions in ReflectionMap.
const SPOTS = [...CAR_XS.map((x) => [x, H - 0.15, 0.6]), [0, H - 0.15, -3.4]]

function SpotRig({ brightness, high }) {
  return (
    <group>
      {SPOTS.map((p, i) => (
        <group key={i}>
          <Spot position={p} target={[p[0], 0, p[2] - 0.4]} intensity={70 * brightness}
            castShadow={i < CAR_XS.length} mapSize={high ? 2048 : 1024} />
          {/* Visible fixture: housing + an HDR-bright lens that blooms. */}
          <mesh position={[p[0], H - 0.06, p[2]]}>
            <cylinderGeometry args={[0.16, 0.18, 0.12, 24]} />
            <meshStandardMaterial color="#1c1d20" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[p[0], H - 0.125, p[2]]} rotation-x={Math.PI / 2}>
            <circleGeometry args={[0.13, 24]} />
            <meshStandardMaterial color="#fff6e8" emissive="#fff6e8" emissiveIntensity={8 * brightness} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Spot({ position, target, intensity, castShadow, mapSize }) {
  const light = useRef()
  useLayoutEffect(() => {
    light.current.target.position.set(...target)
    light.current.target.updateMatrixWorld()
  }, [target])
  return (
    <spotLight ref={light} position={position} angle={0.62} penumbra={0.85} intensity={intensity}
      color="#fff3e0" castShadow={castShadow} shadow-mapSize={[mapSize, mapSize]}
      shadow-bias={-0.0002} shadow-normalBias={0.03} shadow-radius={6} />
  )
}

/** Rect lights face whatever they `lookAt`; this sets that once. */
function RectLight({ position, lookAt, ...props }) {
  const ref = useRef()
  useLayoutEffect(() => { ref.current.lookAt(...lookAt) }, [lookAt])
  return <rectAreaLight ref={ref} position={position} {...props} />
}

const PANEL_ROWS = [-2.4, 0.6, 3.6]

function PanelRig({ brightness }) {
  return (
    <group>
      {PANEL_ROWS.map((z) => CAR_XS.map((x) => (
        <group key={`${x}:${z}`}>
          <mesh position={[x, H - 0.03, z]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[2.2, 0.7]} />
            <meshStandardMaterial color="#ffffff" emissive="#f1f5ff" emissiveIntensity={3.5 * brightness} side={THREE.DoubleSide} />
          </mesh>
          <RectLight position={[x, H - 0.05, z]} lookAt={[x, 0, z]} width={2.2} height={0.7}
            intensity={5 * brightness} color="#f1f5ff" />
        </group>
      )))}
    </group>
  )
}

/** Strips along the top of the back and side walls, plus one under the workbench shelf line. */
const NEON_STRIPS = [
  { pos: [0, H - 0.25, -D / 2 + 0.06], len: W - 1, rot: [0, 0, 0] },
  { pos: [-W / 2 + 0.06, H - 0.25, 0], len: D - 1, rot: [0, Math.PI / 2, 0] },
  { pos: [W / 2 - 0.06, H - 0.25, 0], len: D - 1, rot: [0, Math.PI / 2, 0] },
  { pos: [0, 0.12, -D / 2 + 0.06], len: W - 1, rot: [0, 0, 0] },
]

function NeonRig({ brightness, color }) {
  return (
    <group>
      {NEON_STRIPS.map((s, i) => (
        <group key={i}>
          <mesh position={s.pos} rotation={s.rot}>
            <boxGeometry args={[s.len, 0.04, 0.04]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={9 * brightness} toneMapped={false} />
          </mesh>
          <RectLight position={s.pos} lookAt={[0, s.pos[1] > 1 ? 0.5 : 0.8, 0]} width={s.len} height={0.25}
            intensity={6 * brightness} color={color} />
        </group>
      ))}
    </group>
  )
}

// ── Environment map for reflections ──────────────────────────────────────────
/**
 * Renders the garage's light sources into a small cube map once. Keyed on the
 * lighting config so it re-bakes only when the customiser changes something.
 */
function ReflectionMap({ garage }) {
  const { lights, neonColor, wallColor, brightness } = garage
  const key = JSON.stringify([lights, neonColor, wallColor, brightness])
  return (
    <Environment key={key} resolution={256} frames={1} environmentIntensity={0.9}>
      {/* Dim room-coloured surround so black paint isn't reflecting a void. */}
      <mesh scale={30}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color={new THREE.Color(wallColor).multiplyScalar(0.18 * brightness)} side={THREE.BackSide} />
      </mesh>
      {/* Always-on soft overhead so reflections exist even with every rig off. */}
      <Lightformer form="rect" intensity={0.6 * brightness} position={[0, H, 0]} rotation-x={Math.PI / 2} scale={[W * 0.6, D * 0.5, 1]} />

      {lights.spots && SPOTS.map((p, i) => (
        <Lightformer key={`s${i}`} form="circle" intensity={6 * brightness} position={p} rotation-x={Math.PI / 2} scale={0.5} />
      ))}
      {lights.panels && PANEL_ROWS.map((z) => CAR_XS.map((x) => (
        <Lightformer key={`p${x}${z}`} form="rect" intensity={3 * brightness} position={[x, H - 0.03, z]} rotation-x={Math.PI / 2} scale={[2.2, 0.7, 1]} />
      )))}
      {lights.neon && NEON_STRIPS.map((s, i) => (
        <Lightformer key={`n${i}`} form="rect" color={neonColor} intensity={5 * brightness} position={s.pos} rotation={s.rot} scale={[s.len, 0.08, 1]} />
      ))}
    </Environment>
  )
}
