"use client";

import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
  DoubleSide,
  type Group,
  type Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector2,
} from "three";
import type { ThemeColors } from "@/hooks/use-theme-colors";
import {
  BOX_FACE_ORDER,
  DIE_SIZE,
  STEP_SECONDS,
  type Throw,
  faceUpRotation,
} from "@/lib/dice-physics";
import type { ThrowState } from "../../hooks/use-dice-throw";
import { calabashTexture } from "../../lib/calabash-texture";
import { cupMotion } from "../../lib/cup-motion";
import { createFrameWatch } from "../../lib/frame-watch";
import type { RevealedSeat } from "../../lib/reveal";
import { dieFaceTexture } from "../../lib/dice-textures";
import { type SeatColor, type SeatPlacement } from "../../lib/seat-layout";

const SEAT_TOKEN: Record<SeatColor, keyof ThemeColors> = {
  red: "--seat-red",
  green: "--seat-green",
  yellow: "--seat-yellow",
  blue: "--seat-blue",
};

const CORNERS: { color: SeatColor; x: number; z: number }[] = [
  { color: "red", x: -2.35, z: 2.35 },
  { color: "green", x: -2.35, z: -2.35 },
  { color: "yellow", x: 2.35, z: -2.35 },
  { color: "blue", x: 2.35, z: 2.35 },
];

const CALABASH_PROFILE = [
  [0.0, 0.78],
  [0.16, 0.77],
  [0.34, 0.72],
  [0.5, 0.62],
  [0.62, 0.48],
  [0.69, 0.32],
  [0.7, 0.16],
  [0.66, 0.04],
  [0.6, 0.0],
  [0.57, 0.02],
].map(([x, y]) => new Vector2(x, y));

const CHIP_RADIUS = 0.24;
const CHIP_HEIGHT = 0.07;

function Board({ colors }: { colors: ThemeColors }) {
  return (
    <group>
      <RoundedBox args={[7.6, 0.5, 7.6]} radius={0.14} position={[0, -0.27, 0]}>
        <meshStandardMaterial color={colors["--board-edge"]} roughness={0.55} />
      </RoundedBox>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[6.8, 6.8]} />
        <meshStandardMaterial color={colors["--board"]} roughness={0.6} />
      </mesh>
      {[
        [0, 3.55, 7.6, 0.5],
        [0, -3.55, 7.6, 0.5],
        [3.55, 0, 0.5, 7.6],
        [-3.55, 0, 0.5, 7.6],
      ].map(([x, z, width, depth]) => (
        <RoundedBox
          key={`${x}:${z}`}
          args={[width, 0.35, depth]}
          radius={0.1}
          position={[x, 0.17, z]}
        >
          <meshStandardMaterial color={colors["--board-edge"]} roughness={0.5} />
        </RoundedBox>
      ))}
      {CORNERS.map(({ color, x, z }) => (
        <mesh key={color} rotation-x={-Math.PI / 2} position={[x, 0.004, z]}>
          <planeGeometry args={[1.7, 1.7]} />
          <meshStandardMaterial color={colors[SEAT_TOKEN[color]]} roughness={0.7} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.85, 1.05, 48]} />
        <meshStandardMaterial color={colors["--pattern-accent"]} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Seat({
  seat,
  colors,
  shaking,
  lifted,
}: {
  seat: SeatPlacement;
  colors: ThemeColors;
  shaking: boolean;
  lifted: boolean;
}) {
  const cup = useRef<Group>(null);
  const texture = calabashTexture({
    gourd: colors["--pattern-accent"],
    burnt: colors["--board-edge"],
  });
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((state, delta) => {
    const group = cup.current;
    if (!group) return;
    const time = state.clock.elapsedTime;
    const wobble = shaking ? Math.sin(time * 38) * 0.18 : 0;
    group.rotation.z = wobble;
    group.rotation.x = shaking ? Math.cos(time * 31) * 0.12 : 0;
    const targetY = lifted ? 1.4 : shaking ? 0.08 + Math.abs(Math.sin(time * 19)) * 0.12 : 0;
    group.position.y += (targetY - group.position.y) * Math.min(1, delta * 10);
  });
  return (
    <group position={[seat.cup[0], 0, seat.cup[2]]} rotation-y={seat.facing}>
      <group ref={cup}>
        <mesh castShadow>
          <latheGeometry args={[CALABASH_PROFILE, 48]} />
          <meshStandardMaterial map={texture} roughness={0.85} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.06, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.66, 0.025, 8, 48]} />
          <meshStandardMaterial color={colors[SEAT_TOKEN[seat.color]]} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

const POT_OFFSETS: [number, number][] = [
  [-0.32, 0.32],
  [-0.32, -0.32],
  [0.32, -0.32],
  [0.32, 0.32],
];

function Pot({
  colors,
  seats,
  chipsEach,
}: {
  colors: ThemeColors;
  seats: SeatPlacement[];
  chipsEach: number;
}) {
  return (
    <group>
      {seats.map((seat, index) => (
        <ChipStack
          key={seat.color}
          colors={colors}
          color={seat.color}
          count={chipsEach}
          offset={POT_OFFSETS[index]}
        />
      ))}
    </group>
  );
}

function ChipStack({
  colors,
  color,
  count,
  offset,
}: {
  colors: ThemeColors;
  color: SeatColor;
  count: number;
  offset: [number, number];
}) {
  return (
    <group position={[offset[0], 0, offset[1]]}>
      {Array.from({ length: count }, (_, index) => (
        <mesh
          key={index}
          castShadow
          position={[
            Math.sin(index * 1.7) * 0.015,
            CHIP_HEIGHT / 2 + index * CHIP_HEIGHT,
            Math.cos(index * 2.3) * 0.015,
          ]}
        >
          <cylinderGeometry args={[CHIP_RADIUS, CHIP_RADIUS, CHIP_HEIGHT * 0.94, 32]} />
          <meshStandardMaterial attach="material-0" color={colors["--cowrie"]} roughness={0.4} />
          <meshStandardMaterial
            attach="material-1"
            color={colors[SEAT_TOKEN[color]]}
            roughness={0.45}
          />
          <meshStandardMaterial
            attach="material-2"
            color={colors[SEAT_TOKEN[color]]}
            roughness={0.45}
          />
        </mesh>
      ))}
      <group position={[0, count * CHIP_HEIGHT + 0.045, 0]}>
        <mesh scale={[0.15, 0.06, 0.1]}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshStandardMaterial color={colors["--cowrie"]} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.05, 0]} scale={[0.11, 0.012, 0.015]}>
          <boxGeometry />
          <meshStandardMaterial color={colors["--board-edge"]} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

function ThrownDice({
  result,
  startedAt,
  materials,
}: {
  result: Throw;
  startedAt: number;
  materials: MeshStandardMaterial[];
}) {
  const meshes = useRef<(Mesh | null)[]>([]);
  const turned = new Quaternion();
  const turn = new Quaternion();
  useFrame(() => {
    const step = Math.floor((performance.now() - startedAt) / 1000 / STEP_SECONDS);
    result.dice.forEach((die, index) => {
      const mesh = meshes.current[index];
      if (!mesh) return;
      const frame = die.frames[Math.min(step, die.frames.length - 1)];
      mesh.position.set(...frame.position);
      turned.set(...frame.rotation);
      turn.set(...die.faceTurn);
      mesh.quaternion.copy(turned.multiply(turn));
    });
  });
  return (
    <>
      {result.dice.map((die, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            meshes.current[index] = mesh;
          }}
          castShadow
          material={materials}
          position={die.frames[0].position}
        >
          <boxGeometry args={[DIE_SIZE, DIE_SIZE, DIE_SIZE]} />
        </mesh>
      ))}
    </>
  );
}

const ROW_TOWARD_CENTRE = 1.25;
const ROW_SPACING = DIE_SIZE * 1.25;
const GLOW_INTENSITY = 0.55;

function diceMaterials(colors: ThemeColors, glow = false) {
  return BOX_FACE_ORDER.map(
    (face) =>
      new MeshStandardMaterial({
        map: dieFaceTexture(face, {
          body: colors["--cowrie"],
          pip: colors["--board"],
          edge: colors["--board-edge"],
        }),
        roughness: 0.35,
        emissive: glow ? colors["--pattern-accent"] : "#000000",
        emissiveIntensity: glow ? GLOW_INTENSITY : 0,
      })
  );
}

function RevealedRow({
  seat,
  revealed,
  plain,
  glowing,
}: {
  seat: SeatPlacement;
  revealed: RevealedSeat;
  plain: MeshStandardMaterial[];
  glowing: MeshStandardMaterial[];
}) {
  const first = -((revealed.faces.length - 1) * ROW_SPACING) / 2;
  return (
    <group position={[seat.cup[0], 0, seat.cup[2]]} rotation-y={seat.facing}>
      {revealed.faces.map((face, index) => (
        <mesh
          key={index}
          castShadow
          material={revealed.counting[index] ? glowing : plain}
          position={[first + index * ROW_SPACING, DIE_SIZE / 2, -ROW_TOWARD_CENTRE]}
          quaternion={faceUpRotation(face)}
        >
          <boxGeometry args={[DIE_SIZE, DIE_SIZE, DIE_SIZE]} />
        </mesh>
      ))}
    </group>
  );
}

function FrameWatcher({ onSlow }: { onSlow: () => void }) {
  const [watch] = useState(createFrameWatch);
  useFrame((_, delta) => {
    if (watch.tick(delta)) onSlow();
  });
  return null;
}

export function BoardScene({
  colors,
  seats,
  throwState,
  chipsEach,
  revealed,
  revealedDice = null,
  ownSeat = 0,
  othersShaking = false,
  label,
  onSlow,
}: {
  colors: ThemeColors;
  seats: SeatPlacement[];
  throwState: ThrowState;
  chipsEach: number;
  revealed: boolean;
  revealedDice?: readonly (RevealedSeat | null)[] | null;
  ownSeat?: number | null;
  othersShaking?: boolean;
  label: string;
  onSlow?: () => void;
}) {
  const materials = diceMaterials(colors);
  const glowing = diceMaterials(colors, true);
  useEffect(
    () => () =>
      [...materials, ...glowing].forEach((material) => {
        material.map?.dispose();
        material.dispose();
      }),
    [materials, glowing]
  );
  return (
    <div
      role="img"
      aria-label={label}
      className="aspect-square w-full cursor-grab active:cursor-grabbing"
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 10.4, 8.2], fov: 38 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0.35)}
      >
        <hemisphereLight args={[colors["--cowrie"], colors["--board-edge"], 0.9]} />
        <directionalLight position={[3, 8, 5]} intensity={1.6} />
        <pointLight
          position={[0, 3, 0]}
          intensity={6}
          distance={9}
          color={colors["--pattern-accent"]}
        />
        {onSlow ? <FrameWatcher onSlow={onSlow} /> : null}
        <Board colors={colors} />
        <Pot colors={colors} seats={seats} chipsEach={chipsEach} />
        {seats.map((seat, index) => {
          const motion = cupMotion({
            index,
            ownSeat,
            throwKind: throwState.kind,
            revealed,
            othersShaking,
          });
          return (
            <Seat
              key={seat.side}
              seat={seat}
              colors={colors}
              shaking={motion.shaking}
              lifted={motion.lifted}
            />
          );
        })}
        {revealedDice?.map((row, index) => {
          const seat = seats[index];
          return row && seat ? (
            <RevealedRow
              key={seat.side}
              seat={seat}
              revealed={row}
              plain={materials}
              glowing={glowing}
            />
          ) : null;
        })}
        {throwState.kind === "rolling" && !revealedDice && (
          <ThrownDice
            result={throwState.result}
            startedAt={throwState.startedAt}
            materials={materials}
          />
        )}
        <OrbitControls
          makeDefault
          target={[0, 0, 0.35]}
          enableDamping
          dampingFactor={0.08}
          enableZoom={false}
          enablePan={false}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2.25}
          rotateSpeed={0.7}
        />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={8} blur={2.2} far={2.5} />
      </Canvas>
    </div>
  );
}
