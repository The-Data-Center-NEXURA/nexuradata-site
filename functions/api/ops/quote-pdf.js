import { authorizeOpsRequest, getCaseDetail, normalizeCaseId } from "../../_lib/cases.js";
import { authorizeOrReject, methodNotAllowed, onOptions } from "../../_lib/http.js";
import { logError } from "../../_lib/observability.js";
import { buildQuoteDocument, renderQuotePdfBytes } from "../../_lib/quotes.js";

export const onRequestOptions = (context) => onOptions(context.env, "GET, OPTIONS");

export const onRequestGet = async (context) => {
  if (!context.env?.DATABASE_URL) {
    return new Response("Service temporairement indisponible.", { status: 503 });
  }

  const auth = authorizeOrReject(context.request, context.env, authorizeOpsRequest);

  if (auth instanceof Response) {
    return auth;
  }

  try {
    const url = new URL(context.request.url);
    const caseId = normalizeCaseId(url.searchParams.get("caseId"));

    if (!caseId) {
      return new Response("Numéro de dossier invalide.", { status: 400 });
    }

    const detail = await getCaseDetail(context.env, caseId);

    if (!detail) {
      return new Response("Dossier introuvable.", { status: 404 });
    }

    const document = buildQuoteDocument(detail, context.request.url);
    const bytes = renderQuotePdfBytes(document);

    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${document.quoteNumber}.pdf"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    logError(context, "api.ops.quote_pdf.error", error);
    return new Response("Génération PDF impossible.", { status: 400 });
  }
};

export const onRequest = methodNotAllowed;