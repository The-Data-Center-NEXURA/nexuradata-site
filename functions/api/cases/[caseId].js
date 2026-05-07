// GET /api/cases/:caseId — alias to GET /api/remotefix/cases?caseId=<id>.
import {
  onRequestGet as remoteFixCasesGet,
  onRequestOptions as remoteFixCasesOptions
} from "../remotefix/cases.js";
import { json, methodNotAllowed } from "../../_lib/http.js";

export const onRequestOptions = remoteFixCasesOptions;

export const onRequestGet = async (context) => {
  const caseId = String(context.params?.caseId || "").trim();
  if (!caseId) return json({ ok: false, message: "caseId manquant." }, { status: 400 });

  const url = new URL(context.request.url);
  url.searchParams.set("caseId", caseId);
  const proxied = new Request(url.toString(), context.request);
  return remoteFixCasesGet({ ...context, request: proxied });
};

export const onRequest = methodNotAllowed;
