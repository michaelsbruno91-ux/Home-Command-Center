// Procedural floor textures drawn on a <canvas> at runtime, so the garage ships
// without image assets. Swap for scanned PBR textures later by loading them
// with drei's useTexture in scene/GarageEnvironment.jsx.
import * as THREE from 'three'

const cache = new Map()

function rand(seed) {
  // Small deterministic PRNG (mulberry32) so textures look the same every load.
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function speckle(ctx, size, rnd, count, colors, minR, maxR) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)]
    const r = minR + rnd() * (maxR - minR)
    ctx.beginPath()
    ctx.ellipse(rnd() * size, rnd() * size, r, r * (0.4 + rnd() * 0.6), rnd() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
}

const DRAW = {
  // Mottled trowel marks + fine aggregate + faint saw-cut joints.
  concrete(ctx, s, rnd) {
    ctx.fillStyle = '#9d9a94'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 90; i++) {
      const x = rnd() * s, y = rnd() * s, r = 40 + rnd() * 160
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      const shade = rnd() > 0.5 ? '255,255,255' : '40,38,35'
      g.addColorStop(0, `rgba(${shade},${0.05 + rnd() * 0.06})`)
      g.addColorStop(1, `rgba(${shade},0)`)
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    speckle(ctx, s, rnd, 5000, ['rgba(60,58,55,0.35)', 'rgba(230,228,222,0.3)'], 0.4, 1.4)
    ctx.strokeStyle = 'rgba(45,43,40,0.55)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, s - 2, s - 2)
  },
  // Decorative vinyl chip broadcast over a grey base coat.
  flake(ctx, s, rnd) {
    ctx.fillStyle = '#7d828a'
    ctx.fillRect(0, 0, s, s)
    speckle(ctx, s, rnd, 16000, ['#2b2d31', '#e7e8ea', '#a7acb3', '#50545b', '#c9c1b1'], 0.8, 2.6)
  },
  gloss(ctx, s, rnd) {
    ctx.fillStyle = '#1d1e21'
    ctx.fillRect(0, 0, s, s)
    speckle(ctx, s, rnd, 1500, ['rgba(255,255,255,0.05)'], 0.5, 1.2)
  },
  checker(ctx, s, rnd) {
    const n = 4, t = s / n
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#141416' : '#e9e9e6'
        ctx.fillRect(x * t, y * t, t, t)
      }
    }
    speckle(ctx, s, rnd, 2500, ['rgba(128,128,128,0.12)'], 0.5, 1.5)
    ctx.strokeStyle = 'rgba(90,90,90,0.5)'
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(i * t, 0); ctx.lineTo(i * t, s); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * t); ctx.lineTo(s, i * t); ctx.stroke()
    }
  },
}

/** Returns a cached, tiling sRGB CanvasTexture for the given floor style. */
export function floorTexture(kind, repeat, size = 1024) {
  const key = `${kind}:${repeat}:${size}`
  if (cache.has(key)) return cache.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ;(DRAW[kind] ?? DRAW.concrete)(ctx, size, rand(kind.length * 7919))
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.anisotropy = 8
  cache.set(key, tex)
  return tex
}
