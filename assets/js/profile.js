(async () => {

  const ctx = await C2C.requireUser();

  if (!ctx) return;

  const {
    sb,
    user
  } = ctx;

  function setValue(id, value) {

    const element =
      document.getElementById(id);

    if (element) {
      element.value = value ?? "";
    }
  }

  const result = await C2C.retry(() =>
    sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
  );

  if (result.error) {

    C2C.msg(
      "profileMsg",
      result.error.message,
      "error"
    );

    return;
  }

  const profile =
    result.data || {};

  setValue(
    "fullName",
    profile.full_name ||
    user.user_metadata?.full_name
  );

  setValue(
    "username",
    profile.username ||
    user.user_metadata?.username
  );

  setValue(
    "email",
    user.email
  );

  setValue(
    "phone",
    profile.phone
  );

  setValue(
    "state",
    profile.state
  );

  setValue(
    "city",
    profile.city
  );

  setValue(
    "farmSize",
    profile.farm_size
  );

  setValue(
    "farmSizeUnit",
    profile.farm_size_unit ||
    "hectares"
  );

  setValue(
    "mainCrops",
    profile.main_crops
  );

  setValue(
    "preferredLanguage",
    profile.preferred_language ||
    "English"
  );

  const config =
    C2C.getConfig();

  document.getElementById(
    "serviceStatus"
  ).textContent =
    `Supabase: ${
      C2C.hasSupabase()
        ? "connected"
        : "not configured"
    } · Gemini: ${
      C2C.hasGemini()
        ? "configured"
        : "not configured"
    } · Model: ${
      config.geminiModel ||
      "default"
    }`;

  document
    .getElementById("saveProfile")
    .addEventListener(
      "click",
      async () => {

        C2C.msg(
          "profileMsg",
          "Saving…"
        );

        const payload = {

          id: user.id,

          full_name:
            document
              .getElementById("fullName")
              .value
              .trim(),

          username:
            document
              .getElementById("username")
              .value
              .trim()
              .toLowerCase(),

          phone:
            document
              .getElementById("phone")
              .value
              .trim(),

          state:
            document
              .getElementById("state")
              .value
              .trim(),

          city:
            document
              .getElementById("city")
              .value
              .trim(),

          farm_size:
            Number(
              document
                .getElementById("farmSize")
                .value || 0
            ) || null,

          farm_size_unit:
            document
              .getElementById("farmSizeUnit")
              .value,

          main_crops:
            document
              .getElementById("mainCrops")
              .value
              .trim(),

          preferred_language:
            document
              .getElementById(
                "preferredLanguage"
              )
              .value
        };

        const result =
          await C2C.retry(() =>
            sb
              .from("profiles")
              .upsert(payload)
          );

        if (result.error) {

          C2C.msg(
            "profileMsg",
            result.error.message,
            "error"
          );

          return;
        }

        C2C.msg(
          "profileMsg",
          "Profile saved successfully.",
          "success"
        );
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

})();
