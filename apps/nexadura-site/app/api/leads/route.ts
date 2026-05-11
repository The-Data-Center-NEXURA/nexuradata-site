import { handleLeadPost } from "@/lib/lead-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleLeadPost(request, "/api/leads", "La demande n'a pas pu être traitée.");
}
