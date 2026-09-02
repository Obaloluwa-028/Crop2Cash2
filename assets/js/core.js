window.C2C = (() => {
  const STORAGE = "crop2cash_config_v1";

  function getConfig() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE) || "{}");
    } catch {
      return {};
    }
  }

  function saveConfig(cfg) {
    localStorage.setItem(STORAGE, JSON.stringify(cfg));
  }

  function hasSupabase() {
    const c = getConfig();
    return Boolean(c.supabaseUrl && c.supabaseKey);
  }

  function hasGemini() {
    const c = getConfig();
    return Boolean(c.geminiKey);
  }

  function client() {
    const c = getConfig();

    if (!c.supabaseUrl || !c.supabaseKey) {
      throw new Error(
        "Supabase is not configured. Open Setup first."
      );
    }

    if (!window.supabase?.createClient) {
      throw new Error(
        "Supabase library did not load."
      );
    }

    return window.supabase.createClient(
      c.supabaseUrl,
      c.supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }

  async function getFreshSession(sb) {
    try {
      const { data, error } = await sb.auth.getSession();

      if (error) {
        throw error;
      }

      if (!data?.session) {
        return null;
      }

      return data.session;
    } catch (error) {
      console.warn(
        "Session read failed:",
        error?.message || error
      );

      try {
        const { data, error: refreshError } =
          await sb.auth.refreshSession();

        if (refreshError) {
          throw refreshError;
        }

        return data?.session || null;
      } catch (refreshError) {
        console.warn(
          "Session refresh failed:",
          refreshError?.message || refreshError
        );

        return null;
      }
    }
  }

  async function requireUser() {
    if (!hasSupabase()) {
      window.location.href = "setup.html";
      return null;
    }

    const sb = client();
    const session = await getFreshSession(sb);

    if (!session) {
      window.location.href = "auth.html";
      return null;
    }

    return {
      sb,
      user: session.user,
      session
    };
  }

  async function signedInRedirect() {
    if (!hasSupabase()) {
      return;
    }

    try {
      const sb = client();
      const session = await getFreshSession(sb);

      if (
        session &&
        location.pathname.endsWith("/auth.html")
      ) {
        window.location.href = "dashboard.html";
      }
    } catch {
      // Stay on the page if the session cannot be read.
    }
  }

  /*
   * Retry helper for temporary Supabase/PostgREST failures.
   * PGRST303 ("JWT issued at future") has been reported
   * as an intermittent backend timing issue.
   */
  async function retry(operation, options = {}) {
    const attempts = options.attempts ?? 4;
    const delays = options.delays ?? [500, 1200, 2500, 4000];

    let lastError = null;

    for (let i = 0; i < attempts; i++) {
      try {
        const result = await operation();

        if (!result?.error) {
          return result;
        }

        lastError = result.error;

        const msg = String(
          result.error.message || ""
        ).toLowerCase();

        const isJwtTimingError =
          msg.includes("jwt issued at future") ||
          result.error.code === "PGRST303";

        if (!isJwtTimingError) {
          return result;
        }
      } catch (error) {
        lastError = error;

        const msg = String(
          error?.message || ""
        ).toLowerCase();

        const isJwtTimingError =
          msg.includes("jwt issued at future") ||
          error?.code === "PGRST303";

        if (!isJwtTimingError) {
          throw error;
        }
      }

      if (i < attempts - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, delays[i] ?? 1500)
        );
      }
    }

    return {
      data: null,
      error: lastError
    };
  }

  function money(n) {
    return `₦${Math.round(
      Number(n) || 0
    ).toLocaleString("en-NG")}`;
  }

  function esc(v) {
    return String(v ?? "").replace(
      /[&<>"']/g,
      c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c])
    );
  }

  function msg(id, text, type = "") {
    const el = document.getElementById(id);

    if (!el) {
      return;
    }

    el.textContent = text;
    el.className = `form-msg ${type}`;
  }

  function openMobileNav() {
    document
      .querySelector(".sidebar")
      ?.classList.toggle("open");
  }

  document.addEventListener("DOMContentLoaded", () => {
    document
      .getElementById("openNav")
      ?.addEventListener(
        "click",
        openMobileNav
      );
  });

  return {
    getConfig,
    saveConfig,
    hasSupabase,
    hasGemini,
    client,
    getFreshSession,
    requireUser,
    signedInRedirect,
    retry,
    money,
    esc,
    msg
  };
})();
