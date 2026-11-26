"use client";

import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  DoubleSide,
  type Group,
  type Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector2,
} from "three";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import type { ThemeColors } from "@/hooks/use-theme-colors";
import { BOX_FACE_ORDER, DIE_SIZE, type Throw, faceUpRotation } from "@/lib/dice-geometry";
import type { ThrowState } from "../../hooks/use-dice-throw";
import { useFramesWhileMoving } from "../../hooks/use-frames-while-moving";
import { calabashTexture } from "../../lib/calabash-texture";
import { cupMotion, cupStep } from "../../lib/cup-motion";
import type { RevealedSeat } from "../../lib/reveal";
import { dieFaceTexture } from "../../lib/dice-textures";
import { liftedCupPosition } from "../../lib/lifted-cup";
import { revealedRowCentre } from "../../lib/revealed-row";
import { rollFrame } from "../../lib/roll-frame";
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
  calm,
}: {
  seat: SeatPlacement;
  colors: ThemeColors;
  shaking: boolean;
  lifted: boolean;
  calm: boolean;
}) {
  const cup = useRef<Group>(null);
  const place = useRef<Group>(null);
  const [restX, , restZ] = seat.cup;
  const [liftX, , liftZ] = liftedCupPosition(seat);
  const texture = calabashTexture({
    gourd: colors["--pattern-accent"],
    burnt: colors["--board-edge"],
  });
  useEffect(() => () => texture.dispose(), [texture]);
  useFramesWhileMoving((state, delta) => {
    const group = cup.current;
    const spot = place.current;
    if (!group || !spot) return false;
    const step = cupStep({
      at: { x: spot.position.x, y: group.position.y, z: spot.position.z },
      rest: { x: restX, z: restZ },
      lift: { x: liftX, z: liftZ },
      shaking,
      lifted,
      calm,
      time: state.clock.elapsedTime,
      delta,
    });
    spot.position.x = step.at.x;
    spot.position.z = step.at.z;
    group.rotation.z = step.tiltZ;
    group.rotation.x = step.tiltX;
    group.position.y = step.at.y;
    return step.moving;
  }, `${shaking}:${lifted}:${calm}:${restX}:${restZ}`);
  return (
    <group ref={place} position={[restX, 0, restZ]} rotation-y={seat.facing}>
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
  calm,
}: {
  result: Throw;
  startedAt: number;
  materials: MeshStandardMaterial[];
  calm: boolean;
}) {
  const meshes = useRef<(Mesh | null)[]>([]);
  const turned = new Quaternion();
  const turn = new Quaternion();
  useFramesWhileMoving(() => {
    const elapsed = performance.now() - startedAt;
    let rolling = false;
    result.dice.forEach((die, index) => {
      const mesh = meshes.current[index];
      if (!mesh) return;
      const { index: step, done } = rollFrame(elapsed, die.frames.length, calm);
      if (!done) rolling = true;
      const frame = die.frames[step];
      mesh.position.set(...frame.position);
      turned.set(...frame.rotation);
      turn.set(...die.faceTurn);
      mesh.quaternion.copy(turned.multiply(turn));
    });
    return rolling;
  }, `${startedAt}:${calm}`);
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
    <group position={revealedRowCentre(seat)} rotation-y={seat.facing}>
      {revealed.faces.map((face, index) => (
        <mesh
          key={index}
          castShadow
          material={revealed.counting[index] ? glowing : plain}
          position={[first + index * ROW_SPACING, DIE_SIZE / 2, 0]}
          quaternion={faceUpRotation(face)}
        >
          <boxGeometry args={[DIE_SIZE, DIE_SIZE, DIE_SIZE]} />
        </mesh>
      ))}
    </group>
  );
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
  paused = false,
  label,
}: {
  colors: ThemeColors;
  seats: SeatPlacement[];
  throwState: ThrowState;
  chipsEach: number;
  revealed: boolean;
  revealedDice?: readonly (RevealedSeat | null)[] | null;
  ownSeat?: number | null;
  othersShaking?: boolean;
  paused?: boolean;
  label: string;
}) {
  const calm = useCalmMotion();
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
        dpr={[1, 1.5]}
        frameloop={paused ? "never" : "demand"}
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
        <Board colors={colors} />
        <Pot colors={colors} seats={seats} chipsEach={chipsEach} />
        {seats.map((seat, index) => {
          const motion = cupMotion({
            index,
            ownSeat,
            throwKind: throwState.kind,
            revealed,
            othersShaking,
            calm,
          });
          return (
            <Seat
              key={seat.side}
              seat={seat}
              colors={colors}
              shaking={motion.shaking}
              lifted={motion.lifted}
              calm={calm}
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
            calm={calm}
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
