import { timingSafeEqual } from "node:crypto"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { createWerewolfMcpServer } from "@/lib/werewolf-mcp-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Last-Event-ID, MCP-Protocol-Version, MCP-Session-Id",
  "Access-Control-Expose-Headers": "MCP-Protocol-Version, MCP-Session-Id",
}

function tokensMatch(actual: string | null, expected: string) {
  if (!actual) return false
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

function isAuthorized(request: Request, expected: string) {
  const queryToken = new URL(request.url).searchParams.get("token")
  const authorization = request.headers.get("authorization")
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null
  return tokensMatch(bearerToken ?? queryToken, expected)
}

function errorResponse(status: number, message: string) {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message }, id: null },
    { status, headers: corsHeaders }
  )
}

async function handleMcpRequest(request: Request) {
  const token = process.env.WEREWOLF_MCP_TOKEN
  if (!token) return errorResponse(503, "WEREWOLF_MCP_TOKEN is not configured")
  if (!isAuthorized(request, token)) return errorResponse(401, "Unauthorized")

  const server = createWerewolfMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)

  const response = await transport.handleRequest(request)
  const headers = new Headers(response.headers)
  Object.entries(corsHeaders).forEach(([name, value]) => headers.set(name, value))
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export const GET = handleMcpRequest
export const POST = handleMcpRequest
export const DELETE = handleMcpRequest

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}
