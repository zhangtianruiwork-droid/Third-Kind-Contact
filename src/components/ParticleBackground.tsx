import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
uniform float uTime;
attribute float aSpeed;
attribute float aSize;
attribute float aBrightness;

varying float vAlpha;
varying float vBrightness;

void main() {
  vec3 pos = position;

  // Drift upward with slight sway
  float t = mod(uTime * aSpeed + pos.y * 0.1, 40.0);
  pos.y = pos.y + t * 0.3;
  pos.x += sin(uTime * 0.4 * aSpeed + pos.z) * 0.8;
  pos.z += cos(uTime * 0.3 * aSpeed + pos.x) * 0.4;

  // Wrap around vertically
  if (pos.y > 20.0) pos.y -= 40.0;

  float distFromCenter = length(pos.xz) / 25.0;
  vAlpha = (1.0 - distFromCenter) * aBrightness * smoothstep(-20.0, -5.0, pos.y) * smoothstep(20.0, 5.0, pos.y);
  vBrightness = aBrightness;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aSize * (200.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
varying float vAlpha;
varying float vBrightness;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  float alpha = (0.5 - dist) * 2.0 * vAlpha;

  // Gold color: warm amber
  vec3 colorCore = vec3(0.95, 0.85, 0.35);
  vec3 colorEdge = vec3(0.72, 0.55, 0.18);
  vec3 color = mix(colorEdge, colorCore, (0.5 - dist) * 2.0 * vBrightness);

  gl_FragColor = vec4(color, alpha * 0.75);
}
`;

export function ParticleBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Create particle system
    const COUNT = 1400;
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);
    const brightness = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const r = Math.random() * 22;
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = Math.sin(theta) * r;
      speeds[i] = 0.05 + Math.random() * 0.15;
      sizes[i] = 1.5 + Math.random() * 3.5;
      brightness[i] = 0.3 + Math.random() * 0.7;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader,
      fragmentShader,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Mouse parallax
    let mx = 0, my = 0;
    const handleMouse = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouse);

    const clock = new THREE.Clock();
    let rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      material.uniforms.uTime.value = t;

      // Gentle camera sway
      camera.position.x += (mx * 1.5 - camera.position.x) * 0.02;
      camera.position.y += (-my * 1.0 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
