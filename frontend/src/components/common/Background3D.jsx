import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Float, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

const InteractiveParticles = ({ count = 400, color = "#8B5CF6", isDark = false }) => {
    const mesh = useRef();
    const { mouse, viewport } = useThree();
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const t = Math.random() * 100;
            const factor = 20 + Math.random() * 100;
            const speed = 0.01 + Math.random() / 200;
            const xFactor = -50 + Math.random() * 100;
            const yFactor = -50 + Math.random() * 100;
            const zFactor = -50 + Math.random() * 100;
            temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 });
        }
        return temp;
    }, [count]);

    useFrame((state) => {
        particles.forEach((particle, i) => {
            let { t, factor, speed, xFactor, yFactor, zFactor } = particle;

            // Mouse interaction
            const targetX = (mouse.x * viewport.width) / 50;
            const targetY = (mouse.y * viewport.height) / 50;

            particle.mx += (targetX - particle.mx) * 0.1;
            particle.my += (targetY - particle.my) * 0.1;

            t = particle.t += speed / 2;
            const a = Math.cos(t) + Math.sin(t * 1) / 10;
            const b = Math.sin(t) + Math.cos(t * 2) / 10;
            const s = Math.cos(t);

            dummy.position.set(
                (particle.mx * 10) + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
                (particle.my * 10) + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
                (particle.my * 10) + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
            );

            dummy.scale.set(s, s, s);
            dummy.rotation.set(s * 5, s * 5, s * 5);
            dummy.updateMatrix();
            mesh.current.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[null, null, count]}>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshPhongMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isDark ? 0.8 : 0.2}
                shininess={isDark ? 100 : 30}
                specular={new THREE.Color('#ffffff')}
            />
        </instancedMesh>
    );
};

// --- Main Component ---
const Background3D = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0F0D15' : '#F8FAFC';

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none', background: bgColor, transition: 'background 0.5s ease' }}>
            <Canvas camera={{ position: [0, 0, 15], fov: 75 }}>
                <PerspectiveCamera makeDefault position={[0, 0, 30]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <Stars radius={100} depth={50} count={isDark ? 5000 : 3000} factor={4} saturation={0} fade speed={1} />

                {/* Floating Particles for both modes, color adapted for visibility */}
                <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                    <InteractiveParticles
                        count={400}
                        color={isDark ? '#F472B6' : '#8B5CF6'} // Glossy Light Pink (#F472B6) for Dark Mode
                        isDark={isDark}
                    />
                </Float>
            </Canvas>
        </div>
    );
};

export default Background3D;
