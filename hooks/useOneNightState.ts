"use client"

import { useEffect, useState, useRef } from "react"
import { DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { Player, Role } from "@/types/player"
import { buildRandomAssignments } from "@/types/discussion"

export type OneNightPhase =
  | "setup"
  | "roleCheck"
  | "night"
  | "morning"
  | "discussion"
  | "voteStart"
  | "vote"
  | "result"
  | "reveal"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function randomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function buildRecommended(n: number, theme: string): (Player | null)[] {
  const make = (id: string, name: string): Role => ({ id, name, img: `/image/${theme}/${name}.png` })
  const roleList: Role[] = [
    make("werewolf", "人狼"),
    make("werewolf", "人狼"),
    ...Array.from({ length: n - 2 }, () => make("villager", "村人")),
    make("seer", "占い師"),
    make("robber", "怪盗"),
  ]
  return roleList.map((role, i) => ({ id: i + 1, role, alive: true }))
}

export function useOneNightState() {

  // =========== SETUP STATE ===========

  const [theme, setThemeRaw] = useState<"mama" | "ai">("mama")
  const [playerCount, setPlayerCountRaw] = useState(4)
  const slotCount = playerCount + 2
  const [setupSlots, setSetupSlots] = useState<(Player | null)[]>(() => buildRecommended(4, "mama"))

  // =========== GAME STATE ===========

  const [phase, setPhase] = useState<OneNightPhase>("setup")
  const [players, setPlayers] = useState<(Player | null)[]>([])
  const [centerCards, setCenterCards] = useState<Role[]>([])
  const [currentPlayer, setCurrentPlayer] = useState(1)

  // role check
  const [showRole, setShowRole] = useState(false)

  // night
  const [nightActionReady, setNightActionReady] = useState(false)
  const [showNextButton, setShowNextButton] = useState(false)
  const [wolfModalOpen, setWolfModalOpen] = useState(false)
  const [currentNightRoleId, setCurrentNightRoleId] = useState<string | null>(null)

  // robber
  const [robberTarget, setRobberTarget] = useState<number | null>(null)
  const [robberNewRole, setRobberNewRole] = useState<Role | null>(null)

  // seer
  const [seerChoiceType, setSeerChoiceType] = useState<"player" | "center" | null>(null)
  const [seerTarget, setSeerTarget] = useState<number | null>(null)
  const [seerResult, setSeerResult] = useState<Role | null>(null)
  const [seerCenterResult, setSeerCenterResult] = useState<Role[] | null>(null)

  // vote / execute / result
  const [voteTargets, setVoteTargets] = useState<number[]>([])
  const [executedPlayers, setExecutedPlayers] = useState<number[]>([])
  const [winner, setWinner] = useState<"village" | "wolf" | "all_lose" | null>(null)
  const [isPeace, setIsPeace] = useState(false)
  const [originalPlayers, setOriginalPlayers] = useState<Player[]>([])
  const [robberPlayerNum, setRobberPlayerNum] = useState<number | null>(null)
  const [privateInfo, setPrivateInfo] = useState<Record<number, string>>({})

  // AI mode
  const [aiMode, setAiMode] = useState(false)
  const [gameId, setGameId] = useState("")
  const [playerAssignments, setPlayerAssignments] = useState<Record<number, string>>({})

  // discussion / timer
  const [timeLeft, setTimeLeft] = useState(180)
  const [timerRunning, setTimerRunning] = useState(false)
  const [discussionReady, setDiscussionReady] = useState(false)
  const [discussionEnded, setDiscussionEnded] = useState(false)

  // =========== REFS ===========

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioResolveRef = useRef<(() => void) | null>(null)
  const discussionEndedRef = useRef(false)
  const processedAiActionRef = useRef("")

  // =========== COMPUTED ===========

  const roles: Role[] = [
    { id: "villager", name: "村人" },
    { id: "werewolf", name: "人狼" },
    { id: "seer",     name: "占い師" },
    { id: "robber",   name: "怪盗" },
  ].map(r => ({ ...r, img: `/image/${theme}/${r.name}.png` }))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    if (!aiMode || !gameId || phase === "setup") return

    void fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "onenight",
        gameId,
        playerAssignments,
        players: players.map(player => player ? {
          id: player.id,
          role: { id: player.role.id, name: player.role.name },
          alive: player.alive,
        } : null),
        originalPlayers: originalPlayers.map(player => ({
          id: player.id,
          role: { id: player.role.id, name: player.role.name },
          alive: player.alive,
        })),
        centerCards: centerCards.map(role => ({ id: role.id, name: role.name })),
        privateInfo,
        day: 0,
        phase,
        currentPlayer,
      }),
    }).catch(() => {})
  }, [aiMode, gameId, playerAssignments, players, originalPlayers, centerCards, privateInfo, phase, currentPlayer])

  useEffect(() => {
    if (!aiMode || !gameId || phase !== "night") return
    if (playerAssignments[currentPlayer] === "rivaran") return

    const key = `onenight:${gameId}:0:${currentPlayer}`
    const poll = async () => {
      const response = await fetch("/api/game", { cache: "no-store" }).catch(() => null)
      if (!response?.ok) return
      const state = await response.json()
      const action = state.aiActions?.[key]
      if (!action || processedAiActionRef.current === key) return
      processedAiActionRef.current = key

      const targetNumber = action.targetPlayer as number | undefined
      if (action.action === "swap" && targetNumber) {
        handleRobberSelect(targetNumber)
      } else if (action.action === "inspect" && targetNumber) {
        handleSeerTypeSelect("player")
        handleSeerPlayerSelect(targetNumber)
      } else if (action.action === "inspect_center") {
        handleSeerTypeSelect("center")
      }

      window.setTimeout(nextNightPlayer, 700)
    }

    void poll()
    const interval = window.setInterval(poll, 1500)
    return () => window.clearInterval(interval)
  }, [aiMode, gameId, phase, currentPlayer, playerAssignments])

  // =========== SETUP HELPERS ===========

  function setTheme(t: "mama" | "ai") {
    setThemeRaw(t)
    setSetupSlots(prev => prev.map(p =>
      p ? { ...p, role: { ...p.role, img: `/image/${t}/${p.role.name}.png` } } : null
    ))
  }

  function setPlayerCount(n: number) {
    setPlayerCountRaw(n)
    setSetupSlots(buildRecommended(n, theme))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const role = roles.find(r => r.id === active.id)
    if (!role) return
    const idx = Number(String(over.id).replace("slot-", "")) - 1
    setSetupSlots(prev => {
      const next = [...prev]
      next[idx] = { id: idx + 1, role, alive: true }
      return next
    })
  }

  // =========== AUDIO ===========

  function playAudio(src: string): Promise<void> {
    return new Promise(resolve => {
      if (!audioRef.current) audioRef.current = new Audio()
      const audio = audioRef.current
      if (audioResolveRef.current) {
        audioResolveRef.current()
        audioResolveRef.current = null
      }
      audio.pause()
      audio.currentTime = 0
      const finish = () => {
        if (audioResolveRef.current === finish) audioResolveRef.current = null
        resolve()
      }
      audioResolveRef.current = finish
      audio.onended = finish
      audio.onerror = finish
      audio.src = src
      audio.play().catch(finish)
      setTimeout(finish, 15000)
    })
  }

  // =========== TIMER ===========

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerRunning(true)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          endDiscussion()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function pauseTimer() {
    clearInterval(timerRef.current!)
    timerRef.current = null
    setTimerRunning(false)
  }

  function endDiscussion() {
    if (discussionEndedRef.current) return
    discussionEndedRef.current = true
    setDiscussionEnded(true)
    clearInterval(timerRef.current!)
    timerRef.current = null
    setTimerRunning(false)
    setPhase("voteStart")
    async function runVoteStart() {
      await playAudio("/audio/[05]議論終了の時間となりました。投票に移ります.wav")
      await playAudio("/audio/[06]5からカウントダウン.wav")
      setPhase(prev => prev === "voteStart" ? "vote" : prev)
    }
    runVoteStart()
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, "0")}`
  }

  // =========== GAME START ===========

  function startGame() {
    if (setupSlots.some(s => s === null)) {
      alert("配役をすべて選択してください")
      return
    }
    const gameAssignments = aiMode ? buildRandomAssignments(playerCount) : playerAssignments

    const allRoles = setupSlots.map(s => s!.role)
    const shuffled = shuffle(allRoles)

    const gamePlayers: Player[] = shuffled.slice(0, playerCount).map((role, i) => ({
      id: i + 1, role, alive: true
    }))
    const center = shuffled.slice(playerCount)

    setPlayers(gamePlayers)
    setOriginalPlayers(gamePlayers.map(p => ({ ...p, role: { ...p.role } })))
    setRobberPlayerNum(null)
    setPrivateInfo({})
    setCenterCards(center)
    setCurrentPlayer(1)
    setShowRole(false)
    setNightActionReady(false)
    setShowNextButton(false)
    setWolfModalOpen(false)
    setRobberTarget(null)
    setRobberNewRole(null)
    setSeerChoiceType(null)
    setSeerTarget(null)
    setSeerResult(null)
    setSeerCenterResult(null)
    setVoteTargets([])
    setExecutedPlayers([])
    setWinner(null)
    setIsPeace(false)
    setRobberPlayerNum(null)
    setTimeLeft(180)
    setTimerRunning(false)
    setDiscussionReady(false)
    setDiscussionEnded(false)
    discussionEndedRef.current = false

    setPlayerAssignments(gameAssignments)
    setGameId(Date.now().toString())

    setPhase("night")

    async function runStart() {
      await playAudio("/audio/[00-I]これから一夜人狼を開始します.wav")
      await playAudio("/audio/[01]役職を配布しますので、皆さん目を瞑ってください.wav")
      await playAudio("/audio/[11-1]1番の人は他のプレイヤーが目を瞑ったのを確認した後・・・.wav")
    }
    runStart()
  }

  // =========== ROLE CHECK ===========

  function revealRole() {
    setShowRole(true)
  }

  function nextRoleCheckPlayer() {
    setShowRole(false)
    if (currentPlayer >= playerCount) {
      beginNightPhase()
    } else {
      const next = currentPlayer + 1
      setCurrentPlayer(next)
      playAudio(`/audio/[03-${currentPlayer}]${currentPlayer}番のプレイヤーが役職確認を終えました。続いて${next}番のプレイヤーのみ、目を開け、役職を確認してください.wav`)
    }
  }

  // =========== NIGHT PHASE ===========

  function beginNightPhase() {
    setPhase("night")
    setCurrentPlayer(1)
    resetNightState()
    playAudio(`/audio/[11-1]1番の人は他のプレイヤーが目を瞑ったのを確認した後・・・.wav`)
  }

  function resetNightState() {
    setNightActionReady(false)
    setShowNextButton(false)
    setWolfModalOpen(false)
    setCurrentNightRoleId(null)
    setRobberTarget(null)
    setRobberNewRole(null)
    setSeerChoiceType(null)
    setSeerTarget(null)
    setSeerResult(null)
    setSeerCenterResult(null)
  }

  function beginNightAction() {
    setNightActionReady(true)
    const player = originalPlayers[currentPlayer - 1]
    if (!player) return
    const roleId = player.role.id
    setCurrentNightRoleId(roleId)

    if (roleId === "villager") {
      setTimeout(() => setShowNextButton(true), randomDelay(3000, 5000))
    } else if (roleId === "werewolf") {
      setTimeout(() => setShowNextButton(true), randomDelay(3000, 5000))
    }
    // robber / seer: user interaction drives the flow
  }

  function handleRobberSelect(targetNum: number) {
    setRobberPlayerNum(currentPlayer)
    const myIdx = currentPlayer - 1
    const targetIdx = targetNum - 1
    const myRole = players[myIdx]!.role
    const targetRole = players[targetIdx]!.role
    setRobberTarget(targetNum)
    setRobberNewRole(targetRole)
    setPrivateInfo(prev => ({
      ...prev,
      [currentPlayer]: `プレイヤー${targetNum}と交換し、現在の役職は「${targetRole.name}」です。`,
    }))
    setPlayers(prev => {
      const next = [...prev]
      next[myIdx]    = { ...next[myIdx]!,    role: targetRole }
      next[targetIdx] = { ...next[targetIdx]!, role: myRole }
      return next
    })
  }

  function confirmRobberResult() {
    setShowNextButton(true)
  }

  function handleSeerTypeSelect(type: "player" | "center") {
    setSeerChoiceType(type)
    if (type === "center") {
      setSeerCenterResult(centerCards)
      setPrivateInfo(prev => ({
        ...prev,
        [currentPlayer]: `中央の2枚は「${centerCards.map(role => role.name).join("」「")}」です。`,
      }))
    }
  }

  function handleSeerPlayerSelect(targetNum: number) {
    setSeerTarget(targetNum)
    setSeerResult(originalPlayers[targetNum - 1]!.role)
    setPrivateInfo(prev => ({
      ...prev,
      [currentPlayer]: `プレイヤー${targetNum}を占い、役職は「${originalPlayers[targetNum - 1]!.role.name}」でした。`,
    }))
  }

  function confirmSeerResult() {
    setShowNextButton(true)
  }

  function nextNightPlayer() {
    if (currentPlayer >= playerCount) {
      startMorning()
    } else {
      const next = currentPlayer + 1
      setCurrentPlayer(next)
      resetNightState()
      playAudio(`/audio/[11-${next}]${next}番の人は他のプレイヤーが目を瞑ったのを確認した後・・・.wav`)
    }
  }

  // =========== MORNING / DISCUSSION ===========

  function startMorning() {
    setPhase("morning")
    setDiscussionReady(false)
    setDiscussionEnded(false)
    discussionEndedRef.current = false
    async function run() {
      await playAudio("/audio/[04-1]朝になりました。皆さん目を開けてください.wav")
      setPhase("discussion")
      setTimeLeft(180)
      await playAudio("/audio/[04-2]議論時間は３分です。議論を開始してください.wav")
      setDiscussionReady(true)
      discussionEndedRef.current = false
      if (!aiMode) startTimer()
    }
    run()
  }

  // =========== VOTE / EXECUTE ===========

  function toggleVoteTarget(playerNum: number) {
    setVoteTargets(prev =>
      prev.includes(playerNum) ? prev.filter(n => n !== playerNum) : [...prev, playerNum]
    )
  }

  function judgeWinner(executed: number[], currentPlayers: (Player | null)[], peace: boolean): "village" | "wolf" | "all_lose" {
    const executedRoles = executed.map(n => currentPlayers[n - 1]?.role.id)
    const survivingRoles = currentPlayers
      .filter(p => p && !executed.includes(p.id))
      .map(p => p!.role.id)

    const wolfExecuted = executedRoles.includes("werewolf")
    const wolfSurviving = survivingRoles.includes("werewolf")

    if (peace) {
      // 平和：誰も吊っていない
      return wolfSurviving ? "wolf" : "village"
    }

    if (wolfExecuted) return "village"
    if (!wolfExecuted && wolfSurviving) return "wolf"
    // 人狼が処刑者にもプレイヤーにもいない（全員センター）のに誰か吊った
    return "all_lose"
  }

  function executeSelected() {
    if (voteTargets.length === 0) return
    const targets = [...voteTargets]
    const updatedPlayers = players.map(p => p && targets.includes(p.id) ? { ...p, alive: false } : p)
    setPlayers(updatedPlayers)
    setExecutedPlayers(targets)
    setIsPeace(false)
    const result = judgeWinner(targets, updatedPlayers, false)
    setWinner(result)
    setVoteTargets([])
    setPhase("result")
    async function runAudio() {
      for (const n of targets) {
        await playAudio(`/audio/[00-C]${n}.wav`)
      }
      await playAudio("/audio/[08-I]番のプレイヤーが追放され、決着がつきました.wav")
      if (result === "village") await playAudio("/audio/[09-2]村人陣営の勝利です.wav")
      else if (result === "wolf") await playAudio("/audio/[09-1]人狼陣営の勝利です.wav")
      else await playAudio("/audio/[09-I]全員敗北となります.wav")
    }
    runAudio()
  }

  function declarePeace() {
    setIsPeace(true)
    setExecutedPlayers([])
    const result = judgeWinner([], players, true)
    setWinner(result)
    setPhase("result")
    async function runAudio() {
      if (result === "village") await playAudio("/audio/[09-2]村人陣営の勝利です.wav")
      else await playAudio("/audio/[09-1]人狼陣営の勝利です.wav")
    }
    runAudio()
  }

  // =========== RETURN ===========

  return {
    // setup
    theme, setTheme,
    playerCount, setPlayerCount,
    slotCount,
    setupSlots, setSetupSlots,
    roles, sensors, handleDragEnd,

    // game
    phase, setPhase,
    players, setPlayers,
    centerCards,
    currentPlayer,
    showRole,
    nightActionReady,
    showNextButton,
    wolfModalOpen, setWolfModalOpen,
    currentNightRoleId,

    // robber
    robberTarget, robberNewRole,

    // seer
    seerChoiceType, seerTarget, seerResult, seerCenterResult,

    // vote / execute / result
    voteTargets,
    executedPlayers,
    winner,
    isPeace,
    originalPlayers,
    robberPlayerNum,
    privateInfo,

    // AI mode
    aiMode, setAiMode,
    gameId,
    playerAssignments, setPlayerAssignments,

    // timer / discussion
    timeLeft, timerRunning,
    discussionReady, discussionEnded,

    // functions
    startGame,
    revealRole,
    nextRoleCheckPlayer,
    beginNightAction,
    handleRobberSelect, confirmRobberResult,
    handleSeerTypeSelect, handleSeerPlayerSelect, confirmSeerResult,
    nextNightPlayer,
    startTimer, pauseTimer, endDiscussion,
    formatTime,
    toggleVoteTarget, executeSelected, declarePeace,
  }
}
