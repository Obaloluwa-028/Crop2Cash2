const STORAGE_KEY = "crop2cash_config_v1";

const supabaseUrlInput = document.getElementById("supabaseUrl");
const supabaseKeyInput = document.getElementById("supabaseKey");
const geminiKeyInput = document.getElementById("geminiKey");
const geminiModelInput = document.getElementById("geminiModel");
const message = document.getElementById("setupMsg");

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `form-msg ${type}`;
}

function getSavedConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function loadSavedConfig() {
  const config = getSavedConfig();

  supabaseUrlInput.value = config.supabaseUrl || "";
  supabaseKeyInput.value = config.supabaseKey || "";
  geminiKeyInput.value = config.geminiKey || "";
  geminiModelInput.value =
    config.geminiModel || "gemini-3.7-flash";
}

function saveConfiguration() {
  const supabaseUrl = supabaseUrlInput.value
    .trim()
    .replace(/\/$/, "");

  const supabaseKey = supabaseKeyInput.value.trim();
  const geminiKey = geminiKeyInput.value.trim();
  const geminiModel =
    geminiModelInput.value.trim() || "gemini-3.7-flash";

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
    setMessage(
      "Please enter a valid Supabase project URL.",
      "error"
    );
    return false;
  }

  if (!supabaseKey) {
    setMessage(
      "Please enter your Supabase publishable key.",
      "error"
    );
    return false;
  }

  const config = {
    supabaseUrl,
    supabaseKey,
    geminiKey,
    geminiModel
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(config)
  );

  setMessage(
    "Configuration saved successfully.",
    "success"
  );

  return true;
}

async function testSupabase() {
  const supabaseUrl = supabaseUrlInput.value
    .trim()
    .replace(/\/$/, "");

  const supabaseKey = supabaseKeyInput.value.trim();

  if (!supabaseUrl || !supabaseKey) {
    setMessage(
      "Enter the Supabase URL and publishable key first.",
      "error"
    );
    return;
  }

  setMessage("Testing Supabase connection…");

  try {
    const client = window.supabase.createClient(
      supabaseUrl,
      supabaseKey
    );

    const { error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    /*
      Save immediately after a successful test.
      This prevents the exact problem we were seeing.
    */
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        supabaseUrl,
        supabaseKey,
        geminiKey: geminiKeyInput.value.trim(),
        geminiModel:
          geminiModelInput.value.trim() ||
          "gemini-3.7-flash"
      })
    );

    setMessage(
      "Supabase connection is working and configuration was saved.",
      "success"
    );

  } catch (error) {
    console.error(error);

    setMessage(
      error.message || "Supabase connection failed.",
      "error"
    );
  }
}

document
  .getElementById("saveSetup")
  .addEventListener("click", saveConfiguration);

document
  .getElementById("testSetup")
  .addEventListener("click", testSupabase);

loadSavedConfig();
