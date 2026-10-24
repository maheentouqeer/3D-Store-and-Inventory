import { Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Aisle, Product } from "@workspace/api-client-react";

export type SceneCommand =
  | { id: number; type: "reset" }
  | { id: number; type: "move"; direction: string }
  | { id: number; type: "focus"; aisleId: string };

type ProductInstance = {
  product: Product;
  position: [number, number, number];
  side: number;
};

type MarketSceneProps = {
  products: Product[];
  aisles: Aisle[];
  command: SceneCommand;
  lookEnabled: boolean;
  onProductSelect: (product: Product) => void;
  onAisleSelect: (aisle: Aisle) => void;
};

function browserSupportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

const aisleX = (number: number, count: number) =>
  (number - (count + 1) / 2) * 5;

function ShelfColor({ products, offset }: { products: Product[]; offset: number }) {
  return (
    <>
      {[0, 1, 2, 3].map((row) => (
        <div className="rack-product" key={row}>
          {Array.from({ length: 5 }, (_, column) => {
            const product = products[(offset + row * 5 + column) % Math.max(products.length, 1)];
            const fallbackColors = ["#D79B60", "#738EA2", "#B5AE6C", "#C47459"];
            return (
              <i
                className="pack"
                key={column}
                style={{ background: product?.packageColor || fallbackColors[column % fallbackColors.length] }}
              />
            );
          })}
        </div>
      ))}
    </>
  );
}

function MarketSceneFallback({
  products,
  aisles,
  command,
  onProductSelect,
  onAisleSelect,
  webglUnavailable,
}: MarketSceneProps & { webglUnavailable: boolean }) {
  const [view, setView] = useState({ x: 0, z: 0, yaw: 0 });
  const visibleProducts = products.filter((product) => product.stockQuantity > 0).slice(0, 12);

  useEffect(() => {
    if (command.id === 0) return;
    if (command.type === "reset") {
      setView({ x: 0, z: 0, yaw: 0 });
    } else if (command.type === "focus") {
      const aisle = aisles.find((item) => item.id === command.aisleId);
      if (aisle) {
        setView({
          x: ((aisle.number - 1) % 3 - 1) * 22,
          z: (Math.floor((aisle.number - 1) / 3) - 0.5) * 18,
          yaw: (aisle.number - 3) * 3,
        });
      }
    } else {
      setView((current) => ({
        x: current.x + (command.direction === "left" ? -11 : command.direction === "right" ? 11 : 0),
        z: current.z + (command.direction === "forward" ? -11 : command.direction === "back" ? 11 : 0),
        yaw: current.yaw + (command.direction === "turn-left" ? -9 : command.direction === "turn-right" ? 9 : 0),
      }));
    }
  }, [aisles, command]);

  return (
    <div className="market-fallback-scene" aria-label="Illustrated market preview">
      <div
        className="scene"
        style={{
          transform: `scale(1.04) translate(${view.x * -0.11}%,${view.z * -0.12}%) rotate(${view.yaw * 0.11}deg)`,
        }}
      >
        <div className="back-wall" />
        <div className="ceiling-light" />
        <div className="ceiling-light two" />
        <div className="floor" />
        <div className="floor-lines" />
        <div className="aisle-header">
          {aisles.map((aisle) => (
            <button
              key={aisle.id}
              className="aisle-sign"
              onClick={() => onAisleSelect(aisle)}
              data-testid={`scene-aisle-${aisle.id}`}
            >
              AISLE {String(aisle.number).padStart(2, "0")} · {aisle.name.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="aisle-row left-a"><ShelfColor products={products} offset={0} /></div>
        <div className="aisle-row left-b"><ShelfColor products={products} offset={2} /></div>
        <div className="aisle-row right-b"><ShelfColor products={products} offset={4} /></div>
        <div className="aisle-row right-a"><ShelfColor products={products} offset={1} /></div>
        <div className="checkout-counter" />
        <div className="product-hotspots">
          {visibleProducts.map((product, index) => (
            <button
              key={product.id}
              className="scene-product"
              style={{
                left: `${12 + (index * 11) % 75}%`,
                top: `${53 + (index % 3) * 9}%`,
                zIndex: 2 + index,
                "--pack": product.packageColor,
              } as React.CSSProperties}
              onClick={() => onProductSelect(product)}
              aria-label={`Inspect ${product.name}`}
              data-testid={`scene-product-${product.id}`}
            >
              <span />
            </button>
          ))}
        </div>
      </div>
      <div className="market-fallback-note" role="status">
        {webglUnavailable
          ? "3D preview is unavailable in this browser. The illustrated shelves and live product list are still interactive."
          : "Preparing the market floor…"}
      </div>
    </div>
  );
}

function makeProductInstances(
  products: Product[],
  aisles: Aisle[],
): ProductInstance[] {
  return aisles.flatMap((aisle) => {
    const aisleProducts = products.filter(
      (product) => product.aisleId === aisle.id,
    );
    const x = aisleX(aisle.number, aisles.length);

    return aisleProducts.flatMap((product, index) => {
      if (product.stockQuantity <= 0) return [];
      const z = -6 + (index % 5) * 2.8;
      const y = 0.96 + Math.floor(index / 5) * 0.7;
      const sides = product.stockQuantity <= product.reorderLevel ? [-1] : [-1, 1];

      return sides.map((side) => ({
        product,
        side,
        position: [x + side * 0.53, y, z] as [number, number, number],
      }));
    });
  });
}

function ProductInstances({
  instances,
  onSelect,
}: {
  instances: ProductInstance[];
  onSelect: (product: Product) => void;
}) {
  const packageMesh = useRef<THREE.InstancedMesh>(null);
  const labelMesh = useRef<THREE.InstancedMesh>(null);
  const markerMesh = useRef<THREE.InstancedMesh>(null);
  const packageGeometry = useMemo(() => new THREE.BoxGeometry(0.43, 0.5, 0.36), []);
  const packageMaterial = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.65 }), []);
  const labelGeometry = useMemo(() => new THREE.PlaneGeometry(0.26, 0.1), []);
  const labelMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#F6F4EE", side: THREE.DoubleSide }),
    [],
  );
  const markerGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const markerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#E5322D",
        emissive: "#6F110D",
        emissiveIntensity: 0.25,
      }),
    [],
  );
  const lowStock = useMemo(
    () =>
      instances.filter(
        (instance) =>
          instance.product.stockQuantity <= instance.product.reorderLevel,
      ),
    [instances],
  );

  useLayoutEffect(() => {
    const packages = packageMesh.current;
    const labels = labelMesh.current;
    if (!packages || !labels) return;
    const transform = new THREE.Object3D();
    const color = new THREE.Color();

    instances.forEach((instance, index) => {
      const [x, y, z] = instance.position;
      transform.position.set(x, y, z);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      packages.setMatrixAt(index, transform.matrix);
      packages.setColorAt(index, color.set(instance.product.packageColor));

      transform.position.set(x + instance.side * 0.218, y, z);
      transform.rotation.set(0, instance.side > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      labels.setMatrixAt(index, transform.matrix);
    });

    packages.instanceMatrix.needsUpdate = true;
    labels.instanceMatrix.needsUpdate = true;
    if (packages.instanceColor) packages.instanceColor.needsUpdate = true;
    packages.computeBoundingSphere();
    labels.computeBoundingSphere();
  }, [instances]);

  useLayoutEffect(() => {
    const markers = markerMesh.current;
    if (!markers) return;
    const transform = new THREE.Object3D();
    lowStock.forEach((instance, index) => {
      const [x, y, z] = instance.position;
      transform.position.set(x + instance.side * 0.24, y + 0.33, z);
      transform.scale.set(0.16, 0.11, 0.16);
      transform.rotation.set(0, 0, 0);
      transform.updateMatrix();
      markers.setMatrixAt(index, transform.matrix);
    });
    markers.instanceMatrix.needsUpdate = true;
    markers.computeBoundingSphere();
  }, [lowStock]);

  return (
    <>
      {instances.length > 0 && (
        <>
          <instancedMesh
            ref={packageMesh}
            args={[packageGeometry, packageMaterial, instances.length]}
            castShadow
            onClick={(event) => {
              event.stopPropagation();
              if (event.instanceId !== undefined) {
                onSelect(instances[event.instanceId].product);
              }
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
          />
          <instancedMesh
            ref={labelMesh}
            args={[labelGeometry, labelMaterial, instances.length]}
            raycast={() => null}
          />
        </>
      )}
      {lowStock.length > 0 && (
        <instancedMesh
          ref={markerMesh}
          args={[markerGeometry, markerMaterial, lowStock.length]}
          raycast={() => null}
        />
      )}
    </>
  );
}

function Shelving({ aisles }: { aisles: Aisle[] }) {
  const boardMesh = useRef<THREE.InstancedMesh>(null);
  const postMesh = useRef<THREE.InstancedMesh>(null);
  const boardGeometry = useMemo(() => new THREE.BoxGeometry(0.78, 0.08, 14.8), []);
  const boardMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#A88E67", roughness: 0.8 }),
    [],
  );
  const postGeometry = useMemo(() => new THREE.BoxGeometry(0.13, 2.55, 0.13), []);
  const postMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#766247", roughness: 0.8 }),
    [],
  );
  const boardCount = aisles.length * 6;
  const postCount = aisles.length * 4;

  useLayoutEffect(() => {
    const boards = boardMesh.current;
    const posts = postMesh.current;
    if (!boards || !posts) return;
    const transform = new THREE.Object3D();
    let index = 0;
    for (const aisle of aisles) {
      const x = aisleX(aisle.number, aisles.length);
      for (const side of [-1, 1]) {
        for (const y of [0.68, 1.38, 2.08]) {
          transform.position.set(x + side * 0.53, y, 0);
          transform.rotation.set(0, 0, 0);
          transform.updateMatrix();
          boards.setMatrixAt(index, transform.matrix);
          index += 1;
        }
      }
    }

    index = 0;
    for (const aisle of aisles) {
      const x = aisleX(aisle.number, aisles.length);
      for (const side of [-1, 1]) {
        for (const z of [-7.2, 7.2]) {
          transform.position.set(x + side * 0.91, 1.32, z);
          transform.rotation.set(0, 0, 0);
          transform.updateMatrix();
          posts.setMatrixAt(index, transform.matrix);
          index += 1;
        }
      }
    }
    boards.instanceMatrix.needsUpdate = true;
    posts.instanceMatrix.needsUpdate = true;
    boards.computeBoundingSphere();
    posts.computeBoundingSphere();
  }, [aisles]);

  return (
    <>
      <instancedMesh
        ref={boardMesh}
        args={[boardGeometry, boardMaterial, boardCount]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={postMesh}
        args={[postGeometry, postMaterial, postCount]}
        castShadow
      />
    </>
  );
}

function CheckoutLanes() {
  const lanes = [-6, -2, 2, 6];
  return (
    <>
      {lanes.map((x, index) => (
        <group key={index} position={[x, 0, 10.6]}>
          <mesh position={[0, 0.56, 0]} castShadow>
            <boxGeometry args={[2.5, 1.12, 1.28]} />
            <meshStandardMaterial color="#C5A878" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.14, -0.06]}>
            <boxGeometry args={[1.65, 0.06, 0.88]} />
            <meshStandardMaterial color="#303D43" roughness={0.28} />
          </mesh>
          <mesh position={[0.82, 1.19, 0.18]}>
            <boxGeometry args={[0.28, 0.1, 0.24]} />
            <meshStandardMaterial color="#152337" roughness={0.25} />
          </mesh>
          <Html position={[0, 1.72, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
            <span className="world-checkout-sign">LANE {String(index + 1).padStart(2, "0")}</span>
          </Html>
        </group>
      ))}
    </>
  );
}

function AisleSigns({
  aisles,
  onAisleSelect,
}: {
  aisles: Aisle[];
  onAisleSelect: (aisle: Aisle) => void;
}) {
  return (
    <>
      {aisles.map((aisle) => {
        const x = aisleX(aisle.number, aisles.length);
        return (
          <group key={aisle.id} position={[x, 0, -8.25]}>
            <mesh position={[0, 3.6, 0]}>
              <boxGeometry args={[2.55, 0.62, 0.12]} />
              <meshStandardMaterial color="#0B2A6F" roughness={0.55} />
            </mesh>
            <Html position={[0, 3.6, 0.08]} center distanceFactor={7}>
              <button
                type="button"
                className="world-aisle-sign"
                onClick={() => onAisleSelect(aisle)}
                data-testid={`scene-aisle-${aisle.id}`}
              >
                <span>AISLE {String(aisle.number).padStart(2, "0")}</span>
                <strong>{aisle.name}</strong>
              </button>
            </Html>
          </group>
        );
      })}
    </>
  );
}

function blocked(position: THREE.Vector3, aisles: Aisle[]) {
  if (Math.abs(position.x) > 18.2 || position.z < -14 || position.z > 19) return true;
  if (
    aisles.some(
      (aisle) =>
        Math.abs(position.x - aisleX(aisle.number, aisles.length)) < 0.78 &&
        position.z > -7.7 &&
        position.z < 7.7,
    )
  ) {
    return true;
  }
  return [-6, -2, 2, 6].some(
    (x) =>
      Math.abs(position.x - x) < 1.45 &&
      position.z > 9.7 &&
      position.z < 11.5,
  );
}

function CameraRig({
  aisles,
  command,
  lookEnabled,
  bindLook,
}: {
  aisles: Aisle[];
  command: SceneCommand;
  lookEnabled: boolean;
  bindLook: (start: () => void, stop: () => void) => void;
}) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const look = useRef({ yaw: 0, pitch: 0, dragging: false });
  const cameraTarget = useRef<THREE.Vector3 | null>(null);
  const targetYaw = useRef(0);

  useEffect(() => {
    camera.position.set(0, 1.65, 19);
    camera.rotation.order = "YXZ";
    const startLook = () => {
      if (lookEnabled) look.current.dragging = true;
    };
    const stopLook = () => {
      look.current.dragging = false;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!look.current.dragging || !lookEnabled) return;
      look.current.yaw += event.movementX * 0.0023;
      look.current.pitch = THREE.MathUtils.clamp(
        look.current.pitch - event.movementY * 0.0017,
        -0.55,
        0.55,
      );
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input,textarea,button,[contenteditable=true]")) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        keys.current.add(key);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const onWindowBlur = () => keys.current.clear();

    bindLook(startLook, stopLook);
    gl.domElement.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopLook);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      gl.domElement.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopLook);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
      bindLook(() => undefined, () => undefined);
    };
  }, [bindLook, camera, gl, lookEnabled]);

  useEffect(() => {
    if (command.id === 0) return;
    if (command.type === "reset") {
      cameraTarget.current = new THREE.Vector3(0, 1.65, 19);
      targetYaw.current = 0;
      look.current.pitch = 0;
      return;
    }
    if (command.type === "focus") {
      const aisle = aisles.find((item) => item.id === command.aisleId);
      if (!aisle) return;
      cameraTarget.current = new THREE.Vector3(
        aisleX(aisle.number, aisles.length) + 1.85,
        1.65,
        8,
      );
      targetYaw.current = 0;
      look.current.pitch = 0;
      return;
    }

    cameraTarget.current = null;
    if (command.direction === "turn-left") {
      look.current.yaw -= 0.38;
      return;
    }
    if (command.direction === "turn-right") {
      look.current.yaw += 0.38;
      return;
    }
    camera.rotation.order = "YXZ";
    camera.rotation.set(look.current.pitch, -look.current.yaw, 0, "YXZ");
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    const right = new THREE.Vector3().crossVectors(direction, camera.up).normalize();
    const step = 2.1;
    const candidate = camera.position.clone();
    if (command.direction === "forward") candidate.addScaledVector(direction, step);
    if (command.direction === "back") candidate.addScaledVector(direction, -step);
    if (command.direction === "left") candidate.addScaledVector(right, -step);
    if (command.direction === "right") candidate.addScaledVector(right, step);
    if (!blocked(candidate, aisles)) camera.position.copy(candidate);
  }, [aisles, camera, command]);

  useFrame((_, delta) => {
    camera.rotation.order = "YXZ";
    const keysDown = keys.current;
    const turnSpeed = delta * 1.4;
    if (keysDown.has("arrowleft")) look.current.yaw -= turnSpeed;
    if (keysDown.has("arrowright")) look.current.yaw += turnSpeed;

    if (cameraTarget.current) {
      camera.position.lerp(cameraTarget.current, 1 - Math.exp(-delta * 2.8));
      const difference = THREE.MathUtils.euclideanModulo(
        targetYaw.current - look.current.yaw + Math.PI,
        Math.PI * 2,
      ) - Math.PI;
      look.current.yaw += difference * (1 - Math.exp(-delta * 2.8));
      if (camera.position.distanceTo(cameraTarget.current) < 0.08) {
        camera.position.copy(cameraTarget.current);
        cameraTarget.current = null;
      }
    } else {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
      const move = new THREE.Vector3();
      if (keysDown.has("w") || keysDown.has("arrowup")) move.add(forward);
      if (keysDown.has("s") || keysDown.has("arrowdown")) move.addScaledVector(forward, -1);
      if (keysDown.has("a")) move.addScaledVector(right, -1);
      if (keysDown.has("d")) move.add(right);
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(Math.min(delta, 0.05) * 4.4);
        const candidate = camera.position.clone().add(move);
        if (!blocked(candidate, aisles)) camera.position.copy(candidate);
      }
    }

    camera.position.y = 1.65;
    camera.rotation.set(look.current.pitch, -look.current.yaw, 0, "YXZ");
  });

  return null;
}

function Floor({ onStartLook }: { onStartLook: () => void }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.06, 0]}
      receiveShadow
      onPointerDown={(event) => {
        event.stopPropagation();
        onStartLook();
      }}
    >
      <planeGeometry args={[40, 32]} />
      <meshStandardMaterial color="#D5CCB6" roughness={0.78} />
    </mesh>
  );
}

function StoreArchitecture({ aisles }: { aisles: Aisle[] }) {
  return (
    <>
      <mesh position={[0, 3.2, -15.8]} receiveShadow>
        <boxGeometry args={[40, 6.5, 0.4]} />
        <meshStandardMaterial color="#D9DFD1" roughness={0.9} />
      </mesh>
      <mesh position={[-19.8, 3.2, 0]} receiveShadow>
        <boxGeometry args={[0.4, 6.5, 32]} />
        <meshStandardMaterial color="#E4DFD2" roughness={0.9} />
      </mesh>
      <mesh position={[19.8, 3.2, 0]} receiveShadow>
        <boxGeometry args={[0.4, 6.5, 32]} />
        <meshStandardMaterial color="#E4DFD2" roughness={0.9} />
      </mesh>
      <gridHelper position={[0, 0.005, 0]} args={[38, 38, "#B9AF97", "#C7BEA9"]} />
      <Shelving aisles={aisles} />
      <CheckoutLanes />
    </>
  );
}

export function MarketScene({
  products,
  aisles,
  command,
  lookEnabled,
  onProductSelect,
  onAisleSelect,
}: MarketSceneProps) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const instances = useMemo(
    () => makeProductInstances(products, aisles),
    [aisles, products],
  );
  const startLookRef = useRef<() => void>(() => undefined);
  const stopLookRef = useRef<() => void>(() => undefined);
  const bindLook = useCallback((start: () => void, stop: () => void) => {
    startLookRef.current = start;
    stopLookRef.current = stop;
  }, []);

  useEffect(() => {
    setWebglAvailable(browserSupportsWebGL());
  }, []);

  if (webglAvailable !== true) {
    return (
      <MarketSceneFallback
        products={products}
        aisles={aisles}
        command={command}
        lookEnabled={lookEnabled}
        onProductSelect={onProductSelect}
        onAisleSelect={onAisleSelect}
        webglUnavailable={webglAvailable === false}
      />
    );
  }

  return (
    <Canvas
      className="market-canvas"
      camera={{ position: [0, 1.65, 19], fov: 62, near: 0.1, far: 90 }}
      dpr={[1, 1.6]}
      shadows
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#D9DFD1"]} />
      <fog attach="fog" args={["#D9DFD1", 26, 58]} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#E7EEDC", "#907D5E", 1.1]} />
      <directionalLight
        position={[-8, 13, 7]}
        intensity={2.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <StoreArchitecture aisles={aisles} />
      <AisleSigns aisles={aisles} onAisleSelect={onAisleSelect} />
      <ProductInstances instances={instances} onSelect={onProductSelect} />
      <CameraRig
        aisles={aisles}
        command={command}
        lookEnabled={lookEnabled}
        bindLook={bindLook}
      />
      <Floor onStartLook={() => startLookRef.current()} />
    </Canvas>
  );
}
