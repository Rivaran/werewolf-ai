"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import styles from "@/app/page.module.css"
import { useWakeLock } from "@/hooks/useWakeLock"
import {
  WORDWOLF_GENRES,
  WORDWOLF_GENRE_TOPICS,
  WORDWOLF_RANDOM_TOPICS,
  type WordWolfGenre,
  type WordWolfPair,
  type WordWolfWord,
} from "@/data/wordwolfTopics"

type Theme = "mama" | "ai"
type SourceMode = "genre" | "gm" | "random"
type Role = "villager" | "werewolf" | "fox"
type WordWolfPhase =
  | "setup"
  | "distribution"
  | "discussion"
  | "voteStart"
  | "vote"
  | "execution"
  | "comeback"
  | "comebackReview"
  | "result"
  | "reveal"
type Winner = "villagers" | "werewolves" | "fox" | null

type Participant = {
  id: number
  role: Role
  word: WordWolfWord
  alive: boolean
}

type PairBuildResult = {
  pair: WordWolfPair
  foxWord: WordWolfWord | null
}

const COMMON_WORD_ALIASES: Record<string, string[]> = {
  アメリカンフットボール: ["アメフト"],
  ユニバーサルスタジオジャパン: ["ユニバ", "usj", "USJ"],
  ポケットモンスター: ["ポケモン"],
  僕のヒーローアカデミア: ["ヒロアカ"],
  名探偵コナン: ["コナン"],
  クレヨンしんちゃん: ["しんちゃん"],
  ドラゴンボール: ["ドラゴンボールz"],
  "ハイキュー!!": ["ハイキュー"],
  "SPY×FAMILY": ["スパイファミリー", "spyfamily", "SPYFAMILY","SPYFamiry","SPY Famiry"],
  炎炎ノ消防隊: ["えんえんのしょうぼうたい"],
  青の祓魔師: ["あおのえくそしすと", "青のエクソシスト"],
  斉木楠雄のΨ難: ["さいきくすおのさいなん"],
  桜蘭高校ホスト部: ["おうらんこうこうホストぶ", "ホスト部"],
  "会長はメイド様!": ["かいちょうはメイドさま", "メイド様"],
  黒子のバスケ: ["くろこのバスケ", "黒バス"],
  東京喰種: ["とうきょうグール", "東京グール"],
}

function shuffle<T>(items: T[]) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .replace(/[\s\u3000'"`’“”「」『』（）()【】\[\]{}〈〉《》.,!?！？:：;；/\\~〜\-‐‑‒–—―ーｰ・･]/g, "")
}

function getComparableForms(value: string) {
  const normalized = normalizeAnswer(value)
  const forms = new Set([normalized])

  if (normalized.startsWith("お") || normalized.startsWith("ご")) {
    forms.add(normalized.slice(1))
  }

  return [...forms].filter(Boolean)
}

function getWordCandidates(word: WordWolfWord) {
  return [word.text, word.reading, ...(word.aliases ?? []), ...(COMMON_WORD_ALIASES[word.text] ?? [])].filter(
    (candidate): candidate is string => Boolean(candidate)
  )
}

function isWordMatch(input: string, word: WordWolfWord) {
  const inputForms = getComparableForms(input)
  const candidates = getWordCandidates(word)

  return candidates.some((candidate) => {
    const candidateForms = getComparableForms(candidate)
    return candidateForms.some((candidateForm) => inputForms.includes(candidateForm))
  })
}

function getRoleLabel(role: Role) {
  switch (role) {
    case "villager":
      return "村人"
    case "werewolf":
      return "人狼"
    case "fox":
      return "キツネ"
  }
}

export default function WordWolfPage() {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioResolveRef = useRef<(() => void) | null>(null)
  const audioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const discussionEndedRef = useRef(false)
  const phaseRef = useRef<WordWolfPhase>("setup")
  const voteStartSequenceRef = useRef(0)
  const comebackAudioSequenceRef = useRef(0)

  const [theme, setTheme] = useState<Theme>("mama")
  const [playerCount, setPlayerCount] = useState(4)
  const [wolfCount, setWolfCount] = useState(1)
  const [foxEnabled, setFoxEnabled] = useState(true)
  const [sourceMode, setSourceMode] = useState<SourceMode>("genre")
  const [selectedGenre, setSelectedGenre] = useState<WordWolfGenre>("sports")
  const [gmVillagerWord, setGmVillagerWord] = useState("")
  const [gmWerewolfWord, setGmWerewolfWord] = useState("")
  const [gmFoxWord, setGmFoxWord] = useState("")
  const [showTitleImage, setShowTitleImage] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showRuleHelp, setShowRuleHelp] = useState(false)
  const [showRoleSummary, setShowRoleSummary] = useState(false)
  const [foxComebackEnabled, setFoxComebackEnabled] = useState(true)
  const [werewolfComebackEnabled, setWerewolfComebackEnabled] = useState(false)

  const [phase, setPhase] = useState<WordWolfPhase>("setup")
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentPlayer, setCurrentPlayer] = useState(1)
  const [showWord, setShowWord] = useState(false)
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<number | null>(null)
  const [executedPlayer, setExecutedPlayer] = useState<number | null>(null)
  const [executedRole, setExecutedRole] = useState<Role | null>(null)
  const [winner, setWinner] = useState<Winner>(null)
  const [day, setDay] = useState(1)
  const [tieMode, setTieMode] = useState(false)
  const [tieTargets, setTieTargets] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(180)
  const [timerRunning, setTimerRunning] = useState(false)
  const [villagerWord, setVillagerWord] = useState<WordWolfWord | null>(null)
  const [werewolfWord, setWerewolfWord] = useState<WordWolfWord | null>(null)
  const [comebackRole, setComebackRole] = useState<Role | null>(null)
  const [comebackVillagerGuess, setComebackVillagerGuess] = useState("")
  const [comebackWerewolfGuess, setComebackWerewolfGuess] = useState("")

  useWakeLock(phase !== "setup")

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase !== "comebackReview" || !comebackRole) return

    void playAudio(
      comebackRole === "fox"
        ? "/audio/[14-K-3]キツネの予想したワードはこちらです.wav"
        : "/audio/[14-W-3]人狼の予想したワードはこちらです.wav"
    )
  }, [phase, comebackRole])

  const foxCount = foxEnabled ? 1 : 0
  const selectedParticipant =
    selectedVoteTarget == null
      ? null
      : participants.find((participant) => participant.id === selectedVoteTarget && participant.alive) ?? null
  const selectedGenreLabel =
    WORDWOLF_GENRES.find((genre) => genre.id === selectedGenre)?.label ?? selectedGenre
  const sourceModeLabel =
    sourceMode === "genre" ? `ジャンル: ${selectedGenreLabel}` :
    sourceMode === "gm" ? "GM入力" :
    "ランダム"
  const roleSummaryCounts = participants.reduce(
    (acc, participant) => {
      acc[participant.role] += 1
      return acc
    },
    { villager: 0, werewolf: 0, fox: 0 }
  )

  function playAudio(src: string): Promise<void> {
    return new Promise((resolve) => {
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      const audio = audioRef.current

      if (audioResolveRef.current) {
        audioResolveRef.current()
        audioResolveRef.current = null
      }

      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current)
        audioTimeoutRef.current = null
      }

      audio.pause()
      audio.currentTime = 0

      const finish = () => {
        if (audioTimeoutRef.current) {
          clearTimeout(audioTimeoutRef.current)
          audioTimeoutRef.current = null
        }
        if (audioResolveRef.current === finish) {
          audioResolveRef.current = null
        }
        resolve()
      }

      audioResolveRef.current = finish
      audio.onended = finish
      audio.onerror = finish
      audio.src = src
      audio.play().catch(finish)
      audioTimeoutRef.current = setTimeout(finish, 15000)
    })
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${String(secs).padStart(2, "0")}`
  }

  function renderWord(word: WordWolfWord, size = 30) {
    if (!word.reading) {
      return word.text
    }

    return (
      <ruby style={{ rubyAlign: "center" }}>
        {word.text}
        <rt style={{ fontSize: Math.max(12, Math.floor(size * 0.4)) }}>{word.reading}</rt>
      </ruby>
    )
  }

  function getRoleImage(role: Role) {
    return `/image/${theme}/${getRoleLabel(role)}.png`
  }

  function getResultBackground(targetWinner: Winner) {
    if (targetWinner === "fox") {
      return `/image/${theme}/bg_win_fox.png`
    }

    return targetWinner === "werewolves"
      ? `/image/${theme}/bg_win_wolf.png`
      : `/image/${theme}/bg_win_village.png`
  }

  function resetRoundSelections() {
    setSelectedVoteTarget(null)
    setTieMode(false)
    setTieTargets([])
  }

  function resetToSetup() {
    setPhase("setup")
    setParticipants([])
    setCurrentPlayer(1)
    setShowWord(false)
    setExecutedPlayer(null)
    setExecutedRole(null)
    setWinner(null)
    setDay(1)
    setTimeLeft(180)
    setTimerRunning(false)
    setVillagerWord(null)
    setWerewolfWord(null)
    setComebackRole(null)
    setComebackVillagerGuess("")
    setComebackWerewolfGuess("")
    setShowRoleSummary(false)
    resetRoundSelections()
  }

  async function announcePlayerTurn(playerNumber: number) {
    await playAudio(`/audio/[00-C]${playerNumber}.wav`)
    await playAudio("/audio/[11-K]番の人は他のプレイヤーが目を瞑ったのを確認してから、キーワードを確認してください.wav")
  }

  function pickFoxWord(selectedPair: WordWolfPair, pool: WordWolfPair[]) {
    const selectedWords = new Set(selectedPair.words.map((word) => normalizeAnswer(word.text)))
    const candidates = pool
      .filter((pair) => pair.id !== selectedPair.id)
      .flatMap((pair) => pair.words)
      .filter((word) => !selectedWords.has(normalizeAnswer(word.text)))

    if (candidates.length === 0) {
      return null
    }

    return pickRandom(candidates)
  }

  function buildPair(): PairBuildResult | null {
    if (sourceMode === "genre") {
      const pair = pickRandom(WORDWOLF_GENRE_TOPICS[selectedGenre])
      return {
        pair,
        foxWord: foxEnabled ? pickFoxWord(pair, WORDWOLF_GENRE_TOPICS[selectedGenre]) : null,
      }
    }

    if (sourceMode === "gm") {
      if (!gmVillagerWord.trim() || !gmWerewolfWord.trim()) {
        alert("村人陣営と人狼陣営のワードを入力してください")
        return null
      }

      if (normalizeAnswer(gmVillagerWord) === normalizeAnswer(gmWerewolfWord)) {
        alert("村人陣営と人狼陣営には別のワードを入力してください")
        return null
      }

      if (foxEnabled) {
        if (!gmFoxWord.trim()) {
          alert("キツネ用のワードを入力してください")
          return null
        }

        const normalizedFox = normalizeAnswer(gmFoxWord)
        if (
          normalizedFox === normalizeAnswer(gmVillagerWord) ||
          normalizedFox === normalizeAnswer(gmWerewolfWord)
        ) {
          alert("キツネのワードは他の陣営と別のワードにしてください")
          return null
        }
      }

      return {
        pair: {
          id: "gm-input",
          words: [{ text: gmVillagerWord.trim() }, { text: gmWerewolfWord.trim() }],
        },
        foxWord: foxEnabled ? { text: gmFoxWord.trim() } : null,
      }
    }

    if (WORDWOLF_RANDOM_TOPICS.length === 0) {
      alert("ランダム用のお題がありません")
      return null
    }

    const pair = pickRandom(WORDWOLF_RANDOM_TOPICS)
    return {
      pair,
      foxWord: foxEnabled ? pickFoxWord(pair, WORDWOLF_RANDOM_TOPICS) : null,
    }
  }

  async function showWinnerResult(targetWinner: Exclude<Winner, null>) {
    setWinner(targetWinner)
    setPhase("result")

    if (targetWinner === "villagers") {
      await playAudio("/audio/[09-2]村人陣営の勝利です.wav")
    } else if (targetWinner === "werewolves") {
      await playAudio("/audio/[09-1]人狼陣営の勝利です.wav")
    } else if (targetWinner === "fox") {
      await playAudio("/audio/[09-3]キツネの勝利です.wav")
    }
  }

  async function showComebackReview() {
    if (!comebackRole) return

    setPhase("comebackReview")
  }

  async function startDiscussionRound(nextDay: number) {
    setDay(nextDay)
    setTimeLeft(nextDay === 1 ? 180 : 120)
    setTimerRunning(true)
    discussionEndedRef.current = false
    setPhase("discussion")
    await playAudio(
      nextDay === 1
        ? "/audio/[04-2]議論時間は３分です。議論を開始してください.wav"
        : "/audio/[04-3]議論時間は２分です。議論を開始してください.wav"
    )
  }

  async function finalizeExecutionOutcome() {
    const resolvedRole =
      executedPlayer == null
        ? null
        : participants.find((participant) => participant.id === executedPlayer)?.role ?? executedRole
    const remainingWerewolves = participants.filter(
      (participant) => participant.alive && participant.role === "werewolf"
    ).length
    const remainingFoxes = participants.filter(
      (participant) => participant.alive && participant.role === "fox"
    ).length
    const resolvedWinner: Winner =
      remainingFoxes > 0
        ? "fox"
        : resolvedRole === "villager"
          ? "werewolves"
          : remainingWerewolves === 0
            ? "villagers"
            : null

    setWinner(resolvedWinner)

    if (resolvedWinner === "fox") {
      await showWinnerResult("fox")
      return
    }

    if (resolvedWinner === "werewolves") {
      await showWinnerResult("werewolves")
      return
    }

    if (resolvedWinner === "villagers") {
      await showWinnerResult("villagers")
      return
    }

    await startDiscussionRound(day + 1)
  }

  async function openComebackPhase(role: Role) {
    const sequenceId = ++comebackAudioSequenceRef.current
    setComebackRole(role)
    setComebackVillagerGuess("")
    setComebackWerewolfGuess("")
    setPhase("comeback")

    if (role === "fox") {
      await playAudio("/audio/[14-K-1]キツネのあなたには逆転チャンスがあります.wav")
      if (comebackAudioSequenceRef.current !== sequenceId || phaseRef.current !== "comeback") return
      await playAudio("/audio/[14-K-2]村人陣営のワードと人狼陣営のワードを予想してください.wav")
      return
    }

    await playAudio("/audio/[14-W-1]人狼のあなたには逆転チャンスがあります.wav")
    if (comebackAudioSequenceRef.current !== sequenceId || phaseRef.current !== "comeback") return
    await playAudio("/audio/[14-W-2]村人陣営のワード予想してください.wav")
  }

  async function submitComebackGuess() {
    if (!villagerWord || !werewolfWord || !comebackRole) return
    comebackAudioSequenceRef.current += 1
    await showComebackReview()
  }

  async function resolveComebackGuess() {
    if (!villagerWord || !werewolfWord || !comebackRole) return
    comebackAudioSequenceRef.current += 1

    if (comebackRole === "fox") {
      const villagerCorrect = isWordMatch(comebackVillagerGuess, villagerWord)
      const werewolfCorrect = isWordMatch(comebackWerewolfGuess, werewolfWord)

      if (villagerCorrect && werewolfCorrect) {
        await showWinnerResult("fox")
        return
      }

      await playAudio("/audio/[14-K-4]キツネの予想は外れました.wav")
      setComebackRole(null)
      await startDiscussionRound(day + 1)
      return
    }

    const villagerCorrect = isWordMatch(comebackVillagerGuess, villagerWord)
    if (villagerCorrect) {
      await showWinnerResult("werewolves")
      return
    }

    await playAudio("/audio/[14-W-4]人狼の予想は外れました.wav")
    setComebackRole(null)
    await finalizeExecutionOutcome()
  }

  async function startGame() {
    if (wolfCount <= 0 || wolfCount + foxCount >= playerCount) {
      alert("人狼数とキツネ数の合計がプレイ人数以上にならないようにしてください")
      return
    }

    const built = buildPair()
    if (!built) return

    if (foxEnabled && !built.foxWord) {
      alert("キツネ用のワードを用意できませんでした")
      return
    }

    const [nextVillagerWord, nextWerewolfWord] =
      Math.random() < 0.5 ? built.pair.words : [built.pair.words[1], built.pair.words[0]]

    const roles = shuffle([
      ...Array.from({ length: wolfCount }, () => "werewolf" as const),
      ...(foxEnabled ? ([ "fox" ] as const) : []),
      ...Array.from({ length: playerCount - wolfCount - foxCount }, () => "villager" as const),
    ])

    const nextParticipants = roles.map((role, index) => ({
      id: index + 1,
      role,
      word:
        role === "werewolf"
          ? nextWerewolfWord
          : role === "fox"
            ? (built.foxWord ?? nextVillagerWord)
            : nextVillagerWord,
      alive: true,
    }))

    setParticipants(nextParticipants)
    setVillagerWord(nextVillagerWord)
    setWerewolfWord(nextWerewolfWord)
    setCurrentPlayer(1)
    setShowWord(false)
    setExecutedPlayer(null)
    setExecutedRole(null)
    setWinner(null)
    setDay(1)
    setTimeLeft(180)
    setTimerRunning(false)
    setComebackRole(null)
    setComebackVillagerGuess("")
    setComebackWerewolfGuess("")
    setShowRoleSummary(false)
    resetRoundSelections()
    discussionEndedRef.current = false
    setPhase("distribution")

    await playAudio("/audio/[00-K]これから言葉人狼を開始します.wav")
    await playAudio("/audio/[01-K]キーワードを配布しますので、皆さん目を瞑ってください.wav")
    await announcePlayerTurn(1)
  }

  async function moveToNextPlayer() {
    if (currentPlayer < participants.length) {
      const nextPlayer = currentPlayer + 1
      setCurrentPlayer(nextPlayer)
      setShowWord(false)
      await announcePlayerTurn(nextPlayer)
      return
    }

    setShowWord(false)
    await startDiscussionRound(1)
  }

  async function endDiscussion() {
    if (discussionEndedRef.current) return
    discussionEndedRef.current = true
    const sequenceId = voteStartSequenceRef.current + 1
    voteStartSequenceRef.current = sequenceId

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setTimerRunning(false)
    setPhase("voteStart")
    await playAudio("/audio/[05]議論終了の時間となりました。投票に移ります.wav")
    if (voteStartSequenceRef.current !== sequenceId || phaseRef.current !== "voteStart") return
    await playAudio("/audio/[06]5からカウントダウン.wav")
    if (voteStartSequenceRef.current !== sequenceId || phaseRef.current !== "voteStart") return
    setPhase("vote")
  }

  useEffect(() => {
    if (!timerRunning) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          setTimerRunning(false)
          void endDiscussion()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [timerRunning])

  async function executePlayerById(playerId: number) {
    const target = participants.find((participant) => participant.id === playerId && participant.alive) ?? null
    if (!target) return

    const nextParticipants = participants.map((participant) =>
      participant.id === target.id ? { ...participant, alive: false } : participant
    )
    const remainingWerewolves = nextParticipants.filter(
      (participant) => participant.alive && participant.role === "werewolf"
    ).length

    setParticipants(nextParticipants)
    setExecutedPlayer(target.id)
    setExecutedRole(target.role)
    setWinner(
      target.role === "villager"
        ? "werewolves"
        : remainingWerewolves === 0
          ? "villagers"
          : null
    )
    resetRoundSelections()
    setPhase("execution")

    void playAudio(`/audio/[07-${target.id}]${target.id}番のプレイヤーは追放されます。遺言をどうぞ.wav`)
  }

  async function executeSelectedPlayer() {
    if (!selectedParticipant) return
    await executePlayerById(selectedParticipant.id)
  }

  const previewRoles = [
    ...Array.from({ length: wolfCount }, () => ({ role: "werewolf" as const })),
    ...(foxEnabled ? [{ role: "fox" as const }] : []),
    ...Array.from({ length: Math.max(0, playerCount - wolfCount - foxCount) }, () => ({ role: "villager" as const })),
  ]

  const setupButtonStyle: React.CSSProperties = {
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    color: "#333",
    WebkitTextFillColor: "#333",
    colorScheme: "light",
    cursor: "pointer",
    fontSize: 14,
  }

  const summaryButton = phase !== "setup" && participants.length > 0 && (
    <>
      <button
        onClick={() => setShowRoleSummary(true)}
        style={{
          position: "absolute",
          left: 28,
          bottom: 28,
          zIndex: 4,
          padding: "14px 22px",
          borderRadius: 999,
          border: theme === "mama" ? "2px solid #8cc56b" : "1px solid rgba(255,255,255,0.35)",
          background: theme === "mama" ? "rgba(188,225,165,0.95)" : "rgba(0,0,0,0.55)",
          color: theme === "mama" ? "#29411f" : "#fff",
          fontSize: 16,
          fontWeight: "bold",
          boxShadow: "0 8px 18px rgba(0,0,0,0.28)",
          cursor: "pointer",
        }}
      >
        全体配役
      </button>
      {showRoleSummary && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 20,
          }}
          onClick={() => setShowRoleSummary(false)}
        >
          <div
            style={{
              width: "min(100%, 360px)",
              borderRadius: 20,
              background: "white",
              color: "#222",
              padding: "24px 24px 20px",
              boxShadow: "0 20px 48px rgba(0,0,0,0.28)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 20 }}>全体配役</div>
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 12, background: "rgba(0,0,0,0.06)", fontSize: 16, lineHeight: 1.5 }}>
              <div style={{ fontWeight: "bold", marginBottom: 4 }}>お題の決め方</div>
              <div>{sourceModeLabel}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 20, lineHeight: 1.6 }}>
              <div>人狼 ×{roleSummaryCounts.werewolf}</div>
              {roleSummaryCounts.fox > 0 && <div>キツネ ×{roleSummaryCounts.fox}</div>}
              <div>村人 ×{roleSummaryCounts.villager}</div>
            </div>
            <button
              onClick={() => setShowRoleSummary(false)}
              className={theme === "mama" ? styles.greenButtonMama : styles.blueButton}
              style={{ width: "100%", marginTop: 18 }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  )

  if (phase === "setup") {
    return (
      <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", colorScheme: "light" }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <button onClick={() => router.push("/")} style={setupButtonStyle}>
            ←戻る
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowRuleHelp(true)} style={setupButtonStyle}>
              ルール説明
            </button>
            <button onClick={() => setShowSettings(true)} style={setupButtonStyle}>
              設定
            </button>
          </div>
        </div>

        <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 3 }}>
          <button
            onClick={() => {
              setTheme("mama")
              setShowTitleImage(true)
            }}
            className={`${styles.illustrationButton} ${theme === "mama" ? styles.illustrationButtonActive : ""}`}
          >
            イラスト1
          </button>
          <button
            onClick={() => {
              setTheme("ai")
              setShowTitleImage(true)
            }}
            className={`${styles.illustrationButton} ${theme === "ai" ? styles.illustrationButtonActive : ""}`}
          >
            イラスト2
          </button>
        </div>

        {showTitleImage ? (
          <div className={`${styles.titleImageWrap} ${theme === "mama" ? styles.titleImageWrapMama : ""}`} style={{ marginBottom: 8 }}>
            <img
              src={`/image/${theme}/title_word.png`}
              alt="言葉人狼タイトル"
              onError={() => setShowTitleImage(false)}
              className={styles.titleImageElement}
              style={{ maxWidth: 400, maxHeight: 200 }}
            />
          </div>
        ) : (
          <h1 style={{ fontSize: 38, margin: "8px 0 16px", letterSpacing: 2 }}>言葉人狼</h1>
        )}

        <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18 }}>
            プレイ人数
            <select
              className={styles.lightControl}
              value={playerCount}
              onChange={(event) => {
                const nextPlayerCount = Number(event.target.value)
                setPlayerCount(nextPlayerCount)
                const maxWolfCount = Math.max(1, nextPlayerCount - (foxEnabled ? 2 : 1))
                if (wolfCount > maxWolfCount) {
                  setWolfCount(maxWolfCount)
                }
              }}
              style={{ padding: "8px 10px", borderRadius: 8, border: "2px solid #888", fontSize: 16, cursor: "pointer" }}
            >
              {[3, 4, 5, 6, 7, 8].map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18 }}>
            人狼数
            <select
              className={styles.lightControl}
              value={wolfCount}
              onChange={(event) => setWolfCount(Number(event.target.value))}
              style={{ padding: "8px 10px", borderRadius: 8, border: "2px solid #888", fontSize: 16, cursor: "pointer" }}
            >
              {Array.from({ length: Math.max(1, playerCount - (foxEnabled ? 2 : 1)) }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: "bold", marginBottom: 18 }}>
          <input
            type="checkbox"
            checked={foxEnabled}
            onChange={(event) => {
              const checked = event.target.checked
              setFoxEnabled(checked)
              const maxWolfCount = Math.max(1, playerCount - (checked ? 2 : 1))
              if (wolfCount > maxWolfCount) {
                setWolfCount(maxWolfCount)
              }
            }}
            style={{ width: 20, height: 20 }}
          />
          キツネ入り
        </label>

        <h2 className={styles.sectionTitle}>配役プレビュー</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(88px, 1fr))", gap: 10, width: "min(100%, 360px)", marginBottom: 18 }}>
          {previewRoles.map((item, index) => {
            const label = getRoleLabel(item.role)
            return (
              <div
                key={`${item.role}-${index}`}
                style={{
                  border: "2px dashed rgba(120,120,120,0.55)",
                  borderRadius: 10,
                  padding: "10px 8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.55)",
                }}
              >
                <img src={getRoleImage(item.role)} alt={label} width={64} height={64} style={{ objectFit: "contain" }} />
                <div style={{ fontWeight: "bold", fontSize: 16 }}>{label}</div>
              </div>
            )
          })}
        </div>

        <h2 className={styles.sectionTitle}>お題の決め方</h2>
        <div style={{ width: "min(100%, 420px)", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { id: "genre", label: "ジャンル" },
            { id: "gm", label: "GM入力" },
            { id: "random", label: "ランダム" },
          ].map((option) => {
            const active = sourceMode === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSourceMode(option.id as SourceMode)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: active ? "2px solid #95c47c" : "1px solid rgba(120,120,120,0.4)",
                  background: active ? "rgba(184,216,168,0.95)" : "rgba(255,255,255,0.82)",
                  color: "#222",
                  fontWeight: "bold",
                  cursor: "pointer",
                  minWidth: 120,
                  justifyContent: "center",
                  boxShadow: active ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: active ? "5px solid #6ea65b" : "2px solid #8f8f8f",
                    background: "white",
                    boxSizing: "border-box",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 18, fontWeight: "bold", whiteSpace: "nowrap" }}>{option.label}</span>
              </button>
            )
          })}
        </div>

        {sourceMode === "genre" && (
          <div style={{ width: "min(100%, 420px)", marginTop: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {WORDWOLF_GENRES.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id)}
                  className={`${styles.illustrationButton} ${selectedGenre === genre.id ? styles.illustrationButtonActive : ""}`}
                >
                  {genre.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {sourceMode === "gm" && (
          <div style={{ width: "min(100%, 420px)", display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            <input
              value={gmVillagerWord}
              onChange={(event) => setGmVillagerWord(event.target.value)}
              placeholder="村人陣営のワード"
              style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #bbb", fontSize: 16 }}
            />
            <input
              value={gmWerewolfWord}
              onChange={(event) => setGmWerewolfWord(event.target.value)}
              placeholder="人狼陣営のワード"
              style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #bbb", fontSize: 16 }}
            />
            {foxEnabled && (
              <input
                value={gmFoxWord}
                onChange={(event) => setGmFoxWord(event.target.value)}
                placeholder="キツネのワード"
                style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #bbb", fontSize: 16 }}
              />
            )}
          </div>
        )}

        {sourceMode === "random" && (
          <div style={{ width: "min(100%, 420px)", marginTop: 16, padding: "14px 16px", borderRadius: 12, background: "rgba(0,0,0,0.05)", fontSize: 15, lineHeight: 1.6 }}>
            用意されたお題の中から、ランダムでキーワードを配布します。
          </div>
        )}

        <button
          onClick={() => void startGame()}
          className={theme === "mama" ? styles.wordWolfStartButtonMama : styles.wordWolfStartButtonAi}
        >
          ゲーム開始
        </button>

        {showRuleHelp && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 30 }}
            onClick={() => setShowRuleHelp(false)}
          >
            <div
              style={{ width: "min(100%, 380px)", borderRadius: 20, background: "white", color: "#222", WebkitTextFillColor: "#222", colorScheme: "light", padding: 24, boxShadow: "0 20px 48px rgba(0,0,0,0.28)", lineHeight: 1.7 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 18 }}>言葉人狼のルール</div>
              <p style={{ margin: "0 0 10px" }}>
                似ているけれど少し違うお題を配られた少数派を、会話の中から探すゲームです。
              </p>
              <p style={{ margin: "0 0 10px" }}>
                村人は同じお題、人狼は別のお題を持っています。自分のお題を直接言いすぎないように話し合い、怪しい人に投票します。
              </p>
              <p style={{ margin: "0 0 10px" }}>
                キツネ入りでは、村人とも人狼とも違う第三のお題を持つキツネが登場します。投票で追放されずに生き残ることがキツネの目標です。追放されてしまった場合でも、村人と人狼のお題を両方当てることで逆転勝利できます。
              </p>
              <p style={{ margin: 0 }}>
                勝敗はまずキツネから判定されます。キツネが生き残っていればキツネ陣営の勝利。キツネが負けていれば、人狼を追放できれば村人陣営の勝利、人狼が逃げ切れば人狼陣営の勝利です。
              </p>
              <button
                onClick={() => setShowRuleHelp(false)}
                className={theme === "mama" ? styles.modalActionButtonMama : styles.blueButton}
                style={{ width: 180, maxWidth: "100%", display: "block", margin: "20px auto 0" }}
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {showSettings && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 30 }}
            onClick={() => setShowSettings(false)}
          >
            <div
              style={{ width: "min(100%, 360px)", borderRadius: 20, background: "white", color: "#222", WebkitTextFillColor: "#222", colorScheme: "light", padding: 24, boxShadow: "0 20px 48px rgba(0,0,0,0.28)" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 18 }}>設定</div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, marginBottom: 14 }}>
                <input type="checkbox" checked={foxComebackEnabled} onChange={(event) => setFoxComebackEnabled(event.target.checked)} style={{ width: 20, height: 20 }} />
                逆転チャンスキツネ
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, marginBottom: 20 }}>
                <input type="checkbox" checked={werewolfComebackEnabled} onChange={(event) => setWerewolfComebackEnabled(event.target.checked)} style={{ width: 20, height: 20 }} />
                逆転チャンス人狼
              </label>
              <button
                onClick={() => setShowSettings(false)}
                className={theme === "mama" ? styles.modalActionButtonMama : styles.blueButton}
                style={{ width: 180, maxWidth: "100%", display: "block", margin: "20px auto 0" }}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (phase === "distribution") {
    const participant = participants[currentPlayer - 1]
    if (!participant) return null

    return (
      <div className={styles.screenBase} style={{ backgroundImage: `url(/image/${theme}/bg_night.png)`, backgroundSize: theme === "mama" ? "contain" : "cover", position: "relative" }}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <h1 style={{ fontSize: 34, letterSpacing: 2, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>キーワード配布</h1>
        </div>

        {!showWord ? (
          <div className={`${styles.flexCenterColumn} ${styles.gap16}`}>
            <div className={theme === "mama" ? styles.playerBadgeMama : styles.playerBadge}>プレイヤー {currentPlayer}</div>
            <button onClick={() => setShowWord(true)} className={theme === "mama" ? styles.orangeButtonMama : styles.orangeButton}>
              画面タップ
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center", padding: "0 20px" }}>
            <p style={{ fontSize: 32, fontWeight: "bold", textShadow: "0 0 10px rgba(255,255,255,0.6)" }}>あなたのワード</p>
            <div style={{ minWidth: 240, maxWidth: "90vw", padding: "18px 24px", borderRadius: 18, background: "rgba(255,255,255,0.82)", color: "#222", fontSize: 30, fontWeight: "bold", boxShadow: "0 12px 28px rgba(0,0,0,0.28)" }}>
              {renderWord(participant.word)}
            </div>
            <button onClick={() => void moveToNextPlayer()} className={theme === "mama" ? styles.blueButtonMama : styles.blueButton}>
              {currentPlayer < participants.length ? "次のプレイヤーへ" : "議論時間へ"}
            </button>
          </div>
        )}
        {summaryButton}
      </div>
    )
  }

  if (phase === "discussion") {
    return (
      <div style={{ backgroundImage: `url(/image/${theme}/bg_day.png)`, backgroundSize: theme === "mama" ? "contain" : "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundBlendMode: "darken", backgroundColor: "rgba(0,0,0,0.25)", color: "white", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, position: "relative" }}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <h1 style={{ fontSize: 34, textShadow: "0 3px 12px rgba(0,0,0,0.6)", letterSpacing: 2 }}>{day}日目の昼</h1>
        </div>

        <div style={{ marginTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: 28, fontWeight: "bold", textShadow: "0 3px 12px rgba(0,0,0,0.45)" }}>残り時間</div>
          <div style={{ fontSize: 64, fontWeight: "bold", letterSpacing: 4, textShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>{formatTime(timeLeft)}</div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setTimerRunning((prev) => !prev)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 16, cursor: "pointer" }}>
              {timerRunning ? "一時停止" : "再開"}
            </button>
            <button onClick={() => void endDiscussion()} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 16, cursor: "pointer" }}>
              議論終了
            </button>
          </div>
        </div>
        {summaryButton}
      </div>
    )
  }

  if (phase === "voteStart") {
    return (
      <div style={{ backgroundImage: theme === "mama" ? `url(/image/${theme}/bg_voteStart.png)` : `url(/image/${theme}/bg_day.png)`, backgroundSize: theme === "mama" ? "contain" : "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundBlendMode: "darken", backgroundColor: "rgba(0,0,0,0.25)", color: "white", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, position: "relative" }}>
        <h1 style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", fontSize: 34, textShadow: "0 3px 12px rgba(0,0,0,0.6)", letterSpacing: 2 }}>投票タイム</h1>
        <button onClick={() => setPhase("vote")} style={{ marginTop: 30, padding: "10px 22px", fontSize: 16, color: "white", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 12, backdropFilter: "blur(4px)", cursor: "pointer" }}>
          追放者選択画面へ
        </button>
        {summaryButton}
      </div>
    )
  }

  if (phase === "vote") {
    const aliveParticipants = participants.filter((participant) => participant.alive)
    return (
      <div style={{ backgroundImage: theme === "mama" ? `url(/image/${theme}/bg_vote.png)` : `url(/image/${theme}/bg_day.png)`, backgroundSize: theme === "mama" ? "contain" : "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundBlendMode: "darken", backgroundColor: "rgba(0,0,0,0.25)", color: "white", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 120, paddingBottom: 40, gap: 20, position: "relative" }}>
        <h1 style={{ fontSize: 34, textShadow: "0 3px 12px rgba(0,0,0,0.6)", letterSpacing: 2 }}>追放者決定</h1>
        <p style={{ marginTop: -4, fontSize: 20 }}>{tieMode ? "同数だったプレイヤーを選択（複数選択）" : "追放するプレイヤーを選択"}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {aliveParticipants.map((participant) => {
            const active = tieMode ? tieTargets.includes(participant.id) : selectedVoteTarget === participant.id
            return (
              <button
                key={participant.id}
                onClick={() => {
                  if (tieMode) {
                    setTieTargets((prev) =>
                      prev.includes(participant.id)
                        ? prev.filter((id) => id !== participant.id)
                        : [...prev, participant.id]
                    )
                    return
                  }
                  setSelectedVoteTarget(participant.id)
                }}
                style={{ minWidth: 160, padding: "14px 18px", fontSize: 20, borderRadius: 12, border: active ? "3px solid #ff6b6b" : "1px solid rgba(255,255,255,0.25)", background: active ? "rgba(255,107,107,0.72)" : "rgba(255,255,255,0.6)", color: "#222", fontWeight: "bold", cursor: "pointer" }}
              >
                プレイヤー{participant.id}
              </button>
            )
          })}
        </div>

        {!tieMode && selectedParticipant && (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <p>プレイヤー{selectedParticipant.id} を追放しますか？</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 14 }}>
              <button onClick={() => void executeSelectedPlayer()} style={{ padding: "10px 22px", fontSize: 16, borderRadius: 12, background: theme === "mama" ? "#6b6b6b" : "linear-gradient(135deg,#6bd4ff,#2b8cff)", border: theme === "mama" ? "2px solid #505050" : "none", color: "white", fontWeight: "bold", boxShadow: "0 6px 16px rgba(0,0,0,0.35)", cursor: "pointer" }}>
                決定
              </button>
              <button onClick={() => setSelectedVoteTarget(null)} style={{ padding: "10px 22px", fontSize: 16, borderRadius: 12, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)", color: "white", cursor: "pointer" }}>
                戻る
              </button>
            </div>
          </div>
        )}

        {!tieMode && !selectedParticipant && (
          <button onClick={() => { setTieMode(true); setTieTargets([]) }} style={{ padding: "12px 22px", fontSize: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", color: "white", cursor: "pointer" }}>
            🎲 同数だった場合のランダム追放
          </button>
        )}

        {tieMode && (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                disabled={tieTargets.length < 2}
                onClick={() => {
                  const picked = tieTargets[Math.floor(Math.random() * tieTargets.length)]
                  resetRoundSelections()
                  void executePlayerById(picked)
                }}
                style={{ padding: "10px 22px", fontSize: 16, borderRadius: 12, border: "none", background: tieTargets.length < 2 ? "rgba(255,255,255,0.2)" : "rgba(255,214,102,0.92)", color: tieTargets.length < 2 ? "rgba(255,255,255,0.7)" : "#5a4300", fontWeight: "bold", cursor: tieTargets.length < 2 ? "default" : "pointer" }}
              >
                🎲 ランダム追放実行
              </button>
              <button onClick={() => resetRoundSelections()} style={{ padding: "10px 22px", fontSize: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", color: "white", cursor: "pointer" }}>
                キャンセル
              </button>
            </div>
          </div>
        )}
        {summaryButton}
      </div>
    )
  }

  if (phase === "execution") {
    return (
      <div style={{ backgroundImage: theme === "mama" ? `url(/image/${theme}/bg_vote.png)` : `url(/image/${theme}/bg_day.png)`, backgroundSize: theme === "mama" ? "contain" : "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundBlendMode: "darken", backgroundColor: "rgba(0,0,0,0.35)", color: "white", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "0 20px", textAlign: "center", position: "relative" }}>
        <h1 style={{ fontSize: 40, letterSpacing: 2, textShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>追放しました</h1>
        <p style={{ fontSize: 22, fontWeight: "bold" }}>プレイヤー{executedPlayer}</p>
        <button
          onClick={() => {
            if (executedRole === "fox") {
              void openComebackPhase("fox")
              return
            }

            if (executedRole === "werewolf" && werewolfComebackEnabled) {
              void openComebackPhase("werewolf")
              return
            }

            void finalizeExecutionOutcome()
          }}
          className={theme === "mama" ? styles.wordWolfStartButtonMama : styles.wordWolfStartButtonAi}
        >
          結果確認
        </button>
        {summaryButton}
      </div>
    )
  }

  if (phase === "comeback") {
    return (
      <div style={{ backgroundImage: theme === "mama" ? `url(/image/${theme}/bg_vote.png)` : `url(/image/${theme}/bg_day.png)`, backgroundSize: theme === "mama" ? "contain" : "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundBlendMode: "darken", backgroundColor: "rgba(0,0,0,0.35)", color: "white", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "40px 20px", textAlign: "center", position: "relative" }}>
        <h1 style={{ fontSize: 36, letterSpacing: 2, textShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>逆転チャンス</h1>
        <p style={{ fontSize: 22, fontWeight: "bold" }}>{comebackRole === "fox" ? "キツネの予想タイム" : "人狼の予想タイム"}</p>
        <div style={{ width: "min(100%, 360px)", display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={comebackVillagerGuess}
            onChange={(event) => setComebackVillagerGuess(event.target.value)}
            placeholder="村人陣営のワード"
            style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.3)", fontSize: 16, background: "rgba(255,255,255,0.9)", color: "#222" }}
          />
          {comebackRole === "fox" && (
            <input
              value={comebackWerewolfGuess}
              onChange={(event) => setComebackWerewolfGuess(event.target.value)}
              placeholder="人狼陣営のワード"
              style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.3)", fontSize: 16, background: "rgba(255,255,255,0.9)", color: "#222" }}
            />
          )}
        </div>
        <button onClick={() => void submitComebackGuess()} className={theme === "mama" ? styles.wordWolfStartButtonMama : styles.wordWolfStartButtonAi}>
          判定する
        </button>
        {summaryButton}
      </div>
    )
  }

  if (phase === "comebackReview") {
    return (
      <div style={{ backgroundImage: theme === "mama" ? `url(/image/${theme}/bg_vote.png)` : `url(/image/${theme}/bg_day.png)`, backgroundSize: theme === "mama" ? "contain" : "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundBlendMode: "darken", backgroundColor: "rgba(0,0,0,0.35)", color: "white", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "40px 20px", textAlign: "center", position: "relative" }}>
        <h1 style={{ fontSize: 36, letterSpacing: 2, textShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>予想ワード確認</h1>
        <p style={{ fontSize: 22, fontWeight: "bold" }}>{comebackRole === "fox" ? "キツネの予想" : "人狼の予想"}</p>
        <div style={{ width: "min(100%, 420px)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}>
            <div style={{ fontSize: 15, opacity: 0.8, marginBottom: 6 }}>村人陣営のワード予想</div>
            <div style={{ fontSize: 24, fontWeight: "bold" }}>{comebackVillagerGuess || "未入力"}</div>
          </div>
          {comebackRole === "fox" && (
            <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}>
              <div style={{ fontSize: 15, opacity: 0.8, marginBottom: 6 }}>人狼陣営のワード予想</div>
              <div style={{ fontSize: 24, fontWeight: "bold" }}>{comebackWerewolfGuess || "未入力"}</div>
            </div>
          )}
        </div>
        <button onClick={() => void resolveComebackGuess()} className={theme === "mama" ? styles.wordWolfStartButtonMama : styles.wordWolfStartButtonAi}>
          結果確認
        </button>
        {summaryButton}
      </div>
    )
  }

  if (phase === "result") {
    return (
      <div style={{ backgroundImage: `url(${getResultBackground(winner)})`, backgroundSize: theme === "mama" ? "contain" : "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundBlendMode: "darken", backgroundColor: "rgba(0,0,0,0.35)", color: "white", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "0 20px", textAlign: "center", position: "relative" }}>
        <h1 style={{ fontSize: 40, letterSpacing: 2, textShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
          {winner === "villagers" ? "村人陣営の勝利" : winner === "werewolves" ? "人狼陣営の勝利" : "キツネ陣営の勝利"}
        </h1>
        {winner !== "fox" && <p style={{ fontSize: 22, fontWeight: "bold" }}>追放：{executedPlayer}番</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 240 }}>
          <button onClick={() => setPhase("reveal")} style={{ padding: "12px 0", fontSize: 16, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
            🔍 ネタバラシ
          </button>
          <button onClick={resetToSetup} className={theme === "mama" ? styles.wordWolfStartButtonMama : styles.wordWolfStartButtonAi}>
            もう一度
          </button>
          <button onClick={() => router.push("/")} style={{ padding: "12px 0", fontSize: 16, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer" }}>
            トップへ
          </button>
        </div>
        {summaryButton}
      </div>
    )
  }

  if (phase === "reveal") {
    return (
      <div style={{ backgroundImage: theme === "ai" ? `url(${getResultBackground(winner)})` : `url(/image/${theme}/bg_vote.png)`, backgroundSize: theme === "mama" ? "contain" : "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundBlendMode: "darken", backgroundColor: "rgba(0,0,0,0.45)", color: "white", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 20, padding: "90px 20px 40px", position: "relative" }}>
        <h1 style={{ fontSize: 40, letterSpacing: 2, textShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>🔍 ネタバラシ</h1>
        <div style={{ width: "min(100%, 560px)", display: "flex", flexDirection: "column", gap: 14 }}>
          {participants.map((participant) => (
            <div key={participant.id} style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 14, alignItems: "center", padding: "14px 16px", borderRadius: 16, background: participant.alive ? "rgba(255,255,255,0.12)" : "rgba(255,107,107,0.2)", backdropFilter: "blur(4px)" }}>
              <img src={getRoleImage(participant.role)} alt={getRoleLabel(participant.role)} width={88} height={88} style={{ objectFit: "contain", borderRadius: 12 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 24, fontWeight: "bold" }}>プレイヤー{participant.id}</div>
                <div style={{ fontSize: 18, opacity: 0.92 }}>{getRoleLabel(participant.role)}{participant.alive ? " / 生存" : " / 追放"}</div>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#fff4a8" }}>お題：{renderWord(participant.word, 22)}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 240 }}>
          <button onClick={resetToSetup} className={theme === "mama" ? styles.wordWolfStartButtonMama : styles.wordWolfStartButtonAi}>
            もう一度
          </button>
          <button onClick={() => router.push("/")} style={{ padding: "12px 0", fontSize: 16, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer" }}>
            トップへ
          </button>
        </div>
      </div>
    )
  }

  return null
}
