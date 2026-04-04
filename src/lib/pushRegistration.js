import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const PUSH_LOG_PREFIX = "[push]";
const PUSH_SYNC_LOG_PREFIX = "[push-sync]";
const PUSH_NOTIFICATION_CHANNEL_ID = "push-alerts";

function log(prefix, message, details = undefined) {
  if (details !== undefined) {
    console.log(`${prefix} ${message}`, details);
    return;
  }
  console.log(`${prefix} ${message}`);
}

export function normalizePermissionStatus(status) {
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  if (status === "undetermined") return "undetermined";
  return "error";
}

function normalizeTokenFetchStatus(status) {
  return ["success", "missing", "skipped", "error", "not_attempted"].includes(status) ? status : "not_attempted";
}

function normalizeDatabaseSyncStatus(status) {
  return ["updated", "unchanged", "missing_permission", "token_missing", "failed", "skipped"].includes(status) ? status : "skipped";
}

async function ensurePushNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }
  await Notifications.setNotificationChannelAsync(PUSH_NOTIFICATION_CHANNEL_ID, {
    name: "Push Alerts",
    importance: Notifications.AndroidImportance.DEFAULT
  });
}

export async function getNotificationPermissionStatus() {
  try {
    log(PUSH_SYNC_LOG_PREFIX, "checking notification permission");
    const permission = await Notifications.getPermissionsAsync();
    return {
      success: true,
      status: normalizePermissionStatus(permission.status || "undetermined"),
      error: null
    };
  } catch (error) {
    log(PUSH_SYNC_LOG_PREFIX, "failed to check notification permission", error?.message || String(error));
    return {
      success: false,
      status: "error",
      error: error?.message || "Unable to check notification permission."
    };
  }
}

export async function requestNotificationPermissionIfNeeded() {
  try {
    await ensurePushNotificationChannel();
    log(PUSH_SYNC_LOG_PREFIX, "requesting notification permission intentionally");
    const permission = await Notifications.requestPermissionsAsync();
    return {
      success: true,
      status: normalizePermissionStatus(permission.status || "undetermined"),
      error: null
    };
  } catch (error) {
    log(PUSH_SYNC_LOG_PREFIX, "failed to request notification permission", error?.message || String(error));
    return {
      success: false,
      status: "error",
      error: error?.message || "Unable to request notification permission."
    };
  }
}

export async function getDevicePushToken(permissionStatus) {
  if (permissionStatus !== "granted") {
    return {
      success: false,
      token: null,
      tokenFetchStatus: "skipped",
      error: "Notification permission is not granted."
    };
  }

  try {
    await ensurePushNotificationChannel();
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    if (!projectId) {
      throw new Error("Expo project ID is missing for push notifications.");
    }
    log(PUSH_SYNC_LOG_PREFIX, "fetching Expo push token");
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = String(tokenResponse?.data || "").trim();
    if (!expoPushToken) {
      return {
        success: false,
        token: null,
        tokenFetchStatus: "missing",
        error: "Push token was not returned by Expo."
      };
    }
    return {
      success: true,
      token: expoPushToken,
      tokenFetchStatus: "success",
      error: null
    };
  } catch (error) {
    log(PUSH_SYNC_LOG_PREFIX, "failed to fetch Expo push token", error?.message || String(error));
    return {
      success: false,
      token: null,
      tokenFetchStatus: "error",
      error: error?.message || "Unable to fetch the Expo push token."
    };
  }
}

export async function syncPushTokenForCurrentUser({
  session,
  currentUser,
  alliance,
  requestPermission = false,
  syncRequest
}) {
  const baseResult = {
    ok: false,
    permissionStatus: "error",
    tokenFetchStatus: "not_attempted",
    databaseSyncStatus: "skipped",
    token: null,
    lastSyncedAt: new Date().toISOString(),
    lastError: "",
    player: null
  };

  if (!session?.token || !session?.backendUrl || !currentUser?.id || !alliance?.id || typeof syncRequest !== "function") {
    return {
      ...baseResult,
      lastError: "Push sync prerequisites are missing."
    };
  }

  const permissionResult = requestPermission
    ? await requestNotificationPermissionIfNeeded()
    : await getNotificationPermissionStatus();

  let permissionStatus = permissionResult.status;
  let tokenFetchStatus = "not_attempted";
  let databaseSyncStatus = "skipped";
  let token = null;
  let lastError = permissionResult.error || "";

  if (permissionStatus !== "granted") {
    tokenFetchStatus = "skipped";
    databaseSyncStatus = permissionStatus === "error" ? "failed" : "missing_permission";
    log(PUSH_SYNC_LOG_PREFIX, "skipping token sync because permission is not granted", { permissionStatus });
  } else {
    const tokenResult = await getDevicePushToken(permissionStatus);
    tokenFetchStatus = normalizeTokenFetchStatus(tokenResult.tokenFetchStatus);
    token = tokenResult.token;
    lastError = tokenResult.error || "";
    if (!tokenResult.success || !token) {
      databaseSyncStatus = tokenFetchStatus === "error" ? "failed" : "token_missing";
      log(PUSH_SYNC_LOG_PREFIX, "device token unavailable during sync", { tokenFetchStatus, lastError });
    }
  }

  try {
    log(PUSH_SYNC_LOG_PREFIX, "sending push sync state to backend", {
      permissionStatus,
      tokenFetchStatus,
      hasToken: Boolean(token)
    });
    const response = await syncRequest({
      expoPushToken: token,
      permissionStatus,
      tokenFetchStatus,
      lastError
    });
    const player = response?.player || null;
    const pushDebug = player?.pushDebug || {};
    const syncedResult = {
      ok: pushDebug.databaseSyncStatus !== "failed",
      permissionStatus: normalizePermissionStatus(pushDebug.permissionStatus || permissionStatus),
      tokenFetchStatus: normalizeTokenFetchStatus(pushDebug.tokenFetchStatus || tokenFetchStatus),
      databaseSyncStatus: normalizeDatabaseSyncStatus(pushDebug.databaseSyncStatus || databaseSyncStatus),
      token,
      lastSyncedAt: pushDebug.lastSyncedAt || new Date().toISOString(),
      lastError: pushDebug.lastError || "",
      player
    };
    log(PUSH_SYNC_LOG_PREFIX, "push sync completed", {
      permissionStatus: syncedResult.permissionStatus,
      tokenFetchStatus: syncedResult.tokenFetchStatus,
      databaseSyncStatus: syncedResult.databaseSyncStatus
    });
    return syncedResult;
  } catch (error) {
    log(PUSH_SYNC_LOG_PREFIX, "backend push sync failed", error?.message || String(error));
    return {
      ...baseResult,
      permissionStatus,
      tokenFetchStatus,
      databaseSyncStatus: "failed",
      token,
      lastSyncedAt: new Date().toISOString(),
      lastError: error?.message || "Unable to sync the push token with the backend."
    };
  }
}

export function getPushDebugStateForCurrentUser(currentUser, lastSyncResult = null) {
  const backendDebug = currentUser?.pushDebug || {};
  const source = lastSyncResult || backendDebug;
  return {
    permissionStatus: normalizePermissionStatus(source.permissionStatus || backendDebug.permissionStatus || "error"),
    tokenFetchStatus: normalizeTokenFetchStatus(source.tokenFetchStatus || backendDebug.tokenFetchStatus || "not_attempted"),
    databaseSyncStatus: normalizeDatabaseSyncStatus(source.databaseSyncStatus || backendDebug.databaseSyncStatus || "skipped"),
    lastSyncedAt: source.lastSyncedAt || backendDebug.lastSyncedAt || "",
    lastError: source.lastError || backendDebug.lastError || "",
    hasExpoPushToken: Boolean(currentUser?.hasExpoPushToken)
  };
}

