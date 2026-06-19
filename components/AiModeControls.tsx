"use client"

import { CHARACTERS } from "@/types/discussion"

type Props = {
  enabled: boolean
  playerCount: number
  assignments: Record<number, string>
  onEnabledChange: (enabled: boolean) => void
  onAssignmentsChange: (assignments: Record<number, string>) => void
}

const characterIds = Object.keys(CHARACTERS)

export function buildDefaultAssignments(playerCount: number) {
  return Object.fromEntries(
    characterIds.slice(0, playerCount).map((characterId, index) => [index + 1, characterId])
  )
}

export default function AiModeControls({
  enabled,
  playerCount,
  assignments,
  onEnabledChange,
  onAssignmentsChange,
}: Props) {
  function toggleEnabled() {
    const next = !enabled
    onEnabledChange(next)
    if (next) onAssignmentsChange(buildDefaultAssignments(playerCount))
  }

  return (
    <div style={{ width: "100%", maxWidth: 520, margin: "16px 0 8px" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          type="button"
          onClick={toggleEnabled}
          style={{
            padding: "10px 20px",
            fontSize: 15,
            borderRadius: 999,
            border: enabled ? "2px solid #6bd4ff" : "1px solid #aaa",
            background: enabled ? "rgba(107,212,255,0.15)" : "rgba(200,200,200,0.15)",
            color: enabled ? "#1688b8" : "#666",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          AIと遊ぶ: {enabled ? "ON" : "OFF"}
        </button>
      </div>

      {enabled && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: playerCount }, (_, index) => index + 1).map((playerNumber) => (
            <div key={playerNumber} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ minWidth: 32, fontSize: 13, color: "#666", fontWeight: "bold" }}>
                P{playerNumber}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {Object.entries(CHARACTERS).map(([characterId, character]) => {
                  const selected = assignments[playerNumber] === characterId
                  const usedByOther = Object.entries(assignments).some(
                    ([number, id]) => Number(number) !== playerNumber && id === characterId
                  )
                  return (
                    <button
                      key={characterId}
                      type="button"
                      disabled={usedByOther}
                      onClick={() =>
                        onAssignmentsChange({ ...assignments, [playerNumber]: characterId })
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: selected ? `2px solid ${character.color}` : "1px solid #ccc",
                        background: selected ? `${character.color}20` : "#fff",
                        color: selected ? character.color : "#555",
                        opacity: usedByOther ? 0.35 : 1,
                        cursor: usedByOther ? "not-allowed" : "pointer",
                        fontWeight: selected ? "bold" : "normal",
                      }}
                    >
                      <img
                        src={character.img}
                        alt=""
                        style={{ width: 20, height: 20, borderRadius: "50%" }}
                      />
                      {character.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
