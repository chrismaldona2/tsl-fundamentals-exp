import {
  useRef,
  useLayoutEffect,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { Box3, Vector3, Group, Mesh } from "three";
import {
  useThree,
  type ThreeEvent,
  type ThreeElements,
} from "@react-three/fiber/webgpu";
import { useNavigationStore } from "../stores/navigation-store";

type ZoneProps = {
  id: string;
  children: ReactNode;
} & Omit<ThreeElements["group"], "id">;

export default function Zone({ children, id, ...props }: ZoneProps) {
  const activeZoneId = useNavigationStore((s) => s.activeZoneId);
  const navigate = useNavigationStore((s) => s.navigate);
  const isActive = activeZoneId === id;

  // Cursor hover effect
  const renderer = useThree((s) => s.renderer);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (hovered && !isActive) {
      renderer.domElement.style.cursor = "pointer";
    }
    return () => {
      renderer.domElement.style.cursor = "auto";
    };
  }, [hovered, isActive, renderer]);

  // Hitbox generation
  const contentRef = useRef<Group>(null);
  const hitboxRef = useRef<Mesh>(null);
  const targetWorldCenter = useRef(new Vector3());
  useLayoutEffect(() => {
    if (!contentRef.current || !hitboxRef.current) return;
    contentRef.current.updateWorldMatrix(true, true);

    const box = new Box3().setFromObject(contentRef.current);
    const size = new Vector3();
    const worldCenter = new Vector3();
    box.getSize(size);
    box.getCenter(worldCenter);

    targetWorldCenter.current.copy(worldCenter);

    const localCenter = worldCenter.clone();
    if (hitboxRef.current.parent)
      hitboxRef.current.parent.worldToLocal(localCenter);

    hitboxRef.current.position.copy(localCenter);
    hitboxRef.current.scale.copy(size);
  }, []);

  // Navigation handler
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isActive) return;

    navigate(
      [
        targetWorldCenter.current.x,
        targetWorldCenter.current.y,
        targetWorldCenter.current.z,
      ],
      id,
    );
  };

  return (
    <group {...props}>
      {/* Content */}
      <group ref={contentRef}>{children}</group>

      {/* Hitbox */}
      <mesh
        ref={hitboxRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
