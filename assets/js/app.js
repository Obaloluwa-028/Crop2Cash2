(async () => {
  const ctx = await C2C.requireUser();

  if (!ctx) return;

  const { sb, user } = ctx;

  /* -----------------------------
     Basic user information
  ----------------------------- */

  const meta = user.user_metadata || {};

  const userLine = document.getElementById("userLine");
  const greeting = document.getElementById("greeting");

  if (userLine) {
    userLine.textContent =
      meta.full_name ||
      meta.username ||
      user.email ||
      "Farmer";
  }

  if (greeting) {
    const hour = new Date().getHours();

    greeting.textContent =
      hour < 12
        ? "Good morning."
        : hour < 18
        ? "Good afternoon."
        : "Good evening.";
  }

  /* -----------------------------
     Dashboard loading
  ----------------------------- */

  const recentList =
    document.getElementById("recentList");

  try {
    /*
     * Use C2C.retry() for temporary Supabase
     * JWT/PostgREST timing problems.
     */

    const [
      analysesResult,
      marketsResult
    ] = await Promise.all([
      C2C.retry(
        () =>
          sb
            .from("harvest_analyses")
            .select("*")
            .order("created_at", {
              ascending: false
            }),
        {
          attempts: 5,
          delays: [
            500,
            1000,
            2000,
            3500,
            5000
          ]
        }
      ),

      C2C.retry(
        () =>
          sb
            .from("market_quotes")
            .select("*", {
              count: "exact",
              head: true
            }),
        {
          attempts: 5,
          delays: [
            500,
            1000,
            2000,
            3500,
            5000
          ]
        }
      )
    ]);

    const analyses =
      analysesResult?.data || [];

    const analysesError =
      analysesResult?.error;

    const marketsCount =
      marketsResult?.count || 0;

    const marketsError =
      marketsResult?.error;

    /* -----------------------------
       Handle analysis query errors
    ----------------------------- */

    if (analysesError) {
      console.error(
        "Crop2Cash analysis query failed:",
        analysesError
      );

      if (recentList) {
        recentList.innerHTML = `
          <div class="empty-state">
            <strong>We couldn't load your harvests.</strong>
            <br>
            <span>
              ${C2C.esc(
                analysesError.message ||
                "Temporary connection problem."
              )}
            </span>
            <br><br>
            <button
              class="btn ghost"
              id="retryDashboard"
              type="button"
            >
              Try again
            </button>
          </div>
        `;

        document
          .getElementById("retryDashboard")
          ?.addEventListener(
            "click",
            () => location.reload()
          );
      }

      return;
    }

    /* -----------------------------
       Analysis statistics
    ----------------------------- */

    const statAnalyses =
      document.getElementById(
        "statAnalyses"
      );

    if (statAnalyses) {
      statAnalyses.textContent =
        analyses.length;
    }

    /*
     * Total expected net value
     */
    const totalExpectedValue =
      analyses.reduce(
        (sum, record) =>
          sum +
          Number(
            record.expected_net_value || 0
          ),
        0
      );

    const statValue =
      document.getElementById(
        "statValue"
      );

    if (statValue) {
      statValue.textContent =
        C2C.money(
          totalExpectedValue
        );
    }

    /*
     * Average AI confidence
     */
    const scored =
      analyses.filter(
        record =>
          record.confidence !== null &&
          record.confidence !== undefined &&
          !Number.isNaN(
            Number(record.confidence)
          )
      );

    const statConfidence =
      document.getElementById(
        "statConfidence"
      );

    if (statConfidence) {
      if (scored.length) {
        const averageConfidence =
          scored.reduce(
            (sum, record) =>
              sum +
              Number(record.confidence),
            0
          ) / scored.length;

        statConfidence.textContent =
          `${Math.round(
            averageConfidence
          )}%`;
      } else {
        statConfidence.textContent =
          "—";
      }
    }

    /*
     * Market quote count
     */
    const statMarkets =
      document.getElementById(
        "statMarkets"
      );

    if (statMarkets) {
      statMarkets.textContent =
        marketsError
          ? "—"
          : marketsCount;
    }

    /* -----------------------------
       Recent harvests
    ----------------------------- */

    if (!recentList) return;

    if (!analyses.length) {
      recentList.innerHTML = `
        <div class="empty-state">
          No analyses yet.
          Start with your first harvest.
        </div>
      `;

      return;
    }

    const recent =
      analyses.slice(0, 5);

    recentList.innerHTML =
      recent
        .map(record => {
          const crop =
            C2C.esc(
              record.crop_name
            );

          const quantity =
            C2C.esc(
              record.quantity
            );

          const unit =
            C2C.esc(
              record.unit
            );

          const date =
            C2C.esc(
              record.harvest_date || ""
            );

          const action =
            C2C.esc(
              record.recommended_action ||
              "SAVED"
            );

          const id =
            encodeURIComponent(
              record.id
            );

          return `
            <div class="record-row">

              <div>
                <strong>
                  ${crop}
                </strong>

                <small>
                  ${quantity}
                  ${unit}
                  ·
                  ${date}
                </small>
              </div>

              <div class="record-actions">

                <span class="badge">
                  ${action}
                </span>

                <a
                  class="btn ghost"
                  href="result.html?id=${id}"
                >
                  Open
                </a>

              </div>

            </div>
          `;
        })
        .join("");

  } catch (error) {
    console.error(
      "Crop2Cash dashboard error:",
      error
    );

    if (recentList) {
      recentList.innerHTML = `
        <div class="empty-state">

          <strong>
            Something went wrong loading your dashboard.
          </strong>

          <br><br>

          <button
            class="btn ghost"
            id="retryDashboard"
            type="button"
          >
            Try again
          </button>

        </div>
      `;

      document
        .getElementById(
          "retryDashboard"
        )
        ?.addEventListener(
          "click",
          () => location.reload()
        );
    }
  }

  /* -----------------------------
     Sign out
  ----------------------------- */

  const logoutBtn =
    document.getElementById(
      "logoutBtn"
    );

  if (logoutBtn) {
    logoutBtn.addEventListener(
      "click",
      async () => {
        logoutBtn.disabled = true;
        logoutBtn.textContent =
          "Signing out…";

        try {
          await sb.auth.signOut();
        } catch (error) {
          console.error(
            "Sign out error:",
            error
          );
        }

        window.location.href =
          "index.html";
      }
    );
  }

})();
