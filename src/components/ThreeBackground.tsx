import { useEffect, useRef } from "react";
import { useMotionSettings } from "./MotionSettings";

type Variant = "ambient" | "hero" | "nebula";

/**
 * Three.js powered ambient background.
 * - Fixed full-screen canvas, sits behind app content (pointer-events: none).
 * - Variants tune density/colors/motion for different page intents.
 * - Honors MotionSettings: skips entirely when motion=off or webgl disabled.
 * - Pauses on tab blur + when offscreen via visibility API.
 */
export function ThreeBackground({
  variant = "ambient",
  className = "",
  opacity = 0.55,
}: {
  variant?: Variant;
  className?: string;
  opacity?: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { effectiveWebgl, motion } = useMotionSettings();

  useEffect(() => {
    if (!effectiveWebgl) return;
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.z = 6;

      // Perf tuning — adaptive DPR + mobile-aware density
      const isSmall = window.innerWidth < 768;
      const baseDpr = Math.min(window.devicePixelRatio || 1, isSmall ? 1.25 : 1.5);
      let currentDpr = baseDpr;

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSmall,
        alpha: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(currentDpr);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";

      const palettes: Record<Variant, [number, number, number][]> = {
        ambient: [
          [0.55, 0.62, 0.98],
          [0.62, 0.85, 0.92],
          [0.95, 0.72, 0.82],
        ],
        hero: [
          [0.36, 0.46, 0.95],
          [0.4, 0.85, 0.85],
          [0.98, 0.62, 0.7],
        ],
        nebula: [
          [0.45, 0.55, 0.95],
          [0.85, 0.65, 0.95],
          [0.55, 0.85, 0.75],
        ],
      };
      const palette = palettes[variant];

      // Density scaled by viewport
      const baseCount = variant === "hero" ? 2400 : variant === "nebula" ? 1800 : 1200;
      const count = Math.round(baseCount * (isSmall ? 0.45 : 1));
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
        const c = palette[i % palette.length];
        colors[i * 3] = c[0];
        colors[i * 3 + 1] = c[1];
        colors[i * 3 + 2] = c[2];
        sizes[i] = Math.random() * 0.09 + 0.03;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geom.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: opacity } },
        vertexShader: `
          attribute float aSize; varying vec3 vColor; uniform float uTime;
          void main(){
            vColor = color;
            vec3 p = position;
            p.x += sin(uTime*0.25 + position.y*0.6)*0.35;
            p.y += cos(uTime*0.22 + position.x*0.5)*0.28;
            vec4 mv = modelViewMatrix * vec4(p,1.0);
            gl_PointSize = aSize * (560.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying vec3 vColor; uniform float uOpacity;
          void main(){
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(vColor, a*uOpacity);
          }`,
        vertexColors: true,
      });
      const points = new THREE.Points(geom, mat);
      scene.add(points);

      let plane: import("three").Mesh | null = null;
      let planeMat: import("three").ShaderMaterial | null = null;
      {
        const planeOpacity = variant === "ambient" ? opacity * 0.35 : opacity * 0.55;
        planeMat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: { uTime: { value: 0 }, uOpacity: { value: planeOpacity } },
          vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
          fragmentShader: `
            precision highp float; varying vec2 vUv; uniform float uTime; uniform float uOpacity;
            float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
            float noise(vec2 p){vec2 i=floor(p),f=fract(p);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));vec2 u=f*f*(3.-2.*f);return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;}
            float fbm(vec2 p){float v=0., a=.5; for(int i=0;i<5;i++){v+=a*noise(p); p*=2.02; a*=.5;} return v;}
            void main(){
              vec2 uv=vUv; float t=uTime*0.05;
              float n=fbm(uv*3.0 + vec2(t, -t*0.7));
              vec3 c1=vec3(0.58,0.70,0.98);
              vec3 c2=vec3(0.95,0.78,0.88);
              vec3 c3=vec3(0.62,0.92,0.88);
              vec3 col=mix(c1,c2,smoothstep(0.2,0.7,n));
              col=mix(col,c3,smoothstep(0.55,0.95,n));
              float vign=smoothstep(1.1,0.2,length(uv-0.5));
              gl_FragColor=vec4(col, n*vign*uOpacity);
            }`,
        });
        plane = new THREE.Mesh(new THREE.PlaneGeometry(20, 14, 1, 1), planeMat);
        plane.position.z = -2;
        scene.add(plane);
      }

      function resize() {
        const w = mount!.clientWidth || window.innerWidth;
        const h = mount!.clientHeight || window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(mount);

      let mx = 0,
        my = 0;
      function onMove(e: PointerEvent) {
        mx = (e.clientX / window.innerWidth - 0.5) * 0.4;
        my = (e.clientY / window.innerHeight - 0.5) * 0.4;
      }
      window.addEventListener("pointermove", onMove, { passive: true });

      // Pause when out of view (IntersectionObserver)
      let onScreen = true;
      const io = new IntersectionObserver(
        ([e]) => {
          onScreen = e.isIntersecting;
          if (onScreen) tick();
        },
        { threshold: 0 },
      );
      io.observe(mount);

      let visible = !document.hidden;
      const onVis = () => {
        visible = !document.hidden;
        if (visible && onScreen) tick();
      };
      document.addEventListener("visibilitychange", onVis);

      const reduce = motion !== "full";
      const speed = reduce ? 0.15 : 1;
      const start = performance.now();

      // Adaptive perf: sample FPS, downscale DPR if below threshold
      let last = start;
      let acc = 0,
        frames = 0,
        sampled = false;

      function tick() {
        if (!visible || !onScreen || disposed) return;
        const now = performance.now();
        const dt = now - last;
        last = now;
        acc += dt;
        frames++;
        if (!sampled && acc > 1500) {
          const fps = (frames * 1000) / acc;
          if (fps < 40 && currentDpr > 1) {
            currentDpr = 1;
            renderer.setPixelRatio(1);
          }
          sampled = true;
        }
        const t = ((now - start) / 1000) * speed;
        mat.uniforms.uTime.value = t;
        if (planeMat) planeMat.uniforms.uTime.value = t;
        points.rotation.y += 0.0008 * speed;
        points.rotation.x += 0.0004 * speed;
        camera.position.x += (mx - camera.position.x) * 0.03;
        camera.position.y += (-my - camera.position.y) * 0.03;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      }
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("visibilitychange", onVis);
        geom.dispose();
        mat.dispose();
        if (plane) {
          (plane.geometry as import("three").BufferGeometry).dispose();
          planeMat?.dispose();
        }
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [effectiveWebgl, motion, variant, opacity]);

  // CSS fallback (no WebGL): soft animated gradient
  if (!effectiveWebgl) {
    return (
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        style={{ opacity }}
      >
        <div className="aurora-fallback animate-aurora-drift absolute inset-0" />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ contain: "strict" }}
    />
  );
}
