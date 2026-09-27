// ─────────────────────────────────────────────────────────────────────────────
// GARAGE CANVAS — renderer setup and the post-processing stack.
//
// Pipeline (quality 'high'):
//   scene (PBR, soft shadow maps, env-map reflections, reflective floor)
//   → N8AO ambient occlusion → Bloom (only HDR emissives > 1: lamps, neon)
//   → ACES Filmic tone mapping → sRGB output
// Quality 'low' skips the post stack and floor reflections and lets the
// renderer tone-map directly, for phones and integrated GPUs.
//
// frameloop="demand": nothing renders while nothing changes. Every animation
// in the garage calls invalidate() until it settles, so an idle garage costs
// ~0% GPU instead of a constant 60 fps.
// ─────────────────────────────────────────────────────────────────────────────
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useGarageStore } from '../state/useGarageStore'
import { VEHICLES } from '../config/vehicles'
import GarageEnvironment from './GarageEnvironment'
import Vehicle from './Vehicle'
import CameraRig, { OVERVIEW } from './CameraRig'

export default function GarageCanvas() {
  const quality = useGarageStore((s) => s.garage.quality)
  const high = quality === 'high'

  return (
    <Canvas
      // Some renderer options (antialias, tone mapping) are creation-time only,
      // so switching quality rebuilds the canvas.
      key={quality}
      frameloop="demand"
      shadows="soft"
      dpr={high ? [1, 2] : [1, 1.25]}
      // flat = no renderer tone mapping; the post stack applies ACES instead.
      // In low quality R3F's default (ACES on the renderer) is used.
      flat={high}
      camera={{ position: OVERVIEW.position.toArray(), fov: 42, near: 0.05, far: 80 }}
      gl={{
        antialias: !high, // MSAA comes from the composer in high quality
        powerPreference: 'high-performance',
      }}
      // Clear hover when the pointer leaves the canvas entirely.
      onPointerLeave={() => useGarageStore.getState().setHovered(null)}
    >
      <color attach="background" args={['#0b0d12']} />
      <Suspense fallback={null}>
        <GarageEnvironment />
        {VEHICLES.map((v) => <Vehicle key={v.id} config={v} />)}
      </Suspense>
      <CameraRig />

      {high && (
        <EffectComposer multisampling={4}>
          <N8AO aoRadius={0.8} distanceFalloff={0.6} intensity={2.2} aoSamples={16} denoiseSamples={8} halfRes />
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.6} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
