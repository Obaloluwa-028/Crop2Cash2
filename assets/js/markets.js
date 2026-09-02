(async () => {

  const ctx =
    await C2C.requireUser();

  if (!ctx) return;

  const {
    sb,
    user
  } = ctx;

  const list =
    document.getElementById(
      "quotesList"
    );

  async function loadQuotes() {

    const result =
      await C2C.retry(() =>
        sb
          .from("market_quotes")
          .select("*")
          .order(
            "quote_date",
            {
              ascending: false
            }
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          )
      );

    if (result.error) {

      list.innerHTML = `
        <div class="empty-state">
          ${C2C.esc(
            result.error.message
          )}
        </div>
      `;

      return;
    }

    const quotes =
      result.data || [];

    if (!quotes.length) {

      list.innerHTML = `
        <div class="empty-state">
          No quotes recorded yet.
        </div>
      `;

      return;
    }

    list.innerHTML =
      quotes
        .map(q => `
          <div class="quote-row">

            <div>

              <strong>
                ${C2C.esc(
                  q.market_name
                )}

                ·

                ${C2C.money(
                  q.price
                )}
              </strong>

              <small>

                ${C2C.esc(
                  q.crop_name
                )}

                ·

                ${C2C.esc(
                  q.unit
                )}

                ·

                ${C2C.esc(
                  q.quote_date || ""
                )}

                ·

                ${
                  q.distance_km != null
                    ? C2C.esc(
                        q.distance_km
                      ) + " km · "
                    : ""
                }

                ${C2C.esc(
                  q.buyer_type ||
                  "Market buyer"
                )}

                ${
                  q.notes
                    ? " · " +
                      C2C.esc(
                        q.notes
                      )
                    : ""
                }

              </small>

            </div>

            <div class="quote-actions">

              <button
                data-id="${q.id}"
              >
                Delete
              </button>

            </div>

          </div>
        `)
        .join("");

    list
      .querySelectorAll("button")
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            if (
              !confirm(
                "Delete this market quote?"
              )
            ) {
              return;
            }

            const result =
              await C2C.retry(() =>
                sb
                  .from(
                    "market_quotes"
                  )
                  .delete()
                  .eq(
                    "id",
                    button.dataset.id
                  )
              );

            if (result.error) {

              alert(
                result.error.message
              );

              return;
            }

            await loadQuotes();

          }
        );

      });
  }

  document.getElementById(
    "quoteDate"
  ).value =
    new Date()
      .toISOString()
      .slice(0, 10);

  document
    .getElementById("quoteForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        C2C.msg(
          "quoteMsg",
          "Saving…"
        );

        const payload = {

          user_id: user.id,

          market_name:
            document
              .getElementById(
                "marketName"
              )
              .value
              .trim(),

          crop_name:
            document
              .getElementById(
                "marketCrop"
              )
              .value
              .trim(),

          price:
            Number(
              document
                .getElementById(
                  "marketPrice"
                )
                .value
            ),

          unit:
            document
              .getElementById(
                "marketUnit"
              )
              .value,

          quote_date:
            document
              .getElementById(
                "quoteDate"
              )
              .value,

          distance_km:
            Number(
              document
                .getElementById(
                  "marketDistance"
                )
                .value || 0
            ) || null,

          buyer_type:
            document
              .getElementById(
                "buyerType"
              )
              .value,

          notes:
            document
              .getElementById(
                "quoteNotes"
              )
              .value
              .trim()
        };

        const result =
          await C2C.retry(() =>
            sb
              .from(
                "market_quotes"
              )
              .insert(payload)
          );

        if (result.error) {

          C2C.msg(
            "quoteMsg",
            result.error.message,
            "error"
          );

          return;
        }

        C2C.msg(
          "quoteMsg",
          "Market quote saved.",
          "success"
        );

        event.target.reset();

        document.getElementById(
          "quoteDate"
        ).value =
          new Date()
            .toISOString()
            .slice(0, 10);

        await loadQuotes();

      }
    );

  document
    .getElementById("logoutBtn")
    .addEventListener(
      "click",
      async () => {

        await sb.auth.signOut();

        window.location.href =
          "index.html";
      }
    );

  await loadQuotes();

})();
