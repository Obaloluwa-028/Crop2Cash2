let currentImage = null;
let recognition = null;
let listening = false;

const imageInput =
  document.getElementById(
    "imageInput"
  );

const preview =
  document.getElementById(
    "preview"
  );

const previewImg =
  document.getElementById(
    "previewImg"
  );

const dropTitle =
  document.getElementById(
    "dropTitle"
  );

const voiceBtn =
  document.getElementById(
    "voiceBtn"
  );

const voiceStatus =
  document.getElementById(
    "voiceStatus"
  );

const voiceTranscript =
  document.getElementById(
    "voiceTranscript"
  );


/* ==========================================
   IMAGE
========================================== */

imageInput.addEventListener(
  "change",
  () => {

    const file =
      imageInput.files?.[0];

    if (!file) return;

    currentImage = file;

    previewImg.src =
      URL.createObjectURL(file);

    preview.classList.remove(
      "hidden"
    );

    dropTitle.textContent =
      file.name;
  }
);


document
  .getElementById("clearImage")
  .addEventListener(
    "click",
    () => {

      currentImage = null;

      imageInput.value = "";

      preview.classList.add(
        "hidden"
      );

      dropTitle.textContent =
        "Drop photo here or click to browse";
    }
  );


/* ==========================================
   VOICE
========================================== */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();

  recognition.continuous = false;

  recognition.interimResults =
    false;

  recognition.maxAlternatives = 1;


  recognition.onstart = () => {

    listening = true;

    voiceBtn.textContent =
      "■ Stop voice";

    voiceStatus.textContent =
      "Listening… speak naturally.";
  };


  recognition.onend = () => {

    listening = false;

    voiceBtn.textContent =
      "🎙 Start voice";

    voiceStatus.textContent =
      "Voice capture finished.";
  };


  recognition.onerror = event => {

    listening = false;

    voiceBtn.textContent =
      "🎙 Start voice";

    voiceStatus.textContent =
      `Voice error: ${event.error}`;
  };


  recognition.onresult =
    event => {

      const transcript =
        Array.from(
          event.results
        )
          .map(
            result =>
              result[0].transcript
          )
          .join(" ");

      voiceTranscript.value =
        (
          voiceTranscript.value
            ? voiceTranscript.value + " "
            : ""
        ) + transcript;

      voiceStatus.textContent =
        "Transcript captured. You can edit it.";
    };


  voiceBtn.addEventListener(
    "click",
    () => {

      if (listening) {

        recognition.stop();

        return;
      }

      const language =
        document.getElementById(
          "preferredLanguage"
        ).value;


      /*
       * Browser support for these languages
       * depends on the browser/device.
       */

      const languageMap = {

        English: "en-NG",

        Hausa: "ha-NG",

        Yoruba: "yo-NG",

        Igbo: "ig-NG",

        Pidgin: "en-NG"

      };

      recognition.lang =
        languageMap[language] ||
        "en-NG";

      recognition.start();

    }
  );

} else {

  voiceBtn.disabled = true;

  voiceStatus.textContent =
    "Voice input is not supported by this browser. You can still type.";

}


/* ==========================================
   HELPERS
========================================== */

function fileBase64(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload = () => {

        resolve(
          String(
            reader.result
          ).split(",")[1]
        );

      };

      reader.onerror =
        reject;

      reader.readAsDataURL(file);

    }
  );
}


function safeJson(text) {

  const cleaned =
    String(text)
      .replace(
        /```json|```/g,
        ""
      )
      .trim();

  const start =
    cleaned.indexOf("{");

  const end =
    cleaned.lastIndexOf("}");

  if (
    start >= 0 &&
    end > start
  ) {

    return JSON.parse(
      cleaned.slice(
        start,
        end + 1
      )
    );
  }

  return JSON.parse(cleaned);
}


async function geminiJson({
  apiKey,
  model,
  prompt,
  imageData,
  mimeType
}) {

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

  const parts = [
    {
      text: prompt
    }
  ];

  if (imageData) {

    parts.push({
      inline_data: {
        mime_type:
          mimeType,
        data:
          imageData
      }
    });

  }

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            apiKey
        },

        body: JSON.stringify({
          contents: [
            {
              parts
            }
          ],

          generationConfig: {
            temperature: 0.12,

            responseMimeType:
              "application/json"
          }
        })
      }
    );

  const json =
    await response.json();

  if (!response.ok) {

    throw new Error(
      json?.error?.message ||
      "Gemini request failed."
    );
  }

  const text =
    json?.candidates?.[0]
      ?.content?.parts
      ?.map(
        part =>
          part.text || ""
      )
      .join("") || "";

  return safeJson(text);
}


/* ==========================================
   MAIN
========================================== */

(async () => {

  const ctx =
    await C2C.requireUser();

  if (!ctx) return;

  const {
    sb,
    user
  } = ctx;


  /* Date */

  document.getElementById(
    "harvestDate"
  ).value =
    new Date()
      .toISOString()
      .slice(0, 10);


  /* Profile */

  const profileResult =
    await C2C.retry(() =>
      sb
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
    );

  const profile =
    profileResult?.data || {};


  if (
    profile.preferred_language
  ) {

    document.getElementById(
      "preferredLanguage"
    ).value =
      profile.preferred_language;

  }


  if (
    profile.city ||
    profile.state
  ) {

    document.getElementById(
      "location"
    ).value =
      [
        profile.city,
        profile.state
      ]
        .filter(Boolean)
        .join(", ");

  }


  /* Markets */

  const quotesResult =
    await C2C.retry(() =>
      sb
        .from("market_quotes")
        .select("*")
        .order(
          "quote_date",
          {
            ascending:
              false
          }
        )
        .limit(100)
    );

  const quotes =
    quotesResult.data || [];

  const picker =
    document.getElementById(
      "marketPicker"
    );


  if (quotesResult.error) {

    picker.innerHTML = `
      <div class="empty-state">
        ${C2C.esc(
          quotesResult.error.message
        )}
      </div>
    `;

  }

  else if (!quotes.length) {

    picker.innerHTML = `
      <div class="empty-state">
        No market quotes yet.
        Add quotes on the Market Board.
      </div>
    `;

  }

  else {

    picker.innerHTML =
      quotes.map(
        quote => `

          <label class="market-option">

            <input
              type="checkbox"
              value="${quote.id}"

              data-price="${quote.price}"

              data-name="${C2C.esc(
                quote.market_name
              )}"

              data-distance="${
                quote.distance_km ??
                ""
              }"

              data-unit="${C2C.esc(
                quote.unit
              )}"

              data-crop="${C2C.esc(
                quote.crop_name
              )}"
            >

            <span>

              <strong>
                ${C2C.esc(
                  quote.market_name
                )}

                ·

                ${C2C.money(
                  quote.price
                )}
              </strong>

              <span>

                ${C2C.esc(
                  quote.crop_name
                )}

                ·

                ${C2C.esc(
                  quote.unit
                )}

                ·

                ${C2C.esc(
                  quote.quote_date ||
                  ""
                )}

                ${
                  quote.distance_km != null
                    ? ` · ${C2C.esc(
                        quote.distance_km
                      )} km`
                    : ""
                }

                ·

                ${C2C.esc(
                  quote.buyer_type ||
                  "Market buyer"
                )}

              </span>

            </span>

          </label>
        `
      ).join("");

  }


  /* Logout */

  document
    .getElementById(
      "logoutBtn"
    )
    .addEventListener(
      "click",
      async () => {

        await sb.auth.signOut();

        location.href =
          "index.html";

      }
    );


  /* =========================================
     ANALYSIS SUBMISSION
  ========================================= */

  document
    .getElementById(
      "analysisForm"
    )
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const button =
          document.getElementById(
            "runBtn"
          );

        button.disabled = true;

        button.textContent =
          "Analyzing…";

        C2C.msg(
          "analysisMsg",
          "Preparing your evidence…"
        );


        try {

          const config =
            C2C.getConfig();


          if (!config.geminiKey) {

            throw new Error(
              "Gemini is not configured. Open Setup first."
            );

          }


          if (!currentImage) {

            throw new Error(
              "Add a clear produce photo first."
            );

          }


          const selected =
            [
              ...document.querySelectorAll(
                "#marketPicker input:checked"
              )
            ];


          if (!selected.length) {

            throw new Error(
              "Select at least one market quote."
            );

          }


          /* Gather inputs */

          const crop =
            document.getElementById(
              "crop"
            ).value.trim();

          const variety =
            document.getElementById(
              "variety"
            ).value.trim();

          const quantity =
            Number(
              document.getElementById(
                "quantity"
              ).value
            );

          const unit =
            document.getElementById(
              "unit"
            ).value;

          const harvestDate =
            document.getElementById(
              "harvestDate"
            ).value;

          const location =
            document.getElementById(
              "location"
            ).value.trim();

          const language =
            document.getElementById(
              "preferredLanguage"
            ).value;

          const storageAvailable =
            document.getElementById(
              "storageAvailable"
            ).value === "true";

          const storageDays =
            Number(
              document.getElementById(
                "storageDays"
              ).value || 0
            ) || null;

          const notes =
            document.getElementById(
              "notes"
            ).value.trim();

          const transcript =
            voiceTranscript.value.trim();


          /* Image */

          const imageData =
            await fileBase64(
              currentImage
            );


          C2C.msg(
            "analysisMsg",
            "AI is examining visible produce evidence…"
          );


          /* =================================
             VISION
          ================================= */

          const vision =
            await geminiJson({

              apiKey:
                config.geminiKey,

              model:
                config.geminiModel ||
                "gemini-3.7-flash",

              imageData,

              mimeType:
                currentImage.type ||
                "image/jpeg",

              prompt: `
You are the visual-quality module of Crop2Cash.

Crop2Cash helps African farmers make harvest-to-market decisions.

Analyze ONLY visible evidence in this image.

Do NOT claim certainty about:

- internal defects
- laboratory quality
- exact variety
- pesticide residues
- hidden disease
- exact market price

Return JSON only:

{
  "identified_crop": "string",
  "quality_grade": "A|B|C|Unknown",
  "visual_condition": "string",
  "spoilage_risk": "Low|Medium|High|Unknown",
  "visible_issues": ["string"],
  "handling_advice": ["string"],
  "confidence": 0
}

Context:

Crop:
${JSON.stringify(crop)}

Variety:
${JSON.stringify(variety)}

Location:
${JSON.stringify(location)}

Language:
${JSON.stringify(language)}

Notes:
${JSON.stringify(notes)}

Voice transcript:
${JSON.stringify(transcript)}

Be conservative when the image is ambiguous.
`
            });


          /* =================================
             MARKET CALCULATIONS
          ================================= */

          C2C.msg(
            "analysisMsg",
            "Calculating the economics across markets…"
          );


          const transport =
            Number(
              document.getElementById(
                "transportCost"
              ).value || 0
            );

          const otherCost =
            Number(
              document.getElementById(
                "otherCost"
              ).value || 0
            );


          const marketRows =
            selected.map(
              input => {

                const price =
                  Number(
                    input.dataset.price
                  );

                const gross =
                  price *
                  quantity;

                const net =
                  gross -
                  transport -
                  otherCost;

                return {

                  id:
                    input.value,

                  name:
                    input.dataset.name,

                  crop:
                    input.dataset.crop,

                  price,

                  distance_km:
                    input.dataset.distance
                      ? Number(
                          input.dataset.distance
                        )
                      : null,

                  gross,

                  net
                };

              }
            );


          const best =
            [...marketRows]
              .sort(
                (a, b) =>
                  b.net -
                  a.net
              )[0];


          /* =================================
             DECISION ENGINE
          ================================= */

          C2C.msg(
            "analysisMsg",
            "AI is reasoning over the evidence…"
          );


          const decision =
            await geminiJson({

              apiKey:
                config.geminiKey,

              model:
                config.geminiModel ||
                "gemini-3.7-flash",

              prompt: `
You are Crop2Cash's harvest-to-market decision engine.

Return JSON ONLY.

Schema:

{
  "recommended_action": "SELL NOW|WAIT|CHOOSE MARKET|HOLD",
  "confidence": 0,
  "expected_net_value": 0,
  "best_market": "string",
  "rationale": "string",
  "risk_flags": ["string"],
  "next_action": "string",
  "wait_scenario": "string"
}

VERY IMPORTANT:

1. NEVER invent a market price.
2. Only use the supplied market rows.
3. The supplied net values are already calculated.
4. Consider visible produce quality.
5. Consider spoilage risk.
6. Consider storage availability.
7. Consider the storage window.
8. Do not invent future prices.
9. WAIT must be presented as conditional.
10. If evidence is insufficient, say so.
11. The response must be practical for a farmer.
12. Do not claim certainty.

Harvest:

${JSON.stringify({

  crop,
  variety,
  quantity,
  unit,
  harvestDate,
  location,
  language,
  storageAvailable,
  storageDays,
  notes,
  voiceTranscript: transcript

})}

Vision evidence:

${JSON.stringify(
  vision
)}

Market options:

${JSON.stringify(
  marketRows
)}

Transport cost:

${transport}

Other selling costs:

${otherCost}

Best current market by calculated net:

${JSON.stringify(
  best
)}
`
            });


          /* =================================
             STORE IMAGE
          ================================= */

          let imagePath =
            null;

          try {

            const extension =
              (
                currentImage.name
                  .split(".")
                  .pop() ||
                "jpg"
              )
                .toLowerCase()
                .replace(
                  /[^a-z0-9]/g,
                  ""
                ) ||
              "jpg";


            imagePath =
              `${user.id}/${Date.now()}.${extension}`;


            const upload =
              await sb
                .storage
                .from(
                  "produce-images"
                )
                .upload(
                  imagePath,
                  currentImage,
                  {
                    contentType:
                      currentImage.type ||
                      "image/jpeg",

                    upsert:
                      false
                  }
                );


            if (upload.error) {

              console.warn(
                "Image upload failed:",
                upload.error.message
              );

              imagePath =
                null;
            }

          } catch (uploadError) {

            console.warn(
              "Image upload failed:",
              uploadError
            );

            imagePath =
              null;
          }


          /* =================================
             SAVE COMPLETE ANALYSIS
          ================================= */

          C2C.msg(
            "analysisMsg",
            "Saving your decision…"
          );


          const record = {

            user_id:
              user.id,

            crop_name:
              crop,

            variety:
              variety,

            quantity:
              quantity,

            unit:
              unit,

            harvest_date:
              harvestDate,

            location:
              location,

            notes:
              notes,

            storage_available:
              storageAvailable,

            storage_days:
              storageDays,

            preferred_language:
              language,

            voice_transcript:
              transcript,

            image_path:
              imagePath,

            quality_grade:
              vision.quality_grade,

            visual_condition:
              vision.visual_condition,

            spoilage_risk:
              vision.spoilage_risk,

            vision_json:
              vision,

            market_json:
              marketRows,

            transport_cost:
              transport,

            other_cost:
              otherCost,

            recommended_action:
              decision.recommended_action,

            confidence:
              Number(
                decision.confidence
              ) || 0,

            expected_net_value:
              Number(
                decision.expected_net_value
              ) ||
              best.net,

            best_market:
              decision.best_market ||
              best.name,

            rationale:
              decision.rationale,

            next_action:
              decision.next_action,

            risk_flags:
              decision.risk_flags ||
              [],

            wait_scenario:
              decision.wait_scenario ||
              ""

          };


          const saved =
            await C2C.retry(() =>
              sb
                .from(
                  "harvest_analyses"
                )
                .insert(
                  record
                )
                .select("id")
                .single()
            );


          if (saved.error) {

            throw saved.error;

          }


          window.location.href =
            `result.html?id=${encodeURIComponent(
              saved.data.id
            )}`;

        }

        catch (error) {

          console.error(
            "Crop2Cash analysis error:",
            error
          );

          C2C.msg(
            "analysisMsg",
            error.message ||
              "Analysis failed.",
            "error"
          );

          button.disabled =
            false;

          button.textContent =
            "Analyze with AI →";

        }

      }
    );

})();
