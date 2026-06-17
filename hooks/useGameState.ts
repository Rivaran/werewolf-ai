"use client"

import { useState, useRef, useEffect } from "react"
import { DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core"
import { Player } from "@/types/player"
import { ResultType } from "@/types/result"

export function useGameState() {

  // =========== STATE ===========

  const [winner, setWinner] = useState<"villagers" | "werewolves" | "werewolves_by_no_knight" | null>(null)
  const mounted = true
  const [wolfTarget, setWolfTarget] = useState<number | null>(null)
  const [guardTargets, setGuardTargets] = useState<Record<number, number>>({})
  const [seerResults, setSeerResults] = useState<Record<number, Record<number, "white" | "black">>>({})
  const [morningDeath, setMorningDeath] = useState<number | null>(null)
  const [day, setDay] = useState(0)
  const [theme, setTheme] = useState("mama")
  const [voteTarget, setVoteTarget] = useState<number | null>(null)
  const [lastGuardTarget, setLastGuardTarget] = useState<Record<number, number | null>>({})
  const [seerActed, setSeerActed] = useState<Record<number, boolean>>({})
  const [showWolfToMadman, setShowWolfToMadman] = useState(true)
  const [showMadmanToWolf, setShowMadmanToWolf] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const morningHandledRef = useRef(false)
  const [executing, setExecuting] = useState(false)
  const [discussionReady, setDiscussionReady] = useState(false)
  const [discussionEnded, setDiscussionEnded] = useState(false)
  const [executedPlayer, setExecutedPlayer] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(180)
  const [timerRunning, setTimerRunning] = useState(false)
  const [phase, setPhase] = useState("modeSelect")
  const [currentPlayer, setCurrentPlayer] = useState(1)
  const [showRole, setShowRole] = useState(false)
  const [nightActionReady, setNightActionReady] = useState(false)
  const [showNextButton, setShowNextButton] = useState(false)
  const [playerCount, setPlayerCount] = useState(4)
  const [modalType, setModalType] = useState<"seer" | "wolf" | "medium" | null>(null)
  const [wolfDecider, setWolfDecider] = useState<number | null>(null)
  const [tieMode, setTieMode] = useState(false)
  const [tieTargets, setTieTargets] = useState<number[]>([])
  const [mediumResults, setMediumResults] = useState<Record<number, "white" | "black">>({})  // 霊能者の霊視結果: 追放プレイヤー番号 → white/black
  const [seerToday, setSeerToday] = useState<{
    [player: number]: { target: number; result: string }
  }>({})
  const [players, setPlayers] = useState<(Player | null)[]>(
    Array.from({ length: 4 }, () => null)
  )
  const [aiMode, setAiMode] = useState(false)

  // =========== REFS ===========

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioResolveRef = useRef<(() => void) | null>(null)
  const discussionEndedRef = useRef(false) // stale closure 対策：refは常に最新値を返すのでguardに使う

  // =========== COMPUTED ===========

  const roles = [
    { id: "villager", name: "村人" },
    { id: "werewolf", name: "人狼" },
    { id: "seer", name: "占い師" },
    { id: "knight", name: "騎士" },
    { id: "madman", name: "狂人" },
    { id: "medium", name: "霊能者" },
  ].map(role => ({
    ...role,
    img: `/image/${theme}/${role.name}.png`
  }))

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    })
  )

  // =========== FUNCTIONS ===========

  function canShowNightButton(playerNum: number) {
    const me = players[playerNum - 1]
    if (!me) return false

    // 占い師は常にOK
    if (me.role.id === "seer") return true

    // 人狼
    if (me.role.id === "werewolf") {
      const others = players.filter((p, i) => i !== playerNum - 1)

      // 他の人狼がいる
      const hasWolf = others.some(p => p?.role.id === "werewolf")

      // 狂人が見える設定 && 狂人がいる
      const hasMadman =
        showMadmanToWolf &&
        others.some(p => p?.role.id === "madman")

      return hasWolf || hasMadman
    }

    // 狂人
    if (me.role.id === "madman") {
      if (!showWolfToMadman) return false

      const hasWolf = players.some(p => p?.role.id === "werewolf")
      return hasWolf
    }

    return false
  }

  function buildResults(playerNum: number) {
    const result: Record<number, { type: ResultType }> = {}

    result[playerNum] = { type: "self" }

    const me = players[playerNum - 1]

    players.forEach((p, i) => {
      if (!p || i + 1 === playerNum) return

      // 占い
      const seer = seerResults[playerNum]?.[i + 1]
      if (seer) {
        result[i + 1] = {
          type: seer === "white" ? "white" : "black"
        }
        return
      }

      // 人狼視点
      if (me?.role.id === "werewolf") {
        if (p.role.id === "werewolf") {
          result[i + 1] = { type: "werewolf" }
        }
        if (showMadmanToWolf && p.role.id === "madman") {
          result[i + 1] = { type: "madman" }
        }
      }

      // 狂人視点
      if (me?.role.id === "madman") {
        if (showWolfToMadman && p.role.id === "werewolf") {
          result[i + 1] = { type: "werewolf" }
        }
      }
    })

    return result
  }

  // 仲間取得関数
  function getVisiblePlayers(playerIndex: number) {
    const me = players[playerIndex]
    if (!me) return []

    return players
      .map((p, i) => {
        if (!p || i === playerIndex) return null

        // 人狼 → 人狼
        if (me.role.id === "werewolf" && p.role.id === "werewolf") {
          return { id: i + 1, role: "人狼" }
        }

        // 人狼 → 狂人
        if (me.role.id === "werewolf" && showMadmanToWolf && p.role.id === "madman") {
          return { id: i + 1, role: "狂人" }
        }

        // 狂人 → 人狼
        if (me.role.id === "madman" && showWolfToMadman && p.role.id === "werewolf") {
          return { id: i + 1, role: "人狼" }
        }

        return null
      })
      .filter((v): v is { id: number; role: string } => v !== null)
  }

  // 人狼の襲撃関数
  function resolveNight() {

    if (wolfTarget === null) {
      setMorningDeath(null)
      return
    }

    const guarded = Object.values(guardTargets).includes(wolfTarget)

    const updatedPlayers = players.map((p, i) => {
      if (!p) return p

      if (!guarded && i + 1 === wolfTarget) {
        return { ...p, alive: false }
      }

      return p
    })

    setPlayers(updatedPlayers)
    saveGameState(updatedPlayers, day, "morning")

    if (guarded) {
      setMorningDeath(null)
    } else {
      setMorningDeath(wolfTarget)
    }

    const survivors = updatedPlayers.filter(
      (p): p is Player => p !== null && p.alive
    )

    const werewolfCount = survivors.filter(p => p.role.id === "werewolf").length
    const villagerCount = survivors.filter(p => p.role.id !== "werewolf").length

    if (werewolfCount === 0) {
      setWinner("villagers")
      setPhase("result")
      return true
    }

    if (werewolfCount >= villagerCount) {
      playAudio("/audio/[13-1]人狼の襲撃により人狼陣営と村人陣営が同数になりましたので、人狼陣営の勝利です.wav")
      setWinner("werewolves")
      setPhase("result")
      return true
    }

    return false
  }

  // 勝敗判定関数
  function judgeAfterExecution(executedNum: number) {

    const updatedPlayers = players.map((p, i) =>
      i === executedNum - 1 && p ? { ...p, alive: false } : p
    )

    const survivors = updatedPlayers.filter(
      (p): p is Player => p !== null && p.alive
    )

    const werewolfCount = survivors.filter(p => p.role.id === "werewolf").length
    const nonWerewolfCount = survivors.filter(p => p.role.id !== "werewolf").length
    const hasKnight = survivors.some(p => p.role.id === "knight")

    if (werewolfCount === 0) return "villagers"

    if (werewolfCount >= nonWerewolfCount) return "werewolves"

    if (nonWerewolfCount === werewolfCount + 1 && !hasKnight) return "werewolves_by_no_knight"

    return null
  }

  function buildNightResults(playerNum: number) {
    const result: Record<number, { type: ResultType }> = {}

    const me = players[playerNum - 1]
    if (!me) return result

    // 自分
    result[playerNum] = { type: "self" }

    players.forEach((p, i) => {
      const num = i + 1
      if (!p || num === playerNum) return

      // ① 占い結果（最優先）
      const seer = seerResults[playerNum]?.[num]
      if (seer) {
        result[num] = {
          type: seer === "white" ? "white" : "black"
        }
        return
      }

      // ② 人狼視点
      if (me.role.id === "werewolf") {
        if (p.role.id === "werewolf") {
          result[num] = { type: "werewolf" }
          return
        }
        if (showMadmanToWolf && p.role.id === "madman") {
          result[num] = { type: "madman" }
          return
        }
      }

      // ③ 狂人視点
      if (me.role.id === "madman") {
        if (showWolfToMadman && p.role.id === "werewolf") {
          result[num] = { type: "werewolf" }
          return
        }
      }

      // ④ それ以外
      result[num] = { type: "unknown" }
    })

    return result
  }

  // 霊能者の霊視結果ビルド関数
  function buildMediumResults(playerNum: number) {
    const result: Record<number, { type: ResultType }> = {}
    result[playerNum] = { type: "self" }
    players.forEach((p, i) => {
      const num = i + 1
      if (num === playerNum) return
      const medResult = mediumResults[num]
      if (medResult) {
        result[num] = { type: medResult === "black" ? "black" : "white" }
      }
    })
    return result
  }

  // ランダムディレイ関数
  function randomDelay(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // プレイヤー追放関数
  function executePlayer(num: number) {
    // 霊能者用：追放プレイヤーの役職を記録
    const executedRole = players[num - 1]?.role.id
    setMediumResults(prev => ({
      ...prev,
      [num]: executedRole === "werewolf" ? "black" : "white"
    }))
    const afterExecute = players.map(p =>
      p && p.id === num ? { ...p, alive: false } : p
    )
    setPlayers(afterExecute)
    setVoteTarget(null)
    setExecutedPlayer(num)
    setPhase("execute")
    saveGameState(afterExecute, day, "execute")
    playAudio(`/audio/[07-${num}]${num}番のプレイヤーは追放されます。遺言をどうぞ.wav`)
  }

  // 議論終了関数
  function endDiscussion() {
    if (discussionEndedRef.current) return
    discussionEndedRef.current = true
    setDiscussionEnded(true)
    clearInterval(timerRef.current!)
    timerRef.current = null
    setTimeLeft(0)
    setTimerRunning(false)
    setPhase("voteStart")
    async function runVoteStart() {
      await playAudio("/audio/[05]議論終了の時間となりました。投票に移ります.wav")
      await playAudio("/audio/[06]5からカウントダウン.wav")
      // 音声待ち中にフェーズが変わっていた場合は上書きしない
      setPhase(prev => prev === "voteStart" ? "vote" : prev)
    }
    runVoteStart()
  }

  // 役職配布
  function shuffle<T>(array: T[]) {
    const arr = [...array]

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }

    return arr
  }

  // タイマー表示関数
  function formatTime(sec: number) {

    const m = Math.floor(sec / 60)
    const s = sec % 60

    return `${m}:${s.toString().padStart(2, "0")}`

  }

  // 一時停止関数
  function pauseTimer() {
    clearInterval(timerRef.current!)
    timerRef.current = null
    setTimerRunning(false)
  }

  // タイマー開始関数
  function startTimer() {
    if (timerRef.current) return

    setTimerRunning(true)

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
      if (t <= 1) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        endDiscussion()
        return 0
      }
        return t - 1
      })
    }, 1000)
  }

  // ドロップ関数
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over) return

    const slotIndex = Number(String(over.id).replace("slot-", "")) - 1
    const role = roles.find((r) => r.id === active.id)

    if (!role) return

    const newPlayers = [...players]

    newPlayers[slotIndex] = {
      id: slotIndex + 1,
      role,
      alive: true
    }

    setPlayers(newPlayers)
  }

  // 音声再生関数
  function playAudio(src: string) {
    return new Promise<void>((resolve) => {

      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      const audio = audioRef.current

      if (audioResolveRef.current) {
        audioResolveRef.current()
        audioResolveRef.current = null
      }

      audio.pause()
      audio.currentTime = 0

      const finish = () => {
        if (audioResolveRef.current === finish) {
          audioResolveRef.current = null
        }
        resolve()
      }

      audioResolveRef.current = finish

      audio.onended = finish
      audio.onerror = finish

      audio.src = src

      const p = audio.play()

      if (p !== undefined) {
        p.catch(() => {
          finish()
        })
      }

      setTimeout(() => {
        finish()
      }, 10000)
    })
  }

  // ゲーム状態保存関数
  async function saveGameState(statePlayers: typeof players, stateDay: number, statePhase: string) {
    if (!aiMode) return
    await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        players: statePlayers.map(p => p ? {
          id: p.id,
          role: { id: p.role.id, name: p.role.name },
          alive: p.alive,
        } : null),
        day: stateDay,
        phase: statePhase,
      }),
    }).catch(() => {})
  }

  // ゲームスタート関数
  function startGame() {

    if (players.some(p => p === null)) {
      alert("配役をすべて選択してください")
      return
    }

    setDay(0)

    const selectedRoles = players
      .filter(p => p !== null)
      .map(p => p!.role)

    const shuffled = shuffle(selectedRoles)

    const shuffledPlayers = shuffled.map((role, i) => ({
      id: i + 1,
      role,
      alive: true
    }))

    clearInterval(timerRef.current!)
    timerRef.current = null
    setTimeLeft(180)
    setTimerRunning(false)
    setPlayers(shuffledPlayers)

    const seerIndexes = shuffled
      .map((r, i) => ({ role: r, index: i }))
      .filter(x => x.role.id === "seer")

    const results: Record<number, Record<number, "white">> = {}

    seerIndexes.forEach(({ index }) => {
      const seerNum = index + 1

      const candidates = shuffled
        .map((r, i) => ({ role: r, num: i + 1 }))
        .filter(x =>
          x.role.id !== "werewolf" &&
          x.num !== seerNum
        )

      if (candidates.length > 0) {
        const rand = candidates[Math.floor(Math.random() * candidates.length)]
        results[seerNum] = {
          [rand.num]: "white"
        }
      }
    })

    setSeerResults(results)
    setMediumResults({})

    setPhase("roleCheck")
    setCurrentPlayer(1)
    setShowRole(false)

    saveGameState(shuffledPlayers, 0, "roleCheck")

    async function runStartAudio() {
      await playAudio("/audio/[00]これから人狼ゲームを開始します.wav")
      await playAudio("/audio/[01]役職を配布しますので、皆さん目を瞑ってください.wav")
      await playAudio("/audio/[02]1番の人は他プレイヤーが目を瞑ったのを確認してから画面の役職確認ボタンをタップしてください.wav")
    }

    runStartAudio()
  }

  // 役職確認関数
  function revealRole() {
    setShowRole(true)
  }

  // 次の生きているプレイヤー関数
  function getNextAlivePlayer(start: number, alivePlayers: (Player | null)[]) {

    for (let i = 0; i < alivePlayers.length; i++) {
      const index = (start + i) % alivePlayers.length
      const p = alivePlayers[index]

      if (p && p.alive) {
        return index + 1
      }
    }

    return 1
  }

  // 確認済関数
  function nextPlayer() {

    const next = currentPlayer + 1

    if (next > playerCount) {
      setCurrentPlayer(1)
      setPhase("morning")
      return
    }

    setCurrentPlayer(next)

    setShowRole(false)

    playAudio(`/audio/[03-${next - 1}]${next - 1}番のプレイヤーが役職確認を終えました。続いて${next}番のプレイヤーのみ、目を開け、役職を確認してください.wav`)
  }

  // =========== EFFECTS ===========

  // 初回レンダリング後に処理する用

  // 夜フェーズ描画後処理
  useEffect(() => {
    if (phase === "night") {
      const timeoutId = setTimeout(() => {
        setGuardTargets({})
        setWolfTarget(null)
        setSeerActed({})
      }, 0)

      return () => clearTimeout(timeoutId)
    }
  }, [phase])

  // 夜フェーズ、かつ、現プレイヤーが変わる度に、夜フェーズ準備フラグ立っていない場合の描画後処理
  useEffect(() => {
    if (phase === "night" && !nightActionReady) {
      playAudio(
        `/audio/[11-${currentPlayer}]${currentPlayer}番の人は他のプレイヤーが目を瞑ったのを確認した後・・・.wav`
      )
    }
  }, [currentPlayer, phase])

  // 追放フェーズ描画後処理
  useEffect(() => {
    if (phase === "vote") {
      const timeoutId = setTimeout(() => {
        setVoteTarget(null)
        setTieMode(false)
        setTieTargets([])
      }, 0)

      return () => clearTimeout(timeoutId)
    }
  }, [phase])

  // 朝フェーズ以外の描画後処理
  useEffect(() => {
    if (phase !== "morning") {
      morningHandledRef.current = false
    }
  }, [phase])

  // 朝フェーズの描画後処理
  useEffect(() => {

    if (phase !== "morning") return
    if (morningHandledRef.current) return

    morningHandledRef.current = true

    async function runMorning() {

      setDiscussionReady(false)
      pauseTimer()

      await playAudio("/audio/[04-1]朝になりました。皆さん目を開けてください.wav")

      if (day === 0) {

        await playAudio("/audio/[04-2]議論時間は３分です。議論を開始してください.wav")
        discussionEndedRef.current = false
        setDiscussionEnded(false)
        setDiscussionReady(true)
        startTimer()

      } else if (morningDeath === null) {

        await playAudio("/audio/[12-0]昨晩の犠牲者はいませんでした.wav")
        await playAudio("/audio/[04-3]議論時間は２分です。議論を開始してください.wav")
        discussionEndedRef.current = false
        setDiscussionEnded(false)
        setDiscussionReady(true)
        startTimer()

      } else {

        await playAudio(`/audio/[12-${morningDeath}]昨晩の犠牲者は${morningDeath}番のプレイヤーです.wav`)
        await playAudio("/audio/[04-3]議論時間は２分です。議論を開始してください.wav")
        discussionEndedRef.current = false
        setDiscussionEnded(false)
        setDiscussionReady(true)
        startTimer()

      }
    }

    runMorning()

  }, [phase])

  // =========== RETURN ===========

  return {
    // state
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
    // setters
    setWinner,
    setWolfTarget,
    setGuardTargets,
    setSeerResults,
    setMorningDeath,
    setDay,
    setTheme,
    setVoteTarget,
    setLastGuardTarget,
    setSeerActed,
    setShowWolfToMadman,
    setShowMadmanToWolf,
    setShowSettings,
    setExecuting,
    setDiscussionReady,
    setDiscussionEnded,
    setExecutedPlayer,
    setTimeLeft,
    setTimerRunning,
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
    // computed
    roles,
    sensors,
    // functions
    canShowNightButton,
    buildResults,
    getVisiblePlayers,
    resolveNight,
    judgeAfterExecution,
    buildNightResults,
    buildMediumResults,
    mediumResults,
    setMediumResults,
    randomDelay,
    executePlayer,
    endDiscussion,
    shuffle,
    formatTime,
    pauseTimer,
    startTimer,
    handleDragEnd,
    playAudio,
    saveGameState,
    startGame,
    revealRole,
    getNextAlivePlayer,
    nextPlayer,
  }
}
