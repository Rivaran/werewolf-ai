import { Player } from "@/types/player"

type Props = {
  players: (Player | null)[]
  theme: string
  currentPlayer: number
  phase: string
}

export default function AliveCounter({ players, theme, currentPlayer, phase }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 20,
        display: "flex",
        gap: 0,
        zIndex: 9999
      }}
    >
      {players.map((p, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginLeft: -20
          }}
        >
          <img
            src={
              !p || !p.alive
                ? `/image/${theme}/icon_dead.png`
                : i+1 === currentPlayer && (phase === "night" || phase === "roleCheck")
                  ? `/image/${theme}/icon_active.png`
                  : `/image/${theme}/icon_alive.png`
            }
            style={{
              width: 95,
              height: 45,
              marginRight: -38,
              filter: p && p.alive ? "none" : "brightness(0.6)"
            }}
          />

          <span style={{
            fontSize: 18,
            marginRight: 0,
            marginTop: -5,
            textShadow: "0 0 6px rgba(255,255,255,0.6)"
            }}>{i+1}</span>

        </div>
      ))}
    </div>
  )
}
