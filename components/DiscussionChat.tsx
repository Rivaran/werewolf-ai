"use client"

import { useEffect, useRef, useState } from "react"
import { CHARACTERS, CharacterId, DiscussionLog, DiscussionMessage } from "@/types/discussion"

type Props = {
  gameId: string
  day: number
  morningDeath?: number | null
  playerAssignments: Record<number, string>
  onEndDiscussion: () => void
  title?: string
}

export default function DiscussionChat({ gameId, day, morningDeath = null, playerAssignments, onEndDiscussion, title }: Props) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [posting, setPosting] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const shouldFollowMessagesRef = useRef(true)

  // Find rivaran's player number
  const rivaranPlayerNum = Object.entries(playerAssignments).find(([, v]) => v === "rivaran")?.[0]
    ? Number(Object.entries(playerAssignments).find(([, v]) => v === "rivaran")![0])
    : null

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/discussion?gameId=${gameId}`)
      if (!res.ok) return
      const log: DiscussionLog = await res.json()
      const dayMessages = log.messages.filter(m => m.day === day)
      setMessages(dayMessages)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [gameId, day])

  function handleMessagesScroll() {
    const el = messagesRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldFollowMessagesRef.current = distanceFromBottom < 96
  }

  useEffect(() => {
    if (shouldFollowMessagesRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inputText.trim() || rivaranPlayerNum === null || posting) return

    setPosting(true)
    try {
      await fetch("/api/discussion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          playerNumber: rivaranPlayerNum,
          characterId: "rivaran",
          message: inputText.trim(),
          day,
        }),
      })
      setInputText("")
      shouldFollowMessagesRef.current = true
      await fetchMessages()
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

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
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: "bold", color: "#333" }}>{title ?? `${day + 1}日目の議論`}</div>
          <div style={{ fontSize: 12, color: "#888" }}>発言 {messages.length}件</div>
        </div>
        <button
          onClick={onEndDiscussion}
          style={{
            padding: "10px 20px",
            fontSize: 15,
            fontWeight: "bold",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg, #6bd4ff, #2b8cff)",
            color: "white",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          投票へ →
        </button>
      </div>

      {/* Morning death banner */}
      {morningDeath !== null && day !== 0 && (
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(220, 60, 60, 0.12)",
            borderBottom: "1px solid rgba(220,60,60,0.2)",
            textAlign: "center",
            fontSize: 14,
            color: "#c0392b",
            fontWeight: "bold",
          }}
        >
          昨晩の犠牲者：プレイヤー {morningDeath}
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesRef}
        onScroll={handleMessagesScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#aaa",
              fontSize: 14,
              textAlign: "center",
              whiteSpace: "pre-line",
            }}
          >
            {"まだ発言がありません\nAIはMCPで自動投稿します"}
          </div>
        ) : (
          messages.map(msg => {
            const char = CHARACTERS[msg.characterId as CharacterId]
            if (!char) return null
            const isOwn = msg.characterId === "rivaran"

            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: isOwn ? "row-reverse" : "row",
                  alignItems: "flex-end",
                  gap: 8,
                }}
              >
                {/* Avatar */}
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

                {/* Bubble area */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isOwn ? "flex-end" : "flex-start",
                    maxWidth: "70%",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: char.color,
                      fontWeight: "bold",
                      marginBottom: 3,
                    }}
                  >
                    {char.name}
                  </div>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: isOwn ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                      background: isOwn ? char.color : char.bubbleColor,
                      color: isOwn ? "white" : "#333",
                      border: isOwn ? "none" : `1.5px solid ${char.color}40`,
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
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {rivaranPlayerNum !== null && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 12px",
            background: "rgba(255,255,255,0.9)",
            borderTop: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="発言を入力..."
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 999,
              border: "1.5px solid #ddd",
              fontSize: 14,
              outline: "none",
              background: "white",
            }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || posting}
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              border: "none",
              background: inputText.trim() && !posting
                ? "linear-gradient(135deg, #6bd4ff, #2b8cff)"
                : "#ddd",
              color: inputText.trim() && !posting ? "white" : "#aaa",
              fontWeight: "bold",
              fontSize: 14,
              cursor: inputText.trim() && !posting ? "pointer" : "not-allowed",
            }}
          >
            送信
          </button>
        </form>
      )}
    </div>
  )
}
