import { useTexture, type ThreeElements } from "@react-three/fiber/webgpu";
import { useMemo } from "react";
import {
  atan,
  color,
  cos,
  float,
  Fn,
  mix,
  modelScale,
  mul,
  mx_noise_float,
  mx_worley_noise_float,
  parallaxUV,
  PI,
  rand,
  smoothstep,
  texture,
  time,
  TWO_PI,
  uv,
  vec3,
} from "three/tsl";
import { DoubleSide, Node, RepeatWrapping, SRGBColorSpace } from "three/webgpu";

// TODO: Refactor this file

const DISTANCE = 2.5;

export default function PatternsTest(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <Floor />
      <Pattern01 position={[0, 3.5, 5]} />
      <Pattern02 position={[0, 3.5, 5 - DISTANCE * 1]} />
      <Pattern03 position={[0, 3.5, 5 - DISTANCE * 2]} />
      <Pattern04 position={[0, 3.5, 5 - DISTANCE * 3]} />
      <Pattern05 position={[0, 3.5, 5 - DISTANCE * 4]} />

      <Pattern06 position={[0, 1, 5]} />
      <Pattern07 position={[0, 1, 5 - DISTANCE * 1]} />
      <Pattern08 position={[0, 1, 5 - DISTANCE * 2]} />
      <Pattern09 position={[0, 1, 5 - DISTANCE * 3]} />
      <Pattern10 position={[0, 1, 5 - DISTANCE * 4]} />
    </group>
  );
}

function Floor(props: ThreeElements["mesh"]) {
  const diffuse = useTexture("/textures/seamless-grass.webp", (tex) => {
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(1, 2);
  });

  const nodes = useMemo(() => {
    const colorNode = texture(diffuse);

    const center = uv().sub(0.5).mul(modelScale.xy);
    const radius = float(1);
    const fadeWidth = float(1);
    const innerBox = modelScale.xy.mul(0.5).sub(radius);
    const distance = center.abs().sub(innerBox).max(0).length();

    const opacityNode = smoothstep(
      radius.sub(fadeWidth),
      radius,
      distance,
    ).oneMinus();

    return {
      colorNode,
      opacityNode,
    };
  }, [diffuse]);

  return (
    <mesh rotation-x={-Math.PI / 2} scale={[6, 15, 1]} receiveShadow {...props}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <meshStandardNodeMaterial transparent {...nodes} />
    </mesh>
  );
}

function Pattern01(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const colorNode = vec3(uv().xy, 1);
    return {
      colorNode,
    };
  }, []);

  return (
    <mesh rotation-y={Math.PI / 2} castShadow receiveShadow {...props}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshStandardNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}

function Pattern02(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const colorNode = vec3(uv().x);
    return {
      colorNode,
    };
  }, []);

  return (
    <mesh rotation-y={Math.PI / 2} castShadow receiveShadow {...props}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshStandardNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}

function Pattern03(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const colorNode = vec3(uv().x.mul(10).fract());
    return {
      colorNode,
    };
  }, []);

  return (
    <mesh rotation-y={Math.PI / 2} castShadow receiveShadow {...props}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshStandardNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}

function Pattern04(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const vertical = uv().x.mul(10).fract().step(0.5);
    const horizontal = uv().y.mul(10).fract().step(0.5);
    const colorNode = vec3(vertical.add(horizontal).sub(1).abs());

    return {
      colorNode,
    };
  }, []);

  return (
    <mesh rotation-y={Math.PI / 2} castShadow receiveShadow {...props}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshStandardNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}

function Pattern05(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const colorNode = vec3(uv().sub(0.5).length());

    return {
      colorNode,
    };
  }, []);

  return (
    <mesh rotation-y={Math.PI / 2} castShadow receiveShadow {...props}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshStandardNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}

function Pattern06(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const polarUv = uv().sub(0.5);
    const angle = atan(polarUv.x, polarUv.y);
    const colorNode = vec3(angle.add(PI).div(TWO_PI));

    return {
      colorNode,
    };
  }, []);

  return (
    <mesh rotation-y={Math.PI / 2} castShadow receiveShadow {...props}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshStandardNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}

function Pattern07(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const gridUv = uv().mul(10).floor();
    // const random = hash(gridUv.x.mul(10).add(gridUv.y));
    const random = rand(gridUv);

    const colorNode = vec3(random);

    return {
      colorNode,
    };
  }, []);

  return (
    <mesh rotation-y={Math.PI / 2} castShadow receiveShadow {...props}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshStandardNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}

function Pattern08(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const noise = mx_noise_float(uv().mul(5)).mul(5);
    const colorNode = vec3(noise.add(time.mul(0.5)).fract().step(0.8));

    return {
      colorNode,
    };
  }, []);

  return (
    <mesh rotation-y={Math.PI / 2} castShadow receiveShadow {...props}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshStandardNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}

const palette = Fn(
  ([t, a, b, c, d]: [
    t: Node<"float">,
    a: Node<"vec3">,
    b: Node<"vec3">,
    c: Node<"vec3">,
    d: Node<"vec3">,
  ]) => {
    return a.add(b.mul(cos(mul(6.283185, c.mul(t).add(d)))));
  },
  { t: "float", a: "vec3", b: "vec3", c: "vec3", d: "vec3", return: "vec3" },
);

function Pattern09(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const worleyUv = uv().mul(10);
    const worleyNoise = mx_worley_noise_float(vec3(worleyUv, time));
    const colorNode = palette(
      worleyNoise,
      vec3(0.5, 0.3, 0.4),
      vec3(0.9, 0.5, 0.4),
      vec3(1.0, 1.0, 1.0),
      vec3(0.0, 0.1, 0.2),
    );

    return {
      colorNode,
    };
  }, []);

  return (
    <mesh rotation-y={Math.PI / 2} castShadow receiveShadow {...props}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshStandardNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}

function Pattern10(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const depthUv = (parallaxUV(uv(), float(0.5)) as Node<"vec3">).xy;
    const causticsInput = vec3(depthUv.mul(6), time.mul(0.3));
    const causticsNoise = mx_worley_noise_float(causticsInput).pow(3);
    const depthColor = mix(color(0x193b55), color(0x11eeff), causticsNoise);

    const foamInput = vec3(uv().mul(5), time.mul(0.05));
    const foamNoise = mx_noise_float(foamInput);
    const foamMask = foamNoise.abs().step(0.03).oneMinus();
    const foamColor = color(0xe5f7ff);

    const lilyPadInput = uv().mul(4);
    const lilyPadNoise = mx_worley_noise_float(lilyPadInput);
    const lilyPadMask = lilyPadNoise.oneMinus().step(0.5);
    const lilyPadColor = mix(
      color(0xd7e689),
      color(0x329a89),
      lilyPadNoise.div(0.5),
    );

    let colorNode = mix(depthColor, foamColor, foamMask);
    colorNode = mix(colorNode, lilyPadColor, lilyPadMask);

    return {
      colorNode,
    };
  }, []);

  return (
    <mesh rotation-y={Math.PI / 2} castShadow receiveShadow {...props}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshStandardNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}
