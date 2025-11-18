import { Canvas, useFrame} from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { type GLTF } from 'three-stdlib'

interface GLTFResult extends GLTF {
  nodes: {
    Bone: THREE.Bone;
    Bone001: THREE.Bone;
    Bone002: THREE.Bone;
    Bone003: THREE.Bone;
    Bone004: THREE.Bone;
    Bone005: THREE.Bone;
    Cylinder: THREE.Mesh;
    Cylinder001: THREE.Mesh;
    Cylinder002: THREE.Mesh;
    Cylinder003: THREE.Mesh;
    Cylinder004: THREE.Mesh;
    Sphere: THREE.Mesh;
  }
}

interface JointControls {
  name: string;
  boneName: string;
  min: number;
  max: number;
  step: number;
  axis: 'x' | 'y' | 'z';
}

const jointControls: JointControls[] = [
  { name: 'base', boneName: 'Bone', min: -Math.PI, max: Math.PI, step: 0.01, axis: 'y' },
  { name: 'shoulder', boneName: 'Bone001', min: -Math.PI / 2, max: Math.PI / 2, step: 0.01, axis: 'x' },
  { name: 'elbow', boneName: 'Bone002', min: -Math.PI / 2, max: Math.PI / 2, step: 0.01, axis: 'x' },
  { name: 'wrist', boneName: 'Bone003', min: -Math.PI/2, max: Math.PI/2, step: 0.01, axis: 'y' },
  { name: 'gripper', boneName: 'Bone004', min: -Math.PI / 2, max: Math.PI / 2, step: 0.01, axis: 'x' }
];

interface ModelProps {
  rotations: Record<string, number>;
}

function Model({ rotations }: ModelProps) {
  const modelRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/Robot.glb') as unknown as GLTFResult
  const bonesRef = useRef<Record<string, THREE.Object3D>>({})
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Find all bones in the scene
    scene.traverse((child) => {
      if (child.type === 'Bone') {
        bonesRef.current[child.name] = child
        console.log(`Stored bone: ${child.name}`, child)
      }
    })

    console.log('All bones stored:', Object.keys(bonesRef.current))
    setInitialized(true)
  }, [scene])

  useFrame(() => {
    if (!initialized) return

    // Apply rotations to bones
    jointControls.forEach(joint => {
      const bone = bonesRef.current[joint.boneName]
      if (bone) {
        // Reset rotations first
        bone.rotation.set(0, 0, 0)
        // Apply rotation on the correct axis
        bone.rotation[joint.axis] = rotations[joint.name]
      } else {
        console.warn(`Bone ${joint.boneName} not found for joint ${joint.name}`)
      }
    })
  })

  return <primitive ref={modelRef} object={scene} />
}

function RobotArm({ 
  rotations 
}: { 
  rotations: Record<string, number>;
}) {
  const groupRef = useRef<THREE.Group>(null)

  return (
    <>
      <group 
        ref={groupRef}
        rotation={[0, 0, 0]}
        position={[0, 0, 0]}
        scale={[0.5, 0.5, 0.5]}
      >
        <Model rotations={rotations} />
      </group>
      <OrbitControls makeDefault />
      <gridHelper args={[10, 10]} />
      <axesHelper args={[5]} />
    </>
  )
}

export default function RobotModel() {
  const [rotations, setRotations] = useState<Record<string, number>>(
    Object.fromEntries(jointControls.map(joint => [joint.name, 0]))
  )

  const handleRotationChange = (jointName: string, value: number) => {
    setRotations(prev => ({
      ...prev,
      [jointName]: value
    }))
  }

  const resetRotations = () => {
    setRotations(Object.fromEntries(jointControls.map(joint => [joint.name, 0])))
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px' }}>
      {/* Controls Panel */}
      <div style={{
        position: 'absolute',
        left: '10px',
        top: '10px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '5px',
        color: 'white',
        zIndex: 1000,
        maxHeight: '380px',
        overflowY: 'auto'
      }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>Joint Controls</h3>
        
        {jointControls.map((joint) => (
          <div key={joint.name} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '16px', marginBottom: '6px', fontWeight: '600' }}>
              {joint.name.charAt(0).toUpperCase() + joint.name.slice(1)} ({joint.boneName}, {joint.axis.toUpperCase()}-axis): {(rotations[joint.name] * 180 / Math.PI).toFixed(1)}°
            </label>
            <input
              type="range"
              min={joint.min}
              max={joint.max}
              step={joint.step}
              value={rotations[joint.name]}
              onChange={(e) => handleRotationChange(joint.name, parseFloat(e.target.value))}
              style={{ width: '200px' }}
            />
          </div>
        ))}
        
        <button 
          onClick={resetRotations}
          style={{
            marginTop: '15px',
            padding: '12px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          Reset All
        </button>
      </div>

      {/* Three.js Scene */}
      <Canvas camera={{ position: [5, 5, 5], fov: 90
       }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 10]} intensity={1} />
          <RobotArm rotations={rotations} />
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/Robot.glb')