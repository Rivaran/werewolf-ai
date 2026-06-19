"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DndContext } from "@dnd-kit/core"
import RoleCard from "@/components/RoleCard"
import PlayerSlot from "@/components/PlayerSlot"
import AiModeControls from "@/components/AiModeControls"
import DiscussionChat from "@/components/DiscussionChat"
import styles from "@/app/page.module.css"
import { useOneNightState } from "@/hooks/useOneNightState"
import { useWakeLock } from "@/hooks/useWakeLock"

const ROLE_SUMMARY_ORDER = [
  { id: "werewolf", label: "人狼" },
  { id: "seer", label: "占い師" },
  { id: "robber", label: "怪盗" },
  { id: "villager", label: "村人" },
]

function bgStyle(theme: string, img: string) {
  return {
    backgroundImage: `url(/image/${theme}/${img})`,
    backgroundSize: theme === "mama" ? "contain" : "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundBlendMode: "darken",
    backgroundColor: "rgba(0,0,0,0.45)",
    color: "white",
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    position: "relative" as const,
  }
}

export default function OneNightWolfPage() {
  const router = useRouter()
  const s = useOneNightState()
  const [showRoleSummary, setShowRoleSummary] = useState(false)
  const [showRuleHelp, setShowRuleHelp] = useState(false)

  useWakeLock(s.phase !== "setup")

  const roleSummary = ROLE_SUMMARY_ORDER
    .map(({ id, label }) => ({
      label,
      count: s.setupSlots.filter(player => player?.role.id === id).length,
    }))
    .filter(item => item.count > 0)

  function renderRoleSummaryButton() {
    if (roleSummary.length === 0 || s.phase === "setup") return null

    return (
      <>
        <button
          onClick={() => setShowRoleSummary(true)}
          style={s.theme === "mama" ? {
            position: "fixed",
            left: 20,
            bottom: 20,
            zIndex: 1000,
            padding: "12px 20px",
            fontSize: 15,
            borderRadius: 999,
            border: "2px solid #95c47c",
            background: "rgba(184,216,168,0.95)",
            color: "#2f4a2a",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            cursor: "pointer",
          } : {
            position: "fixed",
            left: 20,
            bottom: 20,
            zIndex: 1000,
            padding: "12px 18px",
            fontSize: 14,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.35)",
            background: "rgba(0,0,0,0.35)",
            color: "white",
            backdropFilter: "blur(4px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            cursor: "pointer",
          }}
        >
          全体配役
        </button>

        {showRoleSummary && (
          <div
            onClick={() => setShowRoleSummary(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(88vw, 360px)",
                background: "rgba(255,255,255,0.95)",
                color: "#222",
                borderRadius: 20,
                padding: 24,
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 18 }}>
                全体配役
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {roleSummary.map(({ label, count }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "rgba(0,0,0,0.06)",
                      fontSize: 18,
                      fontWeight: "bold",
                    }}
                  >
                    <span>{label}</span>
                    <span>×{count}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                <button
                  onClick={() => setShowRoleSummary(false)}
                  className={s.theme === "mama" ? styles.modalActionButtonMama : undefined}
                  style={s.theme === "mama"
                    ? {}
                    : {
                        padding: "10px 24px",
                        borderRadius: 10,
                        border: "none",
                        background: "linear-gradient(135deg,#6bd4ff,#2b8cff)",
                        color: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }


  if (s.phase === "setup") {
    return (
      <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", colorScheme: "light" }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <button
            onClick={() => router.push("/")}
            className={styles.setupTopButton}
          >
            ← 戻る
          </button>
          <button
            onClick={() => setShowRuleHelp(true)}
            className={styles.setupTopButton}
          >
            ルール説明
          </button>
        </div>

        <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 3 }}>
          <button
            onClick={() => s.setTheme("mama")}
            className={`${styles.illustrationButton} ${s.theme === "mama" ? styles.illustrationButtonActive : ""}`}
          >
            イラスト1
          </button>
          <button
            onClick={() => s.setTheme("ai")}
            className={`${styles.illustrationButton} ${s.theme === "ai" ? styles.illustrationButtonActive : ""}`}
          >
            イラスト2
          </button>
        </div>

        <div className={`${styles.titleImageWrap} ${s.theme === "mama" ? styles.titleImageWrapMama : ""}`}>
          <img
            src={`/image/${s.theme}/title_ichi.png`}
            alt=""
            className={styles.titleImageElement}
            style={{ maxWidth: 400, maxHeight: 200 }}
          />
        </div>

        <div style={{ marginBottom: 3 }}>
          人数
          <select
            className={styles.lightControl}
            style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #888", fontSize: 16, cursor: "pointer" }}
            value={s.playerCount}
            onChange={e => s.setPlayerCount(Number(e.target.value))}
          >
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
          </select>
        </div>

        <DndContext sensors={s.sensors} onDragEnd={s.handleDragEnd}>
          <h2 className={styles.sectionTitle}>配役選択</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
            {Array.from({ length: s.slotCount }, (_, i) => (
              <PlayerSlot key={i} id={i + 1} role={s.setupSlots[i]?.role ?? null} theme={s.theme} />
            ))}
          </div>
          <h2 className={styles.sectionTitle}>役職</h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
            {s.roles.map(r => <RoleCard key={r.id} role={r} />)}
          </div>
        </DndContext>

        <AiModeControls
          enabled={s.aiMode}
          playerCount={s.playerCount}
          assignments={s.playerAssignments}
          onEnabledChange={(enabled) => {
            if (enabled && s.playerCount > 5) s.setPlayerCount(5)
            s.setAiMode(enabled)
          }}
          onAssignmentsChange={s.setPlayerAssignments}
        />

        <button
          onClick={s.startGame}
          className={s.theme === "mama" ? styles.oneNightStartButtonMama : styles.oneNightStartButtonAi}
        >
          ゲーム開始
        </button>

        {showRuleHelp && (
          <div
            onClick={() => setShowRuleHelp(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20, zIndex: 9999 }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{ background: "#fff", padding: 24, borderRadius: 16, width: "min(100%, 380px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", color: "#222", WebkitTextFillColor: "#222", colorScheme: "light", lineHeight: 1.7 }}
            >
              <div style={{ fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 14 }}>一夜人狼のルール</div>
              <p style={{ margin: "0 0 10px" }}>
                1回の夜と1回の投票だけで決着する、短時間の人狼ゲームです。
              </p>
              <p style={{ margin: "0 0 10px" }}>
                人狼は正体を隠し、村人陣営は会話と役職能力を手がかりに人狼を探します。
              </p>
              <p style={{ margin: "0 0 10px" }}>
                怪盗は夜に他のプレイヤー1人と役職を交換します。交換後の役職で勝敗が決まるので、元の役職ではなく「いま自分が何陣営か」を考えて話すのが大切です。
              </p>
              <p style={{ margin: 0 }}>
                投票で人狼を処刑できれば村人陣営の勝利、人狼以外を処刑してしまうと人狼陣営の勝利です。平和村では誰も処刑しない選択も重要です。
              </p>
              <button
                onClick={() => setShowRuleHelp(false)}
                className={s.theme === "mama" ? styles.modalActionButtonMamaPurple : undefined}
                style={s.theme === "mama"
                  ? { width: "100%", marginTop: 20 }
                  : { width: "100%", marginTop: 20, padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6bd4ff,#2b8cff)", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (s.phase === "night") {
    const player = s.originalPlayers[s.currentPlayer - 1]
    const roleId = s.currentNightRoleId
    const otherPlayers = s.originalPlayers.filter((_, i) => i !== s.currentPlayer - 1)
    const wolfAllies = s.originalPlayers.filter((p, i) => i !== s.currentPlayer - 1 && p?.role.id === "werewolf")
    const mamaNightOffset = s.theme === "mama" ? 28 : 0
    const readyContentPaddingTop =
      (roleId === "villager"
        ? 112
        : roleId === "seer"
          ? 52
          : roleId === "robber"
            ? 60
          : roleId === "werewolf"
            ? 76
            : 92) + mamaNightOffset

    return (
      <div
        className={styles.screenBase}
        style={{
          backgroundImage: `url(/image/${s.theme}/bg_night.png)`,
          backgroundSize: s.theme === "mama" ? "contain" : "cover",
          minHeight: "100vh",
          height: "auto",
          justifyContent: "flex-start",
          paddingTop: 44 + (s.theme === "mama" ? 10 : 0),
          paddingBottom: 28,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: s.theme === "mama" ? 42 : 28, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <h1 style={{ fontSize: 34, letterSpacing: 2, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>夜時間</h1>
        </div>

        {!s.nightActionReady ? (
          <div className={`${styles.flexCenterColumn} ${styles.gap16}`} style={{ marginTop: 170 + mamaNightOffset }}>
            <div className={s.theme === "mama" ? styles.playerBadgeMama : styles.playerBadge}>
              プレイヤー {s.currentPlayer}{s.aiMode && s.playerAssignments[s.currentPlayer] !== "rivaran" ? "（AI）" : ""}
            </div>
            {s.aiMode && s.playerAssignments[s.currentPlayer] !== "rivaran" && (
              <p style={{ fontSize: 15, opacity: 0.8 }}>MCPで役職を確認して夜行動を決めてください</p>
            )}
            <button
              onClick={s.beginNightAction}
              className={s.theme === "mama" ? styles.orangeButtonMama : styles.orangeButton}
            >
              画面タップ
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              textAlign: "center",
              padding: `${readyContentPaddingTop}px 20px 20px`,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <img src={player?.role.img} width={200} alt={player?.role.name} />
            <p style={{ fontSize: 32, fontWeight: "bold", textShadow: "0 0 10px rgba(255,255,255,0.6)" }}>{player?.role.name}</p>

            {roleId === "villager" && (
              <p style={{ fontSize: 16, opacity: 0.85 }}>
                {!s.showNextButton && <>次のプレイヤーへ進むボタンが<br />表示されるまでお待ちください...</>}
              </p>
            )}

            {roleId === "werewolf" && (
              <>
                <button
                  onClick={() => s.setWolfModalOpen(true)}
                  style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(220,50,50,0.8)", color: "#fff", fontSize: 16, cursor: "pointer" }}
                >
                  👥 仲間を確認する
                </button>
                {!s.showNextButton && (
                  <p style={{ fontSize: 14, opacity: 0.8 }}>次のプレイヤーへ進むボタンが<br />表示されるまでお待ちください...</p>
                )}
              </>
            )}

            {roleId === "robber" && s.robberTarget === null && (
              <>
                <p style={{ fontSize: 16 }}>役職を交換したいプレイヤーを選んでください</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 8 }}>
                  {otherPlayers.map(p => p && (
                    <button
                      key={p.id}
                      onClick={() => s.handleRobberSelect(p.id)}
                      style={{ padding: "12px 20px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.75)", color: "#333", fontSize: 18, fontWeight: "bold", cursor: "pointer" }}
                    >
                      プレイヤー{p.id}
                    </button>
                  ))}
                </div>
              </>
            )}

            {roleId === "robber" && s.robberNewRole !== null && !s.showNextButton && (
              <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 14, padding: "20px 28px", textAlign: "center" }}>
                <p style={{ fontSize: 16, marginBottom: 10 }}>
                  プレイヤー{s.robberTarget}と役職を交換しました
                </p>
                <p style={{ fontSize: 20, fontWeight: "bold", marginTop: 8 }}>あなたの新しい役職：{s.robberNewRole.name}</p>
                {s.robberNewRole.id === "werewolf" && (
                  <p style={{ fontSize: 14, opacity: 0.75, marginTop: 6 }}>※仲間の確認はできません</p>
                )}
                <button
                  onClick={s.nextNightPlayer}
                  className={s.theme === "mama" ? styles.modalActionButtonMama : styles.blueButton}
                  style={s.theme === "mama"
                    ? { marginTop: 16, padding: "14px 40px", fontSize: 18 }
                    : { marginTop: 16, padding: "14px 40px", fontSize: 18 }}
                >
                  {s.currentPlayer < s.players.length ? "次のプレイヤーへ" : "夜が明けます"}
                </button>
              </div>
            )}

            {roleId === "seer" && s.seerChoiceType === null && (
              <>
                <p style={{ fontSize: 16 }}>占い方法を選んでください</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 220 }}>
                  <button
                    onClick={() => s.handleSeerTypeSelect("player")}
                    style={{ padding: "14px 0", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.75)", color: "#333", fontSize: 17, fontWeight: "bold", cursor: "pointer" }}
                  >
                    🔍 プレイヤーを占う
                  </button>
                  <button
                    onClick={() => s.handleSeerTypeSelect("center")}
                    style={{ padding: "14px 0", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.75)", color: "#333", fontSize: 17, fontWeight: "bold", cursor: "pointer" }}
                  >
                    🃏 残り2枚を確認する
                  </button>
                </div>
              </>
            )}

            {roleId === "seer" && s.seerChoiceType === "player" && s.seerResult === null && (
              <>
                <p style={{ fontSize: 16 }}>占うプレイヤーを選んでください</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 8 }}>
                  {otherPlayers.map(p => p && (
                    <button
                      key={p.id}
                      onClick={() => s.handleSeerPlayerSelect(p.id)}
                      style={{ padding: "12px 20px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.75)", color: "#333", fontSize: 18, fontWeight: "bold", cursor: "pointer" }}
                    >
                      プレイヤー{p.id}
                    </button>
                  ))}
                </div>
              </>
            )}

            {roleId === "seer" && s.seerResult !== null && !s.showNextButton && (
              <>
                <div style={{
                  background: s.theme === "mama" ? "rgba(0,0,0,0.55)" : "transparent",
                  borderRadius: 14,
                  padding: s.theme === "mama" ? "18px 28px 14px" : "0",
                  textAlign: "center"
                }}>
                  <p style={{ fontSize: 16, marginBottom: 10 }}>プレイヤー{s.seerTarget}の役職</p>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <img src={s.seerResult.img} width={70} alt={s.seerResult.name} />
                  </div>
                  <p style={{ fontSize: 20, fontWeight: "bold", marginTop: 8 }}>{s.seerResult.name}</p>
                </div>
                <button
                  onClick={s.nextNightPlayer}
                  className={s.theme === "mama" ? styles.blueButtonMama : styles.blueButton}
                  style={s.theme === "mama"
                    ? { marginTop: 8, padding: "14px 40px", fontSize: 18 }
                    : { marginTop: 8, padding: "14px 40px", fontSize: 18 }}
                >
                  {s.currentPlayer < s.players.length ? "次のプレイヤーへ" : "夜が明けます"}
                </button>
              </>
            )}

            {roleId === "seer" && s.seerCenterResult !== null && !s.showNextButton && (
              <>
                <div style={{
                  background: s.theme === "mama" ? "rgba(0,0,0,0.55)" : "transparent",
                  borderRadius: 14,
                  padding: s.theme === "mama" ? "18px 28px 14px" : "0",
                  textAlign: "center"
                }}>
                  <p style={{ fontSize: 16, marginBottom: 10 }}>配役されなかった2枚の役職</p>
                  <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
                    {s.seerCenterResult.map((role, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <img src={role.img} width={60} alt={role.name} />
                        <p style={{ fontSize: 17, fontWeight: "bold", marginTop: 6 }}>{role.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={s.nextNightPlayer}
                  className={s.theme === "mama" ? styles.blueButtonMama : styles.blueButton}
                  style={s.theme === "mama"
                    ? { marginTop: 8, padding: "14px 40px", fontSize: 18 }
                    : { marginTop: 8, padding: "14px 40px", fontSize: 18 }}
                >
                  {s.currentPlayer < s.players.length ? "次のプレイヤーへ" : "夜が明けます"}
                </button>
              </>
            )}

            {s.showNextButton && (
              <button onClick={s.nextNightPlayer} className={s.theme === "mama" ? styles.blueButtonMama : styles.blueButton}>
                {s.currentPlayer < s.players.length ? "次のプレイヤーへ" : "夜が明けます"}
              </button>
            )}
          </div>
        )}

        {s.wolfModalOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
            <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,100,100,0.4)", borderRadius: 16, padding: 28, width: 300, color: "#fff", textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>人狼の仲間</p>
              {wolfAllies.length === 0 ? (
                <p style={{ opacity: 0.7 }}>あなたは一匹狼です</p>
              ) : (
                wolfAllies.map(p => p && (
                  <p key={p.id} style={{ fontSize: 18, marginBottom: 8 }}>プレイヤー{p.id}</p>
                ))
              )}
              <button
                onClick={() => s.setWolfModalOpen(false)}
                className={s.theme === "mama" ? styles.modalActionButtonMama : undefined}
                style={s.theme === "mama"
                  ? { marginTop: 16 }
                  : { marginTop: 16, padding: "10px 32px", borderRadius: 10, border: "none", background: "rgba(220,50,50,0.8)", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: "bold" }}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
        {renderRoleSummaryButton()}
      </div>
    )
  }

  if (s.phase === "discussion" && s.aiMode) {
    return (
      <DiscussionChat
        gameId={s.gameId}
        day={0}
        playerAssignments={s.playerAssignments}
        onEndDiscussion={s.endDiscussion}
        title="一夜人狼の議論"
      />
    )
  }

  if (s.phase === "morning" || s.phase === "discussion") {
    const isDiscussion = s.phase === "discussion"
    const isMamaMorning = s.theme === "mama" && !isDiscussion
    return (
      <div style={{
        ...bgStyle(s.theme, isDiscussion ? "bg_day.png" : "bg_morning.png"),
        backgroundColor: isMamaMorning ? "transparent" : (s.timerRunning ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.45)"),
      }}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <h1 style={{
            fontSize: "clamp(28px, 8vw, 34px)",
            padding: isMamaMorning ? "8px 18px" : undefined,
            borderRadius: isMamaMorning ? 16 : undefined,
            background: isMamaMorning ? "rgba(0,0,0,0.18)" : undefined,
            boxShadow: isMamaMorning ? "0 6px 18px rgba(0,0,0,0.10)" : undefined,
            textShadow: isMamaMorning
              ? "0 2px 0 rgba(0,0,0,0.28), 0 0 18px rgba(0,0,0,0.22), 0 0 32px rgba(255,255,255,0.35)"
              : "0 3px 12px rgba(0,0,0,0.6)",
            letterSpacing: 2,
            whiteSpace: "nowrap",
          }}>
            {isDiscussion ? "議論タイム" : "朝になりました"}
          </h1>
        </div>

        {isDiscussion && (
          <div style={{ marginTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 64, fontWeight: "bold", letterSpacing: 4, textShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
              {s.formatTime(s.timeLeft)}
            </div>

            {s.discussionReady && !s.discussionEnded && (
              <div style={{ display: "flex", gap: 12 }}>
                {s.timerRunning ? (
                  <button onClick={s.pauseTimer} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 16, cursor: "pointer" }}>
                    一時停止
                  </button>
                ) : (
                  <button onClick={s.startTimer} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 16, cursor: "pointer" }}>
                    再開
                  </button>
                )}
                <button onClick={s.endDiscussion} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 16, cursor: "pointer" }}>
                  議論スキップ
                </button>
              </div>
            )}

            {!s.discussionReady && (
              <p style={{ fontSize: 18, opacity: 0.8 }}>準備中...</p>
            )}
          </div>
        )}
        {renderRoleSummaryButton()}
      </div>
    )
  }

  if (s.phase === "voteStart") {
    return (
      <div
        style={{
          backgroundImage: s.theme === "mama"
            ? `url(/image/${s.theme}/bg_voteStart.png)`
            : `url(/image/${s.theme}/bg_day.png)`,
          backgroundSize: s.theme === "mama" ? "contain" : "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundBlendMode: "darken",
          backgroundColor: "rgba(0,0,0,0.25)",
          color: "white",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          position: "relative",
        }}
      >
        <h1
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 34,
            textShadow: "0 3px 12px rgba(0,0,0,0.6)",
            letterSpacing: 2,
          }}
        >
          投票タイム
        </h1>
        <p style={{ fontSize: 18, opacity: 0.85 }}>処理中...</p>
        {renderRoleSummaryButton()}
      </div>
    )
  }

  if (s.phase === "vote") {
    return (
      <div style={{
        ...bgStyle(s.theme, s.theme === "mama" ? "bg_vote.png" : "bg_day.png"),
        backgroundColor: "rgba(0,0,0,0.25)",
      }}>
        <h1 style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", fontSize: 34, textShadow: "0 3px 12px rgba(0,0,0,0.6)", letterSpacing: 2 }}>
          追放者決定
        </h1>

        <p style={{ marginTop: 60, fontSize: 15, opacity: 0.85 }}>追放するプレイヤーを選択（複数可）</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 6 }}>
          {s.players.map(p => p && (
            <button
              key={p.id}
              onClick={() => s.toggleVoteTarget(p.id)}
              style={{
                width: 160,
                padding: 12,
                fontSize: 18,
                borderRadius: 12,
                border: s.voteTargets.includes(p.id) ? "3px solid #ff6b6b" : "1px solid rgba(255,255,255,0.25)",
                background: s.voteTargets.includes(p.id) ? "rgba(255,107,107,0.7)" : "rgba(255,255,255,0.6)",
                color: "#222",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {p.id}番
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          {s.voteTargets.length > 0 && (
            <button
              onClick={s.executeSelected}
              style={{ padding: "14px 32px", fontSize: 20, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#ff6b6b,#c0392b)", color: "#fff", fontWeight: "bold", cursor: "pointer", boxShadow: "0 6px 16px rgba(0,0,0,0.35)" }}
            >
              {s.voteTargets.map(n => `${n}番`).join("・")}を追放
            </button>
          )}
          <button
            onClick={s.declarePeace}
            style={{ display: s.voteTargets.length > 0 ? "none" : "block", padding: "14px 32px", fontSize: 20, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#a8e6cf,#3d9970)", color: "#fff", fontWeight: "bold", cursor: "pointer", boxShadow: "0 6px 16px rgba(0,0,0,0.35)" }}
          >
            🕊 平和
          </button>
        </div>
        {renderRoleSummaryButton()}
      </div>
    )
  }

  if (s.phase === "result") {
    const isVillage = s.winner === "village"
    const bgImg = isVillage ? "bg_win_village.png" : "bg_win_wolf.png"
    const winnerLabel =
      s.winner === "village" ? "村人陣営の勝利" :
      s.winner === "wolf" ? "人狼陣営の勝利" : "全員敗北"

    return (
      <div style={{
        background: `url(/image/${s.theme}/${bgImg}) center / ${s.theme === "mama" ? "contain" : "cover"} no-repeat`,
        backgroundColor: "rgba(0,0,0,0.4)",
        backgroundBlendMode: "darken",
        color: "white",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}>
        <div style={{ fontSize: 42, fontWeight: "bold", letterSpacing: 4, textShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
          {winnerLabel}
        </div>

        {!s.isPeace && s.executedPlayers.length > 0 && (
          <p style={{ fontSize: 18, opacity: 0.85 }}>
            追放：{s.executedPlayers.map(n => `${n}番`).join("・")}
          </p>
        )}
        {s.isPeace && (
          <p style={{ fontSize: 18, opacity: 0.85 }}>平和（追放なし）</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 240 }}>
          <button
            onClick={() => s.setPhase("reveal")}
            style={{ padding: "14px 0", fontSize: 18, fontWeight: "bold", borderRadius: 12, border: "none", background: "rgba(255,255,255,0.25)", color: "#fff", cursor: "pointer" }}
          >
            🔍 ネタバラシ
          </button>
          <button
            onClick={() => s.setPhase("setup")}
            style={s.theme === "mama"
              ? {
                  padding: "14px 0",
                  fontSize: 18,
                  fontWeight: "bold",
                  borderRadius: 12,
                  border: "2px solid #505050",
                  background: "#6b6b6b",
                  color: "#fff",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
                  cursor: "pointer",
                }
              : {
                  padding: "14px 0",
                  fontSize: 18,
                  fontWeight: "bold",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg,#6bd4ff,#2b8cff)",
                  color: "#fff",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
                  cursor: "pointer",
                }}
          >
            もう一度
          </button>
          <button
            onClick={() => router.push("/")}
            style={{ padding: "12px 0", fontSize: 16, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer" }}
          >
            トップへ
          </button>
        </div>
        {renderRoleSummaryButton()}
      </div>
    )
  }

  if (s.phase === "reveal") {
    return (
      <div style={{ padding: 20, minHeight: "100vh", background: "#1a1a2e", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h1 style={{ fontSize: 26, letterSpacing: 2, marginBottom: 20, marginTop: 10 }}>🔍 ネタバラシ</h1>

        <div style={{ width: "100%", maxWidth: 400 }}>
          <h2 style={{ fontSize: 18, marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: 6 }}>プレイヤーの役職</h2>
          {s.originalPlayers.map((orig, i) => {
            const current = s.players[i]
            const changed = current && orig.role.id !== current.role.id
            const isExecuted = s.executedPlayers.includes(orig.id)
            return (
              <div key={orig.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: isExecuted ? "rgba(220,50,50,0.2)" : "rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 16, minWidth: 36, opacity: 0.7 }}>{orig.id}番</span>
                <img src={orig.role.img} width={44} alt={orig.role.name} />
                <span style={{ fontSize: 15 }}>{orig.role.name}</span>
                {changed && current && (
                  <>
                    <span style={{ fontSize: 18, opacity: 0.6 }}>→</span>
                    <img src={current.role.img} width={44} alt={current.role.name} />
                    <span style={{ fontSize: 15, color: "#ffd700" }}>{current.role.name}</span>
                    {s.robberPlayerNum === orig.id && (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>（怪盗）</span>
                    )}
                  </>
                )}
                {isExecuted && <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>追放</span>}
              </div>
            )
          })}

          <h2 style={{ fontSize: 18, marginBottom: 10, marginTop: 20, borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: 6 }}>残りの2枚（センター）</h2>
          <div style={{ display: "flex", gap: 20 }}>
            {s.centerCards.map((card, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>
                <img src={card.img} width={50} alt={card.name} />
                <span style={{ fontSize: 14 }}>{card.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button
            onClick={() => s.setPhase("setup")}
            style={s.theme === "mama"
              ? { padding: "14px 32px", fontSize: 18, borderRadius: 12, border: "2px solid #505050", background: "#6b6b6b", color: "#fff", fontWeight: "bold", boxShadow: "0 3px 10px rgba(0,0,0,0.35)", cursor: "pointer" }
              : { padding: "14px 32px", fontSize: 18, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6bd4ff,#2b8cff)", color: "#fff", fontWeight: "bold", boxShadow: "0 6px 16px rgba(0,0,0,0.35)", cursor: "pointer" }}
          >
            もう一度
          </button>
          <button
            onClick={() => router.push("/")}
            style={{ padding: "14px 24px", fontSize: 16, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer" }}
          >
            トップへ
          </button>
        </div>
        {renderRoleSummaryButton()}
      </div>
    )
  }

  return null
}

