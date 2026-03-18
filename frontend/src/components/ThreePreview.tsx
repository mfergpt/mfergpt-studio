import * as THREE from 'three'
import {
  useRef, useEffect, useState, forwardRef, useImperativeHandle, Suspense, lazy,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, useGLTF, Environment } from '@react-three/drei'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import { TRAIT_MESH_MAPPING } from './traitMeshMapping'

const BG_COLORS: Record<string, string> = {
  red: '#ff7277', green: '#b7ff6c', yellow: '#ffe25e', orange: '#feb66e',
  blue: '#5cd3ff', turquoise: '#4487a3', purple: '#e175ff',
  tree: '#ffe25f', space: '#898989', graveyard: '#7c7c7c',
}

const GLB_URL =
  'https://sfo3.digitaloceanspaces.com/cybermfers/cybermfers/builders/mfermashup.glb'

// ---------------------------------------------------------------------------
// Map creator category keys → TRAIT_MESH_MAPPING category keys
// ---------------------------------------------------------------------------
const CATEGORY_3D_MAP: Record<string, string> = {
  hat_over: 'hat_over_headphones',
  hat_under: 'hat_under_headphones',
}

function get3DCategory(creatorKey: string): string {
  return CATEGORY_3D_MAP[creatorKey] || creatorKey
}

// ---------------------------------------------------------------------------
// Convert creator trait filenames (e.g. "plain mfer.png") → 3D short IDs
// ---------------------------------------------------------------------------
export function filenameToTraitId(
  category: string,
  filename: string,
): string | null {
  if (!filename || filename === 'none') return null

  const raw = filename.replace(/\.png$/i, '').trim()
  const lower = raw.toLowerCase()

  const meshCat = get3DCategory(category)
  const validIds = TRAIT_MESH_MAPPING[meshCat]
  if (!validIds) return null

  // Helper: check if candidate exists in valid IDs
  const has = (id: string) => id in validIds

  // Category-specific normalization
  let candidate: string

  switch (category) {
    case 'type':
      // "plain mfer" → "plain", "based $mfer" → "based"
      candidate = lower.replace(/\s*\$?mfer$/, '').replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'headphones':
      // "black headphones" → "black", "black square headphones" → "black_square"
      candidate = lower.replace(/\s*headphones$/, '').replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'eyes':
      // Handle specific names first
      if (lower.includes('eye patch') || lower === 'eyepatch') return has('eyepatch') ? 'eyepatch' : null
      if (lower.includes('eye mask')) return has('eye_mask') ? 'eye_mask' : null
      if (lower.includes('purple shades') || lower.includes('purple_shades')) return has('purple_shades') ? 'purple_shades' : null
      if (lower.includes('trippy')) return has('trippy') ? 'trippy' : null
      if (lower.includes('matrix')) return has('matrix') ? 'matrix' : null
      if (lower.includes('3d')) return has('3d') ? '3d' : null
      if (lower.includes('nerd')) return has('nerd') ? 'nerd' : null
      if (lower.includes('vr')) return has('vr') ? 'vr' : null
      // "regular eyes" → "regular", "shades" → "shades"
      candidate = lower.replace(/\s*eyes$/, '').replace(/\s*glasses$/, '').replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'hat_over':
      // "cowboy hat" → "cowboy", "top hat" → "top", "pilot helmet" → "pilot"
      // "hoodie gray" → "hoodie_gray", "larva mfer" → "larva_mfer"
      candidate = lower
        .replace(/\s*hat$/, '')
        .replace(/\s*helmet$/, '')
        .replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'hat_under':
      // "bandana blue" → "bandana_blue", "cap black" → "cap_black"
      candidate = lower.replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      // Try with hyphens → underscores too (e.g. "headband blue-green")
      candidate = lower.replace(/[-\s]+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'long_hair':
      // "long hair black" → "long_black", "long hair curly" → "long_curly"
      candidate = lower.replace(/^long\s+hair\s+/, 'long_').replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'shirt':
      // "collared shirt white" → "collared_white"
      // "hoodie down red" → "hoodie_down_red"
      candidate = lower
        .replace(/^collared\s+shirt\s+/, 'collared_')
        .replace(/^hoodie\s+down\s+/, 'hoodie_down_')
        .replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'chain':
      // "gold chain" → "gold", "silver chain" → "silver"
      candidate = lower.replace(/\s*chain$/, '').replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'watch':
      // "argo black" → "argo_black", "sub lantern (green)" → "sub_lantern_green"
      candidate = lower.replace(/[()]/g, '').replace(/[-\s]+/g, '_').replace(/_+/g, '_').replace(/_$/, '')
      if (has(candidate)) return candidate
      // "sub cola (blue-red)" → try just "sub_cola"
      candidate = lower.replace(/\s*\(.*\)/, '').replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'beard':
      // "full beard" → "full", "shadow" → "flat"
      if (lower === 'shadow') return has('flat') ? 'flat' : null
      candidate = lower.replace(/\s*beard$/, '').replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'smoke':
      // "cig black" → "cig_black", "pipe" → "pipe"
      candidate = lower.replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'mouth':
      // "smile" → "smile", "flat" → "flat"
      candidate = lower.replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break

    case 'short_hair':
      // "messy black" → "messy_black", "mohawk green" → "mohawk_green"
      candidate = lower.replace(/\s+/g, '_')
      if (has(candidate)) return candidate
      break
  }

  // Fallback: generic normalization
  candidate = lower.replace(/[-\s]+/g, '_').replace(/[^a-z0-9_]/g, '')
  if (has(candidate)) return candidate

  // Last resort: try partial match (longest match wins)
  const keys = Object.keys(validIds).sort((a, b) => b.length - a.length)
  for (const id of keys) {
    if (candidate.includes(id) || id.includes(candidate)) return id
  }

  return null
}

// ---------------------------------------------------------------------------
// Convert creator traits Record → 3D traits Record (short IDs)
// ---------------------------------------------------------------------------
export function mapTraitsTo3D(
  creatorTraits: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [category, filename] of Object.entries(creatorTraits)) {
    if (category === 'background') {
      if (filename && filename !== 'none') result['background'] = filename
      continue
    }
    const id = filenameToTraitId(category, filename)
    if (id) {
      const meshCat = get3DCategory(category)
      result[meshCat] = id
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Type-specific mouth/eye helpers (from avatar-maker)
// ---------------------------------------------------------------------------
function getTypeMouth(mouthMesh: string, bodyType: string): string {
  if (bodyType === 'metal') return `${mouthMesh}_metal`
  if (bodyType === 'based') return `${mouthMesh}_mfercoin`
  return mouthMesh
}

function getTypeEyes(_eyesType: string, bodyType: string): string {
  const baseEyeTypes = ['eyes_normal', 'eyes_metal', 'eyes_mfercoin', 'eyes_alien', 'eyes_red']
  if (baseEyeTypes.includes(_eyesType)) return _eyesType

  if (bodyType === 'metal') return 'eyes_metal'
  if (bodyType === 'based') return 'eyes_mfercoin'
  if (bodyType === 'zombie') return 'eyes_zombie'
  if (bodyType === 'alien') return 'eyes_alien'
  return 'eyes_normal'
}

// ---------------------------------------------------------------------------
// Inner scene component (runs inside Canvas)
// ---------------------------------------------------------------------------
interface SceneProps {
  traits3D: Record<string, string>
  sceneRef: React.MutableRefObject<THREE.Object3D | null>
  onLoaded: () => void
}

function MferModel({ traits3D, sceneRef, onLoaded }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(GLB_URL)
  const animRef = useRef<{ mixer: THREE.AnimationMixer; action: THREE.AnimationAction } | null>(null)

  useEffect(() => {
    if (!scene || !groupRef.current) return

    const cloned = SkeletonUtils.clone(scene)
    sceneRef.current = cloned
    groupRef.current.add(cloned)

    if (animations?.length) {
      const mixer = new THREE.AnimationMixer(cloned)
      const action = mixer.clipAction(animations[0].clone())
      action.play()
      animRef.current = { mixer, action }
    }

    updateVisibility(cloned, traits3D)
    onLoaded()

    return () => {
      if (animRef.current) {
        animRef.current.action.stop()
        animRef.current.mixer.stopAllAction()
        animRef.current.mixer.uncacheRoot(cloned)
      }
      if (groupRef.current) {
        while (groupRef.current.children.length > 0) {
          const child = groupRef.current.children[0]
          groupRef.current.remove(child)
        }
      }
    }
  }, [scene, animations])

  useEffect(() => {
    if (sceneRef.current) updateVisibility(sceneRef.current, traits3D)
  }, [traits3D])

  useFrame((_, delta) => {
    animRef.current?.mixer.update(delta)
  })

  return <group ref={groupRef} />
}

function updateVisibility(root: THREE.Object3D, traits3D: Record<string, string>) {
  // Hide everything first
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) obj.visible = false
  })

  const meshesToShow = new Set<string>()

  for (const [traitType, traitId] of Object.entries(traits3D)) {
    const mapping = TRAIT_MESH_MAPPING[traitType]
    if (!mapping) continue
    let meshNames = mapping[traitId]
    if (!meshNames) continue

    // Mouth: type-specific variants
    if (traitType === 'mouth') {
      const bodyType = traits3D.type
      meshNames = meshNames.map((name) =>
        name.startsWith('mouth_') ? getTypeMouth(name, bodyType) : name,
      )
    }

    // Eyes: type-specific base eyes
    if (traitType === 'eyes') {
      const bodyType = traits3D.type
      const resolved: string[] = []
      const selectedEyeType = traitId ? `eyes_${traitId}` : 'eyes_normal'
      resolved.push(getTypeEyes(selectedEyeType, bodyType))
      for (const name of meshNames) {
        if (
          !name.includes('eyes_normal') &&
          !name.includes('eyes_metal') &&
          !name.includes('eyes_mfercoin') &&
          !name.includes('eyes_zombie') &&
          !name.includes('eyes_alien') &&
          !name.includes('eyes_red')
        ) {
          resolved.push(name)
        }
      }
      meshNames = resolved
    }

    for (const m of meshNames) meshesToShow.add(m)
  }

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.visible = meshesToShow.has(obj.name)
    }
  })
}

// ---------------------------------------------------------------------------
// Loading indicator (inside Canvas)
// ---------------------------------------------------------------------------
function Loader() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 2
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="#00ff41" wireframe />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Scene wrapper (lights, camera, controls)
// ---------------------------------------------------------------------------
const SceneContent = forwardRef<
  { exportGlb: () => Promise<ArrayBuffer | null>; captureScreenshot: () => string | null },
  { traits3D: Record<string, string> }
>(({ traits3D }, ref) => {
  const sceneRef = useRef<THREE.Object3D | null>(null)
  const [loaded, setLoaded] = useState(false)
  const { scene, camera, gl } = useThree()

  // Set scene background color from traits
  useEffect(() => {
    const bgKey = traits3D.background
    const color = BG_COLORS[bgKey]
    if (color) {
      scene.background = new THREE.Color(color)
    } else {
      scene.background = new THREE.Color('#111111')
    }
  }, [traits3D.background, scene])

  useImperativeHandle(ref, () => ({
    captureScreenshot: () => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    },
    exportGlb: async () => {
      if (!sceneRef.current) return null
      const visibleMeshes = new Set<string>()
      sceneRef.current.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh && obj.visible) visibleMeshes.add(obj.name)
      })

      // Load a fresh copy for export
      const { scene: exportScene } = await new Promise<{ scene: THREE.Object3D }>(
        (resolve, reject) => {
          const loader = new THREE.ObjectLoader()
          // Use GLTFLoader for proper export
          import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
            const gltfLoader = new GLTFLoader()
            gltfLoader.load(GLB_URL, (gltf) => resolve({ scene: gltf.scene }), undefined, reject)
          })
        },
      )

      exportScene.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          node.visible = visibleMeshes.has(node.name)
        }
      })

      const exporter = new GLTFExporter()
      return new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(
          exportScene,
          (result) => resolve(result as ArrayBuffer),
          (error) => reject(error),
          { binary: true, onlyVisible: true },
        )
      })
    },
  }))

  return (
    <>
      <PerspectiveCamera makeDefault position={[-0.5, 1.4, 2.0]} fov={35} />
      <OrbitControls
        enableZoom
        enablePan={false}
        minDistance={1.5}
        maxDistance={3.0}
        target={[0, 0.9, 0]}
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.5}
      />
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 2, 2]} intensity={0.8} />
      <directionalLight position={[-1.5, 1, -1]} intensity={0.4} color="#b4c7ff" />
      <spotLight position={[0, 2, -2.5]} intensity={0.35} angle={0.6} penumbra={1} />
      <pointLight position={[0, 0.5, 1.5]} intensity={0.2} distance={3} color="#b4c7ff" />
      <spotLight
        position={[0, 2.0, -1.5]}
        intensity={1.5}
        angle={Math.PI / 3}
        penumbra={0.8}
        distance={5}
        color="#00ff41"
      />
      <Environment preset="studio" />
      <Suspense fallback={<Loader />}>
        <MferModel traits3D={traits3D} sceneRef={sceneRef} onLoaded={() => setLoaded(true)} />
      </Suspense>
    </>
  )
})

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export interface ThreePreviewHandle {
  exportGlb: () => Promise<ArrayBuffer | null>
  captureScreenshot: () => string | null
}

interface ThreePreviewProps {
  traits: Record<string, string>
}

const ThreePreview = forwardRef<ThreePreviewHandle, ThreePreviewProps>(
  ({ traits }, ref) => {
    const innerRef = useRef<{ exportGlb: () => Promise<ArrayBuffer | null>; captureScreenshot: () => string | null }>(null)
    const [loading, setLoading] = useState(true)
    const traits3D = mapTraitsTo3D(traits)

    useImperativeHandle(ref, () => ({
      exportGlb: async () => {
        return innerRef.current?.exportGlb() ?? null
      },
      captureScreenshot: () => {
        return innerRef.current?.captureScreenshot() ?? null
      },
    }))

    return (
      <div className="relative w-full h-full">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111] rounded-lg z-10">
            <div className="w-8 h-8 border-2 border-[#00ff41] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-gray-400 text-sm">loading 3D model...</span>
            <span className="text-gray-600 text-xs mt-1">~30 MB, first load may take a moment</span>
          </div>
        )}
        <Canvas
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          style={{ background: BG_COLORS[traits3D.background] || '#111' }}
          className="rounded-lg"
          onCreated={() => {
            // Model loaded callback will clear the loading state via MferModel
            // Give a small delay for the model to actually render
            setTimeout(() => setLoading(false), 500)
          }}
        >
          <SceneContent ref={innerRef} traits3D={traits3D} />
        </Canvas>
      </div>
    )
  },
)

export default ThreePreview
