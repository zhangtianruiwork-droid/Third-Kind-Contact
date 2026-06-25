use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    time::Duration,
};
use tauri::Manager;

fn current_exe_dir() -> Option<PathBuf> {
    std::env::current_exe().ok()?.parent().map(|d| d.to_path_buf())
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

/// Read yingling_seed.json from the exe directory or source checkout root.
#[tauri::command]
fn read_seed_file() -> Option<String> {
    portable_base_candidates()
        .into_iter()
        .map(|dir| dir.join("yingling_seed.json"))
        .find_map(|path| fs::read_to_string(path).ok())
}

/// Write yingling_seed.json next to the exe, returns true on success
#[tauri::command]
fn write_seed_file(data: String) -> bool {
    if let Some(dir) = current_exe_dir() {
        return fs::write(dir.join("yingling_seed.json"), data.as_bytes()).is_ok();
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

const ARK_BASE_URL: &str = "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_SEEDANCE_MODEL: &str = "doubao-seedance-2-0-fast-260128";

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建应用数据目录: {e}"))?;
    Ok(dir)
}

fn ark_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("yingling_ark_config.json"))
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
    let data = serde_json::to_vec_pretty(config).map_err(|e| format!("无法序列化方舟配置: {e}"))?;
    fs::write(ark_config_path(app)?, data).map_err(|e| format!("无法写入方舟配置: {e}"))
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

fn load_ark_key(app: &tauri::AppHandle) -> Result<String, String> {
    let config = read_ark_config(app);
    if !config.api_key.trim().is_empty() {
        return Ok(config.api_key);
    }
    std::env::var("ARK_API_KEY")
        .map(|v| v.trim().to_string())
        .ok()
        .filter(|v| !v.is_empty())
        .ok_or_else(|| "尚未配置 ARK_API_KEY，请先在小舞台生成页保存方舟 API Key。".to_string())
}

fn http_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("无法创建 HTTP 客户端: {e}"))
}

fn safe_segment(raw: &str) -> String {
    let value: String = raw
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    if value.is_empty() { "asset".to_string() } else { value }
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
fn create_seedance_task(
    app: tauri::AppHandle,
    request: SeedanceTaskRequest,
) -> Result<SeedanceTaskCreated, String> {
    let api_key = load_ark_key(&app)?;
    let mut content = vec![json!({ "type": "text", "text": request.prompt })];

    let first_frame_image = request.first_frame_image.unwrap_or_default();
    let last_frame_image = request.last_frame_image.unwrap_or_default();
    let reference_images = request.reference_images.unwrap_or_default();
    let has_frame_lock = !first_frame_image.trim().is_empty() || !last_frame_image.trim().is_empty();

    if has_frame_lock {
        if first_frame_image.trim().is_empty() || last_frame_image.trim().is_empty() {
            return Err("Frame-lock mode requires both first_frame and last_frame images.".to_string());
        }
        if reference_images.iter().any(|v| !v.trim().is_empty()) {
            return Err("Frame-lock mode cannot be mixed with reference_image inputs.".to_string());
        }
        if !first_frame_image.trim().is_empty() {
            content.push(json!({
                "type": "image_url",
                "image_url": { "url": first_frame_image.trim() },
                "role": "first_frame"
            }));
        }
        if !last_frame_image.trim().is_empty() {
            content.push(json!({
                "type": "image_url",
                "image_url": { "url": last_frame_image.trim() },
                "role": "last_frame"
            }));
        }
    } else {
        let clean_images: Vec<&str> = reference_images
            .iter()
            .map(|v| v.trim())
            .filter(|v| !v.is_empty())
            .collect();
        if clean_images.len() > 9 {
            return Err("Seedance 2.0 supports up to 9 reference_image inputs.".to_string());
        }
        for image in clean_images {
            content.push(json!({
                "type": "image_url",
                "image_url": { "url": image },
                "role": "reference_image"
            }));
        }
    }

    let mut body = json!({
        "model": request.model,
        "content": content,
        "generate_audio": request.generate_audio,
        "ratio": request.ratio,
        "duration": request.duration,
        "resolution": request.resolution,
        "watermark": request.watermark,
        "return_last_frame": request.return_last_frame
    });

    if let Some(seed) = request.seed {
        body["seed"] = json!(seed);
    }

    let client = http_client()?;
    let response = client
        .post(format!("{ARK_BASE_URL}/contents/generations/tasks"))
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .map_err(|e| format!("创建 Seedance 任务失败: {e}"))?;
    let status = response.status();
    let text = response.text().map_err(|e| format!("读取 Seedance 响应失败: {e}"))?;
    if !status.is_success() {
        return Err(format!("Seedance 创建任务返回 {status}: {text}"));
    }
    let raw: Value = serde_json::from_str(&text).map_err(|e| format!("解析 Seedance 响应失败: {e}; 原始响应: {text}"))?;
    let id = raw
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| format!("Seedance 响应缺少任务 ID: {raw}"))?
        .to_string();
    Ok(SeedanceTaskCreated { id, raw })
}

#[tauri::command]
fn get_seedance_task(app: tauri::AppHandle, task_id: String) -> Result<SeedanceTaskStatus, String> {
    let api_key = load_ark_key(&app)?;
    let task_id = task_id.trim();
    if task_id.is_empty() {
        return Err("任务 ID 不能为空。".to_string());
    }
    let client = http_client()?;
    let response = client
        .get(format!("{ARK_BASE_URL}/contents/generations/tasks/{task_id}"))
        .bearer_auth(api_key)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| format!("查询 Seedance 任务失败: {e}"))?;
    let status_code = response.status();
    let text = response.text().map_err(|e| format!("读取 Seedance 查询响应失败: {e}"))?;
    if !status_code.is_success() {
        return Err(format!("Seedance 查询任务返回 {status_code}: {text}"));
    }
    let raw: Value = serde_json::from_str(&text).map_err(|e| format!("解析 Seedance 查询响应失败: {e}; 原始响应: {text}"))?;
    Ok(SeedanceTaskStatus {
        id: raw.get("id").and_then(Value::as_str).unwrap_or(task_id).to_string(),
        status: raw.get("status").and_then(Value::as_str).unwrap_or("unknown").to_string(),
        content: raw.get("content").cloned(),
        error: raw.get("error").cloned(),
        raw,
    })
}

#[tauri::command]
fn download_seedance_video(
    app: tauri::AppHandle,
    character_id: String,
    scene_id: String,
    task_id: String,
    video_url: String,
) -> Result<DownloadedVideo, String> {
    let video_url = video_url.trim();
    if video_url.is_empty() {
        return Err("视频 URL 为空，无法下载。".to_string());
    }

    let dir = app_data_dir(&app)?
        .join("scene_assets")
        .join(safe_segment(&character_id));
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建视频目录: {e}"))?;
    let path = dir.join(format!(
        "{}-{}.mp4",
        safe_segment(&scene_id),
        safe_segment(&task_id)
    ));

    let client = http_client()?;
    let response = client
        .get(video_url)
        .send()
        .map_err(|e| format!("下载 Seedance 视频失败: {e}"))?;
    let status = response.status();
    if !status.is_success() {
        let text = response.text().unwrap_or_default();
        return Err(format!("下载 Seedance 视频返回 {status}: {text}"));
    }
    let bytes = response.bytes().map_err(|e| format!("读取视频数据失败: {e}"))?;
    fs::write(&path, &bytes).map_err(|e| format!("写入本地视频失败: {e}"))?;
    Ok(DownloadedVideo {
        local_path: path.to_string_lossy().to_string(),
        bytes: bytes.len() as u64,
    })
}

fn copy_scene_assets_recursive(
    source_root: &Path,
    source_dir: &Path,
    target_root: &Path,
    installed: &mut Vec<InstalledSceneAsset>,
) -> Result<(), String> {
    for entry in fs::read_dir(source_dir).map_err(|e| format!("无法读取场景资产目录: {e}"))? {
        let entry = entry.map_err(|e| format!("无法读取场景资产条目: {e}"))?;
        let source_path = entry.path();
        let relative = source_path
            .strip_prefix(source_root)
            .map_err(|e| format!("无法计算场景资产相对路径: {e}"))?;
        let target_path = target_root.join(relative);

        if source_path.is_dir() {
            fs::create_dir_all(&target_path).map_err(|e| format!("无法创建场景资产目录: {e}"))?;
            copy_scene_assets_recursive(source_root, &source_path, target_root, installed)?;
        } else if source_path.is_file() {
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("无法创建场景资产目录: {e}"))?;
            }
            fs::copy(&source_path, &target_path).map_err(|e| format!("无法复制场景资产: {e}"))?;
            installed.push(InstalledSceneAsset {
                relative_path: relative.to_string_lossy().replace('\\', "/"),
                local_path: target_path.to_string_lossy().to_string(),
            });
        }
    }

    Ok(())
}

#[tauri::command]
fn install_bundled_scene_assets(app: tauri::AppHandle) -> Result<Vec<InstalledSceneAsset>, String> {
    let source_root = portable_base_candidates()
        .into_iter()
        .map(|dir| dir.join("scene_assets"))
        .find(|path| path.is_dir());

    let Some(source_root) = source_root else {
        return Ok(Vec::new());
    };

    let target_root = app_data_dir(&app)?.join("scene_assets");
    fs::create_dir_all(&target_root).map_err(|e| format!("无法创建本地场景资产目录: {e}"))?;

    let mut installed = Vec::new();
    copy_scene_assets_recursive(&source_root, &source_root, &target_root, &mut installed)?;
    Ok(installed)
}

#[tauri::command]
fn download_seedance_frame(
    app: tauri::AppHandle,
    character_id: String,
    scene_id: String,
    task_id: String,
    image_url: String,
) -> Result<DownloadedFrame, String> {
    let image_url = image_url.trim();
    if image_url.is_empty() {
        return Err("尾帧 URL 为空，无法下载角色锚点。".to_string());
    }

    let dir = app_data_dir(&app)?
        .join("scene_assets")
        .join(safe_segment(&character_id));
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建尾帧目录: {e}"))?;
    let path = dir.join(format!(
        "{}-{}-last-frame.png",
        safe_segment(&scene_id),
        safe_segment(&task_id)
    ));

    let client = http_client()?;
    let response = client
        .get(image_url)
        .send()
        .map_err(|e| format!("下载 Seedance 尾帧失败: {e}"))?;
    let status = response.status();
    if !status.is_success() {
        let text = response.text().unwrap_or_default();
        return Err(format!("下载 Seedance 尾帧返回 {status}: {text}"));
    }
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .filter(|v| v.starts_with("image/"))
        .unwrap_or("image/png")
        .to_string();
    let bytes = response.bytes().map_err(|e| format!("读取尾帧数据失败: {e}"))?;
    fs::write(&path, &bytes).map_err(|e| format!("写入本地尾帧失败: {e}"))?;
    let encoded = general_purpose::STANDARD.encode(&bytes);

    Ok(DownloadedFrame {
        local_path: path.to_string_lossy().to_string(),
        data_url: format!("data:{content_type};base64,{encoded}"),
        bytes: bytes.len() as u64,
    })
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
