export type CharacterId = "rivaran" | "fin" | "gear" | "navia" | "ray"

export const CHARACTERS: Record<CharacterId, { name: string; img: string; color: string; bubbleColor: string }> = {
  rivaran: { name: "リバラン", img: "/image/ai/rivaran.png", color: "#4A90D9", bubbleColor: "#EBF4FF" },
  fin: { name: "フィン", img: "/image/ai/fin.png", color: "#5BB8A8", bubbleColor: "#E8F8F5" },
  gear: { name: "ギア", img: "/image/ai/gear.png", color: "#C87941", bubbleColor: "#FEF3E8" },
  navia: { name: "ナビア", img: "/image/ai/navia.png", color: "#D96B8A", bubbleColor: "#FDEEF4" },
  ray: { name: "レイ", img: "/image/ai/ray.png", color: "#7B68EE", bubbleColor: "#F0EEFF" },
}

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[]

export function buildDefaultAssignments(playerCount: number) {
  return Object.fromEntries(
    CHARACTER_IDS.slice(0, playerCount).map((characterId, index) => [index + 1, characterId])
  )
}

export function buildRandomAssignments(playerCount: number) {
  const shuffled = [...CHARACTER_IDS]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return Object.fromEntries(
    shuffled.slice(0, playerCount).map((characterId, index) => [index + 1, characterId])
  )
}

export type DiscussionMessage = {
  id: string
  playerNumber: number
  characterId: CharacterId
  message: string
  day: number
  timestamp: string
}

export type DiscussionLog = {
  gameId: string
  startedAt: string
  messages: DiscussionMessage[]
}
