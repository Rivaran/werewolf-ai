import { Player } from "@/types/player"

type Props = {
  players: (Player | null)[]
  currentPlayer: number
  phase: string
}

export default function AliveCounter({ players, currentPlayer, phase }: Props) {
  const count = players.length
  const isCrowded = count >= 9
  const iconWidth = isCrowded ? 78 : 95
  const iconHeight = isCrowded ? 38 : 45
  const overlap = isCrowded ? -23 : -20
  const numberSize = isCrowded ? 16 : 18

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: isCrowded ? 10 : 20,
        display: "flex",
        gap: 0,
        zIndex: 9999
      }}
    >
      {players.map((p, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            width: iconWidth,
            height: iconHeight,
            flex: "0 0 auto",
            marginLeft: i === 0 ? 0 : overlap
          }}
        >
          <img
            src={
              !p || !p.alive
                ? `/image/icon_dead.png`
                : i+1 === currentPlayer && (phase === "night" || phase === "roleCheck")
                  ? `/image/icon_active.png`
                  : `/image/icon_alive.png`
            }
            style={{
              width: iconWidth,
              height: iconHeight,
              display: "block",
              filter: p && p.alive ? "none" : "brightness(0.6)"
            }}
          />

          <span style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: iconWidth,
            height: iconHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: numberSize,
            lineHeight: 1,
            color: p && !p.alive ? "rgba(255,255,255,0.58)" : "inherit",
            textShadow: p && !p.alive
              ? "0 0 4px rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.8)"
              : "0 0 6px rgba(255,255,255,0.6)"
            }}>{i+1}</span>

        </div>
      ))}
    </div>
  )
}
