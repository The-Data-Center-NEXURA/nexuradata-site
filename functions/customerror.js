/**
 * Sentry verification endpoint.
 *
 * Triggers an intentional unhandled error so Sentry can confirm reporting works.
 * Gated to avoid accidental production hits — pass ?token=verify to trigger.
 *
 * Once you've confirmed Sentry receives the test event, you can delete this file.
 */
export const onRequest = (context) => {
    const url = new URL(context.request.url);
    if (url.searchParams.get("token") !== "verify") {
        return new Response(
            "Sentry verification endpoint. Append ?token=verify to trigger a test error.",
            { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }
        );
    }

    setTimeout(() => {
        throw new Error("Sentry verification — intentional test error from /customerror");
    });

    return new Response("Test error scheduled — check Sentry within 1 minute.", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
    });
};
