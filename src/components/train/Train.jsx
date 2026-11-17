import { useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../stores/useAppStore'
import { audioService } from '../../services/audioService'

// ---- Dimensions (scene units ≈ metres, scaled to the narrow Hanoi train street) ----
const BODY_WIDTH = 1.72
const BODY_BASE_Y = 0.74
const WHEEL_RADIUS = 0.24
const WHEEL_CENTER_Y = 0.42 // rail head sits at y≈0.18
const WHEEL_GAUGE = 0.525
const CARRIAGE_LENGTH = 6.4
const CARRIAGE_GAP = 0.36
const LOCO_LENGTH = 7.1
const CARRIAGE_COUNT = 4

const TRAIN_SPEED = 10
const START_Z = -58
const END_Z = 82
const SEATED_Z = 0.6
const PASS_DURATION = (END_Z - START_Z) / TRAIN_SPEED

const COLORS = {
  cream: '#ece4cf',
  blue: '#1d4c86',
  red: '#c3262b',
  roof: '#8a9099',
  under: '#1b1c1e',
  frame: '#2b2e33',
  steel: '#5a5f66',
  // D19E 'Đổi Mới' locomotive livery: silver cab, purple band, yellow stripe, blue skirt
  locoSilver: '#cfd4d8',
  locoPurple: '#6e3b8e',
  locoYellow: '#f2c230',
  locoBlue: '#2f63b4',
}

// ---------------------------------------------------------------- textures
const makeCanvasTexture = (width, height, draw) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

// Warm-lit interior with passenger silhouettes, seen through a window
const createWindowTexture = () =>
  makeCanvasTexture(128, 96, (ctx, w, h) => {
    const glow = ctx.createLinearGradient(0, 0, 0, h)
    glow.addColorStop(0, '#fff1cc')
    glow.addColorStop(0.55, '#f2b866')
    glow.addColorStop(1, '#7a4a22')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(40, 24, 14, 0.85)'
    ctx.fillRect(0, h * 0.62, w, h * 0.38)
    for (let i = 0; i < 3; i++) {
      if (Math.random() < 0.35) continue
      const x = 16 + i * 40 + Math.random() * 10
      ctx.beginPath()
      ctx.arc(x, h * 0.42, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(x - 14, h * 0.52, 28, h * 0.2)
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.beginPath()
    ctx.moveTo(w * 0.6, 0)
    ctx.lineTo(w * 0.78, 0)
    ctx.lineTo(w * 0.4, h)
    ctx.lineTo(w * 0.22, h)
    ctx.fill()
  })

// Yellow cab-front number plate
const createNumberPlateTexture = (number) =>
  makeCanvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f2c230'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#1b1c1e'
    ctx.lineWidth = 4
    ctx.strokeRect(3, 3, w - 6, h - 6)
    ctx.fillStyle = '#1b1c1e'
    ctx.font = 'bold 40px "Be Vietnam Pro", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(number, w / 2, h / 2 + 2)
  })

const createLetteringTexture = (title, number) =>
  makeCanvasTexture(1024, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#f4efe2'
    ctx.font = 'bold 34px "Be Vietnam Pro", Arial, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(title, 40, h / 2)
    ctx.textAlign = 'right'
    ctx.font = 'bold 36px "Be Vietnam Pro", Arial, sans-serif'
    ctx.fillText(number, w - 40, h / 2)
  })

// Glass that reflects a dusky sky, so the cab never reads as a black hole
const createWindscreenTexture = () =>
  makeCanvasTexture(128, 128, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#9db0c8')
    sky.addColorStop(0.5, '#3c4c62')
    sky.addColorStop(1, '#141c26')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath()
    ctx.moveTo(w * 0.15, 0)
    ctx.lineTo(w * 0.35, 0)
    ctx.lineTo(w * 0.1, h)
    ctx.lineTo(0, h)
    ctx.fill()
  })

const createGrilleTexture = () =>
  makeCanvasTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#2a2d31'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#121315'
    for (let y = 4; y < h; y += 8) ctx.fillRect(4, y, w - 8, 4)
  })

// ---------------------------------------------------------------- geometries
// Cross-section of a passenger car with a curved roof, extruded along Z
const createCarriageBodyGeometry = () => {
  const half = BODY_WIDTH / 2
  const wallHeight = 1.62
  const roofHeight = 1.9
  const shape = new THREE.Shape()
  shape.moveTo(-half, 0)
  shape.lineTo(half, 0)
  shape.lineTo(half, wallHeight)
  shape.quadraticCurveTo(half * 0.92, roofHeight, 0, roofHeight)
  shape.quadraticCurveTo(-half * 0.92, roofHeight, -half, wallHeight)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: CARRIAGE_LENGTH,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 18,
  })
  geometry.translate(0, 0, -CARRIAGE_LENGTH / 2)
  return geometry
}

// Side profile of the diesel locomotive (sloped nose + raked windscreen), extruded across X
const LOCO_PROFILE = [
  [-LOCO_LENGTH / 2, 0],
  [LOCO_LENGTH / 2, 0],
  [LOCO_LENGTH / 2, 0.82],
  [LOCO_LENGTH / 2 - 0.22, 1.22],
  [LOCO_LENGTH / 2 - 0.55, 1.32],
  [LOCO_LENGTH / 2 - 0.82, 1.92],
  [-LOCO_LENGTH / 2, 1.92],
]

const createLocoBodyGeometry = () => {
  const shape = new THREE.Shape(LOCO_PROFILE.map(([z, y]) => new THREE.Vector2(z, y)))
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: BODY_WIDTH,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  })
  geometry.translate(0, 0, -BODY_WIDTH / 2)
  geometry.rotateY(-Math.PI / 2)
  return geometry
}

const useTrainAssets = () =>
  useMemo(() => {
    const standard = (color, roughness = 0.55, metalness = 0.15) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness })

    const windowTexture = createWindowTexture()
    const windscreenTexture = createWindscreenTexture()
    return {
      geometries: {
        carriageBody: createCarriageBodyGeometry(),
        locoBody: createLocoBodyGeometry(),
        wheel: new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.07, 24),
        wheelHub: new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12),
        axle: new THREE.CylinderGeometry(0.035, 0.035, WHEEL_GAUGE * 2 + 0.1, 8),
        spring: new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10),
        box: new THREE.BoxGeometry(1, 1, 1),
        plane: new THREE.PlaneGeometry(1, 1),
        lamp: new THREE.CircleGeometry(1, 20),
        handrail: new THREE.CylinderGeometry(0.012, 0.012, 1, 6),
      },
      materials: {
        cream: standard(COLORS.cream, 0.45, 0.1),
        blue: standard(COLORS.blue, 0.4, 0.2),
        red: standard(COLORS.red, 0.45, 0.15),
        roof: standard(COLORS.roof, 0.6, 0.35),
        under: standard(COLORS.under, 0.85, 0.3),
        frame: standard(COLORS.frame, 0.5, 0.6),
        steel: standard(COLORS.steel, 0.3, 0.85),
        wheel: standard('#3a3c40', 0.35, 0.9),
        rubber: standard('#151515', 0.95, 0),
        bellows: standard('#232323', 0.95, 0),
        windowGlow: new THREE.MeshStandardMaterial({
          map: windowTexture,
          emissive: '#ffb45e',
          emissiveMap: windowTexture,
          emissiveIntensity: 1.3,
          roughness: 0.15,
        }),
        windscreen: new THREE.MeshStandardMaterial({
          map: windscreenTexture,
          emissive: '#9fb4cc',
          emissiveMap: windscreenTexture,
          emissiveIntensity: 0.25,
          roughness: 0.1,
          metalness: 0.2,
        }),
        headlight: new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff8e0').multiplyScalar(6) }),
        marker: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3b2e').multiplyScalar(3) }),
        grille: new THREE.MeshStandardMaterial({ map: createGrilleTexture(), roughness: 0.7 }),
        locoSilver: standard(COLORS.locoSilver, 0.32, 0.45),
        locoPurple: standard(COLORS.locoPurple, 0.4, 0.2),
        locoYellow: standard(COLORS.locoYellow, 0.45, 0.1),
        locoBlue: standard(COLORS.locoBlue, 0.4, 0.2),
        numberPlate: new THREE.MeshStandardMaterial({ map: createNumberPlateTexture('D19E-935'), roughness: 0.5 }),
      },
    }
  }, [])

// Small helper: a box from the shared unit geometry
function Block({ assets, material, size, position, rotation }) {
  return (
    <mesh
      geometry={assets.geometries.box}
      material={assets.materials[material] ?? material}
      scale={size}
      position={position}
      rotation={rotation}
      castShadow
    />
  )
}

// ---------------------------------------------------------------- running gear
function Bogie({ assets, position, axleCount = 2, axleSpacing = 1.0 }) {
  const { geometries, materials } = assets
  const axleOffsets = Array.from(
    { length: axleCount },
    (_, i) => (i - (axleCount - 1) / 2) * axleSpacing
  )
  const frameLength = axleSpacing * (axleCount - 1) + 0.7

  return (
    <group position={position}>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            assets={assets}
            material="frame"
            size={[0.08, 0.2, frameLength]}
            position={[side * (WHEEL_GAUGE + 0.12), WHEEL_CENTER_Y + 0.02, 0]}
          />
          {axleOffsets.map((z) => (
            <mesh
              key={z}
              geometry={geometries.spring}
              material={materials.steel}
              position={[side * (WHEEL_GAUGE + 0.12), WHEEL_CENTER_Y + 0.2, z * 0.5]}
            />
          ))}
        </group>
      ))}
      <Block assets={assets} material="frame" size={[1.2, 0.12, 0.3]} position={[0, WHEEL_CENTER_Y + 0.1, 0]} />

      {axleOffsets.map((z) => (
        <group key={z} name="axle" position={[0, WHEEL_CENTER_Y, z]}>
          <mesh geometry={geometries.axle} material={materials.steel} rotation={[0, 0, Math.PI / 2]} />
          {[-1, 1].map((side) => (
            <group key={side} position={[side * WHEEL_GAUGE, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <mesh geometry={geometries.wheel} material={materials.wheel} castShadow />
              <mesh geometry={geometries.wheelHub} material={materials.steel} />
              {/* spoke marker so rotation reads visually */}
              <mesh
                geometry={geometries.box}
                material={materials.steel}
                scale={[0.03, 0.09, WHEEL_RADIUS * 1.6]}
              />
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}

function Coupler({ assets, z }) {
  return (
    <group position={[0, BODY_BASE_Y - 0.08, z]}>
      <Block assets={assets} material="frame" size={[0.16, 0.14, 0.32]} />
      <Block assets={assets} material="steel" size={[0.24, 0.18, 0.06]} position={[0, 0, Math.sign(z) * 0.16]} />
    </group>
  )
}

// ---------------------------------------------------------------- passenger car
const WINDOW_SLOTS = [-2.25, -1.45, -0.65, 0.15, 0.95, 1.75]

function PassengerCarriage({ assets, position, carNumber }) {
  const { geometries, materials } = assets
  const lettering = useMemo(
    () => createLetteringTexture('ĐƯỜNG SẮT VIỆT NAM', `SE7 · ${String(carNumber).padStart(2, '0')}`),
    [carNumber]
  )
  const halfLength = CARRIAGE_LENGTH / 2
  const sideX = BODY_WIDTH / 2 + 0.035

  return (
    <group position={position}>
      <mesh
        geometry={geometries.carriageBody}
        material={materials.cream}
        position={[0, BODY_BASE_Y, 0]}
        castShadow
        receiveShadow
      />
      {/* roof cap with ventilators */}
      <Block assets={assets} material="roof" size={[1.1, 0.06, CARRIAGE_LENGTH - 0.3]} position={[0, BODY_BASE_Y + 1.93, 0]} />
      {[-2, 0, 2].map((z) => (
        <Block key={z} assets={assets} material="roof" size={[0.5, 0.12, 0.45]} position={[0, BODY_BASE_Y + 2.0, z]} />
      ))}

      {[-1, 1].map((side) => (
        <group key={side} position={[side * sideX, 0, 0]} rotation={[0, side * (Math.PI / 2), 0]}>
          {/* blue skirt band + red pinstripe + lettering */}
          <mesh
            geometry={geometries.plane}
            material={materials.blue}
            scale={[CARRIAGE_LENGTH, 0.5, 1]}
            position={[0, BODY_BASE_Y + 0.27, 0]}
          />
          <mesh
            geometry={geometries.plane}
            material={materials.red}
            scale={[CARRIAGE_LENGTH, 0.06, 1]}
            position={[0, BODY_BASE_Y + 0.56, 0.001]}
          />
          <mesh geometry={geometries.plane} scale={[CARRIAGE_LENGTH * 0.9, 0.24, 1]} position={[0, BODY_BASE_Y + 0.27, 0.002]}>
            <meshBasicMaterial map={lettering} transparent toneMapped={false} />
          </mesh>
          <mesh
            geometry={geometries.plane}
            material={materials.blue}
            scale={[CARRIAGE_LENGTH, 0.05, 1]}
            position={[0, BODY_BASE_Y + 1.46, 0]}
          />

          {/* windows (side is mirrored, so flip X for the right side) */}
          {WINDOW_SLOTS.map((slot) => (
            <group key={slot} position={[slot * side, BODY_BASE_Y + 1.06, 0]}>
              <mesh geometry={geometries.plane} material={materials.frame} scale={[0.66, 0.56, 1]} position={[0, 0, 0.002]} />
              <mesh geometry={geometries.plane} material={materials.windowGlow} scale={[0.58, 0.48, 1]} position={[0, 0, 0.004]} />
              <mesh geometry={geometries.plane} material={materials.frame} scale={[0.58, 0.03, 1]} position={[0, 0.1, 0.006]} />
            </group>
          ))}

          {/* doors at both ends */}
          {[-1, 1].map((end) => (
            <group key={end} position={[end * (halfLength - 0.42), 0, 0]}>
              <mesh geometry={geometries.plane} material={materials.blue} scale={[0.6, 1.3, 1]} position={[0, BODY_BASE_Y + 0.82, 0.003]} />
              <mesh geometry={geometries.plane} material={materials.windowGlow} scale={[0.32, 0.36, 1]} position={[0, BODY_BASE_Y + 1.14, 0.005]} />
              <mesh
                geometry={geometries.handrail}
                material={materials.steel}
                scale={[1, 0.9, 1]}
                position={[0.36, BODY_BASE_Y + 0.75, 0.05]}
              />
              {/* boarding steps */}
              <Block assets={assets} material="frame" size={[0.5, 0.04, 0.2]} position={[0, BODY_BASE_Y - 0.18, 0.06]} />
              <Block assets={assets} material="frame" size={[0.5, 0.04, 0.2]} position={[0, BODY_BASE_Y - 0.4, 0.06]} />
            </group>
          ))}
        </group>
      ))}

      {/* end walls with gangway bellows */}
      {[-1, 1].map((end) => (
        <group key={end} position={[0, BODY_BASE_Y, end * (halfLength + 0.05)]}>
          <Block assets={assets} material="bellows" size={[1.0, 1.75, 0.22]} position={[0, 0.98, end * 0.08]} />
          {[0.3, 0.6, 0.9, 1.2, 1.5].map((y) => (
            <Block key={y} assets={assets} material="under" size={[1.04, 0.04, 0.24]} position={[0, y + 0.1, end * 0.08]} />
          ))}
          <mesh geometry={geometries.lamp} material={materials.marker} scale={0.04} position={[0.62, 0.35, end * 0.02]} rotation={[0, end > 0 ? 0 : Math.PI, 0]} />
        </group>
      ))}

      {/* underframe & equipment */}
      <Block assets={assets} material="under" size={[BODY_WIDTH - 0.12, 0.14, CARRIAGE_LENGTH - 0.2]} position={[0, BODY_BASE_Y - 0.07, 0]} />
      <Block assets={assets} material="under" size={[1.1, 0.3, 1.6]} position={[0, BODY_BASE_Y - 0.28, 0]} />
      <Block assets={assets} material="frame" size={[0.4, 0.22, 0.7]} position={[0.5, BODY_BASE_Y - 0.25, -1.0]} />

      <Bogie assets={assets} position={[0, 0, -2.25]} />
      <Bogie assets={assets} position={[0, 0, 2.25]} />
      <Coupler assets={assets} z={-halfLength - 0.05} />
      <Coupler assets={assets} z={halfLength + 0.05} />
    </group>
  )
}

// ---------------------------------------------------------------- locomotive
function Headlight({ assets, position, size = 0.09 }) {
  return (
    <group position={position}>
      <mesh geometry={assets.geometries.lamp} material={assets.materials.frame} scale={size * 1.45} position={[0, 0, -0.002]} />
      <mesh geometry={assets.geometries.lamp} material={assets.materials.headlight} scale={size} />
    </group>
  )
}

// Side panels are rotated ±90°, so map a world Z (along the loco) to the panel-local X
const LOCO_SIDE_OFFSET_Z = -0.35
const alongLoco = (worldZ, side) => -(worldZ - LOCO_SIDE_OFFSET_Z) * side

function Locomotive({ assets, position }) {
  const { geometries, materials } = assets
  const spotRef = useRef()
  const spotTargetRef = useRef()
  const lettering = useMemo(() => createLetteringTexture('ĐƯỜNG SẮT VIỆT NAM', 'D19E-935'), [])
  const half = LOCO_LENGTH / 2
  const noseZ = half + 0.03
  const sideX = BODY_WIDTH / 2 + 0.035

  useLayoutEffect(() => {
    if (spotRef.current && spotTargetRef.current) spotRef.current.target = spotTargetRef.current
  }, [])

  // windscreen pane sits on the sloped segment between profile points 4 and 5
  const [glassBottom, glassTop] = [LOCO_PROFILE[4], LOCO_PROFILE[5]]
  const glassCenterZ = (glassBottom[0] + glassTop[0]) / 2 + 0.035
  const glassCenterY = BODY_BASE_Y + (glassBottom[1] + glassTop[1]) / 2 + 0.01
  const glassTilt = -Math.atan2(glassBottom[0] - glassTop[0], glassTop[1] - glassBottom[1])
  const glassHeight = Math.hypot(glassBottom[0] - glassTop[0], glassTop[1] - glassBottom[1]) - 0.1

  return (
    <group position={position}>
      <mesh geometry={geometries.locoBody} material={materials.locoSilver} position={[0, BODY_BASE_Y, 0]} castShadow receiveShadow />

      {/* blue skirt, yellow stripe and purple band along both sides */}
      {[-1, 1].map((side) => (
        <group key={`band${side}`} position={[side * sideX, 0, 0]} rotation={[0, side * (Math.PI / 2), 0]}>
          <mesh geometry={geometries.plane} material={materials.locoBlue} scale={[LOCO_LENGTH - 0.02, 0.62, 1]} position={[0, BODY_BASE_Y + 0.31, 0]} />
          <mesh geometry={geometries.plane} material={materials.locoYellow} scale={[LOCO_LENGTH - 0.02, 0.08, 1]} position={[0, BODY_BASE_Y + 0.66, 0.001]} />
          <mesh geometry={geometries.plane} material={materials.locoPurple} scale={[LOCO_LENGTH - 0.02, 0.2, 1]} position={[0, BODY_BASE_Y + 0.8, 0.001]} />
        </group>
      ))}

      {/* side details, stopping before the nose slope */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * sideX, 0, LOCO_SIDE_OFFSET_Z]} rotation={[0, side * (Math.PI / 2), 0]}>
          <mesh geometry={geometries.plane} scale={[3.9, 0.15, 1]} position={[alongLoco(-0.9, side), BODY_BASE_Y + 0.38, 0.003]}>
            <meshBasicMaterial map={lettering} transparent toneMapped={false} />
          </mesh>
          {/* engine-room louvres */}
          {[-2.0, -1.2, -0.4].map((z) => (
            <mesh key={z} geometry={geometries.plane} material={materials.grille} scale={[0.62, 0.36, 1]} position={[alongLoco(z, side), BODY_BASE_Y + 1.18, 0.003]} />
          ))}
          {/* cab side window + door */}
          <mesh geometry={geometries.plane} material={materials.windscreen} scale={[0.5, 0.42, 1]} position={[alongLoco(2.3, side), BODY_BASE_Y + 1.42, 0.004]} />
          <mesh geometry={geometries.plane} material={materials.frame} scale={[0.5, 1.1, 1]} position={[alongLoco(1.7, side), BODY_BASE_Y + 0.85, 0.003]} />
          <mesh geometry={geometries.handrail} material={materials.steel} scale={[1, LOCO_LENGTH - 2, 1]} rotation={[0, 0, Math.PI / 2]} position={[alongLoco(-0.6, side), BODY_BASE_Y + 0.98, 0.07]} />
        </group>
      ))}

      {/* raked windscreen with centre pillar + wipers */}
      <group position={[0, glassCenterY, glassCenterZ]} rotation={[glassTilt, 0, 0]}>
        <mesh geometry={geometries.plane} material={materials.windscreen} scale={[BODY_WIDTH - 0.3, glassHeight, 1]} />
        <mesh geometry={geometries.plane} material={materials.frame} scale={[0.06, glassHeight, 1]} position={[0, 0, 0.002]} />
        {[-0.38, 0.38].map((x) => (
          <mesh key={x} geometry={geometries.plane} material={materials.frame} scale={[0.02, glassHeight * 0.7, 1]} position={[x, -0.05, 0.003]} rotation={[0, 0, 0.5]} />
        ))}
      </group>

      {/* nose: blue skirt, yellow stripe, purple band carrying the lamps and number plate */}
      <mesh geometry={geometries.plane} material={materials.locoBlue} scale={[BODY_WIDTH, 0.3, 1]} position={[0, BODY_BASE_Y + 0.15, noseZ]} />
      <mesh geometry={geometries.plane} material={materials.locoYellow} scale={[BODY_WIDTH, 0.07, 1]} position={[0, BODY_BASE_Y + 0.335, noseZ]} />
      <mesh geometry={geometries.plane} material={materials.locoPurple} scale={[BODY_WIDTH, 0.32, 1]} position={[0, BODY_BASE_Y + 0.53, noseZ]} />
      <mesh geometry={geometries.plane} material={materials.numberPlate} scale={[0.56, 0.14, 1]} position={[0, BODY_BASE_Y + 0.52, noseZ + 0.002]} />
      <Headlight assets={assets} position={[-0.6, BODY_BASE_Y + 0.53, noseZ + 0.002]} />
      <Headlight assets={assets} position={[0.6, BODY_BASE_Y + 0.53, noseZ + 0.002]} />
      <mesh geometry={geometries.lamp} material={materials.marker} scale={0.035} position={[-0.72, BODY_BASE_Y + 0.62, noseZ + 0.003]} />
      <mesh geometry={geometries.lamp} material={materials.marker} scale={0.035} position={[0.72, BODY_BASE_Y + 0.62, noseZ + 0.003]} />
      <Headlight assets={assets} position={[0, BODY_BASE_Y + 1.98, half - 0.84]} size={0.11} />

      {/* cowcatcher / pilot */}
      <Block assets={assets} material="under" size={[1.5, 0.3, 0.3]} position={[0, BODY_BASE_Y - 0.28, half + 0.05]} rotation={[-0.35, 0, 0]} />
      <Coupler assets={assets} z={-half - 0.05} />

      {/* roof: fans, horns, exhaust */}
      <Block assets={assets} material="roof" size={[1.4, 0.08, LOCO_LENGTH - 1.2]} position={[0, BODY_BASE_Y + 1.96, -0.6]} />
      {[-2.4, -1.4, -0.4].map((z) => (
        <group key={z} position={[0, BODY_BASE_Y + 2.03, z]}>
          <mesh geometry={geometries.wheel} material={materials.frame} scale={[1.45, 0.5, 1.45]} />
          <mesh geometry={geometries.box} material={materials.grille} scale={[0.6, 0.02, 0.6]} position={[0, 0.03, 0]} />
        </group>
      ))}
      <Block assets={assets} material="under" size={[0.22, 0.25, 0.32]} position={[0, BODY_BASE_Y + 2.1, 0.6]} />
      {[-0.18, 0.18].map((x) => (
        <mesh key={x} geometry={geometries.handrail} material={materials.steel} scale={[3, 0.32, 3]} position={[x, BODY_BASE_Y + 2.05, 2.1]} rotation={[Math.PI / 2, 0, 0]} />
      ))}

      {/* underframe & fuel tank */}
      <Block assets={assets} material="under" size={[BODY_WIDTH - 0.1, 0.16, LOCO_LENGTH - 0.3]} position={[0, BODY_BASE_Y - 0.08, 0]} />
      <Block assets={assets} material="frame" size={[1.3, 0.38, 2.0]} position={[0, BODY_BASE_Y - 0.32, 0]} />

      <Bogie assets={assets} position={[0, 0, -2.3]} axleCount={3} axleSpacing={0.62} />
      <Bogie assets={assets} position={[0, 0, 2.3]} axleCount={3} axleSpacing={0.62} />

      <spotLight
        ref={spotRef}
        position={[0, BODY_BASE_Y + 0.4, half + 0.3]}
        color="#fff3d6"
        intensity={60}
        distance={34}
        angle={0.42}
        penumbra={0.75}
        decay={1.6}
      />
      <object3D ref={spotTargetRef} position={[0, 0, half + 18]} />
      <pointLight position={[0, BODY_BASE_Y + 0.4, half + 0.6]} color="#ffe9b8" intensity={3} distance={4} />
    </group>
  )
}

// ---------------------------------------------------------------- consist
const carriageOffsets = Array.from(
  { length: CARRIAGE_COUNT },
  (_, i) => -(LOCO_LENGTH / 2 + CARRIAGE_GAP + CARRIAGE_LENGTH / 2 + i * (CARRIAGE_LENGTH + CARRIAGE_GAP))
)
const TRAIN_REAR_OFFSET = carriageOffsets[CARRIAGE_COUNT - 1] - CARRIAGE_LENGTH / 2

export function Train() {
  const trainRef = useRef()
  const axlesRef = useRef([])
  const assets = useTrainAssets()

  const isTrainApproaching = useAppStore((state) => state.isTrainApproaching)
  const isTrainPassing = useAppStore((state) => state.isTrainPassing)
  const updateTrainProgress = useAppStore((state) => state.updateTrainProgress)
  const finishTrainPass = useAppStore((state) => state.finishTrainPass)

  // Trains are dispatched by the timetable (ui/TrainScheduler) or manually
  const trainZ = useRef(START_Z)

  useEffect(() => {
    if (!isTrainApproaching || isTrainPassing) return
    audioService.playWarningBell(9, 420)
    audioService.playTrainHorn(0.8)
    const hornTimer = setTimeout(() => audioService.playTrainHorn(0.2), 3200)
    return () => clearTimeout(hornTimer)
  }, [isTrainApproaching, isTrainPassing])

  useEffect(() => {
    if (!isTrainPassing) return
    trainZ.current = START_Z
    audioService.startTrainPassAudio(PASS_DURATION * 0.85)
  }, [isTrainPassing])

  useLayoutEffect(() => {
    if (!isTrainPassing || !trainRef.current) return
    const axles = []
    trainRef.current.traverse((child) => child.name === 'axle' && axles.push(child))
    axlesRef.current = axles
  }, [isTrainPassing])

  useFrame((_, rawDelta) => {
    if (!isTrainPassing || !trainRef.current) return
    const delta = Math.min(rawDelta, 0.05)

    trainZ.current += TRAIN_SPEED * delta
    trainRef.current.position.z = trainZ.current

    const wheelSpin = (TRAIN_SPEED * delta) / WHEEL_RADIUS
    for (const axle of axlesRef.current) axle.rotation.x += wheelSpin

    // Shake is strongest while any part of the train is beside the seat
    const front = trainZ.current + LOCO_LENGTH / 2
    const rear = trainZ.current + TRAIN_REAR_OFFSET
    const distance = SEATED_Z > front ? SEATED_Z - front : SEATED_Z < rear ? rear - SEATED_Z : 0
    const shakeIntensity = Math.max(0, 1 - distance / 14)

    const progress = THREE.MathUtils.clamp((trainZ.current - START_Z) / (END_Z - START_Z), 0, 1)
    updateTrainProgress(progress, shakeIntensity)

    if (trainZ.current > END_Z) finishTrainPass()
  })

  if (!isTrainPassing) return null

  return (
    <group ref={trainRef} position={[0, 0, START_Z]}>
      <Locomotive assets={assets} position={[0, 0, 0]} />
      {carriageOffsets.map((z, i) => (
        <PassengerCarriage key={z} assets={assets} position={[0, 0, z]} carNumber={i + 3} />
      ))}
    </group>
  )
}
