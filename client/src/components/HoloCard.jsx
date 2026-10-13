import React, { useRef, useEffect, useState, useCallback } from 'react';
import './HoloCard.css';

// WebGL Vertex Shader
const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = (position + 1.0) * 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// WebGL Fragment Shader for Holographic Foil Effects
const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform int uPreset; // 0: cosmos, 1: bursts, 2: rainbow, 3: shards

  // Spectral palette calculation
  vec3 spectral(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 p = vUv - 0.5;
    vec2 m = uMouse - 0.5;
    float dist = length(p - m);
    float angle = atan(p.y - m.y, p.x - m.x);

    float foil = 0.0;
    if (uPreset == 0) {
      // Cosmos preset
      foil = sin(p.x * 12.0 + uTime * 0.5) * cos(p.y * 12.0 + uTime * 0.5) + sin(dist * 18.0 - uTime);
    } else if (uPreset == 1) {
      // Bursts preset
      foil = sin(angle * 8.0 + uTime) * sin(dist * 24.0 - uTime * 2.0);
    } else if (uPreset == 2) {
      // Rainbow preset
      foil = p.x * 2.0 + p.y * 2.0 + dist * 3.0 + uTime * 0.4;
    } else {
      // Shards preset
      float grid = sin(p.x * 20.0 + p.y * 20.0) * cos(p.x * 15.0 - p.y * 15.0);
      foil = grid + sin(dist * 15.0 - uTime);
    }

    vec3 col = spectral(foil * 0.4 + dist * 0.6);
    float intensity = smoothstep(0.7, 0.1, dist) * 0.45;
    gl_FragColor = vec4(col * intensity, intensity);
  }
`;

const PRESET_MAP = {
  cosmos: 0,
  bursts: 1,
  rainbow: 2,
  shards: 3,
};

export const HoloCard = ({
  children,
  preset = 'cosmos',
  className = '',
  style = {},
  onClick,
  tiltMax = 14,
  scaleOnHover = 1.03,
}) => {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const animFrameRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // Initialize WebGL context and foil shaders
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setWebglSupported(false);
      return;
    }

    let gl;
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: true }) || canvas.getContext('experimental-webgl');
    } catch (e) {
      setWebglSupported(false);
      return;
    }

    if (!gl) {
      setWebglSupported(false);
      return;
    }

    glRef.current = gl;

    // Helper compiler
    const createShader = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    if (!vs || !fs) {
      setWebglSupported(false);
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setWebglSupported(false);
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    // Quad geometry
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'uTime');
    const mouseLoc = gl.getUniformLocation(program, 'uMouse');
    const presetLoc = gl.getUniformLocation(program, 'uPreset');

    gl.uniform1i(presetLoc, PRESET_MAP[preset] ?? 0);
    gl.uniform2f(mouseLoc, 0.5, 0.5);

    let startTime = performance.now();

    const render = () => {
      const elapsed = (performance.now() - startTime) * 0.001;
      gl.uniform1f(timeLoc, elapsed);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (buffer) gl.deleteBuffer(buffer);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      if (program) gl.deleteProgram(program);
    };
  }, [preset]);

  // Handle pointer interactions & 3D tilt
  const handlePointerMove = useCallback(
    (e) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const normX = x / rect.width;
      const normY = y / rect.height;

      // 3D tilt angles
      const rotY = (normX - 0.5) * tiltMax * 2;
      const rotX = (0.5 - normY) * tiltMax * 2;

      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(${scaleOnHover}, ${scaleOnHover}, ${scaleOnHover})`;
      card.style.setProperty('--glare-x', `${normX * 100}%`);
      card.style.setProperty('--glare-y', `${normY * 100}%`);

      // Update WebGL uniform
      const gl = glRef.current;
      const prog = programRef.current;
      if (gl && prog) {
        gl.useProgram(prog);
        const mouseLoc = gl.getUniformLocation(prog, 'uMouse');
        gl.uniform2f(mouseLoc, normX, 1.0 - normY);
      }
    },
    [tiltMax, scaleOnHover]
  );

  const handlePointerLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }, []);

  return (
    <div
      ref={containerRef}
      className={`holocard-container ${className}`}
      style={style}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div
        ref={cardRef}
        className="holocard-inner bg-[#10141D] border border-white/10 shadow-2xl relative overflow-hidden"
      >
        {/* Holographic Border Glow */}
        <div className="holocard-border-glow" />

        {/* WebGL Foil Canvas */}
        {webglSupported && (
          <canvas
            ref={canvasRef}
            width={300}
            height={400}
            className="holocard-canvas"
          />
        )}

        {/* Dynamic Reflective Glare */}
        <div className="holocard-glare" />

        {/* Card Body */}
        <div className="relative z-10 w-full h-full p-5 flex flex-col justify-between">
          {children}
        </div>
      </div>
    </div>
  );
};

export default HoloCard;
