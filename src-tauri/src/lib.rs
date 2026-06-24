use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{fs, path::PathBuf};
use tauri::Manager;

fn current_exe_dir() -> Option<PathBuf> {
    std::env::current_exe().ok()?.parent().map(|dir| dir.to_path_buf())
}

fn portable_base_candidates() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Some(dir) = current_exe_dir() {
        dirs.push(dir);
    }
    if let Ok(dir) = std::env::current_dir() {
        dirs.push(dir.clone());
        if let Some(parent) = dir.parent() {
            dirs.push(parent.to_path_buf());
        }
    }
    dirs
}

#[tauri::command]
fn read_seed_file() -> Option<String> {
    portable_base_candidates()
        .into_iter()
        .map(|dir| dir.join("third_kind_contact_seed.json"))
        .find_map(|path| fs::read_to_string(path).ok())
}

#[tauri::command]
fn write_seed_file(data: String) -> bool {
    if let Some(dir) = current_exe_dir() {
        return fs::write(dir.join("third_kind_contact_seed.json"), data.as_bytes()).is_ok();
    }
    false
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstalledSceneAsset {
    relative_path: String,
    local_path: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ArkConfig {
    api_key_name: String,
    api_key: String,
    model: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ArkConfigStatus {
    configured: bool,
    api_key_name: String,
    key_tail: String,
    model: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SeedanceTaskRequest {
    model: String,
    prompt: String,
    reference_images: Option<Vec<String>>,
    first_frame_image: Option<String>,
    last_frame_image: Option<String>,
    ratio: String,
    duration: u16,
    resolution: String,
    watermark: bool,
    generate_audio: bool,
    seed: Option<u64>,
    return_last_frame: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SeedanceTaskCreated {
    id: String,
    raw: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SeedanceTaskStatus {
    id: String,
    status: String,
    content: Option<Value>,
    error: Option<Value>,
    raw: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadedVideo {
    local_path: String,
    bytes: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadedFrame {
    local_path: String,
    data_url: String,
    bytes: u64,
}

const DEFAULT_SEEDANCE_MODEL: &str = "doubao-seedance-2-0-fast-260128";

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to resolve app data directory: {error}"))?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Unable to create app data directory: {error}"))?;
    Ok(dir)
}

fn ark_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("third_kind_contact_ark_config.json"))
}

fn read_ark_config(app: &tauri::AppHandle) -> ArkConfig {
    let Ok(path) = ark_config_path(app) else {
        return ArkConfig::default();
    };
    let Ok(data) = fs::read_to_string(path) else {
        return ArkConfig::default();
    };
    serde_json::from_str(&data).unwrap_or_default()
}

fn write_ark_config(app: &tauri::AppHandle, config: &ArkConfig) -> Result<(), String> {
    let data = serde_json::to_vec_pretty(config)
        .map_err(|error| format!("Unable to serialize Ark config: {error}"))?;
    fs::write(ark_config_path(app)?, data)
        .map_err(|error| format!("Unable to write Ark config: {error}"))
}

fn key_tail(key: &str) -> String {
    let tail: String = key.chars().rev().take(6).collect::<String>().chars().rev().collect();
    if tail.is_empty() { String::new() } else { format!("...{tail}") }
}

fn status_from_config(config: ArkConfig) -> ArkConfigStatus {
    let env_key = std::env::var("ARK_API_KEY").unwrap_or_default();
    let effective_key = if config.api_key.trim().is_empty() { env_key } else { config.api_key };
    ArkConfigStatus {
        configured: !effective_key.trim().is_empty(),
        api_key_name: config.api_key_name,
        key_tail: key_tail(&effective_key),
        model: if config.model.trim().is_empty() {
            DEFAULT_SEEDANCE_MODEL.to_string()
        } else {
            config.model
        },
    }
}

#[tauri::command]
fn get_ark_config_status(app: tauri::AppHandle) -> ArkConfigStatus {
    status_from_config(read_ark_config(&app))
}

#[tauri::command]
fn save_ark_config(
    app: tauri::AppHandle,
    api_key_name: String,
    api_key: String,
    model: String,
) -> Result<ArkConfigStatus, String> {
    let mut config = read_ark_config(&app);
    config.api_key_name = api_key_name.trim().to_string();
    if !api_key.trim().is_empty() {
        config.api_key = api_key.trim().to_string();
    }
    config.model = if model.trim().is_empty() {
        DEFAULT_SEEDANCE_MODEL.to_string()
    } else {
        model.trim().to_string()
    };
    write_ark_config(&app, &config)?;
    Ok(status_from_config(config))
}

#[tauri::command]
fn create_seedance_task(request: SeedanceTaskRequest) -> Result<SeedanceTaskCreated, String> {
    let _ = (
        request.model,
        request.prompt,
        request.reference_images,
        request.first_frame_image,
        request.last_frame_image,
        request.ratio,
        request.duration,
        request.resolution,
        request.watermark,
        request.generate_audio,
        request.seed,
        request.return_last_frame,
    );
    Err("Seedance task creation is not enabled in the clean template. Configure the provider implementation before publishing production builds.".to_string())
}

#[tauri::command]
fn get_seedance_task(task_id: String) -> Result<SeedanceTaskStatus, String> {
    Ok(SeedanceTaskStatus {
        id: task_id,
        status: "disabled".to_string(),
        content: None,
        error: Some(json!({ "message": "Seedance integration is disabled in the clean template." })),
        raw: json!({ "status": "disabled" }),
    })
}

#[tauri::command]
fn download_seedance_video() -> Result<DownloadedVideo, String> {
    Err("Seedance video download is disabled in the clean template.".to_string())
}

#[tauri::command]
fn download_seedance_frame() -> Result<DownloadedFrame, String> {
    Err("Seedance frame download is disabled in the clean template.".to_string())
}

#[tauri::command]
fn install_bundled_scene_assets() -> Result<Vec<InstalledSceneAsset>, String> {
    Ok(Vec::new())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_seed_file,
            write_seed_file,
            install_bundled_scene_assets,
            get_ark_config_status,
            save_ark_config,
            create_seedance_task,
            get_seedance_task,
            download_seedance_video,
            download_seedance_frame
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
