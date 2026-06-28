import { useEffect, useRef } from "react";
import { useMotionSettings } from "./MotionSettings";

/**
 * WebGL2 animated aurora orb with graceful fallback:
 * - Honors the global motion + WebGL toggle (MotionSettings).
 * - Detects WebGL availability; if missing, paints an animated CSS gradient.
 * - Respects prefers-reduced-motion (freezes time uniform).
 */
export function ShaderOrb({ className, height = 280 }: { className?: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { effectiveWebgl, motion } = useMotionSettings();
  const animateClass = motion === "full" ? "animate-aurora-drift" : "";

  useEffect(() => {
    if (!effectiveWebgl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      premultipliedAlpha: true,
      alpha: true,
    });
    if (!gl) return;

    const reduceMotion = motion !== "full";

    const vs = `#version 300 es
      in vec2 a_pos; out vec2 v_uv;
      void main(){ v_uv = a_pos*0.5+0.5; gl_Position=vec4(a_pos,0.,1.); }`;
    const fs = `#version 300 es
      precision highp float; in vec2 v_uv; out vec4 outColor;
      uniform float u_time; uniform vec2 u_res;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));vec2 u=f*f*(3.-2.*f);return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.02;a*=.5;}return v;}
      void main(){
        vec2 uv=v_uv; vec2 p=(uv-.5)*vec2(u_res.x/u_res.y,1.); float t=u_time*0.06;
        vec2 c1=vec2(sin(t*1.1)*.35,cos(t*.9)*.18);
        vec2 c2=vec2(cos(t*.7)*.28,sin(t*1.3)*.22);
        float blob=smoothstep(.85,.0,length(p-c1))*.55 + smoothstep(.85,.0,length(p-c2))*.45;
        float n=fbm(p*2.6+t*.6); blob*=.65+.55*n;
        vec3 col=mix(vec3(.36,.46,.95),vec3(.40,.85,.85),smoothstep(0.,.6,blob+.15*n));
        col=mix(col,vec3(.98,.62,.70),smoothstep(.55,1.,blob));
        col+=(hash(uv*u_res.xy+t)-.5)*.04;
        outColor=vec4(col, smoothstep(0.,.35,blob)*.85);
      }`;
    function compile(src: string, type: number) {
      const sh = gl!.createShader(type)!;
      gl!.shaderSource(sh, src);
      gl!.compileShader(sh);
      return sh;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(vs, gl.VERTEX_SHADER));
    gl.attachShader(program, compile(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(program);
    gl.useProgram(program);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_res");
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas!.clientWidth | 0,
        h = canvas!.clientHeight | 0;
      const nw = (w * dpr) | 0,
        nh = (h * dpr) | 0;
      if (canvas!.width !== nw || canvas!.height !== nh) {
        canvas!.width = nw;
        canvas!.height = nh;
        gl!.viewport(0, 0, nw, nh);
      }
    }
    resize();
    let visible = true;
    const io = new IntersectionObserver(
      (e) => {
        visible = e[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    io.observe(canvas);
    let raf = 0;
    const t0 = performance.now();
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      resize();
      gl!.uniform1f(uTime, reduceMotion ? 0 : (now - t0) / 1000);
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
    };
  }, [effectiveWebgl, motion]);

  if (!effectiveWebgl) {
    // CSS gradient fallback
    return (
      <div
        aria-hidden
        className={`${className ?? ""} aurora-fallback ${animateClass}`}
        style={{ width: "100%", height, display: "block" }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ width: "100%", height, display: "block" }}
    />
  );
}
