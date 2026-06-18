export type CharacterId = "rivaran" | "fin" | "gear" | "navia" | "ray"

export const CHARACTERS: Record<CharacterId, { name: string; img: string; color: string; bubbleColor: string }> = {
  rivaran: { name: "リバラン", img: "/image/ai/rivaran.png", color: "#4A90D9", bubbleColor: "#EBF4FF" },
  fin: { name: "フィン", img: "/image/ai/fin.png", color: "#5BB8A8", bubbleColor: "#E8F8F5" },
  gear: { name: "ギア", img: "/image/ai/gear.png", color: "#C87941", bubbleColor: "#FEF3E8" },
  navia: { name: "ナビア", img: "/image/ai/navia.png", color: "#D96B8A", bubbleColor: "#FDEEF4" },
  ray: { name: "レイ", img: "/image/ai/ray.png", color: "#7B68EE", bubbleColor: "#F0EEFF" },
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
