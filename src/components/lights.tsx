export default function Lights() {
  return (
    <>
      <ambientLight color="#859dff" intensity={1} />
      <directionalLight
        position={[8.48, 3.18, -4.24]}
        color="#ffffff"
        intensity={4.5}
        castShadow
        shadow-camera-top={10}
        shadow-camera-right={10}
        shadow-camera-bottom={-10}
        shadow-camera-left={-10}
        shadow-camera-near={0.01}
        shadow-camera-far={20}
        shadow-radius={3}
        shadow-normalBias={0.1}
      />
    </>
  );
}
