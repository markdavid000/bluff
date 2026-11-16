import { cn } from "cn";

const SHADOW_ID = "bluff-street-shadow";
const WIDTH = 1600;
const GROUND = 250;
const LINE = { stroke: "var(--outline)", strokeWidth: 2.5, strokeLinejoin: "round" as const };

type Skin = "--skin-deep" | "--skin-mid" | "--skin-warm";
type Headwear = "fila" | "gele" | "cap" | "hair";

function Face({ x, y, skin, beard }: { x: number; y: number; skin: Skin; beard?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={11} fill={`var(${skin})`} {...LINE} />
      {beard ? (
        <path
          d={`M${x - 9} ${y + 3} Q${x} ${y + 20} ${x + 9} ${y + 3} Z`}
          fill="var(--cowrie)"
          {...LINE}
          strokeWidth={1.5}
        />
      ) : null}
      <circle cx={x - 4} cy={y - 1} r={1.5} fill="var(--outline)" />
      <circle cx={x + 4} cy={y - 1} r={1.5} fill="var(--outline)" />
      {beard ? null : (
        <path
          d={`M${x - 4} ${y + 4} Q${x} ${y + 7} ${x + 4} ${y + 4}`}
          fill="none"
          stroke="var(--outline)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

function Hat({ x, y, kind, colour }: { x: number; y: number; kind: Headwear; colour: string }) {
  if (kind === "fila") {
    return (
      <path
        d={`M${x - 11} ${y - 5} Q${x - 13} ${y - 21} ${x + 3} ${y - 20} Q${x + 15} ${y - 17} ${x + 11} ${y - 5} Z`}
        fill={`var(${colour})`}
        {...LINE}
        strokeWidth={2}
      />
    );
  }
  if (kind === "gele") {
    return (
      <g>
        <path
          d={`M${x - 15} ${y - 3} Q${x - 22} ${y - 26} ${x - 2} ${y - 25} Q${x + 20} ${y - 30} ${x + 17} ${y - 5} Q${x + 2} ${y - 11} ${x - 15} ${y - 3} Z`}
          fill={`var(${colour})`}
          {...LINE}
          strokeWidth={2}
        />
        <path
          d={`M${x - 10} ${y - 16} Q${x} ${y - 22} ${x + 12} ${y - 15}`}
          fill="none"
          stroke="var(--outline)"
          strokeWidth={1.5}
          opacity={0.5}
        />
      </g>
    );
  }
  if (kind === "cap") {
    return (
      <g>
        <path
          d={`M${x - 11} ${y - 4} Q${x} ${y - 20} ${x + 11} ${y - 4} Z`}
          fill={`var(${colour})`}
          {...LINE}
          strokeWidth={2}
        />
        <path
          d={`M${x + 4} ${y - 5} L${x + 19} ${y - 3}`}
          stroke={`var(${colour})`}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </g>
    );
  }
  return (
    <path
      d={`M${x - 11} ${y - 2} Q${x} ${y - 16} ${x + 11} ${y - 2} Q${x} ${y - 8} ${x - 11} ${y - 2} Z`}
      fill="var(--outline)"
    />
  );
}

function Standing({
  x,
  skin,
  outfit,
  headwear,
  hatColour = outfit,
  dress,
  scale = 1,
  className,
}: {
  x: number;
  skin: Skin;
  outfit: string;
  headwear: Headwear;
  hatColour?: string;
  dress?: boolean;
  scale?: number;
  className?: string;
}) {
  const b = GROUND;
  return (
    <g
      transform={`translate(${x} ${b}) scale(${scale}) translate(${-x} ${-b})`}
      className={className}
    >
      {dress ? (
        <path
          d={`M${x - 15} ${b - 70} L${x + 15} ${b - 70} L${x + 22} ${b - 4} L${x - 22} ${b - 4} Z`}
          fill={`var(${outfit})`}
          {...LINE}
        />
      ) : (
        <g>
          <rect x={x - 10} y={b - 34} width={8} height={32} rx={3} fill="var(--outline)" />
          <rect x={x + 2} y={b - 34} width={8} height={32} rx={3} fill="var(--outline)" />
          <path
            d={`M${x - 17} ${b - 30} L${x + 17} ${b - 30} L${x + 13} ${b - 72} Q${x} ${b - 77} ${x - 13} ${b - 72} Z`}
            fill={`var(${outfit})`}
            {...LINE}
          />
        </g>
      )}
      <ellipse cx={x - 7} cy={b - 1} rx={7} ry={3} fill="var(--outline)" />
      <ellipse cx={x + 7} cy={b - 1} rx={7} ry={3} fill="var(--outline)" />
      <rect
        x={x - 22}
        y={b - 70}
        width={8}
        height={32}
        rx={4}
        fill={`var(${outfit})`}
        {...LINE}
        strokeWidth={2}
      />
      <rect
        x={x + 14}
        y={b - 70}
        width={8}
        height={32}
        rx={4}
        fill={`var(${outfit})`}
        {...LINE}
        strokeWidth={2}
      />
      <circle cx={x - 18} cy={b - 36} r={4} fill={`var(${skin})`} />
      <circle cx={x + 18} cy={b - 36} r={4} fill={`var(${skin})`} />
      <Face x={x} y={b - 86} skin={skin} />
      <Hat x={x} y={b - 86} kind={headwear} colour={hatColour} />
    </g>
  );
}

function Seated({
  x,
  facing,
  skin,
  outfit,
  hat,
  moving,
}: {
  x: number;
  facing: 1 | -1;
  skin: Skin;
  outfit: string;
  hat: string;
  moving?: boolean;
}) {
  const b = GROUND;
  const knee = x + facing * 22;
  return (
    <g>
      <rect
        x={x - 14}
        y={b - 26}
        width={28}
        height={8}
        rx={2}
        fill="var(--board)"
        {...LINE}
        strokeWidth={2}
      />
      <rect x={x - 11} y={b - 18} width={5} height={18} fill="var(--board-edge)" />
      <rect x={x + 6} y={b - 18} width={5} height={18} fill="var(--board-edge)" />
      <path
        d={`M${x} ${b - 30} L${knee} ${b - 30}`}
        stroke="var(--outline)"
        strokeWidth={9}
        strokeLinecap="round"
      />
      <path
        d={`M${knee} ${b - 30} L${knee} ${b - 3}`}
        stroke="var(--outline)"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <ellipse cx={knee + facing * 4} cy={b - 1} rx={7} ry={3} fill="var(--outline)" />
      <path
        d={`M${x - 16} ${b - 26} L${x + 16} ${b - 26} L${x + 12} ${b - 66} Q${x} ${b - 71} ${x - 12} ${b - 66} Z`}
        fill={`var(${outfit})`}
        {...LINE}
      />
      <g className={moving ? "animate-street-move calm:animate-none" : undefined}>
        <path
          d={`M${x + facing * 8} ${b - 62} L${x + facing * 30} ${b - 44}`}
          stroke={`var(${outfit})`}
          strokeWidth={8}
          strokeLinecap="round"
        />
        <circle cx={x + facing * 32} cy={b - 42} r={4} fill={`var(${skin})`} />
      </g>
      <Face x={x} y={b - 80} skin={skin} beard />
      <Hat x={x} y={b - 80} kind="fila" colour={hat} />
    </g>
  );
}

function AyoTable({ x }: { x: number }) {
  const b = GROUND;
  return (
    <g>
      <rect
        x={x - 34}
        y={b - 46}
        width={68}
        height={8}
        rx={2}
        fill="var(--board)"
        {...LINE}
        strokeWidth={2}
      />
      <rect x={x - 28} y={b - 38} width={6} height={38} fill="var(--board-edge)" />
      <rect x={x + 22} y={b - 38} width={6} height={38} fill="var(--board-edge)" />
      <rect
        x={x - 30}
        y={b - 58}
        width={60}
        height={13}
        rx={6}
        fill="var(--board-edge)"
        {...LINE}
        strokeWidth={2}
      />
      {[0, 1, 2, 3, 4, 5].map((pit) => (
        <g key={pit}>
          <circle
            cx={x - 24 + pit * 9.6}
            cy={b - 54.5}
            r={3}
            fill="var(--outline)"
            opacity={0.55}
          />
          <circle
            cx={x - 24 + pit * 9.6}
            cy={b - 48.5}
            r={3}
            fill="var(--outline)"
            opacity={0.55}
          />
          {pit % 2 === 0 ? (
            <circle cx={x - 23 + pit * 9.6} cy={b - 55} r={1.3} fill="var(--cowrie)" />
          ) : null}
        </g>
      ))}
    </g>
  );
}

const WINDOW_WIDTH = 30;

function windowsOf(x: number, width: number) {
  return [x + width * 0.2, x + width * 0.8 - WINDOW_WIDTH];
}

const HOUSES = [
  { x: 20, width: 210, height: 150, wall: "--seat-yellow", door: "--seat-green" },
  { x: 420, width: 250, height: 175, wall: "--tile", roof: "--seat-red-edge", door: "--seat-blue" },
  { x: 1010, width: 220, height: 155, wall: "--seat-blue", door: "--seat-yellow" },
  {
    x: 1390,
    width: 200,
    height: 140,
    wall: "--seat-green",
    roof: "--seat-blue-edge",
    door: "--seat-red",
  },
];

function NightWindows() {
  return (
    <g className="hidden dark:inline">
      {HOUSES.flatMap(({ x, width, height }) =>
        windowsOf(x, width).map((left) => (
          <rect
            key={`${x}-${left}`}
            x={left}
            y={GROUND - height + 26}
            width={WINDOW_WIDTH}
            height={28}
            rx={2}
            fill="var(--glass)"
            opacity={0.85}
          />
        ))
      )}
    </g>
  );
}

function House({
  x,
  width,
  height,
  wall,
  roof = "--zinc",
  door = "--seat-red",
}: {
  x: number;
  width: number;
  height: number;
  wall: string;
  roof?: string;
  door?: string;
}) {
  const top = GROUND - height;
  const windows = windowsOf(x, width);
  return (
    <g>
      <rect x={x} y={top} width={width} height={height} rx={3} fill={`var(${wall})`} {...LINE} />
      <path
        d={`M${x - 14} ${top + 6} L${x + width + 14} ${top + 6} L${x + width - 4} ${top - 24} L${x + 4} ${top - 24} Z`}
        fill={`var(${roof})`}
        {...LINE}
      />
      {Array.from({ length: Math.floor((width + 20) / 14) }, (_, index) => (
        <line
          key={index}
          x1={x - 6 + index * 14}
          y1={top + 4}
          x2={x + 2 + index * 14}
          y2={top - 22}
          stroke="var(--zinc-edge)"
          strokeWidth={1.5}
          opacity={0.6}
        />
      ))}
      {windows.map((left) => (
        <g key={left}>
          <rect
            x={left}
            y={top + 26}
            width={WINDOW_WIDTH}
            height={28}
            rx={2}
            fill="var(--glass)"
            {...LINE}
            strokeWidth={2}
          />
          <line
            x1={left + WINDOW_WIDTH / 2}
            y1={top + 26}
            x2={left + WINDOW_WIDTH / 2}
            y2={top + 54}
            stroke="var(--outline)"
            strokeWidth={2}
          />
          <rect
            x={left - 8}
            y={top + 26}
            width={8}
            height={28}
            fill={`var(${door})`}
            {...LINE}
            strokeWidth={1.5}
          />
          <rect
            x={left + WINDOW_WIDTH}
            y={top + 26}
            width={8}
            height={28}
            fill={`var(${door})`}
            {...LINE}
            strokeWidth={1.5}
          />
        </g>
      ))}
      <rect
        x={x + width / 2 - 17}
        y={GROUND - 58}
        width={34}
        height={58}
        rx={2}
        fill={`var(${door})`}
        {...LINE}
      />
      <circle cx={x + width / 2 + 9} cy={GROUND - 28} r={2.5} fill="var(--pattern-accent)" />
      <rect
        x={x + width / 2 - 26}
        y={GROUND - 4}
        width={52}
        height={6}
        rx={2}
        fill="var(--zinc-edge)"
      />
    </g>
  );
}

function Palm({ x, height, lean = 12 }: { x: number; height: number; lean?: number }) {
  const top = { x: x + lean, y: GROUND - height };
  const fronds = [-150, -115, -80, -45, -10, 25];
  return (
    <g>
      <path
        d={`M${x - 9} ${GROUND} Q${x - 2} ${GROUND - height / 2} ${top.x - 5} ${top.y} L${top.x + 5} ${top.y} Q${x + 10} ${GROUND - height / 2} ${x + 9} ${GROUND} Z`}
        fill="var(--board)"
        {...LINE}
      />
      {Array.from({ length: Math.floor(height / 16) }, (_, index) => {
        const t = (index + 1) / (Math.floor(height / 16) + 1);
        const cx = x + lean * t * t;
        const cy = GROUND - height * t;
        return (
          <path
            key={index}
            d={`M${cx - 7} ${cy} Q${cx} ${cy + 4} ${cx + 7} ${cy}`}
            fill="none"
            stroke="var(--board-edge)"
            strokeWidth={2}
          />
        );
      })}
      {fronds.map((angle) => (
        <g key={angle} transform={`rotate(${angle} ${top.x} ${top.y})`}>
          <path
            d={`M${top.x} ${top.y} q 34 -26 78 -4 q -40 -2 -78 4 z`}
            fill="var(--seat-green)"
            {...LINE}
            strokeWidth={2}
          />
          <path
            d={`M${top.x} ${top.y} q 36 -16 74 -3`}
            fill="none"
            stroke="var(--seat-green-edge)"
            strokeWidth={1.5}
          />
        </g>
      ))}
      <circle
        cx={top.x - 5}
        cy={top.y + 6}
        r={6}
        fill="var(--board-edge)"
        {...LINE}
        strokeWidth={1.5}
      />
      <circle
        cx={top.x + 6}
        cy={top.y + 7}
        r={6}
        fill="var(--board-edge)"
        {...LINE}
        strokeWidth={1.5}
      />
    </g>
  );
}

function Trader({ x }: { x: number }) {
  const b = GROUND;
  return (
    <g>
      <path
        d={`M${x - 26} ${b} Q${x} ${b - 40} ${x + 26} ${b} Z`}
        fill="var(--seat-blue)"
        {...LINE}
      />
      <path
        d={`M${x - 15} ${b - 22} L${x + 15} ${b - 22} L${x + 11} ${b - 58} Q${x} ${b - 62} ${x - 11} ${b - 58} Z`}
        fill="var(--seat-blue)"
        {...LINE}
      />
      <ellipse
        cx={x + 36}
        cy={b - 22}
        rx={22}
        ry={6}
        fill="var(--board)"
        {...LINE}
        strokeWidth={2}
      />
      {[-12, -3, 6, -8, 2].map((offset, index) => (
        <circle
          key={index}
          cx={x + 36 + offset}
          cy={b - 28 - (index > 2 ? 6 : 0)}
          r={5}
          fill="var(--seat-yellow)"
          {...LINE}
          strokeWidth={1.2}
        />
      ))}
      <path
        d={`M${x + 10} ${b - 50} L${x + 24} ${b - 26}`}
        stroke="var(--seat-blue)"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <Face x={x} y={b - 72} skin="--skin-mid" />
      <Hat x={x} y={b - 72} kind="gele" colour="--seat-yellow" />
    </g>
  );
}

export function StreetBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}
    >
      <svg
        viewBox={`0 -50 ${WIDTH} 310`}
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-[clamp(10rem,30vh,18rem)] w-full translate-y-[20%]"
      >
        <defs>
          <filter id={SHADOW_ID} colorInterpolationFilters="sRGB">
            <feFlood result="tone" style={{ floodColor: "var(--street-shadow)" }} />
            <feComposite in="tone" in2="SourceAlpha" operator="in" />
          </filter>
        </defs>
        <g filter={`url(#${SHADOW_ID})`}>
          <rect
            x={0}
            y={GROUND - 2}
            width={WIDTH}
            height={14}
            fill="var(--board-edge)"
            opacity={0.35}
          />
          <House {...HOUSES[0]} />
          <Palm x={262} height={190} lean={-14} />
          <Standing
            x={300}
            skin="--skin-warm"
            outfit="--seat-green"
            headwear="gele"
            hatColour="--seat-red"
            dress
          />
          <Standing
            x={345}
            skin="--skin-deep"
            outfit="--pattern"
            headwear="cap"
            hatColour="--seat-red"
          />
          <House {...HOUSES[1]} />
          <Palm x={706} height={210} lean={16} />
          <Seated x={745} facing={1} skin="--skin-deep" outfit="--cowrie" hat="--seat-red" moving />
          <AyoTable x={800} />
          <Seated x={855} facing={-1} skin="--skin-mid" outfit="--seat-blue" hat="--pattern" />
          <Standing
            x={905}
            skin="--skin-warm"
            outfit="--seat-yellow"
            headwear="fila"
            hatColour="--seat-green"
          />
          <Standing
            x={960}
            skin="--skin-mid"
            outfit="--seat-red"
            headwear="hair"
            scale={0.68}
            className="animate-street-hop calm:animate-none"
          />
          <House {...HOUSES[2]} />
          <Palm x={1262} height={180} lean={-10} />
          <Trader x={1310} />
          <House {...HOUSES[3]} />
        </g>
        <NightWindows />
      </svg>
    </div>
  );
}
