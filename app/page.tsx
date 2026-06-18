"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DndContext } from "@dnd-kit/core"

import BuildModal from "@/components/BuildModal"
import RoleDisplay from "@/components/RoleDisplay"
import AliveCounter from "@/components/AliveCounter"
import RoleCard from "@/components/RoleCard"
import PlayerSlot from "@/components/PlayerSlot"
import DiscussionChat from "@/components/DiscussionChat"
import styles from "./page.module.css"
import { useGameState } from "@/hooks/useGameState"
import { useWakeLock } from "@/hooks/useWakeLock"
import { CHARACTERS } from "@/types/discussion"

const ROLE_SUMMARY_ORDER = [
  { id: "werewolf", label: "人狼" },
  { id: "madman", label: "狂人" },
  { id: "seer", label: "占い師" },
  { id: "knight", label: "騎士" },
  { id: "medium", label: "霊能者" },
  { id: "villager", label: "村人" },
] as const

function formatRoleSummary(players: Array<{ role?: { id: string } } | null>) {
  const counts = players.reduce<Record<string, number>>((acc, player) => {
    const roleId = player?.role?.id
    if (!roleId) return acc
    acc[roleId] = (acc[roleId] ?? 0) + 1
    return acc
  }, {})

  return ROLE_SUMMARY_ORDER
    .map(({ id, label }) => ({ label, count: counts[id] ?? 0 }))
    .filter(item => item.count > 0)
}

export default function Page() {

  const router = useRouter()
  const [showRoleSummary, setShowRoleSummary] = useState(false)
  const [showRuleHelp, setShowRuleHelp] = useState(false)

  const {
    winner,
    mounted,
    wolfTarget,
    guardTargets,
    seerResults,
    morningDeath,
    day,
    theme,
    voteTarget,
    lastGuardTarget,
    seerActed,
    showWolfToMadman,
    showMadmanToWolf,
    showSettings,
    executing,
    discussionReady,
    discussionEnded,
    executedPlayer,
    timeLeft,
    timerRunning,
    phase,
    currentPlayer,
    showRole,
    nightActionReady,
    showNextButton,
    playerCount,
    modalType,
    wolfDecider,
    seerToday,
    players,
    setWinner,
    setWolfTarget,
    setGuardTargets,
    setSeerResults,
    setDay,
    setTheme,
    setVoteTarget,
    setLastGuardTarget,
    setSeerActed,
    setShowWolfToMadman,
    setShowMadmanToWolf,
    setShowSettings,
    setExecuting,
    setPhase,
    setCurrentPlayer,
    setShowRole,
    setNightActionReady,
    setShowNextButton,
    setPlayerCount,
    setModalType,
    setWolfDecider,
    setSeerToday,
    setPlayers,
    tieMode,
    tieTargets,
    setTieMode,
    setTieTargets,
    aiMode,
    setAiMode,
    gameId,
    playerAssignments,
    setPlayerAssignments,
    setTimeLeft,
    setTimerRunning,
    setExecutedPlayer,
    roles,
    sensors,
    randomDelay,
    executePlayer,
    endDiscussion,
    formatTime,
    pauseTimer,
    startTimer,
    handleDragEnd,
    playAudio,
    startGame,
    revealRole,
    getNextAlivePlayer,
    nextPlayer,
    judgeAfterExecution,
    resolveNight,
    buildNightResults,
    buildMediumResults,
    mediumResults,
    setMediumResults,
    buildResults,
    getVisiblePlayers,
    canShowNightButton,
  } = useGameState()

  useWakeLock(phase !== "modeSelect" && phase !== "setup")

  const roleSummary = formatRoleSummary(players)

  function renderRoleSummaryButton() {
    if (roleSummary.length === 0) return null

    return (
      <>
        <button
          onClick={() => setShowRoleSummary(true)}
          style={theme === "mama" ? {
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
                  className={theme === "mama" ? styles.modalActionButtonMama : undefined}
                  style={theme === "mama"
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

  if (!mounted) return null

  if (phase === "execute") {

    return (

      <div
        style={{
          backgroundImage: theme === "mama"
            ? `url(/image/${theme}/bg_execute.png)`
            : `url(/image/${theme}/bg_day.png)`,
          backgroundSize: theme === "mama" ? "contain" : "cover",
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
          position: "relative"

        }}
      >
        <AliveCounter players={players} theme={theme} currentPlayer={currentPlayer} phase={phase} />

        <h1
            style={{
              position: "absolute",
              top: 60,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 34,
              textShadow: "0 3px 12px rgba(0,0,0,0.6)",
              letterSpacing: 4,
              opacity: 0.9,
              whiteSpace: "nowrap"
            }}
          >
            遺言の時間
        </h1>

        <h1 style={{
          fontSize: 26,
          fontWeight: "bold",
          letterSpacing: 2
        }}>プレイヤー {executedPlayer} の遺言</h1>

        <h1>ここで遺言を言ってください</h1>

        <button
          disabled={executing}
          onClick={async () => {

            if (executing) return
              setExecuting(true)

            const result = judgeAfterExecution(executedPlayer!)

            const isEnd =
              result === "villagers" ||
              result === "werewolves" ||
              result === "werewolves_by_no_knight"

            const baseAudio = isEnd
              ? `/audio/[08-${executedPlayer}]${executedPlayer}番のプレイヤーが追放され、夜がやって、来ません.wav`
              : `/audio/[10-${executedPlayer}]${executedPlayer}番のプレイヤーが追放され、夜がやってきます.wav`

            await playAudio(baseAudio)

            if (result === "villagers") {
              await playAudio("/audio/[09-2]村人陣営の勝利です.wav")
              setExecuting(false)
              setWinner("villagers")
              setPhase("result")
              return
            }

            if (result === "werewolves") {
              await playAudio("/audio/[09-1]人狼陣営の勝利です.wav")
              setWinner("werewolves")
              setPhase("result")
              setExecuting(false)
              return
            }

            if (result === "werewolves_by_no_knight") {
              await playAudio("/audio/[13-2]騎士がこの村に生存しておりませんので、人狼陣営の勝利です.wav")
              setWinner("werewolves")
              setPhase("result")
              setExecuting(false)
              return
            }

            setCurrentPlayer(getNextAlivePlayer(0, players))
            setPhase("night")
            setExecuting(false)

          }}

          style={theme === "mama" ? {
            marginTop: 40,
            padding: "14px 36px",
            fontSize: 20,
            borderRadius: 999,
            border: "2px solid #505050",
            background: executing ? "rgba(150,150,150,0.5)" : "#6b6b6b",
            color: "white",
            fontWeight: "bold",
            boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
            cursor: executing ? "not-allowed" : "pointer",
            opacity: executing ? 0.7 : 1
          } : {
            marginTop: 40,
            padding: "14px 36px",
            fontSize: 20,
            borderRadius: 14,
            border: "none",
            background: executing
              ? "rgba(200,200,200,0.6)"
              : "linear-gradient(135deg,#6bd4ff,#2b8cff)",
            color: "white",
            fontWeight: "bold",
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            cursor: executing ? "not-allowed" : "pointer",
            opacity: executing ? 0.7 : 1
          }}
        >
          {executing ? "処理中..." : "夜時間へ"}
        </button>
        {renderRoleSummaryButton()}
      </div>

    )

  }

  if (phase === "voteStart") {

    return (

      <div
        style={{
          backgroundImage: theme === "mama"
            ? `url(/image/${theme}/bg_voteStart.png)`
            : `url(/image/${theme}/bg_day.png)`,
          backgroundSize: theme === "mama" ? "contain" : "cover",
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
          position: "relative"

        }}
      >
        <AliveCounter players={players} theme={theme} currentPlayer={currentPlayer} phase={phase} />

        <h1
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 34,
            textShadow: "0 3px 12px rgba(0,0,0,0.6)",
            letterSpacing: 2
          }}
        >
          投票タイム
        </h1>

        <button
          onClick={() => setPhase("vote")}
          style={{
            marginTop: 30,
            padding: "10px 22px",
            fontSize: 16,
            color: "white",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: 12,
            backdropFilter: "blur(4px)",
            cursor: "pointer"
          }}
          >
          追放者選択画面へ
        </button>

      </div>

    )

  }

  if (phase === "result") {

    const bgImage =
      winner === "villagers"
        ? `url(/image/${theme}/bg_win_village.png)`
        : `url(/image/${theme}/bg_win_wolf.png)`

    return (
      <div
        style={{
          background: `${bgImage} center / ${theme === "mama" ? "contain" : "cover"} no-repeat`,
          color: "white",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          position: "relative",
        }}
      >

        <div
          style={{
            fontSize: 46,
            letterSpacing: 4,
            fontWeight: "bold",
            textShadow: "0 4px 16px rgba(0,0,0,0.6)",
            marginTop: 120
          }}
        >
          {winner === "villagers"
            ? "村人陣営の勝利"
            : "人狼陣営の勝利"}
        </div>

        <button
          onClick={() => {
            setPhase("reveal")
          }}
          style={theme === "mama" ? {
            padding: "16px 40px",
            marginTop: 120,
            fontSize: 22,
            borderRadius: 999,
            border: "2px solid #222",
            background: "#222",
            color: "white",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            cursor: "pointer",
          } : {
            padding: "16px 40px",
            marginTop: 120,
            fontSize: 22,
            borderRadius: 14,
            border: "none",
            background: "linear-gradient(135deg,#6bd4ff,#2b8cff)",
            color: "white",
            fontWeight: "bold",
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            cursor: "pointer",
          }}
        >
          ネタバラシ
        </button>
        {renderRoleSummaryButton()}
      </div>
    )
  }

  if (phase === "reveal") {

    const bgImage =
      winner === "villagers"
        ? `url(/image/${theme}/bg_win_village.png)`
        : `url(/image/${theme}/bg_win_wolf.png)`

    return (
      <div
        style={{
          background: `${bgImage} center / ${theme === "mama" ? "contain" : "cover"} no-repeat`,
          color: "white",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 20,
          paddingTop: 90,
          paddingBottom: 40,
          overflowY: "auto"
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
            letterSpacing: 2
          }}
        >
          役職公開
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
            marginTop: 60
          }}
        >

          {players.map((p, i) => (
            <div
              key={i}
              style={{
                textAlign: "center",
                padding: 10,
                background: "rgba(0,0,0,0.4)",
                borderRadius: 12
              }}
            >
              <div>プレイヤー {i+1}</div>

              <img src={p?.role.img} width={80} />

              <div>{p?.role.name}</div>

              <div>
                {p?.alive ? "生存" : "死亡"}
              </div>
            </div>
          ))}

        </div>

        <button
          onClick={() => {
            setPhase("modeSelect")
            setTimeLeft(180)
            setTimerRunning(false)
            setExecutedPlayer(null)
            setWinner(null)
            setCurrentPlayer(1)
            setShowRole(false)
            setSeerResults({})
            setMediumResults({})
            setWolfTarget(null)
            setGuardTargets({})
          }}
          style={theme === "mama" ? {
            padding: "16px 40px",
            fontSize: 22,
            borderRadius: 999,
            border: "2px solid #222",
            background: "#222",
            color: "white",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            cursor: "pointer",
          } : {
            padding: "16px 40px",
            fontSize: 22,
            borderRadius: 14,
            border: "none",
            background: "linear-gradient(135deg,#6bd4ff,#2b8cff)",
            color: "white",
            fontWeight: "bold",
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            cursor: "pointer",
          }}
        >
          トップへ
        </button>
        {renderRoleSummaryButton()}

      </div>
    )
  }

  if (phase === "night") {

    const advanceNightPlayer = () => {
      let next = currentPlayer + 1
      while (next <= playerCount) {
        const p = players[next - 1]
        if (p && p.alive) break
        next++
      }
      setCurrentPlayer(next)
      setNightActionReady(false)
      if (next > playerCount) {
        const finished = resolveNight()
        if (!finished) {
          setDay(d => d + 1)
          setCurrentPlayer(1)
          setPhase("morning")
        }
        setTimeLeft(120)
        setTimerRunning(false)
        setNightActionReady(false)
        setCurrentPlayer(1)
      }
    }

    if (aiMode && currentPlayer !== 1) {
      const aiPlayer = players[currentPlayer - 1]
      if (aiPlayer) {
        const roleId = aiPlayer.role.id
        return (
          <div
            className={styles.screenBase}
            style={{
              backgroundImage: `url(/image/${theme}/bg_night.png)`,
              backgroundSize: theme === "mama" ? "contain" : "cover",
            }}
          >
            <AliveCounter players={players} theme={theme} currentPlayer={currentPlayer} phase={phase} />
            <div className={styles.topCenterTitle}>
              <h1 className={styles.titleLarge}>{day + 1}日目の夜</h1>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, opacity: 0.75, marginBottom: 16 }}>
                プレイヤー {currentPlayer}（AI）
              </div>

              {(roleId === "villager" || roleId === "madman") && (
                <>
                  <p style={{ opacity: 0.8, marginBottom: 20 }}>夜の行動なし</p>
                  <button onClick={advanceNightPlayer} className={theme === "mama" ? styles.blueButtonMama : styles.blueButton}>
                    次のプレイヤー
                  </button>
                </>
              )}

              {roleId === "werewolf" && wolfTarget === null && (
                <>
                  <p style={{ opacity: 0.8, marginBottom: 8 }}>ThreadLogicsを確認して襲撃先を入力</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginTop: 12 }}>
                    {players.map((p, i) => {
                      const num = i + 1
                      if (num === currentPlayer) return null
                      if (!players[i]?.alive) return null
                      if (players[i]?.role?.id === "werewolf") return null
                      return (
                        <button
                          key={num}
                          onClick={() => { setWolfTarget(num); setWolfDecider(currentPlayer) }}
                          style={{ padding: "14px 20px", fontSize: 18, borderRadius: 14, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", color: "white", backdropFilter: "blur(6px)", cursor: "pointer" }}
                        >
                          プレイヤー {num}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {roleId === "werewolf" && wolfTarget !== null && (
                <>
                  <p style={{ fontSize: 20, marginBottom: 16 }}>襲撃先：プレイヤー {wolfTarget}</p>
                  <button onClick={advanceNightPlayer} className={theme === "mama" ? styles.blueButtonMama : styles.blueButton}>
                    次のプレイヤー
                  </button>
                </>
              )}

              {roleId === "knight" && !guardTargets[currentPlayer] && (
                <>
                  <p style={{ opacity: 0.8, marginBottom: 8 }}>ThreadLogicsを確認して護衛先を入力</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginTop: 12 }}>
                    {players.map((p, i) => {
                      const num = i + 1
                      if (num === currentPlayer) return null
                      if (!players[i]?.alive) return null
                      return (
                        <button
                          key={num}
                          disabled={lastGuardTarget[currentPlayer] === num}
                          onClick={() => {
                            setGuardTargets(prev => ({ ...prev, [currentPlayer]: num }))
                            setLastGuardTarget(prev => ({ ...prev, [currentPlayer]: num }))
                          }}
                          style={{ padding: "14px 20px", fontSize: 18, borderRadius: 14, border: "1px solid rgba(255,255,255,0.35)", background: lastGuardTarget[currentPlayer] === num ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)", color: lastGuardTarget[currentPlayer] === num ? "rgba(255,255,255,0.4)" : "white", backdropFilter: "blur(6px)", cursor: lastGuardTarget[currentPlayer] === num ? "not-allowed" : "pointer" }}
                        >
                          プレイヤー {num}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {roleId === "knight" && guardTargets[currentPlayer] && (
                <>
                  <p style={{ fontSize: 20, marginBottom: 16 }}>護衛先：プレイヤー {guardTargets[currentPlayer]}</p>
                  <button onClick={advanceNightPlayer} className={theme === "mama" ? styles.blueButtonMama : styles.blueButton}>
                    次のプレイヤー
                  </button>
                </>
              )}

              {roleId === "seer" && !seerActed[currentPlayer] && (
                <>
                  <p style={{ opacity: 0.8, marginBottom: 8 }}>ThreadLogicsを確認して占い先を入力</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginTop: 12 }}>
                    {players.map((p, i) => {
                      const num = i + 1
                      if (num === currentPlayer) return null
                      if (!players[i]?.alive) return null
                      if (seerResults[currentPlayer]?.[num]) return null
                      return (
                        <button
                          key={num}
                          onClick={() => {
                            const target = players[i]?.role
                            const seerTarget = players[i]?.id
                            const result = target?.id === "werewolf" ? "black" : "white"
                            setSeerToday(prev => ({ ...prev, [currentPlayer]: { target: num, result } }))
                            setSeerResults(prev => ({ ...prev, [currentPlayer]: { ...(prev[currentPlayer] || {}), [seerTarget!]: result } }))
                            setSeerActed(prev => ({ ...prev, [currentPlayer]: true }))
                          }}
                          style={{ padding: "14px 20px", fontSize: 18, borderRadius: 14, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", color: "white", backdropFilter: "blur(6px)", cursor: "pointer" }}
                        >
                          プレイヤー {num}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {roleId === "seer" && seerActed[currentPlayer] && (
                <>
                  <p style={{ fontSize: 20, marginBottom: 16 }}>
                    占い結果：プレイヤー {seerToday[currentPlayer]?.target} は{seerToday[currentPlayer]?.result === "black" ? "人狼" : "人狼ではない"}
                  </p>
                  <button onClick={advanceNightPlayer} className={theme === "mama" ? styles.blueButtonMama : styles.blueButton}>
                    次のプレイヤー
                  </button>
                </>
              )}
            </div>
            {renderRoleSummaryButton()}
          </div>
        )
      }
    }

    const player = players[currentPlayer - 1]
    const firstWolf = players.findIndex(p => p?.role.id === "werewolf") + 1

    return (

      <div
        className={styles.screenBase}
        style={{
          backgroundImage: `url(/image/${theme}/bg_night.png)`,
          backgroundSize: theme === "mama" ? "contain" : "cover"
        }}
      >
        <AliveCounter players={players} theme={theme} currentPlayer={currentPlayer} phase={phase} />

        <div className={styles.topCenterTitle}>
          <h1 className={styles.titleLarge}>
            {day+1}日目の夜
          </h1>
        </div>

        {!nightActionReady && (

          <div className={`${styles.flexCenterColumn} ${styles.gap16}`}>

            <div className={theme === "mama" ? styles.playerBadgeMama : styles.playerBadge}>
              プレイヤー {currentPlayer}
            </div>

            <button
              onClick={() => {

                const role = players[currentPlayer - 1]

                setNightActionReady(true)
                setShowNextButton(false)

                if (role?.role.id === "villager" || role?.role.id === "madman" || role?.role.id === "medium") {
                  const delay = randomDelay(3000, 5000)
                  setTimeout(() => {
                    setShowNextButton(true)
                  }, delay)

                } else if(role?.role.id !== "werewolf" && role?.role.id !== "knight" && role?.role.id !== "seer") {
                  setShowNextButton(true)
                } else if (role?.role.id === "werewolf" && wolfTarget !== null) {
                  setShowNextButton(true)
                }

              }
            }
            className={theme === "mama" ? styles.orangeButtonMama : styles.orangeButton}
            >
            画面タップ
            </button>
          </div>

        )}

        {nightActionReady && player && (

          <div style={{ textAlign: "center" }}>

              <RoleDisplay
                name={player.role.name}
                img={player.role.img}
              />

            {(player.role.id === "werewolf" || player.role.id === "madman") &&
              getVisiblePlayers(currentPlayer - 1).length > 0 && (
              <button
                onClick={() => setModalType("wolf")}
                style={{
                  marginTop: 0,
                  marginBottom: 12,
                  fontSize: 20,
                  color: "rgba(255,255,255,0.7)",
                  background: "transparent",
                  border: "none",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                🔍 仲間確認
              </button>
            )}

            {player.role.id === "medium" && (
              <>
                {Object.keys(mediumResults).length > 0 && (() => {
                  const latestTarget = Math.max(...Object.keys(mediumResults).map(Number))
                  const latestResult = mediumResults[latestTarget]
                  return (
                    <p
                      style={{
                        marginTop: 12,
                        fontSize: 22,
                        fontWeight: "bold",
                        marginBottom: 8,
                      }}
                    >
                      プレイヤー {latestTarget} は{" "}
                      {latestResult === "black" ? "人狼でした" : "人狼ではありません"}
                    </p>
                  )
                })()}

                <button
                  onClick={() => setModalType("medium")}
                  style={{
                    marginTop: 12,
                    marginBottom: 4,
                    fontSize: 20,
                    color: "rgba(255,255,255,0.7)",
                    background: "transparent",
                    border: "none",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  👁 霊視結果一覧
                  {Object.keys(mediumResults).length === 0 && (
                    <span style={{ fontSize: 13, opacity: 0.6, marginLeft: 6 }}>（まだなし）</span>
                  )}
                </button>
              </>
            )}

            {player.role?.id === "seer" && (
              <>
                {seerToday[currentPlayer] && (
                  <p
                    style={{
                      marginTop: 12,
                      fontSize: 22,
                      fontWeight: "bold",
                      marginBottom: 12,
                    }}>
                    プレイヤー {seerToday[currentPlayer].target} は{" "}
                    {seerToday[currentPlayer].result === "white"
                      ? "人狼ではありません"
                      : "人狼です"}
                  </p>
                )}

                <button
                  onClick={() => setModalType("seer")}
                  style={{
                    marginTop: 0,
                    marginBottom: 10,
                    fontSize: 20,
                    color: "rgba(255,255,255,0.7)",
                    background: "transparent",
                    border: "none",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  🔍 占い結果一覧
                </button>

                {!seerActed[currentPlayer] && (
                  <div>
                    <h3>占うプレイヤーを選択</h3>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 14,
                      marginTop: 20
                    }}>
                      {players.map((p, i) => {
                        const num = i + 1
                        if (num === currentPlayer) return null
                        if (!players[i]?.alive) return null
                        if (seerResults[currentPlayer]?.[num]) return null

                        return (
                          <button
                            key={num}
                            onClick={() => {

                              const target = players[i]?.role
                              const seerTarget = players[i]?.id
                              const result = target?.id === "werewolf" ? "black" : "white"

                              setSeerToday(prev => ({
                                ...prev,
                                [currentPlayer]: {
                                  target: num,
                                  result
                                }
                              }))

                              setSeerResults(prev => ({
                                ...prev,
                                [currentPlayer]: {
                                  ...(prev[currentPlayer] || {}),
                                  [seerTarget!]: result
                                }
                              }))

                              setSeerActed(prev => ({
                                ...prev,
                                [currentPlayer]: true
                              }))

                              setShowNextButton(true)
                            }}
                            style={{
                              padding: "14px 20px",
                              fontSize: 18,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.35)",
                              background: "rgba(255,255,255,0.15)",
                              color: "white",
                              backdropFilter: "blur(6px)",
                              cursor: "pointer"
                              }}
                            >
                              プレイヤー {num}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                </>
              )}

              {player.role?.id === "knight" && !guardTargets[currentPlayer] && (
                <div>
                  <h3>護衛するプレイヤーを選択</h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 14,
                      marginTop: 20
                    }}
                  >

                    {players.map((p, i) => {

                      const num = i + 1

                      if (num === currentPlayer) return null
                      if (!players[i]?.alive) return null

                      return (
                        <button
                          key={num}
                          disabled={lastGuardTarget[currentPlayer] === num}
                          onClick={() => {
                            setGuardTargets(prev => ({
                              ...prev,
                              [currentPlayer]: num
                            }))

                            setLastGuardTarget(prev => ({
                              ...prev,
                              [currentPlayer]: num
                            }))

                            setShowNextButton(true)
                          }}
                          style={{
                            position: "relative",
                            overflow: "hidden",
                            padding: "14px 20px",
                            fontSize: 18,
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.35)",
                            background:
                              lastGuardTarget[currentPlayer] === num
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(255,255,255,0.15)",
                            color:
                              lastGuardTarget[currentPlayer] === num
                                ? "rgba(255,255,255,0.5)"
                                : "white",
                            backdropFilter: "blur(6px)",
                            cursor:
                              lastGuardTarget[currentPlayer] === num
                                ? "not-allowed"
                                : "pointer"
                          }}
                        >
                          プレイヤー {num}

                          {lastGuardTarget[currentPlayer] === num && (
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                pointerEvents: "none",
                                background:
                                  "linear-gradient(160deg, transparent 48%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.9) 50%, transparent 52%)"
                              }}
                            />
                          )}
                        </button>
                      )
                  })}
                </div>
              </div>
            )}

            {
              player.role?.id === "knight" &&
              guardTargets[currentPlayer] && (
                <div>
                  <h3>護衛先</h3>
                  <p style={{ fontSize: 24 }}>
                    プレイヤー {guardTargets[currentPlayer]}
                  </p>
                  <p>このプレイヤーを護衛します</p>
                </div>
              )
            }

            {player.role?.id === "werewolf" && wolfTarget === null && (
              <div>
                <h3>襲撃するプレイヤーを選択</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 14,
                    marginTop: 20
                  }}
                >

                  {players.map((p, i) => {

                    const num = i + 1

                    if (num === currentPlayer) return null
                    if (!players[i]?.alive) return null
                    if (players[i]?.role?.id === "werewolf") return null

                    return (
                      <button
                        key={num}
                        onClick={() => {
                          setWolfTarget(num)
                          setWolfDecider(currentPlayer)
                          setShowNextButton(true)
                        }}
                        style={{
                            padding: "14px 20px",
                            fontSize: 18,
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.35)",
                            background: "rgba(255,255,255,0.15)",
                            color: "white",
                            backdropFilter: "blur(6px)",
                            cursor: "pointer"
                        }}
                      >
                        プレイヤー {num}
                      </button>
                    )
                })}
                </div>
              </div>
            )}

            {
              player.role?.id === "werewolf" &&
              wolfTarget !== null &&
              wolfDecider === currentPlayer && (
              <div>
                <h3>襲撃先</h3>
                <p style={{ fontSize: 24 }}>プレイヤー {wolfTarget}</p>
                <p>
                  {wolfDecider === currentPlayer
                    ? "あなたがこのプレイヤーを襲撃します"
                    : "仲間の人狼がこのプレイヤーを襲撃します"}
                </p>
              </div>
              )
            }

            {(player.role?.id === "villager" || player.role?.id === "madman" || player.role?.id === "medium") && !showNextButton && (
              <p>次のプレイヤーへ進むボタンが<br />表示されるまでお待ちください...</p>
            )}

            {showNextButton &&
            (
              (player.role.id !== "werewolf" || wolfTarget !== null) &&
              (player.role.id !== "knight" || !!guardTargets[currentPlayer]) &&
              (player.role.id !== "seer" || Object.keys(seerResults[currentPlayer] || {}).length > 0)
            ) && (

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 10
                }}
              >
                <button
                  onClick={() => {

                    let next = currentPlayer + 1

                    while (next <= playerCount) {
                      const p = players[next - 1]
                      if (p && p.alive) break
                      next++
                    }
                    setCurrentPlayer(next)
                    setNightActionReady(false)
                    if (next > playerCount) {
                      const finished = resolveNight()
                      if (!finished) {
                        setDay(d => d + 1)
                        setCurrentPlayer(1)
                        setPhase("morning")
                      }
                      setTimeLeft(120)
                      setTimerRunning(false)
                      setNightActionReady(false)
                      setCurrentPlayer(1)
                      return
                    }
                  }}
                  className={theme === "mama" ? styles.blueButtonMama : styles.blueButton}
                  >
                    次のプレイヤー
                </button>
              </div>
            )}
          </div>
        )}
        <BuildModal
          isOpen={modalType !== null}
          onClose={() => setModalType(null)}
          players={players}
          currentPlayer={currentPlayer}
          results={
            modalType === "medium"
              ? buildMediumResults(currentPlayer)
              : buildNightResults(currentPlayer)
          }
          theme={theme}
          title={
            modalType === "wolf"
              ? "👥 仲間情報"
              : modalType === "medium"
                ? "👁 霊視結果"
                : "🔍 占い結果"
          }
        />
        {renderRoleSummaryButton()}
      </div>
    )
  }

  if (phase === "vote") {

    return (

      <div
        style={{
          backgroundImage: theme === "mama"
            ? `url(/image/${theme}/bg_vote.png)`
            : `url(/image/${theme}/bg_day.png)`,
          backgroundSize: theme === "mama" ? "contain" : "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",

          backgroundBlendMode: "darken",
          backgroundColor: "rgba(0,0,0,0.25)",

          color: "white",

          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 20,
          position: "relative",
          paddingTop: 140,
          paddingBottom: 40,
          overflowY: "auto"
        }}
      >
        <AliveCounter players={players} theme={theme} currentPlayer={currentPlayer} phase={phase} />

        <h1
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 34,
            textShadow: "0 3px 12px rgba(0,0,0,0.6)",
            letterSpacing: 2,
            textAlign: "center",
            width: "100%",
            lineHeight: 1.25
          }}
        >
          {tieMode ? (
            <>
              同数プレイヤー
              <br />
              を選択
            </>
          ) : "追放者決定"}
        </h1>

        {!tieMode && (
          <>
            <h1>追放するプレイヤーを選択</h1>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 10,
                marginTop: 20
              }}
            >
              {players.map((p, i) => {
                const dead = p?.alive === false
                return (
                  <button
                    key={i}
                    disabled={dead}
                    style={{
                      width: 160,
                      padding: 12,
                      margin: 4,
                      fontSize: 18,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.25)",
                      background: dead ? "rgba(80,80,80,0.65)" : "rgba(255,255,255,0.6)",
                      color: "white",
                      cursor: dead ? "not-allowed" : "pointer",
                      opacity: dead ? 0.4 : 1,
                      backdropFilter: "blur(6px)"
                    }}
                    onClick={() => { if (!dead) setVoteTarget(i + 1) }}
                  >
                    プレイヤー {i + 1}
                    {dead}
                  </button>
                )
              })}
            </div>

            {voteTarget !== null && (
              <div>
                <div style={{ marginTop: 20, textAlign: "center" }}>
                  <p>プレイヤー {voteTarget} を追放しますか？</p>
                </div>
                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 16
                  }}
                >
                  <button
                    onClick={() => executePlayer(voteTarget)}
                    className={theme === "mama" ? styles.blueButtonMama : styles.blueButton}
                    style={theme === "mama" ? {
                      marginTop: 0,
                      padding: "12px 26px",
                    } : {
                      marginTop: 0,
                      padding: "12px 26px",
                      fontSize: 18,
                    }}
                  >
                    決定
                  </button>
                  <button
                    style={{
                      padding: "10px 22px",
                      fontSize: 16,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.35)",
                      color: "white",
                      cursor: "pointer"
                    }}
                    onClick={() => setVoteTarget(null)}
                  >
                    戻る
                  </button>
                </div>
              </div>
            )}

            {voteTarget === null && (
              <button
                onClick={() => { setTieMode(true); setTieTargets([]) }}
                style={{
                  marginTop: 8,
                  padding: "10px 22px",
                  fontSize: 15,
                  borderRadius: 12,
                  background: "rgba(255,200,50,0.2)",
                  border: "1px solid rgba(255,200,50,0.5)",
                  color: "rgba(255,230,100,1)",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)"
                }}
              >
                🎲 同数だった場合のランダム追放
              </button>
            )}
          </>
        )}

        {tieMode && (
          <>
            <p style={{ margin: "32px 0 0", opacity: 0.8, fontSize: 15 }}>
              同数だったプレイヤーを
              <br />
              選択してください（複数選択）
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 10,
                marginTop: 4
              }}
            >
              {players.map((p, i) => {
                const dead = p?.alive === false
                const selected = tieTargets.includes(i + 1)
                return (
                  <button
                    key={i}
                    disabled={dead}
                    style={{
                      width: 160,
                      padding: 12,
                      margin: 4,
                      fontSize: 18,
                      borderRadius: 12,
                      border: selected
                        ? "2px solid rgba(255,200,50,0.9)"
                        : "1px solid rgba(255,255,255,0.25)",
                      background: dead
                        ? "rgba(80,80,80,0.65)"
                        : selected
                          ? "rgba(255,200,50,0.35)"
                          : "rgba(255,255,255,0.15)",
                      color: dead ? "rgba(255,255,255,0.4)" : "white",
                      cursor: dead ? "not-allowed" : "pointer",
                      opacity: dead ? 0.4 : 1,
                      backdropFilter: "blur(6px)",
                      fontWeight: selected ? "bold" : "normal"
                    }}
                    onClick={() => {
                      if (dead) return
                      setTieTargets(prev =>
                        prev.includes(i + 1)
                          ? prev.filter(n => n !== i + 1)
                          : [...prev, i + 1]
                      )
                    }}
                  >
                    プレイヤー {i + 1}
                    {selected && " ✓"}
                  </button>
                )
              })}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                disabled={tieTargets.length < 2}
                onClick={() => {
                  const picked = tieTargets[Math.floor(Math.random() * tieTargets.length)]
                  setTieMode(false)
                  setTieTargets([])
                  executePlayer(picked)
                }}
                style={{
                  padding: "12px 24px",
                  fontSize: 17,
                  borderRadius: 12,
                  border: "none",
                  background: tieTargets.length < 2
                    ? "rgba(150,150,150,0.4)"
                    : "linear-gradient(135deg,#ffcc33,#ff9900)",
                  color: "white",
                  cursor: tieTargets.length < 2 ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  opacity: tieTargets.length < 2 ? 0.5 : 1
                }}
              >
                🎲 ランダム追放実行
              </button>

              <button
                onClick={() => { setTieMode(false); setTieTargets([]) }}
                style={{
                  padding: "10px 20px",
                  fontSize: 15,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                キャンセル
              </button>
            </div>
          </>
        )}
        {renderRoleSummaryButton()}

      </div>

    )

  }

  if (phase === "morning" && aiMode) {
    return (
      <DiscussionChat
        gameId={gameId}
        day={day}
        morningDeath={morningDeath}
        playerAssignments={playerAssignments}
        onEndDiscussion={endDiscussion}
      />
    )
  }

  if (phase === "morning") {

    const isDiscussion = discussionReady && timerRunning
    const isPaused = discussionReady && !timerRunning && !discussionEnded
    const isMamaMorningLayout = theme === "mama" && !discussionReady && !isPaused

    return (

      <div
        style={{
          backgroundImage: discussionReady
            ? `url(/image/${theme}/bg_day.png)`
            : `url(/image/${theme}/bg_morning.png)`,

          backgroundSize: theme === "mama" ? "contain" : "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",

          backgroundBlendMode: "darken",

          backgroundColor: timerRunning
            ? "rgba(0,0,0,0.25)"
            : "transparent",

          color: "white",

          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: isMamaMorningLayout ? "flex-start" : "center",
          gap: 20,
          position: "relative",
          paddingTop: isMamaMorningLayout ? 140 : 0
        }}
      >

          <AliveCounter players={players} theme={theme} currentPlayer={currentPlayer} phase={phase} />

          <div
            style={{
              position: "absolute",
              top: 60,
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center"
            }}
          >
            <h1
              style={{
                fontSize: 34,
                textShadow: "0 3px 12px rgba(0,0,0,0.6)",
                letterSpacing: 2
              }}
            >
              {discussionReady
                ? `${day + 1}日目の昼`
                : `${day + 1}日目の朝`}
            </h1>
          </div>

          {!timerRunning && day !== 0 && !isPaused && (
            <div
              style={{
                marginTop:
                  isMamaMorningLayout
                    ? 0
                    : 120,
                padding: "16px 28px",
                borderRadius: 16,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(6px)",
                textAlign: "center"
              }}
            >
                {morningDeath === null ? (
                  <p>昨晩の犠牲者はいませんでした</p>
                ) : (
                  <p>昨晩の犠牲者：プレイヤー {morningDeath}</p>
                )}
            </div>
          )}

          <div
            style={{
              marginTop:
                isMamaMorningLayout
                  ? day !== 0
                    ? 20
                    : 12
                  : 10,
              textAlign: "center",
              ...(isMamaMorningLayout && !discussionReady && !isPaused && {
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(4px)",
                borderRadius: 16,
                padding: "12px 32px"
              })
            }}
          >

            <div
              style={{
                fontSize: 22,
                opacity: 0.9,
                letterSpacing: 2,
                textShadow: "0 2px 8px rgba(0,0,0,0.5)"
              }}
            >
            {discussionReady || isPaused
              ? `残り時間`
              : `議論時間`}
            </div>

            <div
              style={{
                fontSize: 80,
                fontWeight: "bold",
                color: timeLeft <= 10 ? "#ff4d4d" : "white"
              }}
            >
              {formatTime(timeLeft)}
            </div>

          </div>

        {isDiscussion && !isPaused && (

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={pauseTimer}
              style={{
                marginTop: 30,
                padding: "10px 22px",
                fontSize: 16,
                color: "white",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: 12,
                backdropFilter: "blur(4px)",
                cursor: "pointer",
                width: 120
              }}
            >
              一時停止
            </button>

            <button
              onClick={endDiscussion}
              style={{
                marginTop: 30,
                padding: "10px 22px",
                fontSize: 16,
                color: "white",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: 12,
                backdropFilter: "blur(4px)",
                cursor: "pointer",
                width: 120
              }}
            >
              議論終了
            </button>
          </div>
        )}

        { isPaused && (
          <button
          onClick={startTimer}
          style={{
            marginTop: 30,
            padding: "10px 22px",
            fontSize: 16,
            color: "white",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: 12,
            backdropFilter: "blur(4px)",
            cursor: "pointer",
            width: 120
          }}
          >
            再開
          </button>
        )}
        {renderRoleSummaryButton()}
      </div>
    )
  }

  if (phase === "roleCheck") {

    const player = players[currentPlayer - 1]
    const visiblePlayers = getVisiblePlayers(currentPlayer - 1)

    return (

      <div
        className={styles.screenBase}
        style={{
          backgroundImage: `url(/image/${theme}/bg_night.png)`,
          backgroundSize: theme === "mama" ? "contain" : "cover"
        }}
      >
        <AliveCounter players={players} theme={theme} currentPlayer={currentPlayer} phase={phase} />

        <div className={styles.flexCenterColumn}>

        <div className={styles.topCenterTitle}>
          <h1 className={styles.titleXL}>
            役職確認
          </h1>
        </div>

          {!showRole && (

            <div className={`${styles.flexCenterColumn} ${styles.gap16}`}>

              <div className={theme === "mama" ? styles.playerBadgeMama : styles.playerBadge}>
                プレイヤー {currentPlayer}{aiMode && currentPlayer !== 1 ? "（AI）" : ""}
              </div>

              {aiMode && currentPlayer !== 1 ? (
                <>
                  <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, textAlign: "center" }}>
                    MCPで役職を確認してください
                  </p>
                  <button
                    onClick={nextPlayer}
                    className={theme === "mama" ? styles.blueButtonMama : styles.blueButton}
                  >
                    確認済
                  </button>
                </>
              ) : (
                <button
                  onClick={revealRole}
                  className={theme === "mama" ? styles.orangeButtonMama : styles.orangeButton}
                >
                  役職確認
                </button>
              )}
            </div>

          )}

          {showRole && player && (

            <div style={{ textAlign: "center" }}>

              <RoleDisplay
                name={player.role.name}
                img={player.role.img}
              />

              {visiblePlayers.length > 0 && (
                <div>
                  <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 16
                    }}>

                      <div style={{
                        display: "flex",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        gap: 8
                      }}>
                        <div style={{
                          fontSize: 25,
                          marginTop: 8,
                          opacity: 0.9
                        }}>
                          仲間：
                        </div>

                        {visiblePlayers.map(p => (
                          <div
                            key={p.id}
                            style={{
                              padding: "12px 12px",
                              borderRadius: 999,
                              fontSize: 20,
                              boxShadow:
                              p.role === "人狼"
                                ? "0 0 12px rgba(255,77,79,0.6)"
                                : "0 0 8px rgba(255,255,255,0.3)",
                              background:
                                p.role === "人狼"
                                  ? "rgba(255,77,79,0.2)"
                                  : "rgba(200,200,200,0.2)",
                              color:
                                p.role === "人狼"
                                  ? "#ff4d4f"
                                  : "#ccc",
                              border:
                                p.role === "人狼"
                                  ? "1px solid rgba(255,77,79,0.4)"
                                  : "1px solid rgba(255,255,255,0.2)"
                            }}
                          >
                            {p.id} {p.role}
                          </div>
                        ))}
                      </div>

                  </div>

                  <button
                    onClick={() => setModalType("wolf")}
                    style={{
                      marginTop: 20,
                      fontSize: 20,
                      color: "rgba(255,255,255,0.7)",
                      background: "transparent",
                      border: "none",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                  🔍 仲間確認
                  </button>
                </div>

              )}

              {player.role.id === "seer" && seerResults[currentPlayer] && (
                <div>
                  <p
                    style={{
                      marginTop: 12,
                      fontSize: 22,
                      fontWeight: "bold",
                    }}>
                      プレイヤー {Object.keys(seerResults[currentPlayer])[0]} は人狼ではありません
                  </p>

                  <button
                    onClick={() => setModalType("seer")}
                    style={{
                      marginTop: 20,
                      fontSize: 20,
                      color: "rgba(255,255,255,0.7)",
                      background: "transparent",
                      border: "none",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                  🔍 占い結果一覧
                  </button>
                </div>

              )}

              <button
                onClick={nextPlayer}
                className={theme === "mama" ? styles.blueButtonMama : styles.blueButton}
              >
                確認済
              </button>

            </div>

          )}

        </div>
        <BuildModal
          isOpen={modalType !== null}
          onClose={() => setModalType(null)}
          players={players}
          currentPlayer={currentPlayer}
          results={buildNightResults(currentPlayer)}
          theme={theme}
          title={
            modalType === "wolf"
              ? "👥 仲間情報"
              : "🔍 占い結果"
          }
        />
        {renderRoleSummaryButton()}
      </div>
    )
  }

  if (phase === "modeSelect") {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        }}
      >
        <img
          src="/icon.png"
          alt="スマホGM人狼"
          style={{ width: 120, height: 120, borderRadius: 24, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
        />

        <h1
          style={{
            color: "white",
            fontSize: 32,
            fontWeight: "bold",
            letterSpacing: 4,
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
            margin: 0,
          }}
        >
          スマホGM人狼
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 240 }}>
          <button
            onClick={() => setPhase("setup")}
            style={{
              padding: "16px 0",
              fontSize: 20,
              fontWeight: "bold",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #e05c5c, #c0392b)",
              color: "white",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            }}
          >
            🐺 人狼ゲーム
          </button>

          <button
            onClick={() => router.push("/onenightwolf")}
            style={{
              padding: "16px 0",
              fontSize: 20,
              fontWeight: "bold",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #6f58c9, #9b7bff)",
              color: "white",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            }}
          >
            🌙 一夜人狼
          </button>

          <button
            onClick={() => router.push("/wordwolf")}
            style={{
              padding: "16px 0",
              fontSize: 20,
              fontWeight: "bold",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #79c96b, #44b98c)",
              color: "white",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            }}
          >
            🗣 言葉人狼
          </button>

          <button
            onClick={() => router.push("/history")}
            style={{ padding: "12px 0", fontSize: 16, fontWeight: "bold", borderRadius: 14, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", cursor: "pointer", width: 240 }}
          >
            📜 対戦履歴
          </button>
        </div>

      </div>
    )
  }

  return (

    <div
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        colorScheme: "light",
      }}
    >

      {/* 1段目：戻る ／ ルール設定 */}
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <button
          onClick={() => setPhase("modeSelect")}
          className={styles.setupTopButton}
        >
          ← 戻る
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowRuleHelp(true)}
            className={styles.setupTopButton}
          >
            ルール説明
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className={styles.setupTopButton}
            style={{ fontWeight: "normal", opacity: 0.9 }}
          >
            ルール設定
          </button>
        </div>
      </div>

      {/* 2段目：イラスト切替 */}
      <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 3 }}>
        <button
          onClick={() => setTheme("mama")}
          className={`${styles.illustrationButton} ${theme === "mama" ? styles.illustrationButtonActive : ""}`}
        >
          イラスト1
        </button>

        <button
          onClick={() => setTheme("ai")}
          className={`${styles.illustrationButton} ${theme === "ai" ? styles.illustrationButtonActive : ""}`}
        >
          イラスト2
        </button>
      </div>

      <div className={`${styles.titleImageWrap} ${theme === "mama" ? styles.titleImageWrapMama : ""}`}>
        <img
          src={`/image/${theme}/title.png`}
          alt=""
          className={styles.titleImageElement}
          style={{
            maxHeight: theme === "ai" ? 160 : 120,
          }}
        />
      </div>

      <div style={{ marginBottom: 3 }}>
        人数
        <select
          className={styles.lightControl}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "2px solid #888",
            fontSize: 16,
            cursor: "pointer"
          }}
          value={playerCount}
          onChange={(e) => {
            const n = Number(e.target.value)
            setPlayerCount(n)
            setPlayers(Array.from({ length: n }, () => null))
          }}
        >
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
          <option value={6}>6</option>
          <option value={7}>7</option>
          <option value={8}>8</option>
        </select>
      </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>

        <h2
          className={styles.sectionTitle}
        >
          配役選択
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 3,
            justifyContent: "center"
          }}
        >
          {players.map((role, i) => (
            <PlayerSlot
              key={i}
              id={i + 1}
              role={role?.role ?? null}
              theme={theme}
            />
          ))}
        </div>

        <h2
          className={styles.sectionTitle}
        >
          役職
        </h2>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center"}}>
          {roles.map((r) => (
            <RoleCard key={r.id} role={r} />
          ))}
        </div>
      </DndContext>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, marginBottom: 4 }}>
        <button
          onClick={() => setAiMode(!aiMode)}
          style={{
            padding: "10px 20px",
            fontSize: 15,
            borderRadius: 999,
            border: aiMode ? "2px solid #6bd4ff" : "1px solid #aaa",
            background: aiMode ? "rgba(107,212,255,0.15)" : "rgba(200,200,200,0.15)",
            color: aiMode ? "#6bd4ff" : "#888",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          🤖 AIと遊ぶ: {aiMode ? "ON" : "OFF"}
        </button>
      </div>

      {aiMode && (
        <div style={{ width: "100%", marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#555", marginBottom: 8, textAlign: "center" }}>
            キャラクター割り当て
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: playerCount }, (_, i) => i + 1).map(num => (
              <div key={num} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ minWidth: 32, fontSize: 13, color: "#888", fontWeight: "bold" }}>P{num}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(Object.entries(CHARACTERS) as [string, typeof CHARACTERS[keyof typeof CHARACTERS]][]).map(([cid, char]) => {
                    const selected = playerAssignments[num] === cid
                    const usedByOther = Object.entries(playerAssignments).some(([k, v]) => v === cid && Number(k) !== num)
                    return (
                      <button
                        key={cid}
                        disabled={usedByOther}
                        onClick={() => setPlayerAssignments(prev => ({ ...prev, [num]: cid }))}
                        style={{
                          display: "flex", alignItems: "center", gap: 3,
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: selected ? `2px solid ${char.color}` : "1px solid #ddd",
                          background: selected ? `${char.color}20` : usedByOther ? "#f5f5f5" : "white",
                          cursor: usedByOther ? "not-allowed" : "pointer",
                          opacity: usedByOther ? 0.4 : 1,
                          fontSize: 12,
                          color: selected ? char.color : "#555",
                          fontWeight: selected ? "bold" : "normal",
                        }}
                      >
                        <img src={char.img} style={{ width: 20, height: 20, borderRadius: "50%" }} alt="" />
                        {char.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={startGame}
        className={theme === "mama" ? styles.mainStartButtonMama : styles.mainStartButtonAi}
      >
        ゲーム開始
      </button>

      {showRuleHelp && (
        <div
          onClick={() => setShowRuleHelp(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            zIndex: 9999
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "#fff",
              color: "#222",
              WebkitTextFillColor: "#222",
              colorScheme: "light",
              padding: 24,
              borderRadius: 16,
              width: "min(100%, 380px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              lineHeight: 1.7
            }}
          >
            <div style={{ fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 14 }}>
              人狼ゲームのルール
            </div>
            <p style={{ margin: "0 0 10px" }}>
              村人陣営は、昼の話し合いで人狼を見つけて追放することを目指します。
            </p>
            <p style={{ margin: "0 0 10px" }}>
              人狼陣営は、夜に村人を襲いながら正体を隠し、村人と同数以上になることを目指します。
            </p>
            <p style={{ margin: 0 }}>
              占い師、騎士、霊能者、狂人などの役職は、それぞれの能力を使って陣営の勝利を助けます。
            </p>
            <button
              onClick={() => setShowRuleHelp(false)}
              className={theme === "mama" ? styles.modalActionButtonMamaPurple : undefined}
              style={theme === "mama"
                ? { width: "100%", marginTop: 20 }
                : { width: "100%", marginTop: 20, padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6bd4ff,#2b8cff)", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 設定画面のモーダル */}
      {showSettings && (

        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "rgb(255, 255, 255)",
            backdropFilter: "blur(10px)",
            padding: 24,
            borderRadius: 16,
            width: 320,
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            color: "black"
          }}>
            <div style={{
              textAlign: "center",
              marginBottom: 16
            }}>
              <div style={{
                fontSize: 18,
                fontWeight: "bold",
                letterSpacing: 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.1)"
              }}>
                ⚙ ゲーム設定
              </div>

              <label
                onClick={() => setShowWolfToMadman(!showWolfToMadman)}
                className={`${theme === "mama" ? styles.toggleLabelMama : styles.toggleLabel} ${
                  showWolfToMadman ? (theme === "mama" ? styles.toggleLabelMamaActive : styles.toggleLabelActive) : ""
                }`}
              >
                <div
                  className={`${theme === "mama" ? styles.toggleBoxMama : styles.toggleBox} ${
                    showWolfToMadman ? (theme === "mama" ? styles.toggleBoxMamaActive : styles.toggleBoxActive) : ""
                  }`}
                >
                  {showWolfToMadman ? "✓" : ""}
                </div>

                狂人に人狼を表示
              </label>

              <label
                onClick={() => setShowMadmanToWolf(!showMadmanToWolf)}
                className={`${theme === "mama" ? styles.toggleLabelMama : styles.toggleLabel} ${
                  showMadmanToWolf ? (theme === "mama" ? styles.toggleLabelMamaActive : styles.toggleLabelActive) : ""
                }`}
              >
                <div
                  className={`${theme === "mama" ? styles.toggleBoxMama : styles.toggleBox} ${
                    showMadmanToWolf ? (theme === "mama" ? styles.toggleBoxMamaActive : styles.toggleBoxActive) : ""
                  }`}
                >
                  {showMadmanToWolf ? "✓" : ""}
                </div>

                人狼に狂人を表示
              </label>

              <button
                onClick={() => setShowSettings(false)}
                style={theme === "mama" ? {
                  padding: "10px 24px",
                  borderRadius: 999,
                  border: "2px solid #544880",
                  background: "#6a5aa0",
                  color: "#f0eeff",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 3px 10px rgba(70,55,115,0.4)"
                } : {
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg,#6bd4ff,#2b8cff)",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                決定！
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
