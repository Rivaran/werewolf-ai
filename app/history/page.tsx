"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CHARACTERS, CharacterId, DiscussionLog, DiscussionMessage } from "@/types/discussion"

type HistoryEntry = {
  gameId: string
  startedAt: string
  messageCount: number
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function getDays(messages: DiscussionMessage[]) {
  const days = Array.from(new Set(messages.map(m => m.day))).sort((a, b) => a - b)
  return days
}

export default function HistoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [log, setLog] = useState<DiscussionLog | null>(null)
  const [selectedDay, setSelectedDay] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/history")
      .then(r => r.json())
      .then(data => {
        setEntries(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function selectGame(gameId: string) {
    const res = await fetch(`/api/discussion?gameId=${gameId}`)
    const data: DiscussionLog = await res.json()
    setLog(data)
    const days = getDays(data.messages)
    setSelectedDay(days[0] ?? 0)
    setSelectedGameId(gameId)
  }

  if (selectedGameId && log) {
    const days = getDays(log.messages)
    const dayMessages = log.messages.filter(m => m.day === selectedDay)

    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(160deg, #f0f4ff 0%, #fdf0ff 100%)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <button
            onClick={() => { setSelectedGameId(null); setLog(null) }}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
              fontSize: 14,
              color: "#555",
            }}
          >
            ← 戻る
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#333" }}>対戦ログ</div>
            <div style={{ fontSize: 12, color: "#888" }}>{formatDate(log.startedAt)}</div>
          </div>
        </div>

        {/* Day tabs */}
        {days.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "8px 16px",
              background: "rgba(255,255,255,0.6)",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              overflowX: "auto",
            }}
          >
            {days.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 999,
                  border: selectedDay === d ? "none" : "1px solid #ddd",
                  background: selectedDay === d ? "linear-gradient(135deg, #6bd4ff, #2b8cff)" : "white",
                  color: selectedDay === d ? "white" : "#555",
                  fontWeight: selectedDay === d ? "bold" : "normal",
                  cursor: "pointer",
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                {d + 1}日目
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {dayMessages.length === 0 ? (
            <div style={{ textAlign: "center", color: "#aaa", fontSize: 14, marginTop: 40 }}>
              この日の発言はありません
            </div>
          ) : (
            dayMessages.map(msg => {
              const char = CHARACTERS[msg.characterId as CharacterId]
              if (!char) return null

              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-end",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: `3px solid ${char.color}`,
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={char.img}
                      alt={char.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      maxWidth: "70%",
                    }}
                  >
                    <div style={{ fontSize: 11, color: char.color, fontWeight: "bold", marginBottom: 3 }}>
                      {char.name}
                    </div>
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "4px 18px 18px 18px",
                        background: char.bubbleColor,
                        color: "#333",
                        border: `1.5px solid ${char.color}40`,
                        fontSize: 14,
                        lineHeight: 1.5,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                      }}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #f0f4ff 0%, #fdf0ff 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
            fontSize: 14,
            color: "#555",
          }}
        >
          ← 戻る
        </button>
        <div style={{ fontSize: 20, fontWeight: "bold", color: "#333" }}>対戦履歴</div>
      </div>

      {/* List */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#aaa", fontSize: 14, marginTop: 40 }}>読み込み中...</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: "center", color: "#aaa", fontSize: 14, marginTop: 40 }}>
            対戦履歴がありません
          </div>
        ) : (
          entries.map(entry => (
            <button
              key={entry.gameId}
              onClick={() => selectGame(entry.gameId)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(255,255,255,0.85)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: "bold", color: "#333", marginBottom: 4 }}>
                  {formatDate(entry.startedAt)}
                </div>
                <div style={{ fontSize: 13, color: "#888" }}>発言 {entry.messageCount}件</div>
              </div>
              <div style={{ fontSize: 20, color: "#bbb" }}>›</div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
